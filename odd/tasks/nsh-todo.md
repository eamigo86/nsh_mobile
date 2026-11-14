# Feature: nsh-todo

Locator: `odd/tasks/nsh-todo.md` · Engram mirror: `odd/nsh-todo/tasks`

## Objective

Rebuild the Exact Todo app (sibling project `../exact_mobile`) with Longbridge's
Native Shell (NSH, https://github.com/longbridge/nsh): same features, the same
"Warm Paper" Liquid Glass styles where NSH allows, and a Makefile for every command.

## Problem / why

Compare two Rust-based native UI runtimes on the same product. NSH renders native
views (UIKit, Android views) from TSX or Rust, with shadcn-style theme tokens and
`glassEffect` (Liquid Glass on iOS 26+).

## Scope (parity with exact_mobile)

- Tabs (system `TabBar` from `nsh/mobile`): Home, Tasks, Categories, Settings.
- Home: time-of-day greeting with the display name ("Hello" when empty),
  "X of Y done today" with a progress ring, All / Today / Overdue glass tiles
  (overdue number and icon in danger colour), "Up next" (5 earliest open tasks).
- Tasks: status chips (All, Active, Done, Today, Overdue), category filter, rows with
  checkbox, category dot, title, category · due date (red when overdue), swipe or
  long-press delete, edit sheet, floating add button; add sheet with title (required),
  notes, category, due date and time.
- Categories: tinted cards with "N tasks"; add sheet with name (required, duplicates
  refused case-insensitively) and a 6-colour swatch picker; seeds Home (blue), Work
  (violet), Personal (pink).
- Settings: avatar with the initial, display name.
- Persistence across restarts.
- Styles: Warm Paper palette from `../exact_mobile/mobile/app.tamber` as NSH theme tokens
  (light and dark), peach mesh hero, white-tinted glass tiles, terracotta accent.

## Constraints

- Mode: TSX (`nsh init --template ts`): no Rust toolchain of its own, hot reload, and
  NSH's own `examples/tasks` recipe is TSX.
- NSH CLI 0.5.0 (f4d68f7); docs read at that commit, not `main`.
- Theme colours only through tokens (NSH Coding Guides: no raw hex in presentation code).
- Artifacts in English.

## TDD

- Mode: strict, enabled. Source: user global instructions. Runner: `nsh test` (`*.test.tsx`, `nsh/test`).
- RDD: off (global).

## Tasks

- [x] T1 Scaffold: `nsh init --template ts`, git, Makefile. Route: inline (mechanical).
- [x] T2 App with tests first: theme, ui layer, four tabs, sheets, persistence. Route: delegated writer (many non-trivial files). Evidence: RED `make test` 11 tests: 0 passed, 11 failed (scaffold counter); GREEN 11 tests: 11 passed; `make check` clean; `nsh build` no warnings; iOS 26.5 simulator run, light and dark, no runtime errors (not committed).
- [x] T3 Verify: `nsh check`, `nsh test`, run on iOS Simulator and Android emulator, screenshots light/dark. Route: inline per-action. Evidence (parent): `make check` clean, `make test` 11/11; iOS 26.5 Home/Tasks light+dark reviewed; Android API 35 emulator via `nsh run --target android`: Home light+dark, Tasks, Categories reviewed, tab switching works.
- [x] T4 Desktop and web navigation with nsh/base Tabs. Route: delegated writer. `TabBar` stays on iOS and Android; every other platform gets `Tabs`/`Tab`: a left sidebar where `platform.desktop`, a bottom bar in the web's phone idiom; pill indicator in `primary/15`, theme tokens only. Evidence: RED `make test` 12 tests: 11 passed, 1 failed (`no pressable view matches id:tab-tasks`); GREEN 12 tests: 12 passed; `make check` clean; `nsh package --target macos --out dist/macos` built (placeholder app id warning only). Parent check on the packaged macOS app (dark): sidebar tabs switch Home, Tasks, Categories; follow-up aligned the pill with the tabs (`inset-x-3`) and added house and sliders glyphs; 12/12 tests.

## Acceptance criteria

- `make check` and `make test` pass.
- The app runs on the iOS Simulator and the Android emulator with the four tabs working.
- Screenshots reviewed in light and dark.

## Progress / evidence

- 2026-11-13: nsh 0.5.0 installed to `~/.nsh` (release tarball, SHA-256 verified); scaffold `nsh check` ok, `nsh test` 1 passed.

## Known gaps (NSH 0.5.0)

- Android tab icons are system `android:ic_menu_*` drawables: `nsh package`/dev host bundle only the launcher icon (`crates/nsh-cli/src/android.rs`: "Resources: only the launcher icon"), so a TSX app cannot ship its own.
- iOS tab bar renders as the classic bar, not the iOS 26 floating glass capsule.
- No swipe-to-delete: delete is a long-press context menu.
- Headless tests on iOS switch tabs through deep links (`nshtodo://<tab>`): the system TabBar is not pressable headless (the desktop `Tabs` is, see T4).
- Dark mode glass tiles use a white-tinted blur (native glass went near-black over the deep hero).

## Next step

Done.
