// Settings: the display name, shown on an avatar and in Home's greeting.
import { signal, Text, View } from "nsh";
import { initial } from "../domain";
import { displayName, setName } from "../store";
import { currentPosition, decimals5, type Position } from "../location";
import { Button, ButtonLabel } from "../ui/button";
import { Card } from "../ui/card";
import { Field, TextField } from "../ui/field";
import { Icon } from "../ui/icon";
import { heroLinear } from "../ui/surfaces";
import { Title } from "./Title";

/** The "Location" card: a button, then the position or why there is none. */
function LocationCard() {
  const position = signal<Position | null>(null);
  const message = signal("");
  const busy = signal(false);
  const show = async () => {
    busy.set(true);
    try {
      position.set(await currentPosition());
      message.set("");
    } catch (e) {
      position.set(null);
      message.set((e as Error).message);
    } finally {
      busy.set(false);
    }
  };
  return (
    <Field label="Location">
      <Card class="gap-3">
        <Button testID="location-button" disabled={busy()} onPress={show}>
          <ButtonLabel>Show my location</ButtonLabel>
        </Button>
        <If when={position()}>
          {(p) => (
            <View class="gap-1">
              <View testID="location-latitude">
                <Text class="text-base text-card-foreground">{`Latitude ${decimals5(p().latitude)}`}</Text>
              </View>
              <View testID="location-longitude">
                <Text class="text-base text-card-foreground">{`Longitude ${decimals5(p().longitude)}`}</Text>
              </View>
              <View testID="location-accuracy">
                <Text class="text-sm text-muted-foreground">{`Accuracy ${Math.round(p().accuracy)} m`}</Text>
              </View>
            </View>
          )}
        </If>
        <If when={message()}>
          <View testID="location-message">
            <Text class="text-sm text-destructive">{message()}</Text>
          </View>
        </If>
      </Card>
    </Field>
  );
}

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
        <LocationCard />
      </View>
    </View>
  );
}
