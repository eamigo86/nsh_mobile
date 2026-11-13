// The large title every tab page starts with, with an optional action at its end.
import { type JSX, Text, View } from "nsh";

export function Title(props: { children: string; action?: JSX.Element }) {
  return (
    <View class="flex-row items-center justify-between px-4 pb-2 pt-3">
      <Text class="text-3xl font-bold text-foreground">{props.children}</Text>
      {props.action}
    </View>
  );
}
