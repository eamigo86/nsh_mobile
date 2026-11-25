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

- [x] T1 Branch `feat/nsh-geolocation` from `feat/nsh-todo` (f77b201); this document. Route: inline (mechanical).
- [x] T2 TSX location row with tests first; iOS host project with the Swift bridge; Makefile targets; embed libraries fetched. Route: delegated writer (several non-trivial files, Xcode project).
- [x] T3 Android host project with the Kotlin bridge. Route: delegated writer (same writer, Gradle project).
- [x] T4 Verify on the iOS Simulator and the Android emulator with a simulated position; measure lines per platform, build times, app sizes and the dev loop (hot reload through `nsh dev`). Route: inline per-action. Evidence below (T4).
- [x] T5 (added 2026-11-14 at the user's request) iOS through the app's own Rust crate instead of the Xcode project: a `#[module]` on CoreLocation in the crate, packaged by `nsh package --target ios`; TSX uses it where present and `host.call` elsewhere (Android host unchanged). Verify on the simulator; measure crate lines, first and incremental builds, test time, .app size (stripped), the TabBar look, and TSX hot reload with `nsh run --target ios`. Route: delegated writer, then parent verification.

## Acceptance criteria

- `make check` and `make test` pass (12 existing tests plus the new ones).
- On the iOS Simulator and the Android emulator, the Settings row shows the simulated position
  after the permission is granted, and a clear message when it is denied.
- The cost is recorded: lines of TSX, Swift and Kotlin, project files, build times, sizes.

## Delivery

- Forecast: about 600 to 900 authored lines, most of them project files. Local branch only;
  no push or pull request planned.

## Progress / evidence

- 2026-11-14: branch created from `feat/nsh-todo` at f77b201.

- T2 (fe83959), route: delegated writer. Strict TDD, runner `make test`.
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
- T3 (d8bbec2), route: same writer. AGP 9.5.1 (Kotlin built in, no kotlin plugin), Gradle 9.8.0 wrapper committed,
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

- T4 (parent, 2026-11-14), route: inline per-action.
  - iOS 26.5 Simulator (iPhone 17 Pro), position set with `xcrun simctl location booted set 40.41680,-3.70380`:
    the system prompt shows the usage text; "Don't Allow" -> "Location permission denied. Allow it in the system
    settings."; after `simctl privacy grant location` -> "Latitude 40.41680 / Longitude -3.70380 / Accuracy 5 m".
    The embedded app's TabBar draws as the iOS 26 floating capsule here (the `nsh package` app showed the classic bar).
  - Android API 35 emulator (Pixel 9 Pro XL), `adb emu geo fix -3.70380 40.41680`: "Don't allow" -> denied message;
    after `pm grant` -> same position, accuracy 5 m; location turned off (`cmd location set-location-enabled false`) ->
    "Location services are off. Turn them on and try again."
  - Dev loop: `nsh dev App.tsx --server-only` with both hosts started by `make ios-host-run DEV=1` and
    `make android-host-run DEV=1`: an edit to `pages/Settings.tsx` showed on both devices without a rebuild
    ("rebuilt App.tsx (12ms), 2 devices"; seen on the emulator 2.1 s after the save, polling included), and each kept
    its current tab.
  - Release APK: AGP 9.5.1 could not strip `libnsh.so` ("Unable to strip the following libraries") because its default
    NDK is not installed: 192M unsigned. Pinning `ndkVersion = "28.0.13004108"` (installed) strips it: 132M
    (arm64-v8a 49M, x86_64 54M, armeabi-v7a 33M), release build 6.5 s incremental, 24.8 s first. `nsh package` made
    an 82.5 MB APK of the same app before. Debug APK 215M (nsh-dev.aar keeps symbols); debug build still passes
    (`make android-host` 2.2 s incremental).
  - `make check` clean, `make test` 18/18 after the pin.

- T5 (6a97776), route: delegated writer. Strict TDD, runner `make test`. Parent verification on devices pending (T5 not ticked).
  - Crate: `rust/` (`nsh.json` `"rust": "rust"`), set `nshtodo/native` with `#[module] Location` and `pub async fn current() -> Result<Position, String>`
    (`Position` is `#[derive(JsObject)]`, so TS gets `Promise<Position>` and a rejection carries the `Err` text). NSH async module functions are
    supported: they run on the engine thread, so `ios.rs` hops to the main thread with `run_on_main_thread` for CoreLocation and gets the answer
    back through a `futures-channel` oneshot. iOS only (`cfg(target_os = "ios")`): objc2 0.6, objc2-foundation 0.3, objc2-core-location 0.3
    (the last one fetched from crates.io), a `define_class!` delegate (`NSHTodoLocationDelegate`) with the same flow as `LocationBridge.swift`
    (disabled -> "disabled", When-In-Use request, denied/restricted -> "denied", one `requestLocation`, one fix answers all waiting calls).
    Other targets compile `Err("unavailable")`. `cargo check --target aarch64-apple-ios-sim` and both packages compile first time.
  - `nsh.json`: `ios.infoPlist.NSLocationWhenInUseUsageDescription` (same text as the Xcode host). The capabilities needed no change on paper:
    NSH's docs say a registered Rust function is the host's own code and the capability sandbox does not apply to it (`modules/nsh.md`,
    nativeModule); not exercised on a device yet, so the grant question stays open until the parent runs it.
  - TSX: `location.ts` calls `nativeModule("nshtodo/native").Location.current` when the set is registered; the "unavailable" error (any
    platform without the bridge, including `nsh dev` on this Mac and `nsh test`) and a `ReferenceError` (a host whose runtime has no crate: the
    Android Gradle host, the Xcode iOS host) both fall through to `host.call("location.current")`. `nativeModule` is used instead of
    `import { Location } from "nshtodo/native"` so that a bundle running where the crate is absent still loads. Checked: a copy of the app
    without `"rust"` in `nsh.json` runs the 18 earlier tests green (only the 2 crate stand-in tests fail there, as expected), and `nsh build`
    for the Android host still emits a plain bundle (`make android-host` exit 0, `make ios-host` exit 0).
  - RED (3 new tests, `location.ts` still host-only): `error 21 tests: 19 passed, 2 failed`
    (`the Rust crate's position is shown and the host is not asked`: `expected false to be true`, screen showed the host's
    `Latitude 1.00000`; `a denied permission in the Rust crate is explained`: ``id:location-message` showing never happened in 5000 ms``;
    the fallback test passed because it already was the old behavior). GREEN: `21 tests: 21 passed, 0 failed (5.7s)`; `make check` clean.
    Stand-ins: `open(..., { modules: { "nshtodo/native": { "Location.current": async () => ... } } })` replace `nativeModule`'s functions too.
  - Authored lines: Rust 174 (`ios.rs` 132, `lib.rs` 42) + `Cargo.toml` 17 (+ lockfile); TSX `location.ts` +43/-8 (61 total), tests +40;
    `nsh.json` +6; Makefile +18. Against T2/T3: Swift 142 + Kotlin 132 + about 350 lines of Xcode and Gradle project files.
  - Builds (`/usr/bin/time -p`, real): `nsh package --target ios-simulator --out dist/ios-crate-sim` first release build of the crate (crates
    downloaded, deps never built for iOS release) 71.7 s; after a one-line Rust edit 2.0 s (reverted, rebuilt 1.5 s). Device,
    `nsh package --target ios --out dist/ios-crate`: first attempt failed to link (`___chkstk_darwin` undefined: the C dependencies, onig and
    QuickJS, are built with the current SDK, but rustc's default device deployment target is iOS 10); with `IPHONEOS_DEPLOYMENT_TARGET=15.0`
    it exits 0 in 57.1 s, an unsigned `.app` (the Makefile's `ios-crate-device` sets it). `make check` first run 40 s (builds the crate for
    the descriptions), then 0.3 s. `make test`: first run with the crate 63.8 s (builds the headless runner with the crate), then 5.7 to
    6.6 s for 21 tests; T4 had 18 tests in 2.1 s, so `nsh test` now builds and loads the crate and a run is about 3x slower.
  - Sizes: simulator `.app` 59M, `NSHTodo` 61.8 MB as built, 48.4 MB after `xcrun strip -x -S` on a copy; the baseline `dist/ios-sim`
    (`.app` 45M) is 47.6 MB, the same after strip (it ships stripped). So the crate adds 0.74 MB (+1.6%) and the unstripped 14 MB is symbols
    that the Rust release runner keeps. Device `.app` 59M, 61.85 MB as built, 48.38 MB stripped.
  - Toolchain: no `rustup target add` was needed (`aarch64-apple-ios` and `aarch64-apple-ios-sim` were installed); the first `nsh init` in the
    scratch directory made rustup update the stable toolchain to 1.100.0.
  - Not verified: any run on a simulator or device (permission prompt, denied, a fix, the usage text from the packaged `Info.plist`, the
    capability question above), `nsh run --target ios` with the crate, hot reload of TSX there, a signed `.ipa`, the macOS `nsh dev` path
    for the crate (it answers "unavailable" and falls back).

## Findings

- The bridge itself was small: one `host.call` contract, 32 lines of TSX plumbing, about 140 lines each of Swift and
  Kotlin, and permission, denied and disabled states on each side.
- The larger cost is structural: leaving `nsh package` for an Xcode project and a Gradle project per app
  (hand-written pbxproj, wrapper, AGP and NDK versions, signing, store packaging), about 350 lines of project files,
  and ~310 MB of embed libraries to fetch per version.
- `host.call` must be granted in `nsh.json`, and declaring `capabilities` then restricts everything else
  (`statusBar` had to be listed too).
- Hot reload from `nsh dev` keeps working in both embedding hosts.
- Sizes grow: iOS .app 72-75M (46.6 MB packaged before), Android APK 132M with 3 ABIs once stripped (82.5 MB before).
- Not verified: Android API 26-29 fallback (`requestSingleUpdate`), a real device, store-signed builds, and the exact
  error text a real host gives for an unhandled name (covered by a test with a stand-in).

- Size check (parent, 2026-11-14): the iOS host links NativeShell statically and `xcodebuild build` keeps symbols.
  Release binary 75 MB as built, 49 MB after `strip -x -S`, against 45 MB for the `nsh package` simulator binary
  stripped the same way (+9%). The `nsh package` APK holds 2 ABIs (arm64-v8a, armeabi-v7a; 79 MB on disk), the host
  APK 3: without x86_64 (54 MB) the host APK is about 78 MB. Store builds (archive, App Bundle) strip and split, so
  the ~60% growth seen in local builds is mostly symbols and the emulator ABI.

- T5 parent verification (2026-11-14, iOS 26.5 Simulator, iPhone 17 Pro):
  - Packaged crate app (`make ios-crate-run`): the system prompt shows the usage text from `nsh.json`'s
    `ios.infoPlist`; "Allow While Using App" resolves the waiting call with 40.41680 / -3.70380, accuracy 5 m;
    after `simctl privacy revoke` -> the denied message. No capability grant was needed for the crate module.
  - TabBar: the crate app draws the iOS 26 floating capsule; the earlier `nsh package` app without a crate
    (`dist/ios-sim`) draws the classic bar. `vtool -show-build`: without a crate the runner is the prebuilt one,
    linked against SDK 18.5 (iOS runs it in compatibility mode); with a crate `nsh package` links it here against
    SDK 27.2. The look follows the SDK the binary is linked with (the Xcode host links here too), not the crate.
  - Dev loop: `nsh run --target ios` built the crate and the development host for the simulator in 49.1 s
    (53 s to connected); a TSX edit reloaded on the device ("rebuilt App.tsx (16ms)"). But the development host
    (`com.longbridge.nsh.host`) does not carry the app's `ios.infoPlist`: CoreLocation logs "attempted to access
    privacy-sensitive data without a usage description" and the call never settles (the button stays busy).
    Location can be tried only in the packaged app, not in the hot-reload host. The bridge also has no timeout.
  - Toolchain side effect (writer): `nsh init` in a scratch folder made rustup update `stable` to 1.100.0.
- [x] T5 ticked after this verification.

## Findings (T5)

- The crate path keeps the stock CLI (`nsh package`, `nsh run`) and adds 174 lines of Rust (objc2 delegate),
  0.74 MB to the stripped binary (+1.6%), a 72 s first release build and 2 s incremental ones.
- Costs: `nsh test` now compiles and loads the crate (21 tests in 5.7-6.6 s instead of 18 in 2.1 s; 64 s the first
  time); a device package needs `IPHONEOS_DEPLOYMENT_TARGET=15.0` to link; the hot-reload host cannot use APIs that
  need Info.plist keys; Android still needs the Gradle project.
- Compared with the Xcode host: less project machinery on iOS (no pbxproj, no embed download for iOS), but
  Objective-C bindings from Rust instead of Swift, and no device API testing in the hot-reload loop.

## Next step

Done. Open: a timeout or Info.plist check in both bridges so a missing usage key fails instead of hanging.
