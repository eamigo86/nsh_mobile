// The surface everything sits on. `tint` colours a category card; callers never pick colours.
import { type JSX, View } from "nsh";
import type { CategoryColor } from "../domain";

const TINTS: Record<CategoryColor, string> = {
  blue: "bg-cat-blue-tint",
  violet: "bg-cat-violet-tint",
  pink: "bg-cat-pink-tint",
  orange: "bg-cat-orange-tint",
  green: "bg-cat-green-tint",
  teal: "bg-cat-teal-tint",
};
const SOLIDS: Record<CategoryColor, string> = {
  blue: "bg-cat-blue",
  violet: "bg-cat-violet",
  pink: "bg-cat-pink",
  orange: "bg-cat-orange",
  green: "bg-cat-green",
  teal: "bg-cat-teal",
};

export function Card(props: { tint?: CategoryColor; testID?: string; class?: string; children?: JSX.Element }) {
  return (
    <View testID={props.testID} class={`rounded-3xl p-4 ${props.tint ? TINTS[props.tint] : "bg-card"} ${props.class ?? ""}`}>
      {props.children}
    </View>
  );
}

/** A category's colour as a dot (`size` of the Tailwind scale in `class`) or a badge background. */
export function ColorDot(props: { color: CategoryColor | null; class: string }) {
  return <View class={`rounded-full ${props.color ? SOLIDS[props.color] : "bg-muted-foreground"} ${props.class}`} />;
}
export const solidClass = (c: CategoryColor) => SOLIDS[c];
