// Settings: the display name, shown on an avatar and in Home's greeting.
import { Text, View } from "nsh";
import { initial } from "../domain";
import { displayName, setName } from "../store";
import { Field, TextField } from "../ui/field";
import { Icon } from "../ui/icon";
import { heroLinear } from "../ui/surfaces";
import { Title } from "./Title";

export function Settings() {
  return (
    <View class="flex-1">
      <Title>Settings</Title>
      <View class="gap-5 p-4">
        <View class="flex-row items-center gap-4 rounded-3xl bg-card p-4">
          <View class="size-16 items-center justify-center rounded-full" style={{ backgroundImage: heroLinear() }} testID="avatar">
            <If when={initial(displayName()) !== ""} else={<Icon name="person" size="lg" color="on-hero" />}>
              <Text class="text-3xl font-semibold text-on-hero">{initial(displayName())}</Text>
            </If>
          </View>
          <Text class="flex-1 text-lg font-semibold text-card-foreground">{displayName().trim() === "" ? "Your name" : displayName().trim()}</Text>
        </View>
        <Field label="Display name">
          <TextField
            testID="settings-name"
            accessibilityLabel="Display name"
            placeholder="Display name"
            capitalize="words"
            value={displayName()}
            onChange={setName}
          />
        </Field>
        <Text class="px-4 text-sm text-muted-foreground">Shown in the greeting on Home.</Text>
      </View>
    </View>
  );
}
