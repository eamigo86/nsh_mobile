# Feature: nsh-chart

Locator: `odd/tasks/nsh-chart.md` · Engram mirror: `odd/chart/tasks`

## Objective

Add a "Market" tab with a trading-style, real-time candlestick chart of BTC-USD (Coinbase public REST + WebSocket),
with pinch zoom, pan, double-tap reset and a crosshair, on iOS and Android. The same chart goes into the Exact Todo app
(`../exact_mobile, branch feat/exact-chart`) to compare how both frameworks handle charts, live data and gestures (2026-11-16 request; not related to the
todo domain).

## Scope

## Chart spec (shared by both apps)

- A fifth tab "Market" (chart icon), after Categories, before Settings is fine too; keep the other tabs working.
- Header: "BTC-USD", the last price (large, tabular digits), change vs the first loaded candle's open (absolute and %, up/down colour), and a connection status pill: Connecting / Live / Reconnecting (with the next retry in seconds) / Offline.
- Data source (public, no key):
  - History: `GET https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=60` -> up to 300 rows `[time, low, high, open, close, volume]`, newest first (time in Unix seconds). Sort ascending.
  - Live: `wss://ws-feed.exchange.coinbase.com`, on open send `{"type":"subscribe","product_ids":["BTC-USD"],"channels":["ticker"]}`; messages `{"type":"ticker","price":"65266.90","time":"2026-11-16T22:00:01.123Z","last_size":"0.001", ...}`. Fold each tick into the current 1-minute candle (high/low/close, volume += last_size); a tick in a new minute starts a new candle (open = previous close or the tick price). Ignore non-ticker messages.
  - Reconnect with exponential backoff (1 s doubling to 30 s, reset on a good open). Re-fetch the history after a reconnect so gaps are filled.
  - Connect only while the Market tab is shown if the framework allows it cleanly; otherwise say what happens.
- Chart (candlesticks):
  - Up candles green, down red (new theme tokens `up`/`down` that read in light and dark), wick + body; volume bars in the bottom ~20% of the chart, same colours at low opacity.
  - Right price axis with about 5 rounded ticks (price labels), a time axis with about 4 HH:MM labels.
  - A dashed horizontal line at the last price with a filled price label at the right edge, coloured by the last candle's direction.
  - Draw efficiently: batch candles of one colour into one path/shape where the framework allows (not one node per candle if that is slow).
- Interaction:
  - Pinch to zoom: visible candles between 20 and 200 (default 60), zooming around the pinch centre if feasible.
  - Pan horizontally to scroll back through history; when the view is at the latest candle it follows new candles, otherwise it stays put.
  - Double-tap resets to the default zoom at the latest candle.
  - Long-press (or press-and-drag) shows a crosshair: vertical line at the nearest candle, horizontal line at the finger, and a readout with time, O, H, L, C, volume.
  - Also buttons "−", "+" and "Latest" under the chart (accessible fallback; they must work even where a gesture is not available).
- Pure data functions (parse rows, apply a tick, visible window, price-to-y, nice ticks, gesture maths) in their own module with unit tests (tests first).
- Findings for the comparison: what the framework gave (networking, sockets, drawing, gestures), what had to be built by hand, workarounds, doc gaps, platform differences, smoothness concerns, lines per area.

Out of scope: other symbols or intervals, order books, web and desktop checks.

## Constraints

- Branch `feat/nsh-chart from feat/nsh-sqlite (4b246fc)`. NSH 0.5.0 (f4d68f7). Do not change native/.
- Keep the existing checks green. Artifacts in English. Conventional commits, no attribution lines, no push.

## TDD

- Mode: strict, enabled. Source: user global instructions. Runner: `make test` (nsh test, plus cargo test) and `make check`.
- RDD: off (global).

## Tasks

- [x] T1 Branch and this document. Route: inline (mechanical).
- [x] T2 Market tab, data feed, chart drawing and interaction, tests first for the data and gesture maths. Route: delegated writer (several new files).
- [ ] T3 Verify on the iOS Simulator and the Android emulator: live updates, zoom, pan, reset, crosshair, reconnect, light and dark. Route: inline per-action.

## Delivery

- Forecast: about 400-600 authored lines. Local branch only; no push or pull request planned.

## Progress / evidence

- T1: branch created.
- T2 (delegated writer, strict TDD): RED observed first: `make test` -> `MarketData.test.tsx: Could not resolve './market'` / `Could not resolve './feed'`
  (later `"indexAt" is not exported`), and `Market.test.tsx` failing with the tab absent (`text:65,120.00 showing never happened`). Then GREEN.
  - `make check`: clean (no type errors).
  - `make test`: 101 tests: 101 passed, 0 failed (19 pure + 8 UI tests are new).
  - `make ios-crate`: packaged dist/ios-crate-sim/NSH Todo.app.
  - `make package-android`: packaged dist/android/NSH Todo.apk (arm64-v8a, armeabi-v7a).
  - Coinbase REST reachable (curl): rows `[time, low, high, open, close, volume]`, newest first. A throwaway headless test with
    `network: "live"` reached status Live over the real `wss://ws-feed.exchange.coinbase.com` (not kept).
  - Commits: see the end of this section.

## Findings for the comparison

- Networking: `fetch` works as the web's; a `network.hosts` capability is needed (`wss://` counts as the host). `network` in `open()` stubs fetch
  well. Headless sockets are refused and messages cannot be injected, so the tick logic is tested as pure functions and the socket through an
  injected fake (`connectFeed(handlers, deps)`); the retry schedule is also observable in the app with a manual clock ("Reconnecting in 1s, 2s, 4s").
- Sockets: the global `WebSocket` is the browser one (onopen/onmessage/onclose/onerror). No auto-reconnect, no ping: backoff is hand-written (about 90 lines with
  the fake-able deps). Tab-scoped connection is natural: the page is mounted only while shown, `cleanup()` stops the feed. Not handled: app
  backgrounded (the socket may be dropped by the OS; the retry loop reconnects and refetches).
- Drawing: `Canvas` (Canvas 2D subset) is enough: `Path2D` with `rect`/`moveTo`/`lineTo` batches all up/down candles, wicks and volume into 6 paths, 2 fills + 2 strokes + 2 volume fills per frame.
  `fillText` with `fontVariantNumeric = "tabular-nums"`, `setLineDash`, `globalAlpha` all exist. No candlestick in `nsh/base/plot`, no zoom/pan there: the whole chart is hand-written (about 250 lines incl. gestures).
  `draw` reruns on signals it reads (candles, view, crosshair): no manual invalidate. Theme tokens come with `token("up")` and follow the appearance.
- Gestures: no per-frame pinch scale reaches JS (`pinch={{scale}}` drives an animated value only; `onPinchStart/End` only at the ends). Pinch is computed from two touches in the
  responder (`e.touches`, distance ratio, anchored at the centroid). Pan and the crosshair also come from the responder. No double-tap handler: two releases within 300 ms / 30 pt (`isDoubleTap`, tested).
  Long press is a 400 ms timer started at grant (the built-in `onLongPress` gives no follow-up moves while the finger stays down).
  Headless `drag` and `longPress` (`dragAndHold` + `drop`) drive the responder, so pan, crosshair and double tap are tested in the UI tests (pinch is not: there is no two-finger test API).
- Doc gap / quirk: `app.press` found no target on a canvas that only had responder handlers (`no pressable view`); a no-op `onPress` makes it one. It may matter on device if it competes
  with the responder (to check).
- Testing: `network` stubs, manual `clock`, `dragAndHold`/`drop` and `longPress` cover most of it with no device.
- Performance concerns (unmeasured, to check on devices): `draw` re-records the whole chart on every pan move (about 60-200 candles, cheap) and on each 1 s flush; the crosshair readout is a `Text`
  overlay, so it re-renders on each move. Ticks are coalesced to one flush per second, so the last price moves once a second, not per tick.
- Lines per area (new): pure logic 169, feed 93, store 79, chart + gestures 254, page 77; tests 340.
  - Commits: 48a6148 feat(market): add a live BTC-USD candlestick chart; docs commit with this record follows.
