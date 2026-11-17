# Feature: nsh-home-swipe

Locator: `odd/tasks/nsh-home-swipe.md` · Engram mirror: `odd/nsh-home-swipe/tasks`

## Objective

Give each task row of Home's "Up next" card swipe actions: swipe right to complete, swipe left to edit or delete. The same
feature goes into the Exact Todo app (`../exact_mobile`, branch `feat/exact-home-swipe`). It is also a measurement of a common
app pattern for the framework comparison: what each framework gives, what is built by hand, and how smooth the swipe is
(2026-11-17 request).

## Swipe spec (shared by both apps)

- Where: every task row in Home's "Up next" card. Other screens are unchanged.
- Swipe right (the row moves right): a green **Complete** action shows on the left. It marks the task done, as the app's
  existing completion does.
- Swipe left (the row moves left): two actions show on the right, **Edit** (blue) then **Delete** (red), Delete outermost.
  - Edit opens the app's existing editor for that task.
  - Delete removes the task without asking, as iOS does for routine deletions (Mail, Reminders).
- Look, from the user's reference image:
  - Icons only, no text: a checkmark, a square-and-pencil, a trash can, in white.
  - Flush rectangles the row's full height, about 72-76 pt wide each.
  - Colours that read in light and dark. Reuse theme tokens where they fit, such as `destructive` and `up`; add tokens only if needed.
- Behaviour:
  - Past a threshold the row snaps open; otherwise it snaps back.
  - One row open at a time. Pressing the row's content while it is open closes it.
  - A full swipe performing the outermost action (Complete; Delete) is wanted as on iOS. If the framework gives it, use it;
    if hand-building it adds a lot, skip it and record why.
- Accessibility: each action has an accessibility label ("Complete", "Edit", "Delete"). Where the framework offers custom
  actions on the row (VoiceOver/TalkBack), expose them.
- Tests first (strict TDD): complete, edit (opens the editor for that task) and delete from Home; the gesture too if the
  test API can drive a horizontal drag.
- Findings for the comparison: what the framework gave, what was hand-built, workarounds, doc gaps, platform differences, and
  lines per area.

Out of scope: swipe actions on the Tasks or Categories screens, undo, web and desktop checks.

## Measurement plan (T3, parent)

- Implementation cost: authored lines (code and tests) per app.
- Smoothness on Android: frame times while a scripted swipe drags a row (`dumpsys SurfaceFlinger --latency` on the app's layer,
  or `gfxinfo framestats` where it applies). Jank count, p50/p90/p99.
- CPU while a row is swiped repeatedly (sampled with `top`).
- iOS Simulator: behaviour check, no frame numbers (the simulator is not representative).

## Constraints

- Branch `feat/nsh-home-swipe` from `feat/nsh-chart` (6922eb1). NSH 0.5.1 (224d9a7). Do not change `native/`.
- The uncommitted `Makefile` change (`package-ios` deployment target) is not part of this feature: never stage it here.
- Keep the existing checks green. Artifacts in English. Conventional commits, no attribution lines, no push.

## TDD

- Mode: strict, enabled. Source: user global instructions. Runner: `make test` (nsh test) and `make check`.
- RDD: off (global).

## Tasks

- [x] T1 Branch and this document. Route: inline (mechanical).
- [x] T2 Swipe actions on Home's "Up next" rows, tests first. Route: delegated writer (several files: a swipe row, Home, tests).
- [ ] T3 Verify on the iOS Simulator and the Android emulator (light and dark), then measure. Route: inline per-action.

## Delivery

- Forecast: about 250-400 authored lines (a hand-built swipe row). Strategy: ask-on-risk. Local branch only; no push or pull request planned.

## Progress / evidence

- T1: branch created from 6922eb1.
- T2 (delegated writer, strict TDD): RED observed first: `make test` -> `error Swipe.test.tsx: building ... failed [UNRESOLVED_IMPORT] Could not resolve './ui/swipe'`
  (103 passed, 1 failed). First GREEN attempt: 6 of 10 gesture tests failed for test-side reasons only (`label:Delete matches 2 pressable views`;
  and `app.press` on a hidden action resolved: headless never reports an action under the row as covered), fixed by id selectors and by disabling
  an action unless its side is open (`app.enabled`).
  - `make check`: clean. `make test`: 114 tests: 114 passed, 0 failed (10 new in `Swipe.test.tsx`: 4 pure snap maths, 6 UI).
  - `make ios-crate`: packaged dist/ios-crate-sim/NSH Todo.app. `make package-android`: packaged dist/android/NSH Todo.apk (arm64-v8a, armeabi-v7a).
  - Commit: b119e64 feat(home): add swipe actions to the up next rows.
  - To check on devices: drag follows the finger smoothly; snap at half an action; one row open; tap on open row closes; Edit opens the editor; Delete removes;
    Complete completes; full swipe (past 60% of the width) deletes / completes; vertical scrolling of Home still works over the rows (`panActivation`);
    glyph colours and action colours in light and dark; TalkBack/VoiceOver show "Complete", "Edit", "Delete" custom actions on the row.

## Findings for the comparison

- What NSH gave: a native pan (`pan={{ x }}` drives an `AnimatedValue` on the UI thread), `translateX` bound to that value, `x.spring()`, `extractOffset`/`flattenOffset`
  (the React Native pattern), `panActivation={{ activeOffsetX, failOffsetY }}` so a vertical scroll around the row keeps its touches, `onLayout` for the width,
  and `accessibilityActions` + `onAccessibilityAction` (custom VoiceOver/TalkBack actions). No swipe-actions component exists in nsh-base 0.5.1.
- Native-driven, not JS-driven: the finger moves the row with no JS per frame; JS runs only at `onPanStart` (`extractOffset`) and `onPanEnd` (settle maths, then a spring).
  The JS responder was not needed.
- Hand-built: the action layers under the row (coloured halves plus fixed 74 pt buttons), the snap/threshold maths (`ui/swipe.ts`, pure and unit-tested), one-open-at-a-time
  (a module signal plus an effect), press-to-close, the white glyphs (two new stroked paths: `edit`, `trash`).
- Full swipe: yes, cheap (about 6 lines): past 60% of the width the row springs off screen and then runs Delete (left) or Complete (right). Not done: the outer action does
  not stretch or follow the row during the drag (iOS grows the Delete button); the colour halves fill the gap instead.
- Workarounds: the pan value is unbounded (no clamp on the drag), so the row can be dragged past the actions up to the full-swipe zone; `app.drag` in headless drives
  `onPanStart`/`onPanEnd` correctly (full swipes and snaps tested). Headless does not treat an action hidden under the row as covered, so the actions are `disabled`
  unless their side is open (this also stops taps that would otherwise reach a hidden button); the tests read `app.enabled`.
- Doc gaps: no test API reads a view's translation or invokes an accessibility action, so the open/closed position and the custom actions are not asserted; whether the pan
  base is the current value or zero is not documented (`extractOffset` at start was used, as in React Native; untested natively).
- Platform notes: unverified on devices (the parent checks iOS and Android).
- Authored lines (git, additions): swipe row component 90, snap maths 16, page (Home) 20 changed, icons 2 (theme: 0, no new tokens: `up`, `destructive`, `cat-blue`, `on-color`), tests 94.

## T2 correction (device finding)

- Finding: in dark mode the actions became pastel with black glyphs (`on-color` and `up`/`destructive`/`cat-blue` flip in dark). User also asked: swipe left overlays Edit/Delete over a fixed row; swipe right keeps the push with a 12 pt card gap after Complete.
- Fix: new `swipe-ink`/`swipe-complete`/`swipe-edit`/`swipe-delete` tokens (light = old values, dark = #2e9b4f/#2f7fe0/#e5484d, ink white both). `ui/swipe.ts`: `GAP = 12`, right open at 86. `ui/swipe-row.tsx`: one pan value drives the row (right only, interpolate clamp), the trailing action group (left, from off the right edge to 0), a green trail that stops 12 pt short of the row, and a delete cover that sweeps in before a full-swipe delete.
- RED: the test API reads no view or canvas colour (only `spanStyle`), so the colour test asserts `theme.json` tokens: `expected undefined to be "#ffffff"`; the snap tests failed to build without `GAP` (103 passed, 1 failed).
- GREEN: `make check` clean; `make test` 115 passed, 0 failed; `make ios-crate` and `make package-android` packaged. Not verified on devices (parent to check): overlay motion, gap, full-swipe cover, dark colours, and that the `deleting() &&` cover mounts reactively.
- Commit: c0c355c.
