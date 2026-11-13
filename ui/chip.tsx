// A filter chip: glass at rest, the accent when selected.
import { Text } from "nsh";
import { Button } from "nsh/base";
import { motion } from "./motion";
import { glassFallback, glassStyle } from "./surfaces";

export function Chip(props: { label: string; selected: boolean; testID?: string; onPress: () => void }) {
  return (
    <Button
      testID={props.testID}
      selected={props.selected}
      onPress={props.onPress}
      class={`min-h-9 items-center justify-center rounded-full px-4 ${motion.press} ${motion.colors} ${props.selected ? "bg-primary" : glassFallback}`}
      style={props.selected ? undefined : glassStyle()}
    >
      <Text class={`text-sm font-medium ${props.selected ? "text-primary-foreground" : "text-on-hero"}`}>{props.label}</Text>
    </Button>
  );
}
