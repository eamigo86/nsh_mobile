// Market: a live BTC-USD candlestick chart (Coinbase public REST and WebSocket). The feed runs only while this page is
// mounted, which is while the tab is shown.
import { cleanup, Text, View } from "nsh";
import { changeSince, formatPrice, zoom } from "../market";
import { historyFailed, marketCandles, marketNow, marketStatus, marketView, setView, startMarket } from "../market-store";
import { Button } from "../ui/button";
import { CandleChart } from "../ui/candles";

const STEP = 1.5;

function StatusPill() {
  const text = () => {
    const s = marketStatus();
    if (s.kind === "live") return "Live";
    if (s.kind === "connecting") return "Connecting";
    if (s.kind === "offline") return "Offline";
    const seconds = Math.ceil((s.at - marketNow()) / 1000);
    return seconds > 0 ? `Reconnecting in ${seconds}s` : "Reconnecting";
  };
  const dot = () => {
    const kind = marketStatus().kind;
    return kind === "live" ? "bg-up" : kind === "offline" ? "bg-muted-foreground" : "bg-primary";
  };
  return (
    <View class="flex-row items-center gap-2 rounded-full bg-secondary px-3 py-1" testID="market-status">
      <View class={`size-2 rounded-full ${dot()}`} />
      <Text class="text-xs font-medium text-secondary-foreground">{text()}</Text>
    </View>
  );
}

export function Market() {
  const stop = startMarket();
  cleanup(stop);
  const last = () => marketCandles()[marketCandles().length - 1];
  const change = () => changeSince(marketCandles());
  const tone = () => (change().abs >= 0 ? "text-up" : "text-down");
  const sign = (n: number) => (n >= 0 ? "+" : "-");
  const zoomBy = (factor: number) => setView(zoom(marketView(), factor, 1, marketCandles().length));
  const offset = () => Math.round(marketView().offset);
  return (
    <View class="flex-1">
      <View class="flex-row items-center justify-between px-4 pb-1 pt-3">
        <Text class="text-3xl font-bold text-foreground">BTC-USD</Text>
        <StatusPill />
      </View>
      <View class="px-4 pb-2">
        <Text class="text-4xl font-bold text-foreground" style={{ fontVariant: ["tabular-nums"] }}>
          {last() ? formatPrice(last().close) : "--"}
        </Text>
        <If when={last() !== undefined} else={<Text class="text-sm text-muted-foreground">{historyFailed() ? "Could not load prices. Retrying..." : "Loading prices..."}</Text>}>
          <Text class={`text-sm font-medium ${tone()}`} style={{ fontVariant: ["tabular-nums"] }}>
            {`${sign(change().abs)}${formatPrice(Math.abs(change().abs))} (${sign(change().pct)}${Math.abs(change().pct).toFixed(2)}%)`}
          </Text>
        </If>
      </View>
      <CandleChart />
      <View class="flex-row items-center justify-between gap-2 px-4 py-2">
        <View class="flex-row items-center gap-2">
          <Button variant="glass" size="icon" accessibilityLabel="Zoom out" testID="market-zoom-out" onPress={() => zoomBy(1 / STEP)}>
            <Text class="text-xl font-semibold text-primary">−</Text>
          </Button>
          <Button variant="glass" size="icon" accessibilityLabel="Zoom in" testID="market-zoom-in" onPress={() => zoomBy(STEP)}>
            <Text class="text-xl font-semibold text-primary">+</Text>
          </Button>
        </View>
        <View class="items-center">
          <Text testID="market-count" class="text-sm font-medium text-foreground">{`${Math.round(marketView().count)} candles`}</Text>
          <Text testID="market-offset" class="text-xs text-muted-foreground">{offset() === 0 ? "Live" : `${offset()} min back`}</Text>
        </View>
        <Button variant="glass" accessibilityLabel="Latest" testID="market-latest" disabled={offset() === 0} onPress={() => setView({ ...marketView(), offset: 0 })}>
          <Text class="text-base font-semibold text-primary">Latest</Text>
        </Button>
      </View>
    </View>
  );
}
