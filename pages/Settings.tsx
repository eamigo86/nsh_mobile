// Settings: the display name (an avatar and Home's greeting), the appearance, the onboarding and the location.
import { Scroll, signal, Text, View } from "nsh";
import { Radio, RadioGroup } from "nsh/base";
import { type Appearance, APPEARANCES } from "../domain";
import { appearanceChoice, displayName, pickPhoto, photoUri, setAppearance, setName, setPhoto, showOnboarding } from "../store";
import { currentPosition, decimals5, type Position } from "../location";
import { Avatar } from "../ui/avatar";
import { Button, ButtonLabel } from "../ui/button";
import { Card } from "../ui/card";
import { Field, TextField } from "../ui/field";
import { motion } from "../ui/motion";
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

const APPEARANCE_LABELS: Record<Appearance, string> = { system: "System", light: "Light", dark: "Dark" };

/** The "Appearance" card: one of System, Light or Dark, as a segmented row of radios. */
function AppearanceCard() {
  return (
    <Field label="Appearance">
      <RadioGroup class="flex-row gap-1 rounded-2xl bg-card p-1">
        {APPEARANCES.map((choice) => (
          <Radio
            testID={`appearance-${choice}`}
            accessibilityLabel={APPEARANCE_LABELS[choice]}
            checked={appearanceChoice() === choice}
            onChange={() => setAppearance(choice)}
            class={`min-h-10 flex-1 items-center justify-center rounded-xl ${motion.colors} ${appearanceChoice() === choice ? "bg-primary" : ""}`}
          >
            <Text class={`text-base font-medium ${appearanceChoice() === choice ? "text-primary-foreground" : "text-card-foreground"}`}>
              {APPEARANCE_LABELS[choice]}
            </Text>
          </Radio>
        ))}
      </RadioGroup>
    </Field>
  );
}

/** The profile card: the avatar (a button), the name, and the photo buttons. */
function ProfileCard() {
  const error = signal("");
  const choose = async () => error.set(await pickPhoto());
  return (
    <View testID="settings-profile" class="gap-3 rounded-3xl bg-card p-4">
      <View class="flex-row items-center gap-4">
        <Avatar testID="avatar" photoID="avatar-photo" size="lg" label="Change profile photo" onPress={choose} />
        <Text class="flex-1 text-lg font-semibold text-card-foreground">{displayName().trim() === "" ? "Your name" : displayName().trim()}</Text>
      </View>
      <View class="flex-row flex-wrap gap-2">
        <Button testID="choose-photo" variant="glass" onPress={choose}>
          <ButtonLabel variant="glass">Choose photo</ButtonLabel>
        </Button>
        <If when={photoUri() !== ""}>
          <Button testID="remove-photo" variant="ghost" onPress={() => setPhoto("")}>
            <ButtonLabel variant="ghost">Remove photo</ButtonLabel>
          </Button>
        </If>
      </View>
      <If when={error()}>
        <View testID="photo-error">
          <Text class="text-sm text-destructive">{error()}</Text>
        </View>
      </If>
    </View>
  );
}

export function Settings() {
  return (
    <View class="flex-1">
      <Title>Settings</Title>
      <Scroll class="flex-1">
        <View class="gap-5 p-4">
          <ProfileCard />
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
          <AppearanceCard />
          <Field label="Welcome">
            <Card>
              <Button testID="onboarding-again" onPress={showOnboarding}>
                <ButtonLabel>Show onboarding again</ButtonLabel>
              </Button>
            </Card>
          </Field>
          <LocationCard />
        </View>
      </Scroll>
    </View>
  );
}
