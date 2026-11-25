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

- [x] T1 Branch `feat/nsh-onboarding` from `feat/native-time-picker` (c36e4f1); this document. Route: inline (mechanical).
- [x] T2 Brand: logo and icon assets, app icon in `nsh.json`; record the native launch on each platform. Route: delegated writer (T2-T4, one writer, trigger: 2+ non-trivial files).
- [x] T3 Animated in-app splash and the 4-step onboarding, tests first. Route: delegated writer.
- [x] T4 Settings: "Show onboarding again" and Appearance (System/Light/Dark, persisted, applied at launch), tests first. Route: delegated writer.
- [x] T5 Verify on the iOS Simulator and the Android emulator (packaged apps): first launch, skip, reopen, theme switch in light and dark; screenshots; lines of code. Route: inline per-action.

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

- T1: branch created from c36e4f1.
- T2 (49e5881): `icon` set to `assets/brand/icon-1024.png` (1024x1024); the masters are in `assets/brand/`. No behaviour to test (config only). `make check`: pass.
- T3 (0fe5161): RED first: `make test` after writing `Onboarding.test.tsx`: 9 of the 10 new tests failed (`no view matches id:onboarding-steps`, `expected false to be true` on `id:splash`, `expected undefined to be false` for `parseSaved(...).onboarded`; the tenth, an old save counts as onboarded, passed because nothing existed yet). Then 32 existing tests failed after the implementation (they open the app with empty storage and now meet the splash), so fixtures were adapted (below). GREEN: `make test`: 42 passed, 0 failed. `make check`: pass.
- T4 (687f0f5): RED first: `Appearance.test.tsx` 8 of 8 failed (`no pressable view matches id:appearance-dark`, `id:onboarding-again`; `expected undefined to be "system"`). GREEN: `make test`: 51 passed, 0 failed (22 s). `make check`: pass.
- Test fixtures: `testing.ts` (`launchApp`) opens the app as a returning user (`{"onboarded":true}` in storage) with `reducedMotion`, waits for `id:splash` to be gone; `App.test.tsx`, `Location.test.tsx`, `TimePicker.test.tsx` now use it (about 20 changed lines in total). Test files keep their own scenarios.
- Storage decision: the two new values live in the existing `exact-todo` blob (`onboarded`, `appearance`) rather than separate keys: one read at launch (the splash already waits for it), one write path (`commit`), and `parseSaved` is the single place that defaults them. Old blobs (no `onboarded`) load as onboarded, so existing users do not get the onboarding; no blob (fresh install) is a first launch; an unknown `appearance` is `system`.
- Packaging (no install, no device): `make ios-crate`: built and packaged `dist/ios-crate-sim/NSH Todo.app` (about 40 s incl. the crate; Info.plist has the icon entries `AppIcon`, `Assets.car`, and `UILaunchScreen` as an empty dict). `make package-android`: built `dist/android/NSH Todo.apk` (82.5 MB; it contains `res/mipmap-xxxhdpi-v4/ic_launcher.png` and the six SVGs under `assets/nsh/assets/assets/brand/`); it exceeded 2 minutes the first time (cold Rust build for the Android targets), exit 0. `dist/` is not tracked.
- Not verified here (no device or visual run allowed): how the splash, the carousel layout and the dark scheme look and animate on iOS and Android; headless `nsh test` draws nothing.

## Findings for the comparison

Factual log, NSH 0.5.0 (f4d68f7). "Verified" means observed in this work; "from source" means read in the NSH sources or docs and not run on a device.

### Brand and native launch (T2)

- `icon` in `nsh.json` takes one square PNG (`assets/brand/icon-1024.png`, 1024x1024, has an alpha channel). First time, no workaround; `make check` passes. Verified: it is accepted. The packaged results are listed under the packaging builds below.
- iOS (from `crates/nsh-cli/src/package.rs`): the icon goes through `actool` into `Assets.car`; `nsh package` always writes an empty `UILaunchScreen` dict ("opts into the full screen"). An empty dict means the system draws the launch screen as a plain `systemBackground` fill (white in light, black in dark), with no logo and no colour of our own. `ios.infoPlist` is merged over NSH's defaults, so a `UILaunchScreen` of our own (`UIColorName`, `UIImageName`) is technically allowed (only the keys listed in the docs table are reserved; `UILaunchScreen` is not), but `UIColorName` needs a named colour in an asset catalog and `UIImageName` an image in the bundle, and NSH only builds a catalog for the icon. So a launch colour cannot be set from `nsh.json` alone; not tried, because it also needs resources NSH does not ship. `appearance` sets `UIUserInterfaceStyle`, which does fix the launch screen's scheme, but it is fixed at package time and would defeat the in-app System option.
- Android (from `android.rs`): the icon is resized to 192x192 into `mipmap-xxxhdpi/ic_launcher.png`, a plain legacy icon (no adaptive icon, no foreground/background layers, no monochrome layer, no mask), so launchers draw it as a square or in their own shape with no safe zone. The activity theme is `@android:style/Theme.Material.Light.NoActionBar`, or the dark one only when `appearance` is `"dark"` at package time: the launch window follows the package-time setting, not the system, so a device in dark mode can show a light window before the first frame. Nothing in `nsh.json` sets `windowBackground`, a splash icon or `windowSplashScreen*` attributes. Android 12+ draws its system splash (icon on the theme background) regardless.
- Consequence: the first frame the user sees is the system's plain screen (no logo); the in-app animated splash starts after the runtime has loaded. The native hosts in `native/` could change this but are out of scope.

### Splash and onboarding (T3)

- Animated splash: worked first time with `createMotion` per layer (tile scale 0.6 -> 1.06 -> 1 with fade, two lines `scaleX`, name rise) inside one `Animated.parallel`; the per-animation `delay` option makes the timeline without `Animated.delay`. The check mark is drawn as a stroke: a `Canvas` with `setLineDash([L, L])` and an animated `lineDashOffset` (the docs say any `CanvasNumber` can be an animated value, and `lineDashOffset: CanvasNumber` is typed so); no pop-in workaround was needed. Not seen on a device: the drawing is verified only to type check and run headless.
- The logo is four layers: two SVG files (`logo-tile.svg`, `logo-paper.svg`, cut from `logo.svg` by copying its elements), the two lines as plain views with the logo's colour, and the check as canvas path data copied from the SVG. The SVG is static (resvg, no SMIL/CSS animation), so the animated parts had to be rebuilt natively; this is the main cost of animating a logo (about 15 lines of layer geometry).
- Reduced motion: motions land at their end by themselves; `Animated.timing` (the check) had to be skipped by hand (`reduceMotion()`), and the plain fade needs `ignoreReduceMotion: true` or the preset lands at once and shows no fade.
- Gating on storage: no router; the `loaded` state is a signal, the pages mount when the splash starts to fade (so nothing flashes under it), `effect(leave)` waits for both the timer and `isReady()`.
- Onboarding: `Carousel` (nsh/base) did swipe, Next, page dots and the animated scroll with no gestures code; controlled by `index`/`onChange`. The pagination item has `selected:` and `group-selected:` styling, so the wider primary dot is a class. The dot width change uses `LayoutAnimation.easeInEaseOut()` (not verified to animate on a device). Headless `app.drag(..., { x: -300 })` swiped the carousel and `onChange` fired, so swipe is covered by a test. Doc gap: the carousel docs do not say how it looks natively on iOS and Android (it is a native scroll view with snapping; no visual check here).
- Illustrations: `import art from "./x.svg"` and `<Image src={art}>` worked with the 320x240 SVGs as given; sized by style (280x210). NSH draws SVG with resvg on both platforms, so they look the same on iOS and Android by design. `accessibilityElementsHidden` marks them decorative.
- Existing tests: every test that opened the app with empty storage hit the splash (32 failures). One shared helper (`testing.ts`, 13 lines) fixed all; the manual clock plus `waitFor(..., { state: "gone" })` moves the splash without real waiting (full suite 22 s, of which most is the Rust crate build and the real-clock location tests).

### Settings (T4)

- Appearance: `setColorScheme("system" | "light" | "dark")` applies at once (colours are theme tokens; `colorScheme()` drives `glassStyle()`); a segmented row of `Radio` in a `RadioGroup` (nsh/base, unstyled: the look is ours: `checked` state drives the classes). Re-applied at launch after the storage read. Headless proof: `spanStyle(...).color` changes with the scheme, `app.setColorScheme` simulates the system.
- Limit: the in-app scheme does not reach the native launch screens (above), and the iOS launch screen follows the system only when `appearance` is not forced in `nsh.json`. Whether the native `TabBar` and the system sheets follow the forced scheme is not stated in the docs for `TabBar`/`Select` and was not verified; `setColorScheme` documents "alerts, the status bar's default style" as following it.
- "Show onboarding again": one signal (`onboardingOpen`); the same `Onboarding` component is re-created, so it starts at step 1; finishing returns to the page that was open (Settings) because the tab state is kept while the onboarding replaces the shell.
- Settings had no scroll view and grew two cards, so it is now wrapped in `Scroll` (a silent layout risk on small phones if missed). That re-indent shows as 61/24 changed lines in the diff though about 30 are new.

### Lines per area (git diff --stat, authored)

- Art: 8 master SVG files supplied (137 lines, shared with the Exact app) + 2 layer SVGs cut here (13 lines) + 2 PNGs (icon 733 KB, logo 163 KB; the logo PNG is not used by the app).
- Logic and UI (non-test): T3 about 205 added / 11 removed (splash 89, onboarding 57, App 28/8, store 16/1, domain 4/2); T4 about 80 added / 26 removed (Settings 61/24 incl. re-indent, store 13/2, domain 6/2); DESIGN.md 3.
- Tests: T3 114 (new) + 13 (`testing.ts`) + 12 changed in three existing files; T4 90. Total tests: 19 new, suite 32 -> 51.
- Config: `nsh.json` 1 line.

## T5 device verification (2026-11-16)

iPhone 17 Pro Simulator (iOS 26.5, `make ios-crate` package installed with `simctl`) and Pixel 9 Pro XL emulator
(API 35, `make package-android` APK, 82.5 MB), fresh installs. Launches recorded and read frame by frame.

- iOS: the launch screen is the plain system background (white), then the in-app splash plays as designed (tile pop,
  lines, the check drawn on a Canvas, name, fade) and hands over to onboarding. The `Carousel` pages with a native
  finger swipe; Next, Skip, dots and Get started work (no Back button: swipe back). Settings: Appearance is NSH's own
  segmented radio; Dark applies at once (native tab bar and status bar included) and survives a relaunch; the splash
  then plays in dark. "Show onboarding again" opens step 1 and Skip returns to Settings, but the native tab bar is
  mounted again and animates its selection from Home to Settings (about 0.3 s).
- Android: Android 12+ draws its system splash first (white window, the legacy square icon in a circle, about 1.2 s),
  then the in-app splash on the page colour, check draw included. First display 3.9 s on the first launch. The page
  colour runs under the status bar (edge to edge). Swipe, Skip, Settings, Dark and the relaunch work; with Dark chosen
  the system splash stays white (theme fixed at package time) and the in-app splash then animates in dark.
- No layout or safe-area fixes were needed on either platform.

Lines (authored, without art masters and docs): production +275 (splash 89, onboarding page 57, Settings +61/-24,
App +28/-8, store +28/-2, domain +8/-2, nsh.json +1, plus 13 lines of logo layer SVG), tests +229 (Onboarding 114,
Appearance 90, testing helper 13, fixtures in three existing tests).
