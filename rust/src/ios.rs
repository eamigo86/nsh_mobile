//! `Location.current` on iOS: CoreLocation through objc2, mirroring native/ios/NSHTodoHost/LocationBridge.swift.
//! Everything that touches CoreLocation runs on the main thread (`run_on_main_thread`); the answer comes back to the
//! engine thread through a oneshot channel.

use std::cell::{Cell, OnceCell, RefCell};

use futures_channel::oneshot;
use nsh_core::prelude::run_on_main_thread;
use objc2::rc::Retained;
use objc2::runtime::ProtocolObject;
use objc2::{define_class, msg_send, DefinedClass, MainThreadMarker, MainThreadOnly};
use objc2_core_location::{
    kCLLocationAccuracyNearestTenMeters, CLAuthorizationStatus, CLError, CLLocation, CLLocationManager,
    CLLocationManagerDelegate,
};
use objc2_foundation::{NSArray, NSError, NSObject, NSObjectProtocol};

use crate::Position;

type Reply = oneshot::Sender<Result<Position, String>>;

#[derive(Default)]
struct Ivars {
    /// Calls waiting for the permission or the fix: one fix answers all of them.
    waiting: RefCell<Vec<Reply>>,
    locating: Cell<bool>,
}

define_class!(
    #[unsafe(super(NSObject))]
    #[thread_kind = MainThreadOnly]
    #[name = "NSHTodoLocationDelegate"]
    #[ivars = Ivars]
    struct Delegate;

    unsafe impl NSObjectProtocol for Delegate {}

    unsafe impl CLLocationManagerDelegate for Delegate {
        #[unsafe(method(locationManagerDidChangeAuthorization:))]
        fn did_change_authorization(&self, manager: &CLLocationManager) {
            if !self.ivars().waiting.borrow().is_empty() {
                self.proceed(manager);
            }
        }

        #[unsafe(method(locationManager:didUpdateLocations:))]
        fn did_update_locations(&self, _manager: &CLLocationManager, locations: &NSArray<CLLocation>) {
            let Some(fix) = locations.lastObject() else { return };
            let coordinate = unsafe { fix.coordinate() };
            let accuracy = unsafe { fix.horizontalAccuracy() };
            self.finish(Ok(Position { latitude: coordinate.latitude, longitude: coordinate.longitude, accuracy }));
        }

        #[unsafe(method(locationManager:didFailWithError:))]
        fn did_fail(&self, _manager: &CLLocationManager, error: &NSError) {
            let message = if error.code() == CLError::Denied.0 {
                "denied".to_owned()
            } else {
                error.localizedDescription().to_string()
            };
            self.finish(Err(message));
        }
    }
);

impl Delegate {
    fn new(mtm: MainThreadMarker) -> Retained<Self> {
        let this = mtm.alloc::<Self>().set_ivars(Ivars::default());
        unsafe { msg_send![super(this), init] }
    }

    fn request(&self, manager: &CLLocationManager, reply: Reply) {
        if !unsafe { CLLocationManager::locationServicesEnabled_class() } {
            let _ = reply.send(Err("disabled".to_owned()));
            return;
        }
        self.ivars().waiting.borrow_mut().push(reply);
        if unsafe { manager.authorizationStatus() } == CLAuthorizationStatus::NotDetermined {
            unsafe { manager.requestWhenInUseAuthorization() }; // answered in did_change_authorization
        } else {
            self.proceed(manager);
        }
    }

    fn proceed(&self, manager: &CLLocationManager) {
        let status = unsafe { manager.authorizationStatus() };
        if status == CLAuthorizationStatus::NotDetermined {
            return;
        }
        if status == CLAuthorizationStatus::Denied || status == CLAuthorizationStatus::Restricted {
            return self.finish(Err("denied".to_owned()));
        }
        if !self.ivars().locating.replace(true) {
            unsafe { manager.requestLocation() };
        }
    }

    fn finish(&self, answer: Result<Position, String>) {
        let waiting = self.ivars().waiting.take();
        self.ivars().locating.set(false);
        for reply in waiting {
            let _ = reply.send(answer.clone());
        }
    }
}

thread_local! {
    // The main thread's manager and its delegate (the manager holds its delegate weakly).
    static BRIDGE: OnceCell<(Retained<CLLocationManager>, Retained<Delegate>)> = const { OnceCell::new() };
}

fn request_on_main(reply: Reply) {
    let mtm = MainThreadMarker::new().expect("run_on_main_thread runs on the main thread");
    BRIDGE.with(|bridge| {
        let (manager, delegate) = bridge.get_or_init(|| {
            let delegate = Delegate::new(mtm);
            let manager = unsafe { CLLocationManager::new() };
            unsafe {
                manager.setDelegate(Some(ProtocolObject::from_ref(&*delegate)));
                manager.setDesiredAccuracy(kCLLocationAccuracyNearestTenMeters);
            }
            (manager, delegate)
        });
        delegate.request(manager, reply);
    });
}

pub async fn current() -> Result<Position, String> {
    let (reply, answer) = oneshot::channel();
    run_on_main_thread(move || request_on_main(reply)).await.map_err(|e| e.to_string())?;
    answer.await.map_err(|_| "cancelled".to_owned())?
}
