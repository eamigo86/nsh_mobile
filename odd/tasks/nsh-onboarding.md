# Feature: nsh-onboarding

Locator: `odd/tasks/nsh-onboarding.md` · Engram mirror: `odd/nsh-onboarding/tasks`

## Objective

Add an animated splash screen, a skippable first-launch onboarding with vector illustrations,
a Settings entry to see the onboarding again and a Settings appearance option (dark mode) to
the NSH Todo app, on iOS and Android. The same features go into the Exact Todo app
(`../exact_mobile`, branch `feat/exact-onboarding`) to compare how well each framework does it:
quality, lines of code, difficulty and limitations (2026-11-16 request).

## Scope

- Brand: one logo designed for this comparison (`assets/brand/`): a warm orange tile with a
  paper sheet and a check mark. The same SVG masters are used in both apps.
- Native launch: the logo as the app icon (`icon` in `nsh.json`). NSH 0.5.0 has no launch-screen
  or splash key (`nsh package` writes an empty `UILaunchScreen`), so the native launch is what
  NSH generates; record what each platform shows. Our own native hosts (`native/`) are out of
  scope for this feature.
- In-app animated splash right after the native launch: the logo pops in, the check mark draws,
  the app name fades in, then the splash gives way to onboarding or the tabs (about 1.5 s,
  shorter with reduced motion).
- Onboarding: 4 steps, each a flat SVG illustration with a short title and one line of text.
  Skip on every step, Next, page dots, swipe, "Get started" on the last step. Shown on first
  launch only (persisted flag).
- Settings: "Show onboarding again" opens it. Appearance: System, Light or Dark, persisted and
  applied at launch.
- Out of scope: macOS, desktop and web checks, the native hosts, localisation, `../nsh_rust`.

## Constraints

- NSH 0.5.0 (f4d68f7); sources and docs at `~/.cargo/git/checkouts/nsh-9218b667fc8c8325/f4d68f7`
  (`website/docs`). Commands through the Makefile.
- Keep `make check` and `make test` green.
- Artifacts in English. Conventional commits, no attribution lines, no push.

## TDD

- Mode: strict, enabled. Source: user global instructions. Runner: `make test` (`nsh test`; it
  also builds the crate and runs `cargo test` in `rust/`).
- RDD: off (global).

## Tasks

- [x] T1 Branch `feat/nsh-onboarding` from `feat/native-time-picker` (d30e022); this document. Route: inline (mechanical).
- [ ] T2 Brand: logo and icon assets, app icon in `nsh.json`; record the native launch on each platform. Route: delegated writer (T2-T4, one writer, trigger: 2+ non-trivial files).
- [ ] T3 Animated in-app splash and the 4-step onboarding, tests first. Route: delegated writer.
- [ ] T4 Settings: "Show onboarding again" and Appearance (System/Light/Dark, persisted, applied at launch), tests first. Route: delegated writer.
- [ ] T5 Verify on the iOS Simulator and the Android emulator (packaged apps): first launch, skip, reopen, theme switch in light and dark; screenshots; lines of code. Route: inline per-action.

## Acceptance criteria

- `make check` and `make test` pass with the new tests.
- First launch shows the animated splash, then onboarding; Skip or Get started lands on the
  tabs; the next launch goes from the splash straight to the tabs, with no onboarding flash.
- Settings reopens onboarding; the appearance choice changes the app at once and survives a
  relaunch.
- Checked on the iOS Simulator and the Android emulator in light and dark.

## Delivery

- Forecast: about 300-400 authored lines. Strategy: `ask-on-risk`. Local branch only; no push or
  pull request planned.

## Progress / evidence

- T1: branch created from d30e022.

## Findings for the comparison

Factual log, NSH 0.5.0 (f4d68f7). "Verified" means observed in this work; "from source" means read in the NSH sources or docs and not run on a device.

### Brand and native launch (T2)

- `icon` in `nsh.json` takes one square PNG (`assets/brand/icon-1024.png`, 1024x1024, has an alpha channel). First time, no workaround; `make check` passes. Verified: it is accepted. The packaged results are listed under the packaging builds below.
- iOS (from `crates/nsh-cli/src/package.rs`): the icon goes through `actool` into `Assets.car`; `nsh package` always writes an empty `UILaunchScreen` dict ("opts into the full screen"). An empty dict means the system draws the launch screen as a plain `systemBackground` fill (white in light, black in dark), with no logo and no colour of our own. `ios.infoPlist` is merged over NSH's defaults, so a `UILaunchScreen` of our own (`UIColorName`, `UIImageName`) is technically allowed (only the keys listed in the docs table are reserved; `UILaunchScreen` is not), but `UIColorName` needs a named colour in an asset catalog and `UIImageName` an image in the bundle, and NSH only builds a catalog for the icon. So a launch colour cannot be set from `nsh.json` alone; not tried, because it also needs resources NSH does not ship. `appearance` sets `UIUserInterfaceStyle`, which does fix the launch screen's scheme, but it is fixed at package time and would defeat the in-app System option.
- Android (from `android.rs`): the icon is resized to 192x192 into `mipmap-xxxhdpi/ic_launcher.png`, a plain legacy icon (no adaptive icon, no foreground/background layers, no monochrome layer, no mask), so launchers draw it as a square or in their own shape with no safe zone. The activity theme is `@android:style/Theme.Material.Light.NoActionBar`, or the dark one only when `appearance` is `"dark"` at package time: the launch window follows the package-time setting, not the system, so a device in dark mode can show a light window before the first frame. Nothing in `nsh.json` sets `windowBackground`, a splash icon or `windowSplashScreen*` attributes. Android 12+ draws its system splash (icon on the theme background) regardless.
- Consequence: the first frame the user sees is the system's plain screen (no logo); the in-app animated splash starts after the runtime has loaded. The native hosts in `native/` could change this but are out of scope.
