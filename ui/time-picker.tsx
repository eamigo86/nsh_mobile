// The "Due time" control: NSH's DateTimePicker on iOS and Android (the system's compact time picker, the system's time
// dialog), NSH's TimeField on desktops and the web, where DateTimePicker shows nothing. It has no tint prop, so the
// pickers draw in the system's accent.
import { platform } from "nsh";
import { DateTimePicker } from "nsh/mobile";
import { TimeField } from "nsh/base";

/** True where NSH's DateTimePicker draws something (the system pickers); desktops and the web have none. */
export const hasNativePicker = () => platform.os === "ios" || platform.os === "android";

/** `value` and what `onChange` gets are "HH:MM", 24-hour. */
export function TimePicker(props: { value: string; onChange: (value: string) => void }) {
  return (
    <If
      when={hasNativePicker()}
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
