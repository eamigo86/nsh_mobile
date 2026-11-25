# Feature: nsh-avatar

Locator: `odd/tasks/nsh-avatar.md` · Engram mirror: `odd/nsh-avatar/tasks`

## Objective

Let the user change their avatar in Settings with a photo from the photo library and show it on
Home as "(avatar) Hello, <name>", on iOS and Android. The same feature goes into the Exact Todo
app (`../exact_mobile`, branch `feat/exact-avatar`) to compare both frameworks (2026-11-16 request).

## Scope

- Settings: tapping the avatar circle, or a "Choose photo" button, opens the system photo picker
  (`Picker.pickImages`, `capabilities.picker`, no permission needed), one image, `maxDimension`
  256 and JPEG. The photo is shown round (`objectFit: "cover"`) and persisted as a JPEG data URI
  under its own `Storage` key (`fs` is not available on iOS or Android). "Remove photo" goes back
  to the initial or the person icon. Cancelling changes nothing.
- Home: the hero card's greeting row shows the avatar (44 pt circle, same fallback) before the text.
  The greeting becomes "Hello, <name>" ("Hello" with no name), as requested; the time-of-day
  salutation goes away.
- Out of scope: camera capture, editing or zooming the crop, desktop and web checks, the native hosts.

## Constraints

- Branch `feat/nsh-avatar` from `feat/nsh-onboarding` (2531972). NSH 0.5.0 (f4d68f7).
- Keep `make check` and `make test` green. Artifacts in English. Conventional commits, no
  attribution lines, no push.

## TDD

- Mode: strict, enabled. Source: user global instructions. Runner: `make test` (`nsh test`;
  `app.onPick` answers picks headless).
- RDD: off (global).

## Tasks

- [x] T1 Branch and this document. Route: inline (mechanical).
- [x] T2 Avatar pick, persist and remove in Settings; avatar and "Hello, <name>" on Home; tests first. Route: delegated writer (2+ non-trivial files: store, pages, tests).
- [x] T3 Verify on the iOS Simulator and the Android emulator (packaged apps): pick, cancel, relaunch, remove, light and dark. Route: inline per-action.

## Acceptance criteria

- `make check` and `make test` pass with the new tests.
- On both platforms a picked photo shows as a round avatar in Settings and on Home, survives a
  relaunch, and Remove photo restores the fallback.

## Delivery

- Forecast: about 120-200 authored lines. Local branch only; no push or pull request planned.

## Progress / evidence

- T1: branch created from 2531972.
- T2 (bb53030, `feat(settings): pick a profile photo and show it on Home`; route: delegated writer):
  - RED: `make test`: `error 58 tests: 51 passed, 7 failed` (6 new avatar tests, `id:avatar` not pressable; the greeting still said "Good afternoon").
  - GREEN: `make test`: `57 tests: 57 passed, 0 failed (28.3s)`. `make check`: pass (no errors). `make ios-crate`: `packaged dist/ios-crate-sim/NSH Todo.app`. `make package-android`: `packaged dist/android/NSH Todo.apk` (about 3 s, no emulator).
  - Diff: 8 files, +210/-25 (tests 94 lines, `ui/avatar.tsx` 41, store 39, Settings 45, Home 12, domain -4).
  - Not covered headless: the pick failure path (a throwing `onPick` handler fails the test step instead of rejecting the app's call; no capability override in `open`). Check on a device.

## Findings for the comparison

- Worked first time: `Picker.pickImages` options (`multiple`, `maxDimension`, `quality`), `app.onPick` returning bytes, `app.picks()`, `Storage.removeItem`, `Image` with a `data:` URI, `btoa`.
- Workaround: `"picker": true` was missing from `nsh.json` capabilities; without it the pick rejects (ERR_ACCESS_DENIED) and the app showed only the generic error. No documentation gap, but the failure is silent unless the rejection is shown.
- Workaround: `btoa` needs a binary string; bytes are converted in 32 KB chunks of `String.fromCharCode`.
- Error fixed: the test `toMatchObject({ quality: 0.8 })` failed, quality comes back as float32 (0.800000011920929); `toBeCloseTo` is not in `nsh/test`'s expectation.
- Error fixed: a throwing `onPick` handler fails the test; the failure path has no headless test.
- No crop API: `maxDimension` only scales. A non-square photo is shown with `objectFit: "cover"` in a square box, so the centre is cropped on screen; the stored JPEG keeps the whole picture.
- Persistence: its own Storage key (`nsh-avatar`), read together with the main entry in the existing `ready` promise; `fs` is not available on iOS/Android.
- iOS/Android differences: none in code; the picker is the system one on both (PHPicker / Photo Picker), no permission. Behaviour on devices is T3.
- Lines per area (authored, with tests): store 39, Settings 45, Home 12, Avatar component 41, tests 94 (new file) plus 1.

## T3 device verification (2026-11-16)

iPhone 17 Pro Simulator (iOS 26.5, `make ios-crate` package) and Pixel 9 Pro XL emulator (API 35, `make package-android`
APK), the same test portrait and sample landscape photos as the Exact check.

- iOS: "Choose photo" opens PHPicker (system blue tint); a landscape photo shows centre-cropped (`objectFit: "cover"`) in
  Settings at once and on Home before "Hello, Ada"; the photo survives a relaunch.
- Android: the system Photo Picker opens (no permission); Settings and Home update at once; the photo survives a
  relaunch.
- No fixes were needed on either platform. Cosmetic: "Choose photo" is a filled pill and "Remove photo" a plain text
  button side by side.

Lines (authored, final): production +120/-24 (store 35, avatar component 41, Settings 33, Home 8, domain 2, nsh.json 1),
tests +90.
