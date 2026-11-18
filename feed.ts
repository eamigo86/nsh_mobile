// The Coinbase ticker feed: one WebSocket that reconnects with growing delays. The socket and the timers are
// injectable because the headless tests cannot receive socket messages (they refuse every connection).
// NSH 0.6.0 packages leave the websocket feature out unless a module imports `websocket`: the global
// WebSocket alone does not count, and without the feature the Market's socket and history never settle.
import "websocket";
import { backoff, parseTick, type Tick } from "./market";

export const FEED_URL = "wss://ws-feed.exchange.coinbase.com";
const SUBSCRIBE = JSON.stringify({ type: "subscribe", product_ids: ["BTC-USD"], channels: ["ticker"] });

export type FeedStatus = { kind: "connecting" } | { kind: "live" } | { kind: "reconnecting"; at: number } | { kind: "offline" };

export interface SocketLike {
  onopen: (() => void) | null;
  onmessage: ((e: { data: any }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  send(data: string): void;
  close(): void;
}

export interface FeedDeps {
  open: (url: string) => SocketLike;
  now: () => number;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (id: unknown) => void;
}

const real: FeedDeps = {
  open: (url) => new WebSocket(url) as unknown as SocketLike,
  now: () => Date.now(),
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};

export interface FeedHandlers {
  onTick: (tick: Tick) => void;
  onStatus: (status: FeedStatus) => void;
  /** The socket opened; `again` is true after earlier failures, when the history may have a gap to refetch. */
  onOpen?: (again: boolean) => void;
}

/** Connects at once; reconnects after a failure (1 s doubling to 30 s, back to 1 s after a good open) until `stop()`. */
export function connectFeed(handlers: FeedHandlers, deps: FeedDeps = real) {
  let attempt = 0;
  let stopped = false;
  let socket: SocketLike | undefined;
  let timer: unknown;
  handlers.onStatus({ kind: "connecting" });

  const connect = () => {
    timer = undefined;
    const mine = deps.open(FEED_URL);
    socket = mine;
    let dead = false;
    const fail = () => {
      if (dead || stopped) return;
      dead = true;
      const delay = backoff(attempt++);
      handlers.onStatus({ kind: "reconnecting", at: deps.now() + delay });
      timer = deps.setTimer(() => {
        handlers.onStatus({ kind: "reconnecting", at: deps.now() });
        connect();
      }, delay);
    };
    mine.onopen = () => {
      if (stopped) return;
      mine.send(SUBSCRIBE);
      const again = attempt > 0;
      attempt = 0;
      handlers.onStatus({ kind: "live" });
      handlers.onOpen?.(again);
    };
    mine.onmessage = (e) => {
      const tick = typeof e.data === "string" ? parseTick(e.data) : null;
      if (tick) handlers.onTick(tick);
    };
    mine.onerror = fail;
    mine.onclose = fail;
  };
  connect();

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      if (timer !== undefined) deps.clearTimer(timer);
      try {
        socket?.close();
      } catch {
        // already closed
      }
      handlers.onStatus({ kind: "offline" });
    },
  };
}
