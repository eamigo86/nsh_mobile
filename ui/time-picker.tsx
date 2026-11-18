// The "Due time" control: NSH's DateTimePicker on iOS (the system's compact time picker), NSH's TimeField everywhere
// else. DateTimePicker has no tint prop, so the iOS picker draws in the system's accent.
import { platform } from "nsh";
import { DateTimePicker } from "nsh/mobile";
import { TimeField } from "nsh/base";

/** `value` and what `onChange` gets are "HH:MM", 24-hour. */
export function TimePicker(props: { value: string; onChange: (value: string) => void }) {
  return (
    <If
      when={platform.os === "ios"}
      else={
        <TimeField
          accessibilityLabel="Due time"
          value={props.value}
          onChange={({ value }) => props.onChange(value)}
          segmentClass="rounded-md px-1 text-base tabular-nums text-primary focus:bg-primary/15"
          separatorClass="text-base text-primary"
        />
      }
    >
      <DateTimePicker
        mode="time"
        testID="form-time-native"
        accessibilityLabel="Due time"
        value={props.value}
        onChange={({ value }) => props.onChange(value)}
      />
    </If>
  );
}
