# NSH Todo

A todo app for iOS and Android built with [NSH](https://github.com/longbridge/nsh) (Native Shell), currently version 0.7.2. The app is written in TSX.

This repository is half of an Exact vs NSH comparison: the same app was built twice, once in each framework. The Exact version lives in [exact_mobile](https://github.com/eamigo86/exact_mobile).

## Features

- Home with a progress ring and an "Up next" list; rows swipe to Complete, Edit or Delete
- Tasks with status filters and a category filter
- New/Edit task sheet with a due date and time
- Categories with colors
- Market tab with a live BTC-USD candlestick chart (Coinbase REST history plus WebSocket ticks)
- Settings: avatar photo, display name, appearance, onboarding replay, current location
- SQLite storage and a first-run onboarding

## Tech stack

- NSH 0.7.2: CLI, runtimes and the `nsh-core` 0.7.2 crate; the embed libraries are fetched at release `v0.7.2`
- TypeScript/TSX for the app; Rust for the app's own crate in `rust/`
- Storage: SQLite (`rusqlite`, bundled) through the crate's `Db` module, imported as `nshtodo/native`. Where the crate is missing (web), data falls back to NSH's `Storage`
- Location: the crate's `Location` module (CoreLocation on iOS)
- Network: `api.exchange.coinbase.com` and `ws-feed.exchange.coinbase.com`, declared in `nsh.json`

## Requirements

- The `nsh` CLI (`make install`, then `make components` for the iOS, Android and web runtimes)
- Xcode for iOS; Android SDK and an AVD for Android (`ANDROID_HOME`)
- Rust toolchain for the crate (the iOS and Android targets build `rust/`)
- Only for the optional embed hosts: `gh` (to download the libraries) and JDK 21 (`JAVA_HOME`) for Gradle

No Node or `package.json` is needed.

## Getting started

```sh
make help         # list every target
make install      # nsh CLI into ~/.nsh
make components   # ios, android and web runtimes
```

Run on iOS with hot reload:

```sh
make ios
```

Run on Android with hot reload:

```sh
make emulator     # AVD=<name> to choose one
make android
```

Other targets: `make dev` (native host on this Mac), `make web`, `make macos`, `make package-ios`, `make package-android`, `make package-web`.

To run iOS through the app's own Rust crate (CoreLocation, no Xcode project): `make ios-crate`, then `make ios-crate-run`.

## Testing

```sh
make check   # type-check the app (nsh check)
make test    # run the *.test.tsx files headless (nsh test)
```

The tests cover the app screens and flows (`App`, `Onboarding`, `Swipe`, `DueDate`, `TimePicker`), appearance, avatar, SQLite storage, location, and the Market page and its data (`Market`, `MarketData`).

## Project structure

```text
App.tsx            root: tabs, splash, onboarding
pages/             Home, Tasks, Categories, Market, Settings, Onboarding
sheets/            task and category sheets
ui/                shared controls (swipe row, ring, candles, time picker, ...)
store.ts           app state (signals) and storage
domain.ts          types and constants
market.ts, feed.ts, market-store.ts   Market logic, socket feed, signals
location.ts        location access
rust/              app crate: SQLite Db and Location (nshtodo/native)
native/            optional iOS and Android embed hosts
theme.json         light/dark tokens
nsh.json           app manifest and capabilities
DESIGN.md          motion and Market design notes
odd/tasks/         development logs
```

The embed hosts are built with `make embed-libs`, then `make ios-host` / `make android-host` and the matching `-run` targets.

## Development notes

[`odd/tasks/`](odd/tasks) holds the feature work logs written during development: objective, tasks, verification and findings for each feature.

Verified so far: the iOS simulator (iOS 26.5, iPhone 17 Pro) and the Android emulator (API 35). No physical device has been tested. The `native/` embed hosts were not rebuilt on 0.6.x or 0.7.x.

Known issue: on Android, NSH does not lift a sheet above the software keyboard (by design since NSH #3154; content pads by `env(keyboard-inset-height)`). The app adds that padding itself through `KEYBOARD_ROOM` in `ui/sheet.tsx`, on Android only. On iOS a sheet is lifted without shrinking and the inset is still reported inside it; this was filed as [longbridge/nsh#3288](https://github.com/longbridge/nsh/issues/3288). Re-check `KEYBOARD_ROOM` and the `Keyboard.dismiss()` calls in `sheets/TaskSheet.tsx` once a release fixes it. See [`odd/tasks/nsh-0-7-0.md`](odd/tasks/nsh-0-7-0.md).

## Status

Experimental comparison project, not production software. Pull requests are not expected.
