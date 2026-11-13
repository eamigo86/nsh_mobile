// Buttons: one look and one press feedback for the whole app. Callers place them (width, margin)
// but never colour them; a new look is a new `variant` here.
import { split, Text, type JSX } from "nsh";
import { Button as BaseButton } from "nsh/base";
import { motion } from "./motion";
import { glassStyle } from "./surfaces";

const VARIANTS = {
  primary: "bg-primary disabled:opacity-40",
  glass: "bg-glass-tint disabled:opacity-40",
  ghost: "disabled:opacity-40",
} as const;
const SIZES = { md: "min-h-11 px-5 rounded-full", icon: "size-11 rounded-full", fab: "size-14 rounded-full" } as const;

export interface ButtonProps {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  class?: string;
  onPress?: () => void;
  children?: JSX.Element;
}

export function Button(props: ButtonProps) {
  const [own, rest] = split(props, ["variant", "size", "class"]);
  return (
    <BaseButton
      {...rest}
      class={`items-center justify-center ${VARIANTS[own.variant ?? "primary"]} ${SIZES[own.size ?? "md"]} ${motion.press} ${own.class ?? ""}`}
      style={own.variant === "glass" ? glassStyle() : undefined}
    />
  );
}

/** A text label in the colour that reads on the button's variant. */
export function ButtonLabel(props: { variant?: keyof typeof VARIANTS; children: string }) {
  return (
    <Text class={`text-base font-semibold ${props.variant === "primary" || props.variant === undefined ? "text-primary-foreground" : "text-primary"}`}>
      {props.children}
    </Text>
  );
}

/** A text-only link-style button ("Remove Due Date"). */
export function TextButton(props: { label: string; testID?: string; onPress?: () => void; destructive?: boolean }) {
  return (
    <BaseButton testID={props.testID} onPress={props.onPress} class={`min-h-11 justify-center ${motion.fade}`}>
      <Text class={`text-base ${props.destructive ? "text-destructive" : "text-primary"}`}>{props.label}</Text>
    </BaseButton>
  );
}
