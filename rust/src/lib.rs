//! The app's Rust code: what `App.tsx` reaches as `nshtodo/native` (`nsh.json` `"rust"`).
//! Contract with `location.ts`: `Location.current()` resolves `{ latitude, longitude, accuracy }`
//! (degrees, metres) and rejects with "denied", "disabled", "unavailable" or the error's text.

use nsh_core::prelude::*;

#[cfg(target_os = "ios")]
mod ios;

/// The crate's UI set.
#[native_module("nshtodo/native")]
fn native(registry: &mut Registry) {
    registry.module::<Location>();
}

/// A device position.
#[derive(Clone, Debug, PartialEq, JsObject)]
pub struct Position {
    /// Degrees north.
    pub latitude: f64,
    /// Degrees east.
    pub longitude: f64,
    /// Horizontal accuracy in metres.
    pub accuracy: f64,
}

/// The device position.
#[module]
pub struct Location;

#[module]
impl Location {
    /// The current position, asking for When-In-Use permission first. Rejects with "denied" (permission
    /// refused), "disabled" (location services off), "unavailable" (this platform has no bridge) or the
    /// system's error text.
    pub async fn current() -> Result<Position, String> {
        #[cfg(target_os = "ios")]
        return ios::current().await;
        #[cfg(not(target_os = "ios"))]
        Err("unavailable".to_owned())
    }
}
