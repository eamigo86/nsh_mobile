# Feature: nsh-datetimepicker

Locator: `odd/tasks/nsh-datetimepicker.md` · Engram mirror: `odd/nsh-datetimepicker/tasks`

## Objective

On iOS, the task form's "Due time" uses NSH 0.6.0's `DateTimePicker` (`nsh/mobile`, `mode="time"`) instead of the
`UIDatePicker` component this app's Rust crate registers (`nshtodo.timePicker`, see `native-time-picker.md`).

## Why

NSH 0.6.0 ships the system date and time picker (#2278): on iOS a compact `UIDatePicker`, on Android the system dialog,
nothing on desktops and the web. It does what the crate's component does, so the crate code can go.

## Scope

- `ui/time-picker.tsx`: iOS shows `DateTimePicker` (`mode="time"`, `value` and `onChange` as `"HH:MM"`,
  `accessibilityLabel="Due time"`); every other platform keeps NSH's `TimeField`, as today.
- Remove the now unused crate picker: `nshtodo.timePicker`, `TimePicker.available()`, `rust/src/time_picker.rs`,
  `rust/src/time.rs` and the dependencies only they use.
- Android too (added 2026-11-18 at the user's request, T5): `DateTimePicker` (the system time dialog) on iOS and
  Android; desktops and the web keep `TimeField` (`DateTimePicker` shows nothing there).
- The due date too (added 2026-11-18 at the user's request, T6): on iOS and Android the "Due date" row uses
  `DateTimePicker` (`mode="date"`, `"YYYY-MM-DD"`); with no due date it shows an "Add date" button that sets today,
  as "Add time" does for the time (a native picker with no value would show today and hide that there is no date).
  Desktops and the web keep NSH's `DatePicker` calendar.

## Constraints

- Branch `feat/nsh-datetimepicker` from `chore/nsh-0.6.0` (5fdded8). NSH 0.6.0.
- The uncommitted `package-ios` line in the Makefile stays out of every commit.
- Known difference: `DateTimePicker` has no tint prop; the crate's picker drew its time in the theme's primary colour.

## TDD

- Mode: strict (user global instructions). Runner: `make test` (TSX tests plus the crate's `cargo test`), `make check`.

## Tasks

- [x] T1 Branch and this document. Route: inline (mechanical).
- [x] T2 iOS "Due time" uses `DateTimePicker`, tests first. Route: delegated writer (TSX control and tests).
- [x] T3 Remove the crate's time picker. Route: same delegated writer, separate commit (Rust and Cargo files).
- [x] T4 Verify on the iOS 26.5 Simulator (picker opens, the pick is saved and shown) and that Android still shows
  `TimeField`. Route: inline per-action.
- [x] T5 Android "Due time" uses `DateTimePicker` too, tests first; desktops and the web keep `TimeField`. Route: inline
  (one condition and its tests). Verify on the API 35 emulator.
- [x] T6 iOS and Android "Due date" uses `DateTimePicker` (`mode="date"`) with an "Add date" button when empty, tests
  first; desktops and the web keep the `DatePicker` calendar. Route: delegated writer (`ui/field.tsx`, the task sheet,
  several test files). Verify on the iOS Simulator and the API 35 emulator (parent).

## Acceptance criteria

- `make check` and `make test` pass.
- On the iOS Simulator and the Android emulator the due time is the system picker and a pick reaches the saved task;
  desktops and the web keep `TimeField`.

## Progress / evidence

- 2026-11-18: branch created from `chore/nsh-0.6.0` at 5fdded8.
- T2 (delegated writer): `ui/time-picker.tsx` now renders `DateTimePicker` (`mode="time"`, `testID="form-time-native"`,
  `accessibilityLabel="Due time"`) when `platform.os === "ios"` (the `platform` export of `nsh`), else the unchanged
  `TimeField`. The tint is dropped (no prop; the picker uses the system accent). The crate's `TimePicker.available`
  stub tests are gone; `TimePicker.test.tsx` has two tests (Android keeps the TimeField; iOS shows no TimeField
  segments, "Due time" label present).
  - RED: `make test` 114 tests, 113 passed, 1 failed: `TimePicker.test.tsx > on iOS the due time is the native
    DateTimePicker, not the TimeField` (`expected false to be true` for `shows("id:form-time-native")`; the screen still
    showed "09", ":", "00"). After the implementation the same assertion still failed: headless draws no native control,
    so `id:form-time-native` is not findable. That assertion was removed (not observable headless); the rest of the
    test failed RED first on the TimeField segments.
  - GREEN: `make check` ok; `make test` 114 tests, 114 passed; `make ios-crate` ok.
  - Headless limits: `DateTimePicker` renders nothing findable or readable and there is no `app.*` driver to change it,
    so a pick reaching the form or the saved task is verified on the simulator (T4), not here.
  - Files: `ui/time-picker.tsx`, `TimePicker.test.tsx`, this document.
- T3 (same delegated writer): removed `rust/src/time_picker.rs`, `rust/src/time.rs` (with its 7 unit tests), the
  `TimePicker` module, the `#[native_components(ios)]` registration and `TimePicker.available()` from `rust/src/lib.rs`.
  `Cargo.toml`: dropped `objc2-ui-kit`, `objc2-core-foundation`, `nsh-platform-ios` and `serde_json` (only the picker
  used them; `ios.rs` still uses `objc2`, `objc2-foundation`, `objc2-core-location`, `futures-channel`, kept) and the
  `NSDate`/`NSTimeZone` features of `objc2-foundation`. `Cargo.lock` regenerated by the build (-973/+25 lines, mostly
  `nsh-platform-ios`'s tree). `db` and `Location` untouched.
  - GREEN: `make check` ok; `make test` 107 tests, 107 passed (114 minus the 7 removed `time` tests); `make ios-crate`
    ok (builds and packages `dist/ios-crate-sim/NSH Todo.app`; only warning is the existing placeholder app id);
    `cargo build --target aarch64-apple-ios-sim` in `rust/` compiles clean.
- T4 (parent, inline): iOS 26.5 Simulator, `make ios-crate` build of 2ff7fd6. On a throwaway task (inserted in SQLite,
  removed after), "Due time" shows the system compact capsule (09:00, system accent, no tint); tapping it opens the
  24-hour wheels; picking 10:01 updates the capsule, Save stores `time = 10:01` in `todo.sqlite` and the list row shows
  "Nov 18, 2026 10:01". Android API 35 emulator, `make package-android`: the New Task sheet's "Due time" still shows
  the TimeField ("09 : 00"); nothing saved. Not checked: a 12-hour device setting, a physical device.
- T5 (parent, inline, strict TDD): `TimePicker.test.tsx` runs the native-picker test for `ios` and `android` and adds
  a desktop (`macos`) test that keeps the TimeField.
  - RED: `nsh test TimePicker.test.tsx` 3 tests, 2 passed, 1 failed: `on android the due time is the native
    DateTimePicker, not the TimeField` (`expected true to be false`, the TimeField still shown). The desktop test passed
    from the start (it guards the fallback).
  - GREEN: `ui/time-picker.tsx` condition `platform.os === "ios" || platform.os === "android"`; 3/3; `make check` ok;
    `make test` 108/108.
  - Device: API 35 emulator, `make package-android`. "Due time" shows the system field ("9:00 AM", the emulator's
    12-hour format); it opens the system clock dialog; picking 3:15 PM shows "3:15 PM" and, saved, the list row shows
    "Nov 19, 2026 15:15", so the value stays 24-hour "HH:MM" under a 12-hour device setting. The throwaway task was
    deleted afterwards.
- T6 (delegated writer, strict TDD): `ui/field.tsx` `DateRow` shows `DateTimePicker` (`mode="date"`, `testID="form-due-native"`,
  `accessibilityLabel` = the row label) in a row like "Due time" on iOS and Android (`hasNativePicker()`, exported from
  `ui/time-picker.tsx` and reused there), with an "Add date" `TextButton` (`testID="form-add-date"`) that sets today
  (`today()` from `store.ts`, passed as a `today` prop from `sheets/TaskSheet.tsx`) while the date is empty. Desktops and
  the web keep the `DatePicker` calendar unchanged. New `DueDate.test.tsx` (5 tests).
  - Headless default platform: `ios` (an `open()` without `platform`).
  - RED (`nsh test DueDate.test.tsx`, 5 tests, 1 passed, 4 failed): `on ios`/`on android` "empty due date shows Add
    date" (`expected false to be true`) and "Add date sets today and the task is saved" (`no pressable view matches
    id:form-add-date`); the macOS calendar test passed from the start (guards the fallback). After implementing, 2 of
    the 4 still failed because my test pressed `id:form-due`, which is not pressable on mobile (the row is not a
    trigger there); that step became `shows("id:form-due")`.
  - Adapted tests: `App.test.tsx`: the 3 tests that pick a given day (`a task is edited through its sheet`, `filters
    narrow...`, `the settings name greets...`) now launch with `platform: "macos"` (`launchDesktop`), same assertions;
    on macOS the tab bar's "Home" text collides with the category "Home", so `addTask` presses the category as
    `role:option[<name>]` (same intent, as the filter test already does). `TimePicker.test.tsx` `openDueTime` presses
    `id:form-add-date` when shown (iOS, Android) else picks day 20 on the calendar (macOS); its assertions are unchanged.
  - GREEN: `make check` ok; `make test` 113 tests, 113 passed; `make ios-crate` ok; `make package-android` ok.
  - Not verifiable headless: `DateTimePicker`'s `onChange` (picking another date) and the native look; device
    verification (iOS Simulator, API 35 emulator) is the parent's.
  - Files: `ui/field.tsx`, `ui/time-picker.tsx`, `sheets/TaskSheet.tsx`, `DueDate.test.tsx`, `App.test.tsx`,
    `TimePicker.test.tsx`, this document. Commit: see `git log` (feat(tasks): use NSH's DateTimePicker for the due date).
- T6 device checks (parent, inline), builds of 7db0903:
  - iOS 26.5 Simulator: the New Task sheet shows "Due date: Add date" and no time row; "Add date" shows the compact
    capsule with today ("Nov 18, 2026") plus the "Due time" row and "Remove Due Date"; the capsule opens the system
    calendar; picking the 25th updates it and Save stores `due = 2026-11-25`. Editing that task shows the picker at
    once, and "Remove Due Date" brings "Add date" back. The throwaway task was deleted afterwards.
  - Android API 35 emulator: "Add date" shows the system field with today; it opens the system date dialog; picking
    the 26th and Save shows "Nov 26, 2026" in the list. The throwaway task was deleted afterwards.
  - Seen, not fixed (NSH): on iOS the capsule of an existing task first shows the short format "11/25/26", while a
    picked date shows "Nov 25, 2026"; the picker's width at first layout seems to decide the style.
  - Follow-up commit 9994e39 (style): re-indented the `DatePicker` fallback in `ui/field.tsx` (no behaviour change).
