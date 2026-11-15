//! `nshtodo.timePicker` on iOS: a `UIDatePicker` in time mode and compact style, the button that opens the system's
//! wheels. Props: `value` ("HH:MM", 24-hour; anything else leaves the picker as it is) and `tint` ("#RRGGBB").
//! Event: `change` with `{ value: "HH:MM" }` when the user picks a time. It reports its natural size.
//!
//! The picker runs in the GMT zone and holds the time as that time of day on 1970-01-01 (`crate::time`), so the
//! value is the same whatever the device's zone or 12/24-hour setting; only what the picker shows follows the locale.

use std::rc::Rc;

use nsh_core::JsonValue;
use nsh_platform_ios::{ComponentContext, Components, NativeComponent};
use objc2::rc::Retained;
use objc2::{define_class, msg_send, sel, DefinedClass, MainThreadMarker, MainThreadOnly};
use objc2_core_foundation::CGSize;
use objc2_foundation::{NSDate, NSObject, NSObjectProtocol, NSTimeZone};
use objc2_ui_kit::{UIColor, UIControlEvents, UIDatePicker, UIDatePickerMode, UIDatePickerStyle, UIView};

use crate::time;

const NAME: &str = "nshtodo.timePicker";

pub fn register(components: &Components) {
    components.register(NAME, Rc::new(|context| Box::new(TimePicker::new(context))));
}

struct TargetIvars {
    context: ComponentContext,
}

define_class!(
    /// The picker's target: `valueChanged:` tells the app the new time.
    #[unsafe(super(NSObject))]
    #[thread_kind = MainThreadOnly]
    #[name = "NSHTodoTimePickerTarget"]
    #[ivars = TargetIvars]
    struct Target;

    unsafe impl NSObjectProtocol for Target {}

    impl Target {
        #[unsafe(method(valueChanged:))]
        fn value_changed(&self, picker: &UIDatePicker) {
            let context = &self.ivars().context;
            let (hour, minute) = time::from_timestamp(picker.date().timeIntervalSince1970());
            let mut event = serde_json::Map::new();
            event.insert("value".to_owned(), time::format(hour, minute).into());
            context.emit("change", JsonValue::Object(event));
            report_size(picker, context);
        }
    }
);

impl Target {
    fn new(mtm: MainThreadMarker, context: ComponentContext) -> Retained<Self> {
        let this = mtm.alloc::<Self>().set_ivars(TargetIvars { context });
        unsafe { msg_send![super(this), init] }
    }
}

/// The compact picker's own size (it grows and shrinks with the text it shows, "9:00 AM" against "12:00 PM").
fn report_size(picker: &UIView, context: &ComponentContext) {
    let mut size = picker.intrinsicContentSize();
    if size.width <= 0.0 || size.height <= 0.0 {
        size = picker.systemLayoutSizeFittingSize(CGSize::new(0.0, 0.0));
    }
    context.set_size(size.width as f32, size.height as f32);
}

struct TimePicker {
    picker: Retained<UIDatePicker>,
    context: ComponentContext,
    /// The control holds its target weakly.
    _target: Retained<Target>,
}

impl TimePicker {
    fn new(context: ComponentContext) -> Self {
        let mtm = MainThreadMarker::new().expect("native components are made on the main thread");
        let picker = UIDatePicker::new(mtm);
        picker.setDatePickerMode(UIDatePickerMode::Time);
        picker.setPreferredDatePickerStyle(UIDatePickerStyle::Compact);
        picker.setTimeZone(Some(&NSTimeZone::timeZoneForSecondsFromGMT(0)));
        let target = Target::new(mtm, context.clone());
        // SAFETY: `valueChanged:` takes the sending control, as the action of a `UIControl` does.
        unsafe { picker.addTarget_action_forControlEvents(Some(&target), sel!(valueChanged:), UIControlEvents::ValueChanged) };
        TimePicker { picker, context, _target: target }
    }

    fn shown(&self) -> (u8, u8) {
        time::from_timestamp(self.picker.date().timeIntervalSince1970())
    }
}

impl NativeComponent for TimePicker {
    fn view(&self) -> &UIView {
        &self.picker
    }

    fn set_prop(&mut self, name: &str, value: Option<&JsonValue>) {
        match name {
            "value" => {
                // Not a time (or removed): the picker keeps what it shows; the app's default is the app's to give.
                let Some((hour, minute)) = value.and_then(JsonValue::as_str).and_then(time::parse) else { return };
                if self.shown() != (hour, minute) {
                    self.picker.setDate(&NSDate::dateWithTimeIntervalSince1970(time::to_timestamp(hour, minute)));
                }
                report_size(&self.picker, &self.context);
            }
            "tint" => {
                let color = value
                    .and_then(JsonValue::as_str)
                    .and_then(|hex| nsh_core::Hsla::parse_hex(hex).ok())
                    .map(nsh_core::Color::from)
                    .map(|c| {
                        let (r, g, b, a) = c.to_f64();
                        UIColor::colorWithRed_green_blue_alpha(r, g, b, a)
                    });
                // SAFETY: a plain setter on the main thread; `None` restores the inherited tint.
                unsafe { self.picker.setTintColor(color.as_deref()) };
            }
            _ => {}
        }
    }
}
