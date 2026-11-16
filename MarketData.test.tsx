// The Market tab's pure logic: rows and ticks into candles, the visible window, the price scale, the gestures'
// maths and the reconnect schedule. No app is opened; the socket and the timers are fakes.
import { expect, test } from "nsh/test";
import {
  applyTick,
  backoff,
  changeSince,
  clampView,
  DEFAULT_COUNT,
  follow,
  indexAt,
  isDoubleTap,
  mergeHistory,
  MAX_COUNT,
  MIN_COUNT,
  niceTicks,
  pan,
  parseRows,
  parseTick,
  pinchFactor,
  priceRange,
  priceToY,
  visibleWindow,
  zoom,
  type Candle,
} from "./market";
import { connectFeed, type FeedStatus } from "./feed";

const c = (time: number, open: number, high: number, low: number, close: number, volume = 1): Candle => ({ time, open, high, low, close, volume });
const series = (n: number): Candle[] => Array.from({ length: n }, (_, i) => c(i * 60, 100, 101, 99, 100));

test("rows are sorted oldest first, de-duplicated and reordered to open, high, low, close", () => {
  // Coinbase: [time, low, high, open, close, volume], newest first.
  const rows = [[120, 9, 12, 10, 11, 3], [60, 8, 11, 9, 10, 2], [60, 8, 11, 9, 10, 2], [0, 7, 10, 8, 9, 1]];
  expect(parseRows(rows)).toEqual([c(0, 8, 10, 7, 9, 1), c(60, 9, 11, 8, 10, 2), c(120, 10, 12, 9, 11, 3)]);
});

test("bad rows are skipped and a non-array is empty", () => {
  expect(parseRows([[1, "x", 2, 3, 4, 5], [1, 2, 3], null, [60, 1, 2, 1, 2, 0]])).toEqual([c(60, 1, 2, 1, 2, 0)]);
  expect(parseRows({ message: "rate limited" })).toEqual([]);
});

test("a ticker message becomes a tick; anything else is ignored", () => {
  const text = JSON.stringify({ type: "ticker", price: "65266.90", time: "2026-11-16T22:00:01.500Z", last_size: "0.25" });
  expect(parseTick(text)).toEqual({ price: 65266.9, size: 0.25, time: Date.parse("2026-11-16T22:00:01.500Z") / 1000 });
  expect(parseTick(JSON.stringify({ type: "subscriptions", channels: [] }))).toBeNull();
  expect(parseTick(JSON.stringify({ type: "ticker", price: "x", time: "2026-11-16T22:00:01Z" }))).toBeNull();
  expect(parseTick(JSON.stringify({ type: "ticker", price: "1", time: "nope" }))).toBeNull();
  expect(parseTick("not json")).toBeNull();
});

test("a tick in the same minute updates high, low, close and volume", () => {
  const list = [c(60, 10, 12, 9, 11, 1)];
  expect(applyTick(list, { price: 13, size: 0.5, time: 90 })).toEqual([c(60, 10, 13, 9, 13, 1.5)]);
  expect(applyTick(list, { price: 8, size: 1, time: 119 })).toEqual([c(60, 10, 12, 8, 8, 2)]);
  expect(list).toEqual([c(60, 10, 12, 9, 11, 1)]);
});

test("a tick in a new minute opens a candle at the previous close; a late tick is ignored", () => {
  const list = [c(60, 10, 12, 9, 11, 1)];
  expect(applyTick(list, { price: 14, size: 2, time: 125 })).toEqual([c(60, 10, 12, 9, 11, 1), c(120, 11, 14, 11, 14, 2)]);
  expect(applyTick(list, { price: 5, size: 2, time: 10 })).toEqual(list);
  expect(applyTick([], { price: 7, size: 1, time: 61 })).toEqual([c(60, 7, 7, 7, 7, 1)]);
});

test("a refetched history wins over the same minutes and keeps newer live candles", () => {
  const live = [c(0, 1, 1, 1, 1, 1), c(60, 2, 2, 2, 2, 1), c(120, 3, 3, 3, 3, 1)];
  const history = [c(0, 1, 2, 1, 2, 5), c(60, 2, 3, 2, 3, 6)];
  expect(mergeHistory(live, history)).toEqual([c(0, 1, 2, 1, 2, 5), c(60, 2, 3, 2, 3, 6), c(120, 3, 3, 3, 3, 1)]);
});

test("the change is measured from the first candle's open", () => {
  expect(changeSince([c(0, 100, 0, 0, 0), c(60, 0, 0, 0, 110)])).toEqual({ abs: 10, pct: 10 });
  expect(changeSince([])).toEqual({ abs: 0, pct: 0 });
});

test("the window shows the default count at the latest candle", () => {
  expect(visibleWindow(300, { count: DEFAULT_COUNT, offset: 0 })).toEqual({ start: 240, end: 300 });
  expect(visibleWindow(300, { count: 60, offset: 30 })).toEqual({ start: 210, end: 270 });
  expect(visibleWindow(10, { count: 60, offset: 0 })).toEqual({ start: 0, end: 10 });
});

test("pan moves back through history and stays inside it", () => {
  const v = { count: 60, offset: 0 };
  expect(pan(v, 25, 300)).toEqual({ count: 60, offset: 25 });
  expect(pan(v, -5, 300)).toEqual({ count: 60, offset: 0 });
  expect(pan(v, 1000, 300)).toEqual({ count: 60, offset: 240 });
  expect(pan(v, 10, 30)).toEqual({ count: 60, offset: 0 });
});

test("zoom stays between 20 and 200 candles and keeps the candle under the anchor", () => {
  expect(zoom({ count: 60, offset: 0 }, 100, 0.5, 300).count).toBe(MIN_COUNT);
  expect(zoom({ count: 60, offset: 0 }, 0.01, 0.5, 300).count).toBe(MAX_COUNT);
  // Zooming in 2x around the right edge keeps the latest candle at the edge.
  expect(zoom({ count: 60, offset: 0 }, 2, 1, 300)).toEqual({ count: 30, offset: 0 });
  // Around the middle: the candle at index 270 (offset 0, count 60, anchor 0.5) stays in the middle.
  const z = zoom({ count: 60, offset: 0 }, 2, 0.5, 300);
  expect(z).toEqual({ count: 30, offset: 15 });
  expect(clampView({ count: 500, offset: -4 }, 300)).toEqual({ count: 200, offset: 0 });
});

test("a view scrolled back stays put when a candle is added; the latest view follows", () => {
  expect(follow({ count: 60, offset: 0 }, 1)).toEqual({ count: 60, offset: 0 });
  expect(follow({ count: 60, offset: 12 }, 1)).toEqual({ count: 60, offset: 13 });
  expect(follow({ count: 60, offset: 12 }, 0)).toEqual({ count: 60, offset: 12 });
});

test("a touch maps to the candle under it, clamped to the visible ones", () => {
  // 60 candles in 300 points: 5 points each, the latest candle (index 299) at the right edge.
  const v = { count: 60, offset: 0 };
  expect(indexAt(299, 300, 300, v)).toBe(299);
  expect(indexAt(0, 300, 300, v)).toBe(240);
  expect(indexAt(-50, 300, 300, v)).toBe(240);
  expect(indexAt(900, 300, 300, v)).toBe(299);
  expect(indexAt(150, 300, 300, { count: 60, offset: 30 })).toBe(240);
  expect(indexAt(10, 300, 3, v)).toBe(0);
});

test("the pinch factor is the ratio of the finger distances", () => {
  expect(pinchFactor(100, 200)).toBe(2);
  expect(pinchFactor(100, 50)).toBe(0.5);
  expect(pinchFactor(0, 50)).toBe(1);
});

test("two presses close together in time and place are a double tap", () => {
  const first = { time: 1000, x: 50, y: 50 };
  expect(isDoubleTap(null, first)).toBe(false);
  expect(isDoubleTap(first, { time: 1250, x: 60, y: 55 })).toBe(true);
  expect(isDoubleTap(first, { time: 1400, x: 50, y: 50 })).toBe(false);
  expect(isDoubleTap(first, { time: 1200, x: 200, y: 50 })).toBe(false);
});

test("the price scale pads the visible range and maps price to y, high at the top", () => {
  const range = priceRange([c(0, 100, 110, 90, 105), c(60, 105, 120, 100, 110)]);
  expect(range.min).toBeLessThan(90);
  expect(range.max).toBeGreaterThan(120);
  expect(priceToY(range.max, range, 10, 200)).toBe(10);
  expect(priceToY(range.min, range, 10, 200)).toBe(210);
  expect(priceRange([c(0, 5, 5, 5, 5)]).max).toBeGreaterThan(5);
  expect(priceRange([])).toEqual({ min: 0, max: 1 });
});

test("nice ticks are round numbers inside the range", () => {
  expect(niceTicks(0, 100, 5)).toEqual([0, 20, 40, 60, 80, 100]);
  expect(niceTicks(65210, 65290, 5)).toEqual([65220, 65240, 65260, 65280]);
  expect(niceTicks(1, 1, 5)).toEqual([1]);
  expect(niceTicks(0.1, 0.5, 4)).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
});

test("the reconnect delay doubles from 1 s to 30 s", () => {
  expect([0, 1, 2, 3, 4, 5, 6, 20].map(backoff)).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000]);
});

// A socket the test drives, and a clock it moves.
function harness() {
  const sockets: FakeSocket[] = [];
  const timers: { fn: () => void; ms: number; id: number }[] = [];
  const statuses: FeedStatus[] = [];
  const ticks: unknown[] = [];
  const opens: boolean[] = [];
  let id = 0;
  let clock = 1000;
  class FakeSocket {
    sent: string[] = [];
    closed = false;
    onopen: (() => void) | null = null;
    onmessage: ((e: { data: string }) => void) | null = null;
    onclose: (() => void) | null = null;
    onerror: (() => void) | null = null;
    send(s: string) {
      this.sent.push(s);
    }
    close() {
      this.closed = true;
    }
  }
  const feed = connectFeed(
    { onTick: (t) => ticks.push(t), onStatus: (s) => statuses.push(s), onOpen: (again) => opens.push(again) },
    {
      open: () => {
        const s = new FakeSocket();
        sockets.push(s);
        return s;
      },
      now: () => clock,
      setTimer: (fn, ms) => {
        timers.push({ fn, ms, id: ++id });
        return id;
      },
      clearTimer: (n) => {
        const i = timers.findIndex((t) => t.id === n);
        if (i >= 0) timers.splice(i, 1);
      },
    },
  );
  return { feed, sockets, timers, statuses, ticks, opens, last: () => sockets[sockets.length - 1] };
}

test("the feed connects, subscribes on open and passes ticker messages on", () => {
  const h = harness();
  expect(h.statuses).toEqual([{ kind: "connecting" }]);
  h.last().onopen?.();
  expect(JSON.parse(h.last().sent[0])).toEqual({ type: "subscribe", product_ids: ["BTC-USD"], channels: ["ticker"] });
  expect(h.statuses[h.statuses.length - 1]).toEqual({ kind: "live" });
  expect(h.opens).toEqual([false]);
  h.last().onmessage?.({ data: JSON.stringify({ type: "ticker", price: "10", time: "2026-11-16T22:00:00Z", last_size: "1" }) });
  h.last().onmessage?.({ data: JSON.stringify({ type: "heartbeat" }) });
  expect(h.ticks.length).toBe(1);
});

test("the feed retries with growing delays, and a good open resets them", () => {
  const h = harness();
  const fail = () => {
    h.last().onerror?.();
    h.last().onclose?.();
  };
  const delays: number[] = [];
  for (let i = 0; i < 4; i++) {
    fail();
    delays.push(h.timers[h.timers.length - 1].ms);
    h.timers[h.timers.length - 1].fn();
  }
  expect(delays).toEqual([1000, 2000, 4000, 8000]);
  expect(h.statuses.some((s) => s.kind === "reconnecting" && s.at === 1000 + 1000)).toBe(true);
  h.last().onopen?.();
  expect(h.opens).toEqual([true]);
  fail();
  expect(h.timers[h.timers.length - 1].ms).toBe(1000);
});

test("error then close schedules one retry; stop goes offline and cancels the retry", () => {
  const h = harness();
  h.last().onerror?.();
  h.last().onclose?.();
  expect(h.timers.length).toBe(1);
  h.feed.stop();
  expect(h.timers.length).toBe(0);
  expect(h.statuses[h.statuses.length - 1]).toEqual({ kind: "offline" });
  h.last().onclose?.();
  expect(h.timers.length).toBe(0);
});
