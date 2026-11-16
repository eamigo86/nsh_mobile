// The candlestick chart: one canvas, drawn from the candles and the view, with the gestures on it. Candles of one colour
// go into one path (two fills, two strokes for the whole chart). Pinch is the platform's: it drives an animated scale
// that stretches the canvas while the fingers move, and the real zoom is applied when they lift (the JS side hears no
// per-frame scale, and iOS gives the responder one touch only). Pan, crosshair and double tap come from the responder.
import { AnimatedValue, Canvas, type CanvasRenderingContext2D, Path2D, signal, Text, token, View } from "nsh";
import {
  type Candle,
  formatPrice,
  formatTime,
  indexAt,
  isDoubleTap,
  niceTicks,
  pan,
  pinchView,
  type Press,
  priceRange,
  priceToY,
  type View as ViewState,
  visibleWindow,
} from "../market";
import { marketCandles, marketView, resetView, setView } from "../market-store";

const AXIS = 64; // the price axis at the right
const TOP = 8;
const BOTTOM = 22; // the time axis
const VOLUME = 0.2; // the share of the plot the volume bars take
const LONG_PRESS_MS = 400;
const MOVE_SLOP = 8;
const FONT = "11px sans-serif";

const cross = signal<{ x: number; y: number } | null>(null);

/** The candle under the crosshair, for the readout. */
const crossCandle = (width: number): Candle | undefined => {
  const c = cross();
  const list = marketCandles();
  return c && width > 0 ? list[indexAt(c.x, width - AXIS, list.length, marketView())] : undefined;
};

function draw(cx: CanvasRenderingContext2D, size: { width: number; height: number }) {
  const list = marketCandles();
  const v = marketView();
  const { start, end } = visibleWindow(list.length, v);
  const shown = list.slice(start, end);
  const { width, height } = size;
  const plotW = width - AXIS;
  const plotH = height - TOP - BOTTOM;
  const priceH = plotH * (1 - VOLUME) - 6;
  const volTop = TOP + plotH * (1 - VOLUME);
  const slot = plotW / v.count;
  const x = (i: number) => plotW - (list.length - v.offset - (i + 0.5)) * slot;
  const up = token("up");
  const down = token("down");
  cx.font = FONT;
  cx.fontVariantNumeric = "tabular-nums";
  if (shown.length === 0) return;

  const range = priceRange(shown);
  const y = (p: number) => priceToY(p, range, TOP, priceH);
  const grid = token("border");
  const label = token("muted-foreground");

  // Grid and price labels.
  cx.textAlign = "right";
  cx.textBaseline = "middle";
  cx.lineWidth = 1;
  cx.strokeStyle = grid;
  cx.fillStyle = label;
  cx.beginPath();
  const ticks = niceTicks(range.min, range.max, 5);
  for (const t of ticks) {
    cx.moveTo(0, y(t));
    cx.lineTo(plotW, y(t));
  }
  cx.stroke();
  for (const t of ticks) cx.fillText(formatPrice(t), width - 4, y(t));

  // Time labels: about four.
  cx.textAlign = "center";
  cx.textBaseline = "alphabetic";
  const every = Math.max(1, Math.round(shown.length / 4));
  for (let i = start + every - 1; i < end; i += every) cx.fillText(formatTime(list[i].time), x(i), height - 6);

  // Candles and volume: up and down each go into one path.
  const body = Math.max(1, slot * 0.7);
  const maxVolume = Math.max(...shown.map((c) => c.volume), 1e-9);
  const bodies = { up: new Path2D(), down: new Path2D() };
  const wicks = { up: new Path2D(), down: new Path2D() };
  const volumes = { up: new Path2D(), down: new Path2D() };
  for (let i = start; i < end; i++) {
    const c = list[i];
    const side = c.close >= c.open ? "up" : "down";
    const cxm = x(i);
    const top = y(Math.max(c.open, c.close));
    const bottom = y(Math.min(c.open, c.close));
    bodies[side].rect(cxm - body / 2, top, body, Math.max(1, bottom - top));
    wicks[side].moveTo(cxm, y(c.high));
    wicks[side].lineTo(cxm, y(c.low));
    const vh = (c.volume / maxVolume) * (plotH * VOLUME - 2);
    volumes[side].rect(cxm - body / 2, TOP + plotH - vh, body, vh);
  }
  cx.lineWidth = 1;
  for (const [side, color] of [["up", up], ["down", down]] as const) {
    cx.fillStyle = color;
    cx.strokeStyle = color;
    cx.stroke(wicks[side]);
    cx.fill(bodies[side]);
    cx.globalAlpha = 0.3;
    cx.fill(volumes[side]);
    cx.globalAlpha = 1;
  }

  // The last price: a dashed line and a filled label at the right edge, in the last candle's colour.
  const last = list[list.length - 1];
  const lastY = Math.min(Math.max(y(last.close), TOP + 8), TOP + priceH);
  const lastColor = last.close >= last.open ? up : down;
  cx.setLineDash([4, 4]);
  cx.strokeStyle = lastColor;
  cx.beginPath();
  cx.moveTo(0, lastY);
  cx.lineTo(plotW, lastY);
  cx.stroke();
  cx.setLineDash([]);
  cx.fillStyle = lastColor;
  cx.fillRect(plotW, lastY - 9, AXIS, 18);
  cx.fillStyle = token("on-color");
  cx.textAlign = "right";
  cx.textBaseline = "middle";
  cx.fillText(formatPrice(last.close), width - 4, lastY);

  // The crosshair: a vertical line at the nearest candle, a horizontal one at the finger.
  const touch = cross();
  if (touch) {
    const i = indexAt(touch.x, plotW, list.length, v);
    const fy = Math.min(Math.max(touch.y, TOP), TOP + plotH);
    cx.strokeStyle = token("foreground");
    cx.lineWidth = 1;
    cx.setLineDash([3, 3]);
    cx.beginPath();
    cx.moveTo(x(i), TOP);
    cx.lineTo(x(i), TOP + plotH);
    cx.moveTo(0, fy);
    cx.lineTo(plotW, fy);
    cx.stroke();
    cx.setLineDash([]);
    if (fy <= TOP + priceH) {
      const price = range.max - ((fy - TOP) / priceH) * (range.max - range.min);
      cx.fillStyle = token("foreground");
      cx.fillRect(plotW, fy - 9, AXIS, 18);
      cx.fillStyle = token("background");
      cx.textAlign = "right";
      cx.fillText(formatPrice(price), width - 4, fy);
    }
  }
}

/** What a finger is doing: nothing yet, a pan, a pinch or a crosshair drag. */
type Gesture =
  | { mode: "touch"; x: number; y: number; time: number; timer: ReturnType<typeof setTimeout> }
  | { mode: "pan" | "cross" };

export function CandleChart() {
  let width = 0;
  let gesture: Gesture | null = null;
  let lastTap: Press | null = null;
  let panFrom: { x: number; view: ViewState } | null = null;
  let lastX = 0; // the last finger position seen by the responder: a pinch anchors there (the native event has no centre)
  let pinch: { start: ViewState; anchor: number } | null = null;
  const pinchScale = new AnimatedValue(1);
  const plotW = () => Math.max(1, width - AXIS);
  const finish = () => {
    if (gesture?.mode === "touch") clearTimeout(gesture.timer);
    gesture = null;
    cross.set(null);
  };

  return (
    <View class="flex-1">
      <Canvas
        testID="market-chart"
        accessibilityLabel="BTC-USD candlestick chart"
        class="absolute inset-0"
        draw={draw}
        onLayout={(e) => (width = e.bounds.size.width)}
        onPress={() => {}} // makes the canvas a target for the test's `press`; the responder below does the work
        onStartShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          const t = e.touches[0] ?? e;
          const x = t.locationX;
          const y = t.locationY;
          lastX = x;
          const timer = setTimeout(() => {
            if (gesture?.mode !== "touch") return;
            gesture = { mode: "cross" };
            cross.set({ x, y });
          }, LONG_PRESS_MS);
          gesture = { mode: "touch", x, y, time: Date.now(), timer };
        }}
        onResponderMove={(e) => {
          const g = gesture;
          if (!g) return;
          if (pinch) return; // the native pinch owns the fingers until it ends
          const total = marketCandles().length;
          const t = e.touches[0] ?? e;
          lastX = t.locationX;
          if (g.mode === "cross") return cross.set({ x: t.locationX, y: t.locationY });
          if (g.mode === "touch") {
            if (Math.hypot(t.locationX - g.x, t.locationY - g.y) < MOVE_SLOP) return;
            clearTimeout(g.timer);
            gesture = { mode: "pan" };
            // The pan is measured from where the finger went down: the view is the one it began with.
            panFrom = { x: g.x, view: marketView() };
          }
          if (panFrom) setView(pan(panFrom.view, (t.locationX - panFrom.x) / (plotW() / panFrom.view.count), total));
        }}
        pinch={{ scale: pinchScale }}
        onPinchStart={() => {
          if (gesture?.mode === "touch") clearTimeout(gesture.timer);
          gesture = null;
          panFrom = null;
          cross.set(null);
          pinch = { start: marketView(), anchor: Math.min(1, Math.max(0, lastX / plotW())) };
        }}
        onPinchEnd={(e) => {
          if (pinch) setView(pinchView(pinch.start, e.scale, pinch.anchor, marketCandles().length));
          pinch = null;
          pinchScale.set(1);
        }}
        style={{ transform: [{ scaleX: pinchScale }] }}
        onResponderRelease={() => {
          const g = gesture;
          if (g?.mode === "touch") {
            const press = { time: Date.now(), x: g.x, y: g.y };
            if (isDoubleTap(lastTap, press)) {
              resetView();
              lastTap = null;
            } else lastTap = press;
          } else lastTap = null;
          panFrom = null;
          finish();
        }}
        onResponderTerminate={() => {
          panFrom = null;
          finish();
        }}
      />
      <If when={cross() !== null}>
        <Text testID="market-readout" class="absolute left-2 top-1 text-xs text-foreground" style={{ pointerEvents: "none" }}>
          {readout(crossCandle(width))}
        </Text>
      </If>
    </View>
  );
}

const readout = (c: Candle | undefined) =>
  c
    ? `${formatTime(c.time)}  O ${formatPrice(c.open)}  H ${formatPrice(c.high)}  L ${formatPrice(c.low)}  C ${formatPrice(c.close)}  V ${c.volume.toFixed(2)}`
    : "";
