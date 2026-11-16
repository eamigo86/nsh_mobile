// The Market tab's pure logic: Coinbase rows and ticks into 1-minute candles, the visible window, the price scale,
// and the maths behind the gestures. No signals, no drawing, no network: everything here is tested on its own.

/** One 1-minute candle; `time` is the minute's start in Unix seconds. */
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Tick {
  price: number;
  size: number;
  /** Unix seconds. */
  time: number;
}

/** What is on screen: `count` candles (fractional while pinching), `offset` candles scrolled back from the latest (0 = following). */
export interface View {
  count: number;
  offset: number;
}

export const DEFAULT_COUNT = 60;
export const MIN_COUNT = 20;
export const MAX_COUNT = 200;
const MINUTE = 60;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** Coinbase rows `[time, low, high, open, close, volume]` (newest first) as candles, oldest first; bad rows are skipped. */
export function parseRows(rows: unknown): Candle[] {
  if (!Array.isArray(rows)) return [];
  const byTime = new Map<number, Candle>();
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 6 || !row.slice(0, 6).every(finite)) continue;
    const [time, low, high, open, close, volume] = row as number[];
    byTime.set(time, { time, open, high, low, close, volume });
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}

/** A `ticker` message of the feed as a tick; null for any other message or an unreadable one. */
export function parseTick(text: string): Tick | null {
  try {
    const m = JSON.parse(text);
    if (m?.type !== "ticker") return null;
    const price = Number(m.price);
    const time = Date.parse(m.time) / 1000;
    const size = m.last_size === undefined ? 0 : Number(m.last_size);
    if (!finite(price) || !finite(time) || !finite(size)) return null;
    return { price, size, time };
  } catch {
    return null;
  }
}

/** Folds a tick into the candles: the current minute's high, low, close and volume, or a new candle that opens at the previous close. */
export function applyTick(candles: Candle[], tick: Tick): Candle[] {
  const minute = Math.floor(tick.time / MINUTE) * MINUTE;
  const last = candles[candles.length - 1];
  if (!last) return [{ time: minute, open: tick.price, high: tick.price, low: tick.price, close: tick.price, volume: tick.size }];
  if (minute < last.time) return candles;
  if (minute === last.time) {
    const next = { ...last, high: Math.max(last.high, tick.price), low: Math.min(last.low, tick.price), close: tick.price, volume: last.volume + tick.size };
    return [...candles.slice(0, -1), next];
  }
  const open = last.close;
  return [...candles, { time: minute, open, high: Math.max(open, tick.price), low: Math.min(open, tick.price), close: tick.price, volume: tick.size }];
}

/** A refetched history over the live candles: the history wins for its minutes, newer live candles stay. */
export function mergeHistory(live: Candle[], history: Candle[]): Candle[] {
  const byTime = new Map(live.map((c) => [c.time, c]));
  for (const c of history) byTime.set(c.time, c);
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}

/** The move from the first candle's open to the last close. */
export function changeSince(candles: Candle[]): { abs: number; pct: number } {
  if (candles.length === 0) return { abs: 0, pct: 0 };
  const first = candles[0].open;
  const abs = candles[candles.length - 1].close - first;
  return { abs, pct: first === 0 ? 0 : (abs / first) * 100 };
}

/** Count within 20..200 and the offset within the history. */
export function clampView(view: View, total: number): View {
  const count = clamp(view.count, MIN_COUNT, MAX_COUNT);
  return { count, offset: clamp(view.offset, 0, Math.max(0, total - count)) };
}

/** The indexes drawn: `start` to `end`, exclusive (a fractional offset draws one more at the edge). */
export function visibleWindow(total: number, view: View): { start: number; end: number } {
  const end = Math.min(total, Math.ceil(total - view.offset));
  return { start: Math.max(0, Math.floor(total - view.offset - view.count)), end };
}

/** Scrolls `by` candles toward older history (negative: toward the latest). */
export const pan = (view: View, by: number, total: number): View => clampView({ ...view, offset: view.offset + by }, total);

/** Scales the candle count by 1/`factor`, keeping the candle under `anchor` (0 left edge .. 1 right edge) where it is. */
export function zoom(view: View, factor: number, anchor: number, total: number): View {
  const count = clamp(view.count / factor, MIN_COUNT, MAX_COUNT);
  const under = total - view.offset - view.count + anchor * view.count;
  return clampView({ count, offset: total - (under - anchor * count) - count }, total);
}

/** A candle was added: a view scrolled back keeps its candles, the latest view keeps following. */
export const follow = (view: View, added: number): View => (view.offset > 0 ? { ...view, offset: view.offset + added } : view);

/** The zoom factor of a pinch from the distance between the fingers at its start and now. */
export const pinchFactor = (start: number, now: number) => (start > 0 && now > 0 ? now / start : 1);

/** The view after a native pinch of `scale` (1 = no change, above 1 = fingers spread = fewer candles) on the view it began with. */
export const pinchView = (start: View, scale: number, anchor: number, total: number): View => zoom(start, pinchFactor(1, scale), anchor, total);

export interface Press {
  time: number;
  x: number;
  y: number;
}

/** Two presses within `ms` and `slop` points of each other. */
export function isDoubleTap(previous: Press | null, next: Press, ms = 300, slop = 30): boolean {
  return previous !== null && next.time - previous.time <= ms && Math.hypot(next.x - previous.x, next.y - previous.y) <= slop;
}

/** The visible candles' low..high with 5% padding. */
export function priceRange(candles: Candle[]): { min: number; max: number } {
  if (candles.length === 0) return { min: 0, max: 1 };
  const lo = Math.min(...candles.map((c) => c.low));
  const hi = Math.max(...candles.map((c) => c.high));
  const pad = hi > lo ? (hi - lo) * 0.05 : Math.abs(hi) * 0.001 || 1;
  return { min: lo - pad, max: hi + pad };
}

/** The y of a price in a band `top`..`top + height`, the highest price at the top. */
export const priceToY = (price: number, range: { min: number; max: number }, top: number, height: number) =>
  top + ((range.max - price) / (range.max - range.min)) * height;

/** About `n` round prices inside the range (steps of 1, 2 or 5 times a power of ten). */
export function niceTicks(min: number, max: number, n: number): number[] {
  if (!(max > min)) return [min];
  const raw = (max - min) / n;
  const exp = Math.floor(Math.log10(raw));
  const f = raw / 10 ** exp;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * 10 ** exp;
  const ticks: number[] = [];
  for (let k = Math.ceil(min / step - 1e-9); k <= Math.floor(max / step + 1e-9); k++) ticks.push(Number((k * step).toFixed(10)));
  return ticks;
}

/** The reconnect delay after `attempt` failures in a row: 1 s doubling to 30 s. */
export const backoff = (attempt: number) => Math.min(30_000, 1000 * 2 ** attempt);

export const formatPrice = (p: number) => p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatTime = (seconds: number) => {
  const d = new Date(seconds * 1000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** The candle under x in a plot `plotWidth` wide whose right edge is the candle `total - offset`; clamped to the visible ones. */
export function indexAt(x: number, plotWidth: number, total: number, view: View): number {
  const { start, end } = visibleWindow(total, view);
  const raw = Math.floor(total - view.offset - (plotWidth - x) / (plotWidth / view.count));
  return clamp(raw, start, Math.max(start, end - 1));
}
