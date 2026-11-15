// The "Due time" control: the system time picker where this app's Rust crate registers it (iOS, packaged or run
// with the crate), NSH's TimeField everywhere else. The crate says so itself: `TimePicker.available()` is true on
// iOS and the module is missing in a plain `nsh build` bundle (an embedding host), so both fall back. The headless
// runner has no native components either (it runs on this machine, where the crate answers false).
import { colorScheme, nativeComponent, nativeModule } from "nsh";
import { TimeField } from "nsh/base";

const CRATE_SET = "nshtodo/native";

/** theme.json's primary, light and dark: the picker draws its time in it. */
const TINT = { light: "#c2410c", dark: "#e8692e" };

const NativeTimePicker = nativeComponent<{ value: string; tint: string }, { change: { value: string } }>("nshtodo.timePicker", {
  props: ["value", "tint"],
  events: ["change"],
});

function nativePickerAvailable(): boolean {
  try {
    return nativeModule<{ TimePicker: { available(): boolean } }>(CRATE_SET).TimePicker.available();
  } catch {
    return false; // ReferenceError: nothing registered under CRATE_SET
  }
}

/** `value` and what `onChange` gets are "HH:MM", 24-hour. */
export function TimePicker(props: { value: string; onChange: (value: string) => void }) {
  return (
    <If
      when={nativePickerAvailable()}
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
      <NativePicker value={props.value} onChange={props.onChange} />
    </If>
  );
}

function NativePicker(props: { value: string; onChange: (value: string) => void }) {
  return (
    <NativeTimePicker
      testID="form-time-native"
      accessibilityLabel="Due time"
      value={props.value}
      tint={TINT[colorScheme() === "dark" ? "dark" : "light"]}
      onChange={({ value }) => props.onChange(value)}
    />
  );
}
