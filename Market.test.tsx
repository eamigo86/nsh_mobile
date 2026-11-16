// The Market tab, driven like a user: the history comes from a stubbed Coinbase endpoint; the live feed's socket is
// refused headless (and its messages cannot be injected), so the tick maths is covered in MarketData.test.tsx and
// what the socket does here is the status and the retry schedule.
import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { launchApp } from "./testing";

const BASE = 1_763_330_400;
const URL = "GET https://api.exchange.coinbase.com/products/BTC-USD/candles*";
// 120 minutes, newest first, as Coinbase sends them: [time, low, high, open, close, volume].
const rows = Array.from({ length: 120 }, (_, i) => {
  const p = 65000 + 119 - i;
  return [BASE + (119 - i) * 60, p - 1, p + 2, p, p + 1, 1];
});

const market = async (options: Parameters<typeof launchApp>[0] = {}) => {
  const app = await launchApp({ network: { [URL]: { body: rows } }, ...options });
  await app.openWithUrl("nshtodo://market");
  await app.waitFor("text:65,120.00");
  return app;
};
const has = (app: App, pattern: RegExp) => app.texts().some((t) => pattern.test(t));

test("the tab shows the pair, the last price and the change since the first candle", async () => {
  const app = await market();
  expect(app.texts()).toContain("BTC-USD");
  expect(app.texts()).toContain("65,120.00");
  expect(has(app, /^\+120\.00 \(\+0\.18%\)$/)).toBe(true);
  expect(app.shows("id:market-chart")).toBe(true);
  expect(app.requests()[0].url).toContain("granularity=60");
});

test("a refused socket shows Reconnecting with the retry growing 1 s, 2 s, 4 s", async () => {
  const app = await market({ clock: {} });
  expect(has(app, /^Reconnecting in 1s$/)).toBe(true);
  await app.clock!.runFor(1100);
  expect(has(app, /^Reconnecting in 2s$/)).toBe(true);
  await app.clock!.runFor(2100);
  expect(has(app, /^Reconnecting in 4s$/)).toBe(true);
});

test("minus and plus zoom between 20 and 200 candles", async () => {
  const app = await market();
  expect(app.texts()).toContain("60 candles");
  await app.press("id:market-zoom-in");
  expect(app.texts()).toContain("40 candles");
  for (let i = 0; i < 4; i++) await app.press("id:market-zoom-in");
  expect(app.texts()).toContain("20 candles");
  for (let i = 0; i < 12; i++) await app.press("id:market-zoom-out");
  expect(app.texts()).toContain("200 candles");
});

test("dragging the chart scrolls back, and Latest returns to the newest candle", async () => {
  const app = await market();
  expect(app.texts()).toContain("Live");
  await app.drag("id:market-chart", { x: 120 });
  expect(has(app, /^\d+ min back$/)).toBe(true);
  expect(app.enabled("id:market-latest")).toBe(true);
  await app.press("id:market-latest");
  expect(app.texts()).toContain("Live");
});

test("a double tap resets the zoom and the position", async () => {
  const app = await market({ clock: {} });
  await app.press("id:market-zoom-in");
  await app.drag("id:market-chart", { x: 100 });
  expect(app.texts()).toContain("40 candles");
  await app.press("id:market-chart");
  expect(app.texts()).toContain("40 candles");
  await app.press("id:market-chart");
  expect(app.texts()).toContain("60 candles");
  expect(app.texts()).toContain("Live");
});

test("a long press shows the crosshair readout and lifting hides it", async () => {
  const app = await market();
  expect(app.shows("id:market-readout")).toBe(false);
  await app.dragAndHold("id:market-chart", { x: 0.1 });
  await app.wait(700);
  expect(app.shows("id:market-readout")).toBe(true);
  expect(has(app, /O 65,\d{3}\.00 {1,2}H 65,\d{3}\.00 {1,2}L 65,\d{3}\.00 {1,2}C 65,\d{3}\.00 {1,2}V /)).toBe(true);
  await app.drop();
  expect(app.shows("id:market-readout")).toBe(false);
});

test("leaving the tab stops the feed and coming back loads the history again", async () => {
  const app = await market();
  expect(app.requests().length).toBe(1);
  await app.openWithUrl("nshtodo://settings");
  await app.openWithUrl("nshtodo://market");
  await app.waitUntil(() => app.requests().length === 2);
});

test("a failed history load says so and the tab keeps working", async () => {
  const app = await launchApp({ network: { [URL]: { status: 429, body: { message: "rate limited" } } } });
  await app.openWithUrl("nshtodo://market");
  await app.waitUntil(() => has(app, /^Could not load prices/));
  expect(app.shows("id:market-chart")).toBe(true);
});
