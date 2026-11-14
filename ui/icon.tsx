// Stroked glyphs (24 x 24 grid, round caps), drawn natively on a canvas in a theme colour:
// they follow the appearance with no image assets.
import { Canvas, Path2D, token } from "nsh";

const PATHS = {
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  alert: "M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0zM12 8v5M12 16.5h.01",
  plus: "M12 5v14M5 12h14",
  close: "M18 6 6 18M6 6l12 12",
  check: "M20 6 9 17l-5-5",
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  settings: "M20 7h-9M14 17H5M17 17a3 3 0 1 1-6 0a3 3 0 0 1 6 0zM10 7a3 3 0 1 1-6 0a3 3 0 0 1 6 0z",
  person: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0a4 4 0 0 1 8 0z",
  chevron: "m9 18 6-6-6-6",
  clock: "M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0zM12 7v5l3 2",
} as const;

export type IconName = keyof typeof PATHS;
export type IconColor =
  | "foreground"
  | "muted-foreground"
  | "primary"
  | "primary-foreground"
  | "destructive"
  | "on-hero"
  | "on-color";
const SIZES = { sm: "size-4", md: "size-5", lg: "size-6" } as const;

export function Icon(props: { name: IconName; color?: IconColor; size?: keyof typeof SIZES }) {
  const path = () => new Path2D(PATHS[props.name]);
  return (
    <Canvas
      class={SIZES[props.size ?? "md"]}
      accessibilityElementsHidden
      draw={(cx, size) => {
        cx.scale(size.width / 24, size.height / 24);
        cx.strokeStyle = token(props.color ?? "foreground");
        cx.lineWidth = 2;
        cx.lineCap = "round";
        cx.lineJoin = "round";
        cx.stroke(path());
      }}
    />
  );
}
