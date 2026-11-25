# Feature: native-time-picker

Locator: `odd/tasks/native-time-picker.md` · Engram mirror: `odd/native-time-picker/tasks`

## Objective

On iOS, the task form's "Due time" uses the system time picker (`UIDatePicker`, time mode, compact
style: the iOS button that opens the wheels), as the Exact app does, instead of NSH's segmented
`TimeField` with the number pad. Other platforms keep `TimeField`.

## Problem / why

NSH 0.5.0 has no native date or time picker (no `UIDatePicker` in its crates): `DatePicker` and
`TimeField` are drawn by NSH. The user wants the native iOS control. NSH lets the app's own Rust crate
register native components on iOS (`website/docs/native-components.md`, "Registering from the app's
crate"); TSX uses them through `nativeComponent` (`website/modules/nsh.md`, "nativeComponent and
nativeModule").

## Scope

- A native component (e.g. `nshtodo.timePicker`) registered by the crate on iOS (`#[native_components(ios)]`):
  a `UIDatePicker` with `datePickerMode = .time`, `preferredDatePickerStyle = .compact`, 24-hour value in and
  out as `"HH:MM"` (prop `value`, event `change`), tinted with the app's primary colour if the API allows,
  reporting its natural size.
- TSX: the "Due time" row uses the native component on iOS and `TimeField` elsewhere, and wherever the
  component is not registered (headless tests, dev host without the crate, Android, desktop, web).
- Out of scope: the date (`DatePicker` calendar), Android's `TimePickerDialog`, the Rust app (`../nsh_rust`).

## Constraints

- Branch `feat/native-time-picker` from `feat/nsh-geolocation` (8a5ad96), which has the crate (`rust/`).
- NSH 0.5.0; objc2 0.6 family, as the location module uses. Artifacts in English.

## TDD

- Mode: strict, enabled. Source: user global instructions. Runner: `make test` (`nsh test`; it builds the
  crate and runs `cargo test` for Rust unit tests in `rust/`, then the TSX tests).
- Tests first: the `"HH:MM"` conversion helpers in Rust; in TSX, the row picks the native component on iOS
  and `TimeField` elsewhere, and a `change` from the native side updates the form value.
- RDD: off (global).

## Tasks

- [x] T1 Branch and this document. Route: inline (mechanical).
- [x] T2 Native `UIDatePicker` component in the crate and the TSX row, tests first. Route: delegated writer (Rust objc2 + TSX, several non-trivial files). Commit 3c19b13.
- [x] T3 Verify on the iOS 26.5 Simulator (native compact picker opens, value saved and shown in the task row) and that Android still shows `TimeField`. Route: inline per-action.

## Acceptance criteria

- `make check` and `make test` pass.
- On the iOS Simulator the due time shows the system compact picker; picking a time updates the form and the
  saved task; other platforms unchanged.

## Progress / evidence

- 2026-11-15: branch created from `feat/nsh-geolocation` at 8a5ad96.

- T2 (3c19b13), strict TDD, runner `make test`:
  - RED 1: Rust `time::tests` (parse/format) with `unimplemented!()` stubs: 4 failed ("not implemented"); TSX
    `TimePicker.test.tsx` native-branch test failed (`expected false to be true`, TimeField segments still on screen).
  - GREEN 1: parse/format implemented, 4 Rust tests pass. RED 2: `to_timestamp`/`from_timestamp` tests, 3 failed.
  - GREEN 2: all 7 Rust unit tests pass; TSX native branch implemented. Final `make test`: 32 tests, 32 passed
    (21 existing + 4 `TimePicker.test.tsx` + 7 Rust). `make check` ok. `make ios-crate` ok (16.9 s wall, release
    runner for the simulator; `nshtodo.timePicker` and `NSHTodoTimePickerTarget` are in the binary). Not run: any
    simulator or device (T3).
  - Files: `rust/src/time.rs` (pure helpers + tests), `rust/src/time_picker.rs` (iOS component), `rust/src/lib.rs`
    (`#[native_components(ios)]`, `TimePicker.available()`), `rust/Cargo.toml` (+ `Cargo.lock`), `ui/time-picker.tsx`,
    `sheets/TaskSheet.tsx`, `TimePicker.test.tsx`.
  - Decision, registration detection: NSH has no "is registered" API for a component. The crate exports
    `TimePicker.available()` (`cfg!(target_os = "ios")`); the TSX control reads it through `nativeModule` and falls back
    to `TimeField` when it is false or the module is missing (an embedding host loading a plain bundle, Android,
    desktop, web, and the headless runner, which runs on macOS even with `platform: "ios"`). Tests stand it in with
    `modules: { "nshtodo/native": { "TimePicker.available": true } }`.
  - Decision, 24-hour handling: the picker's `timeZone` is GMT and its date is the time of day on 1970-01-01, so the
    `"HH:MM"` value is independent of the device zone and 12/24-hour setting; only what the picker displays follows the
    device locale. An invalid or empty `value` leaves the picker as it is (the default 09:00 is the TSX's).
  - Decision, tint: simple, so done. TSX passes prop `tint` (theme.json primary, light `#c2410c` / dark `#e8692e`, by
    `colorScheme()`); Rust parses it with `nsh_core::Hsla::parse_hex` into a `UIColor`. The hex values are duplicated
    from theme.json.
  - Size: `intrinsicContentSize` (fallback `systemLayoutSizeFittingSize`) reported after each value change.
  - Gap: the headless harness cannot emit native events and the native component has no size there, so the
    native `change` -> form value path and the picker's layout are only verifiable on a simulator (T3).

- T3 (parent, 2026-11-15, iOS 26.5 Simulator, iPhone 17 Pro, `make ios-crate-run`): after "Add time" the row shows
  the system compact picker (grey pill, 09:00); a tap opens the native wheels popover (24-hour columns, value in the
  primary tint); picking 11:01 updates the pill; saving lists the task as "Nov 15, 2026 11:01"; reopening the task
  (Edit Task) shows 11:01 in the picker; dark mode renders the system dark pill. Android not run on the emulator:
  its fallback to `TimeField` is covered by the headless test on a non-iOS platform and by `TimePicker.available()`
  being `cfg!(target_os = "ios")`.

## Next step

Done. Possible follow-ups: the due date as a native compact `UIDatePicker` (date mode); Android `TimePickerDialog` through the Gradle host; the same component in `../nsh_rust`.
