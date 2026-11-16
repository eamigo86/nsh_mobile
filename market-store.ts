// The Market tab's state. Ticks fold into a plain array and reach the signals about once a second (the chart redraws
// then); gestures write `view` directly. `startMarket` runs while the tab is shown: it loads the history and opens the feed.
import { signal } from "nsh";
import { connectFeed, type FeedStatus } from "./feed";
import { applyTick, type Candle, clampView, DEFAULT_COUNT, follow, mergeHistory, parseRows, type View } from "./market";

export const HISTORY_URL = "https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=60";
const FLUSH_MS = 1000;
const RETRY_MS = 5000;

const candles = signal<Candle[]>([]);
const view = signal<View>({ count: DEFAULT_COUNT, offset: 0 });
const status = signal<FeedStatus>({ kind: "offline" });
const failed = signal(false);
const clock = signal(Date.now());

export const marketCandles = () => candles();
export const marketView = () => view();
export const marketStatus = () => status();
/** True after the history failed to load and no candle is on screen. */
export const historyFailed = () => failed() && candles().length === 0;
/** The wall clock, to the second, for the retry countdown. */
export const marketNow = () => clock();

export const setView = (next: View) => view.set(clampView(next, candles().length));
export const resetView = () => view.set({ count: DEFAULT_COUNT, offset: 0 });

export function startMarket(): () => void {
  let live = candles();
  let dirty = false;
  let stopped = false;
  let retry: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    clock.set(Date.now());
    if (!dirty) return;
    dirty = false;
    const added = Math.max(0, live.length - candles().length);
    candles.set(live);
    if (added > 0) view.update((v) => clampView(follow(v, added), live.length));
  };

  const loadHistory = async () => {
    try {
      const response = await fetch(HISTORY_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = parseRows(await response.json());
      if (rows.length === 0) throw new Error("no rows");
      if (stopped) return;
      live = mergeHistory(live, rows);
      dirty = true;
      failed.set(false);
      flush();
    } catch (e) {
      console.warn(`market: history not loaded (${e})`);
      if (stopped) return;
      failed.set(true);
      retry = setTimeout(loadHistory, RETRY_MS);
    }
  };

  loadHistory();
  const timer = setInterval(flush, FLUSH_MS);
  const feed = connectFeed({
    onTick: (tick) => {
      live = applyTick(live, tick);
      dirty = true;
    },
    onStatus: (s) => status.set(s),
    onOpen: (again) => again && loadHistory(),
  });

  return () => {
    stopped = true;
    clearInterval(timer);
    if (retry !== undefined) clearTimeout(retry);
    feed.stop();
  };
}
