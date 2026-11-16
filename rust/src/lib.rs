//! The app's Rust code: what `App.tsx` reaches as `nshtodo/native` (`nsh.json` `"rust"`).
//! Contract with `location.ts`: `Location.current()` resolves `{ latitude, longitude, accuracy }`
//! (degrees, metres) and rejects with "denied", "disabled", "unavailable" or the error's text.

use nsh_core::prelude::*;

mod db;
pub use db::{CategoryRow, TaskRow};
use std::sync::Mutex;
#[cfg(target_os = "ios")]
mod ios;
#[cfg(target_os = "ios")]
mod time_picker;
// Used by the iOS time picker; the unit tests run everywhere.
#[cfg_attr(not(any(target_os = "ios", test)), allow(dead_code))]
mod time;

/// The crate's UI set.
#[native_module("nshtodo/native")]
fn native(registry: &mut Registry) {
    registry.module::<Location>();
    registry.module::<Db>();
    registry.module::<TimePicker>();
}

/// The native components of the iOS runtime: `nshtodo.timePicker`, the system time picker. Other platforms register
/// none (`TimePicker.available()` says so, and `ui/time-picker.tsx` falls back to NSH's `TimeField`).
#[native_components(ios)]
fn components(components: &nsh_platform_ios::Components) {
    time_picker::register(components);
}

/// The system time picker.
#[module]
pub struct TimePicker;

#[module]
impl TimePicker {
    /// Whether this runtime registered the `nshtodo.timePicker` native component: on iOS, where the app is built with
    /// this crate.
    pub fn available() -> bool {
        cfg!(target_os = "ios")
    }
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

/// The app's SQLite database, `todo.sqlite` in the app's data directory. The functions are synchronous: each is one
/// small statement on a local file, so it runs inside the TSX call and returns its value (an `Err` throws), with no task
/// to start and nothing to await in Rust. `open` comes first, with `process.dataDir`: `data_dir()` reads the reactive
/// runtime, which is not entered when a promise continuation calls the module (it panics there), so TSX passes the path.
#[module]
pub struct Db;

static CONN: Mutex<Option<rusqlite::Connection>> = Mutex::new(None);

/// Runs `f` on the open connection.
fn with_conn<T>(f: impl FnOnce(&mut rusqlite::Connection) -> Result<T, String>) -> Result<T, String> {
    let mut guard = CONN.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    f(guard.as_mut().ok_or("the database is not open")?)
}

#[module]
impl Db {
    /// Opens `todo.sqlite` in `dir` (the app's data directory, `process.dataDir`), creating it and its tables; an empty
    /// `dir` (the web has none) is an error. Opening again keeps the open connection.
    pub fn open(dir: String) -> Result<(), String> {
        let mut guard = CONN.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        if guard.is_none() {
            *guard = Some(db::open_in(&dir)?);
        }
        Ok(())
    }
    /// 0 until the first `import`, then 1 (`PRAGMA user_version`).
    pub fn version() -> Result<u32, String> {
        with_conn(|c| db::version(c))
    }
    /// Every category, oldest first.
    pub fn categories() -> Result<Vec<CategoryRow>, String> {
        with_conn(|c| db::categories(c))
    }
    /// Every task, oldest first.
    pub fn tasks() -> Result<Vec<TaskRow>, String> {
        with_conn(|c| db::tasks(c))
    }
    /// Adds a task (`id` empty) or updates the one with that id (its `done` stays); returns the id.
    pub fn save_task(task: TaskRow) -> Result<String, String> {
        with_conn(|c| db::save_task(c, &task))
    }
    /// Marks a task done or open.
    pub fn set_done(id: String, done: bool) -> Result<(), String> {
        with_conn(|c| db::set_done(c, &id, done))
    }
    /// Deletes a task.
    pub fn remove_task(id: String) -> Result<(), String> {
        with_conn(|c| db::remove_task(c, &id))
    }
    /// Adds a category and returns it; a name taken in any letter case is refused with the message to show.
    pub fn add_category(name: String, color: String) -> Result<CategoryRow, String> {
        with_conn(|c| db::add_category(c, &name, &color))
    }
    /// Loads the first snapshot in one transaction while `version` is 0 and makes it 1; false when it was already imported.
    pub fn import(tasks: Vec<TaskRow>, categories: Vec<CategoryRow>) -> Result<bool, String> {
        with_conn(|c| db::import(c, &tasks, &categories))
    }
}
