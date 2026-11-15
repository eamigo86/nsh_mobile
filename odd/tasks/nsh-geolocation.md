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
- [x] T2 TSX location row with tests first; iOS host project with the Swift bridge; Makefile targets; embed libraries fetched. Route: delegated writer (several non-trivial files, Xcode project).
- [x] T3 Android host project with the Kotlin bridge. Route: delegated writer (same writer, Gradle project).
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

- T2 (7c145be), route: delegated writer. Strict TDD, runner `make test`.
  - RED (before `Settings` had the card): `error 18 tests: 12 passed, 6 failed` with
    `no pressable view matches \`id:location-button\``. GREEN: `18 tests: 18 passed, 0 failed (2.2s)`;
    `make check` clean.
  - Capability: `host.call` is refused unless `nsh.json` lists it (`warn nsh/host: location.current is not granted`;
    the 4 tests that went through the host failed that way). Declaring `capabilities` restricts everything else,
    and the app uses the status bar (`warn the status bar is not granted`), so `nsh.json` now has
    `"capabilities": { "statusBar": true, "host": ["location.current"] }`: the exact host function only, plus what the
    app already used. Storage, Keyboard and the system TabBar needed no grant. iOS host calls
    `grantCapabilities` never (nil: what the app declares).
  - Embed libs: `make embed-libs` (gh release download v0.5.0, `shasum -a 256 -c` OK for both zips) 25.7 s, into
    `native/libs/{ios,android}/nsh-embed-*/` (git-ignored; the zips stay in `native/libs/download`). No `rm` in the target.
  - iOS: `NSHTodoHost` (bundle id `com.example.nshtodo.host`, iOS 15.0 as the framework, arm64 only: the xcframework
    has no x86_64 slice), hand-written pbxproj with a synchronized root group (objectVersion 77), no new tool.
    Debug links NativeShellDev, Release NativeShell through per-config `FRAMEWORK_SEARCH_PATHS` on the slice folder:
    both xcframeworks hold a framework named `NativeShell`, so they cannot be linked together, and an xcframework in
    the Frameworks phase cannot be chosen per configuration. The search path needs quoting (the repo path has a space).
    Bundle: `nsh build App.tsx --release --out native/ios/nsh`, added as a folder reference `nsh`.
  - Build: `make ios-host` = `xcodebuild -project native/ios/NSHTodoHost.xcodeproj -scheme NSHTodoHost -sdk iphonesimulator -configuration Debug CODE_SIGNING_ALLOWED=NO -derivedDataPath native/ios/build build`.
    `/usr/bin/time -p`: clean (derived data deleted, Xcode caches warm) real 5.83 s; no-op 1.56 s; after a Swift edit 1.83 s.
    `.app` Debug (NativeShellDev, 1 arch) 75M; Release (checked once, scratch dir) 72M. Not run on a simulator by the writer.
- T3 (9828f55), route: same writer. AGP 9.5.1 (Kotlin built in, no kotlin plugin), Gradle 9.8.0 wrapper committed,
  compileSdk/targetSdk 36, minSdk 26, `androidx.activity:activity:1.12.4` for `registerForActivityResult`. `debugImplementation`
  nsh-dev.aar, `releaseImplementation` nsh.aar from `native/libs`. Bundle in `app/src/main/assets/nsh`, `loadAssetBundle("nsh")`;
  `--es dev_server ws://...` (make `DEV=1`) connects to `nsh dev`.
  - Permission: manifest declares ACCESS_FINE_LOCATION and ACCESS_COARSE_LOCATION; the runtime request is one
    dialog for concurrent calls. `isLocationEnabled` off -> reject "disabled"; denied -> "denied".
  - Build: `make android-host` = `nsh build` + `./gradlew assembleDebug`. `/usr/bin/time -p`: clean (`build/` deleted,
    Gradle and AGP already cached and downloaded) real 28.88 s; after a Kotlin edit 1.48 s (warm daemon); no-op 0.54 s.
    APK Debug (3 ABIs, nsh-dev.aar) 199M. Not run on an emulator by the writer.
  - Authored lines (no wrapper, no generated): TSX 146 (location.ts 32, Location.test.tsx 62, Settings.tsx +52);
    Swift 142; Kotlin 132; Gradle Kotlin DSL + properties 48; pbxproj/plist/scheme 275; manifest + theme 26;
    Makefile +43; nsh.json +4; .gitignore +9.

## Next step

T4: verify on the iOS Simulator and the Android emulator (parent), then measure the dev loop.
