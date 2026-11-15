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

- Branch `feat/native-time-picker` from `feat/nsh-geolocation` (5f6ba7b), which has the crate (`rust/`).
- NSH 0.5.0; objc2 0.6 family, as the location module uses. Artifacts in English.

## TDD

- Mode: strict, enabled. Source: user global instructions. Runner: `make test` (`nsh test`; it builds the
  crate and runs `cargo test` for Rust unit tests in `rust/`, then the TSX tests).
- Tests first: the `"HH:MM"` conversion helpers in Rust; in TSX, the row picks the native component on iOS
  and `TimeField` elsewhere, and a `change` from the native side updates the form value.
- RDD: off (global).

## Tasks

- [x] T1 Branch and this document. Route: inline (mechanical).
- [ ] T2 Native `UIDatePicker` component in the crate and the TSX row, tests first. Route: delegated writer (Rust objc2 + TSX, several non-trivial files).
- [ ] T3 Verify on the iOS 26.5 Simulator (native compact picker opens, value saved and shown in the task row) and that Android still shows `TimeField`. Route: inline per-action.

## Acceptance criteria

- `make check` and `make test` pass.
- On the iOS Simulator the due time shows the system compact picker; picking a time updates the form and the
  saved task; other platforms unchanged.

## Progress / evidence

- 2026-11-15: branch created from `feat/nsh-geolocation` at 5f6ba7b.

## Next step

T2.
