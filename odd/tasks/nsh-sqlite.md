# Feature: nsh-sqlite

Locator: `odd/tasks/nsh-sqlite.md` · Engram mirror: `odd/sqlite/tasks`

## Objective

Keep the app's tasks and categories in a local SQLite database instead of the `Storage` JSON blob,
with a one-time import of the existing data, on iOS and Android. NSH 0.5.0 has no SQLite API, so
the database lives in the app's Rust crate (`rusqlite`, bundled SQLite) and TSX calls it through
`nativeModule`. The same change goes into the Exact Todo app (`../exact_mobile`, branch
`feat/exact-sqlite`, through `storage.sqlite`) to compare offline/local-database support
(2026-11-16 request).

## Scope

- Rust (`rust/`): a `Db` module (`#[module]`) registered in the existing `#[native_module("nshtodo/native")]`
  set, database at `data_dir()/todo.sqlite` (create the directory first). Tables `categories(id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE, color TEXT NOT NULL)` and `tasks(id INTEGER PRIMARY KEY, title, notes,
  category_id TEXT, due, time, done INTEGER NOT NULL DEFAULT 0)`, `PRAGMA user_version` for the schema version.
  Per-operation functions (list, insert or update a task, set done, remove, add a category, import a snapshot),
  not a rewrite of the whole data set per change.
- TSX (`store.ts`): tasks and categories go through the module; settings (name, appearance, onboarding flag) stay
  in the `Storage` blob and the avatar in its own key. First run with the database empty: import the blob's
  tasks and categories (or the seed) once. Where the module is missing (web, a bundle without the crate) keep the
  current `Storage` path, as `location.ts` does.
- Out of scope: sync with a server, web and desktop checks, the native hosts in `native/`.

## Constraints

- Branch `feat/nsh-sqlite` from `feat/nsh-avatar` (71be20c). NSH 0.5.0 (f4d68f7); `rusqlite` with the `bundled`
  feature (0.41.x or 0.42.x is in the local cargo registry).
- Keep `make check` and `make test` green; `make ios-crate` and `make package-android` must build.
- Artifacts in English. Conventional commits, no attribution lines, no push.

## TDD

- Mode: strict, enabled. Source: user global instructions. Runner: `make test` (`nsh test`, which also runs
  `cargo test` in `rust/`): Rust unit tests on an in-memory connection for the SQL layer, TSX tests with a
  faked module (`open(..., { modules })`) for the store.
- RDD: off (global).

## Tasks

- [x] T1 Branch and this document. Route: inline (mechanical).
- [x] T2 Rust `Db` module with rusqlite, TSX store through it with the Storage fallback, one-time import, tests first. Route: delegated writer (Rust and TSX files).
- [x] T3 Verify on the iOS Simulator and the Android emulator (packaged apps): upgrade from the blob build keeps the data, add/edit/toggle/delete, relaunch; inspect the database file. Route: inline per-action.

## Acceptance criteria

- `make check` and `make test` pass with Rust and TSX tests; both packages build.
- On both platforms, an install that had blob data keeps its tasks after the upgrade, `todo.sqlite` holds them,
  and changes survive a relaunch.

## Delivery

- Forecast: about 250-350 authored lines. Local branch only; no push or pull request planned.

## Progress / evidence

- T1: branch created from 71be20c.
- T2 (delegated writer), commit f49504c `feat(storage): keep tasks and categories in SQLite through the Rust crate`:
  - RED (Rust): `cargo test` with `todo!()` stubs: `test result: FAILED. 7 passed; 6 failed` (db::tests). Later the `open_in` test alone: panicked "not yet implemented", 1 failed.
  - RED (TSX): `nsh test Sqlite.test.tsx` before the store change: `error 7 tests: 1 passed, 6 failed`; after adding the `open` tests, `9 tests: 7 passed, 2 failed`.
  - GREEN: `cargo test`: 14 passed (7 time, 7 db). `make test`: `73 tests: 73 passed, 0 failed` (Rust and TSX; 9 new in Sqlite.test.tsx).
  - `make check`: `checked nshtodo-native` OK, no type errors.
  - `make ios-crate`: packaged `dist/ios-crate-sim/NSH Todo.app`, release runner 19.7 s; app 61,208 KB -> 63,100 KB (+1.9 MB).
  - `make package-android`: packaged `dist/android/NSH Todo.apk (arm64-v8a, armeabi-v7a)`; libnsh.so 18.8 s (armeabi-v7a) and 18.1 s (arm64-v8a), whole command 39 s; APK 82,572,653 -> 86,431,085 bytes (+3.86 MB).
  - Database: `<data dir>/todo.sqlite`, where the data dir is `process.dataDir` (`<data>/com.example.nshtodo`, beside `storage.json`).
  - Not run: devices (T3 is the user's).

## Findings for the comparison

- Worked first time: rusqlite 0.42 with `bundled` cross-compiled for iOS simulator and both Android ABIs without any setup (no NDK flags, no cc env). `#[derive(JsObject)]` structs work as arguments and results (`category_id` arrives as `categoryId`); `Vec<Struct>` args too. Generated `.d.ts` came for free.
- Workaround: `data_dir()` from `nsh_core::prelude` panics ("no reactive runtime: signals are used on the engine thread, while components run") when a module function is called from a promise continuation, which poisoned the global mutex. TSX now passes `process.dataDir` to `Db.open(dir)`. Doc gap: the docs show `data_dir()` without saying it needs the reactive runtime entered; `process.dataDir` is `null` in headless tests, so tests cannot exercise a real directory (the Rust layer is tested with `open_in` on a temp dir).
- Sync vs async: exported functions are sync (one small statement on a local file; no task needed). Under `modules` fakes every call becomes a Promise, so TSX always `await`s them, which also keeps the real sync module working.
- Error flow: `Result<T, String>` `Err` throws in TSX; the store treats any error at open/load as "no database" and stays on Storage.
- Not-quite-equal case folding: SQLite `COLLATE NOCASE` is ASCII only, the app's old check used JS `toLowerCase()` (Unicode). The signal pre-check keeps the old behaviour; the Rust check is a backstop with the same message.
- Store design: Storage path unchanged; with the database every change is serialised in a promise queue and signals update after the module call returns (new task ids come from SQLite). Settings blob no longer holds `tasks`/`categories` once the database is in use (trimmed on the load that follows a successful import).
- Headless tests build and use the real crate: an unfaked `nativeModule` works there; `Db` without a data dir rejects, so the whole existing suite still runs on the Storage path.
- Size/time: iOS sim .app +1.9 MB; APK +3.86 MB (x86_64 not packaged); first rusqlite crate build adds roughly 20 s per ABI.
- Lines: Rust `db.rs` 150 non-test + 96 test, `lib.rs` +64 (module, doc comments), `Cargo.toml` +2; TSX `store.ts` +80/-14, `Sqlite.test.tsx` 190 (new).

## T3 device verification (2026-11-16)

- iOS (iPhone 17 Pro Simulator, iOS 26.5, `make ios-crate` package): before the upgrade the blob build held 4 categories
  (one custom, "Errands") and 3 tasks (seeded into `storage.json`). After installing the SQLite build over it:
  `.../Library/Application Support/nsh/com.example.nshtodo/todo.sqlite` beside `storage.json`, `PRAGMA user_version` = 1,
  4 categories and 3 tasks with the same ids, dates, times and done flags; the `exact-todo` blob now holds only
  `{name, onboarded, appearance}`. Toggling "Buy groceries" set `done = 1` in the database at once and survived a relaunch.
- Android (Pixel 9 Pro XL emulator, API 35, arm64-v8a APK): one task created in the blob build through the UI. The
  database file cannot be read (release APK, not debuggable; no root), and the store fell back to `Storage` silently
  on any error, so the check was blind. Added a log line (`console.info`/`console.warn`, commit below) that says which
  store holds the tasks; `adb logcat -s nsh` then showed `js: store: tasks in SQLite (1 tasks, 3 categories)` after the
  upgrade, and again after a toggle and a relaunch (the toggle kept). First run of the crate's own code on Android in
  this project: rusqlite (bundled) worked with no Android-specific setup.
- Commit for the log line: see `git log` (`feat(storage): log whether tasks live in SQLite or fall back to Storage`).
