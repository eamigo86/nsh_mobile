// A progress ring: a track and an arc, drawn natively in theme colours, with the value inside.
import { Canvas, Text, token, View } from "nsh";

export function Ring(props: { fraction: number; label: string; caption: string }) {
  return (
    <View class="size-28 items-center justify-center" accessibilityLabel={`${props.label} ${props.caption}`}>
      <Canvas
        class="absolute inset-0"
        draw={(cx, size) => {
          const c = size.width / 2;
          const r = c - 7;
          cx.lineWidth = 10;
          cx.lineCap = "round";
          cx.strokeStyle = token("border");
          cx.beginPath();
          cx.arc(c, c, r, 0, Math.PI * 2);
          cx.stroke();
          const f = Math.min(1, Math.max(0, props.fraction));
          if (f > 0) {
            cx.strokeStyle = token("cat-green");
            cx.beginPath();
            cx.arc(c, c, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f);
            cx.stroke();
          }
        }}
      />
      <Text class="text-2xl font-medium text-card-foreground">{props.label}</Text>
      <Text class="text-xs text-muted-foreground">{props.caption}</Text>
    </View>
  );
}
