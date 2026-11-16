// The animated splash: the logo (the tile and the paper are SVG layers, the two lines are views that grow, the
// check mark is a canvas stroke that draws itself), then the name; about 1.5 s, then a fade to the app.
// Reduced motion: the logo rests at once and only a short plain fade plays.
import { Animated, Canvas, createAnimatedValue, createMotion, Easing, effect, Image, Path2D, reduceMotion, Text, View } from "nsh";
import paper from "../assets/brand/logo-paper.svg";
import tile from "../assets/brand/logo-tile.svg";

const SIZE = 120;
const U = SIZE / 512; // the logo's units (a 512 grid) in points
const CHECK = new Path2D("M190 318l46 46 92-108");
const CHECK_LENGTH = 208; // a little over the path's own length (207.2), so the dash is never short
const LINES = [
  { x: 172, y: 168, w: 96 },
  { x: 172, y: 212, w: 64 },
];
const HOLD = 1250; // ms until the fade starts, counted from the first frame
const rise = { opacity: [0, 1], translateY: [10, 0] };

export function Splash(props: { ready: () => boolean; onReveal: () => void; onDone: () => void }) {
  const quiet = reduceMotion();
  const group = createMotion({ initial: quiet ? {} : { opacity: 0, scale: 0.6 } });
  const lines = LINES.map(() => createMotion({ initial: quiet ? {} : { scaleX: 0 } }));
  const name = createMotion({ initial: quiet ? {} : { opacity: 0, translateY: 10 } });
  const dash = createAnimatedValue(quiet ? 0 : CHECK_LENGTH);
  const screen = createMotion();

  if (!quiet)
    Animated.parallel([
      group.animation({ duration: 450, keyframes: { opacity: [0, 1], scale: [0.6, 1.06, 1] } }),
      ...lines.map((m, i) => m.animation({ duration: 250, delay: 300 + i * 50, keyframes: { scaleX: [0, 1] }, easing: Easing.out(Easing.cubic) })),
      Animated.timing(dash, { toValue: 0, duration: 300, delay: 600, easing: Easing.out(Easing.cubic) }),
      name.animation({ duration: 300, delay: 700, keyframes: rise }),
    ]).start();

  // Leaves once the animation has had its time and the saved data has loaded.
  let timeUp = false;
  let left = false;
  const leave = () => {
    if (left || !timeUp || !props.ready()) return;
    left = true;
    props.onReveal();
    screen.play({ duration: quiet ? 200 : 250, keyframes: { opacity: [1, 0] } }, { ignoreReduceMotion: true }).then(props.onDone);
  };
  setTimeout(() => {
    timeUp = true;
    leave();
  }, quiet ? 400 : HOLD);
  effect(leave);

  return (
    <View testID="splash" accessibilityLabel="NSH Todo" class="absolute inset-0 items-center justify-center bg-background" style={screen.style}>
      <View style={{ width: SIZE, height: SIZE, ...group.style }} accessibilityElementsHidden>
        <Image src={tile} style={{ position: "absolute", width: SIZE, height: SIZE }} />
        <Image src={paper} style={{ position: "absolute", width: SIZE, height: SIZE }} />
        {LINES.map((l, i) => (
          <View
            style={{
              position: "absolute",
              left: l.x * U,
              top: l.y * U,
              width: l.w * U,
              height: 20 * U,
              borderRadius: 10 * U,
              backgroundColor: "#f3d9c8",
              transformOrigin: "left",
              ...lines[i].style,
            }}
          />
        ))}
        <Canvas
          style={{ position: "absolute", width: SIZE, height: SIZE }}
          draw={(cx) => {
            cx.scale(U, U);
            cx.strokeStyle = "#c2410c";
            cx.lineWidth = 36;
            cx.lineCap = "round";
            cx.lineJoin = "round";
            cx.setLineDash([CHECK_LENGTH, CHECK_LENGTH]);
            cx.lineDashOffset = dash;
            cx.stroke(CHECK);
          }}
        />
      </View>
      <View class="absolute inset-x-0 items-center" style={{ top: "50%", marginTop: SIZE / 2 + 24, ...name.style }}>
        <Text class="text-2xl font-semibold text-foreground">NSH Todo</Text>
      </View>
    </View>
  );
}
