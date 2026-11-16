// The profile avatar: the photo as a round image (cover: the centre of a non-square photo), else the
// name's initial or a person glyph on the hero gradient. With `onPress` it is a button.
import { Image, Text, View } from "nsh";
import { Button as BaseButton } from "nsh/base";
import { initial } from "../domain";
import { displayName, photoUri } from "../store";
import { Icon } from "./icon";
import { heroLinear } from "./surfaces";

// Home's avatar sits on the hero, so it gets a ring that reads in light and dark.
const SIZES = {
  sm: { box: "size-11 border-2 border-on-hero", text: "text-xl", icon: "md" },
  lg: { box: "size-16", text: "text-3xl", icon: "lg" },
} as const;

export function Avatar(props: { testID: string; photoID: string; size: keyof typeof SIZES; label?: string; onPress?: () => void }) {
  const look = SIZES[props.size];
  const face = (
    <View class={`items-center justify-center overflow-hidden rounded-full ${look.box}`} style={{ backgroundImage: heroLinear() }}>
      <If
        when={photoUri() !== ""}
        else={
          <If when={initial(displayName()) !== ""} else={<Icon name="person" size={look.icon} color="on-hero" />}>
            <Text class={`${look.text} font-semibold text-on-hero`}>{initial(displayName())}</Text>
          </If>
        }
      >
        <Image testID={props.photoID} src={photoUri()} class="size-full rounded-full" style={{ objectFit: "cover" }} accessibilityElementsHidden />
      </If>
    </View>
  );
  return props.onPress ? (
    <BaseButton testID={props.testID} accessibilityLabel={props.label} onPress={props.onPress}>
      {face}
    </BaseButton>
  ) : (
    <View testID={props.testID} accessibilityElementsHidden>
      {face}
    </View>
  );
}
