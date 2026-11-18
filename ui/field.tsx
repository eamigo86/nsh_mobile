// Form controls: a text field, a select row and a date row, all on the same rounded surface.
import { Text, View } from "nsh";
import { type CalendarEntry, DatePicker, Input, Select } from "nsh/base";
import { DateTimePicker } from "nsh/mobile";
import { MONTH_NAMES } from "../domain";
import { TextButton } from "./button";
import { Icon } from "./icon";
import { hasNativePicker } from "./time-picker";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
// The calendar draws numbers for weekdays and months; the app says them in words.
const calendarLabel = (e: CalendarEntry) =>
  e.kind === "weekday" ? WEEKDAYS[e.value] : e.kind === "monthToggle" || e.kind === "month" ? MONTH_NAMES[e.month - 1].slice(0, 3) : e.kind === "previous" ? "‹" : e.kind === "next" ? "›" : String(e.value);

const ROW = "min-h-12 flex-row items-center justify-between gap-3 rounded-2xl bg-card px-4";

export function Field(props: { label?: string; hint?: string; hintTestID?: string; error?: string; errorTestID?: string; children: import("nsh").JSX.Element }) {
  return (
    <View class="gap-1.5">
      <If when={props.label}>
        <Text class="px-4 text-sm font-medium uppercase text-muted-foreground">{props.label}</Text>
      </If>
      {props.children}
      <If when={props.hint}>
        <View testID={props.hintTestID}>
          <Text class="px-4 text-sm text-muted-foreground">{props.hint}</Text>
        </View>
      </If>
      <If when={props.error}>
        <View testID={props.errorTestID}>
          <Text class="px-4 text-sm text-destructive">{props.error}</Text>
        </View>
      </If>
    </View>
  );
}

export function TextField(props: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  testID?: string;
  multiline?: boolean;
  autoFocus?: boolean;
  capitalize?: "words" | "sentences";
  onSubmit?: () => void;
}) {
  return (
    <Input
      testID={props.testID}
      accessibilityLabel={props.accessibilityLabel}
      value={props.value}
      onChange={({ value }) => props.onChange(value)}
      onSubmit={() => props.onSubmit?.()}
      placeholder={props.placeholder}
      multiline={props.multiline}
      autoFocus={props.autoFocus}
      autoCapitalize={props.capitalize ?? "sentences"}
      class={`rounded-2xl bg-card px-4 text-base text-card-foreground placeholder:text-muted-foreground ${props.multiline ? "min-h-24 py-3" : "min-h-12"}`}
    />
  );
}

/** A labelled row that opens a list of choices (a sheet on phones). */
export function SelectRow(props: {
  label: string;
  value: string;
  items: { value: string; title: string }[];
  onChange: (value: string) => void;
  testID?: string;
  itemTestIDPrefix?: string;
}) {
  const shown = () => props.items.find((i) => i.value === props.value)?.title ?? "";
  return (
    <Select
      accessibilityLabel={props.label}
      value={props.value}
      items={props.items}
      onChange={({ value }) => props.onChange(value ?? "")}
      popupClass="rounded-t-3xl bg-popover p-2 pb-[env(safe-area-inset-bottom)]"
      backdropClass="bg-scrim"
      itemClass="min-h-12 flex-row items-center rounded-xl px-4 text-popover-foreground selected:bg-muted"
      itemStyle={{ fontSize: 17 }}
      trigger={
        <View testID={props.testID} class={ROW}>
          <Text class="text-base text-card-foreground">{props.label}</Text>
          <View class="flex-row items-center gap-1.5">
            <Text class="text-base text-primary">{shown()}</Text>
          </View>
        </View>
      }
    />
  );
}

/**
 * A labelled row for a day; `value` is `YYYY-MM-DD` or empty. Desktops and the web open a calendar. iOS and Android use
 * the system picker, which with no value would show today and hide that there is none, so an empty row offers "Add date".
 */
export function DateRow(props: { label: string; value: string; text: string; today: string; onChange: (value: string) => void; testID?: string }) {
  return (
    <If
      when={hasNativePicker()}
      else={
        <DatePicker
          accessibilityLabel={props.label}
          value={props.value === "" ? null : props.value}
          onChange={({ value }) => props.onChange(typeof value === "string" ? value.slice(0, 10) : "")}
          popupClass="rounded-t-3xl bg-popover p-4 pb-[env(safe-area-inset-bottom)]"
          backdropClass="bg-scrim"
          itemClass="group size-10 items-center justify-center rounded-full selected:bg-primary data-today:border data-today:border-primary"
          renderItem={(e) => <Text class="text-base text-popover-foreground group-selected:text-primary-foreground">{calendarLabel(e)}</Text>}
          trigger={
            <View testID={props.testID} class={ROW}>
              <Text class="text-base text-card-foreground">{props.label}</Text>
              <View class="flex-row items-center gap-2">
                <Text class={`text-base ${props.value === "" ? "text-muted-foreground" : "text-primary"}`}>{props.text}</Text>
                <Icon name="calendar" size="sm" color="muted-foreground" />
              </View>
            </View>
          }
        />
      }
    >
      <View testID={props.testID} class={ROW}>
        <Text class="text-base text-card-foreground">{props.label}</Text>
        <If
          when={props.value !== ""}
          else={<TextButton testID="form-add-date" label="Add date" onPress={() => props.onChange(props.today)} />}
        >
          <DateTimePicker
            mode="date"
            testID="form-due-native"
            accessibilityLabel={props.label}
            value={props.value}
            onChange={({ value }) => props.onChange(value)}
          />
        </If>
      </View>
    </If>
  );
}
