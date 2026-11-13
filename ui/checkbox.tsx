// A round checkbox: a ring at rest, the accent with a tick when done.
import { Checkbox as BaseCheckbox } from "nsh/base";
import { motion } from "./motion";
import { Icon } from "./icon";

export function Checkbox(props: { checked: boolean; label: string; testID?: string; onChange: (checked: boolean) => void }) {
  return (
    <BaseCheckbox
      testID={props.testID}
      checked={props.checked}
      accessibilityLabel={props.label}
      hitSlop={12}
      onChange={({ checked }) => props.onChange(checked)}
      class={motion.press}
      indicatorClass={`size-6 items-center justify-center rounded-full border-2 border-input checked:border-primary checked:bg-primary ${motion.colors}`}
      indicator={props.checked ? <Icon name="check" size="sm" color="primary-foreground" /> : undefined}
    />
  );
}
