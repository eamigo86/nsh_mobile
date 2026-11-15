# Feature: nsh-geolocation

Locator: `odd/tasks/nsh-geolocation.md` · Engram mirror: `odd/nsh-geolocation/tasks`

## Objective

Spike: add the device's location to the NSH Todo app on iOS and Android, and measure what
integrating one native API costs in NSH 0.5.0, which ships no geolocation module.

## Problem / why

NSH 0.5.0 has no geolocation, NFC, Bluetooth or remote push (checked in its docs and sources at
f4d68f7). Expo Exact ships `@exact/geolocation` for Apple, Android and web. The user asked
(2026-11-14) to measure the cost of building such a bridge in NSH: code per platform, build
times, dev loop, and what has to change in how the app is built.

## Scope

- Settings gets a "Location" row: a button that asks for the current position and shows
  latitude, longitude and accuracy, or why it is unavailable (denied, no host, error).
- One TSX contract on both platforms: `host.call("location.current")` from `nsh`, answered by
  the native app that embeds NSH. The stock `nsh run` hosts have no handler: the row says the
  location is unavailable there.
- iOS: an Xcode project in `native/ios` that embeds NSH with `NativeShell.xcframework`'s
  `NshAppView`, with a Swift bridge on CoreLocation.
- Android: a Gradle project in `native/android` that embeds NSH with `nsh.aar`'s `NshView`, with
  a Kotlin bridge on the platform `LocationManager` (no Google Play services).
- Makefile targets to fetch the embed libraries (release v0.5.0, SHA-256 checked, git-ignored),
  build the bundle, and build and run each native project.
- Out of scope: background location, continuous updates, geofencing, macOS, web.

## Design choice

Both platforms use `host.call` so TSX keeps a single contract. The alternative on iOS, the app's
own Rust crate calling CoreLocation (`nsh init --template mixed`), keeps `nsh package` but needs
Objective-C bindings from Rust and still leaves Android to a Gradle project
(`website/docs/packaging.md`, "Camera, Bluetooth and other hardware"). It is not tried here.

## Constraints

- NSH 0.5.0 (f4d68f7); embed libraries from the v0.5.0 GitHub release
  (`nsh-embed-ios.zip`, `nsh-embed-android.zip`).
- No new global tools (no Homebrew installs). Gradle 9.8 (cached) and JDK 21 are present.
- Keep the 12 existing tests green and `make check` clean.
- Artifacts in English.

## TDD

- Mode: strict, enabled. Source: user global instructions. Runner: `make test` (`nsh test`).
- The TSX side is test-first (host stand-ins). The Swift and Kotlin bridges are verified by
  running them on the simulator and the emulator (no native unit tests in this spike).
- RDD: off (global).

## Tasks

- [x] T1 Branch `feat/nsh-geolocation` from `feat/nsh-todo` (8ce8648); this document. Route: inline (mechanical).
- [ ] T2 TSX location row with tests first; iOS host project with the Swift bridge; Makefile targets; embed libraries fetched. Route: delegated writer (several non-trivial files, Xcode project).
- [ ] T3 Android host project with the Kotlin bridge. Route: delegated writer (same writer, Gradle project).
- [ ] T4 Verify on the iOS Simulator and the Android emulator with a simulated position; measure lines per platform, build times, app sizes and the dev loop (hot reload through `nsh dev`). Route: inline per-action.

## Acceptance criteria

- `make check` and `make test` pass (12 existing tests plus the new ones).
- On the iOS Simulator and the Android emulator, the Settings row shows the simulated position
  after the permission is granted, and a clear message when it is denied.
- The cost is recorded: lines of TSX, Swift and Kotlin, project files, build times, sizes.

## Delivery

- Forecast: about 600 to 900 authored lines, most of them project files. Local branch only;
  no push or pull request planned.

## Progress / evidence

- 2026-11-14: branch created from `feat/nsh-todo` at 8ce8648.

## Next step

T2.
