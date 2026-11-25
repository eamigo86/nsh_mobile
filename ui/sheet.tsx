// A bottom sheet for forms: its content is made on each opening, so drafts start fresh.
import { type JSX, platform, Text, View } from "nsh";
import { Sheet } from "nsh/base";
import { Button } from "./button";
import { Icon } from "./icon";

const KEYBOARD_ROOM = platform.os === "android" ? " pb-[env(keyboard-inset-height)]" : "";

export function FormSheet(props: { open: boolean; onClose: () => void; children?: JSX.Element }) {
  return (
    <Sheet
      open={props.open}
      onOpenChange={({ open }) => !open && props.onClose()}
      closeOnSwipe
      popupClass={`rounded-t-3xl bg-background${KEYBOARD_ROOM}`}
      popupStyle={{ maxHeight: "92%" }}
      backdropClass="bg-scrim"
    >
      {props.children}
    </Sheet>
  );
}

/** Cancel, a title and Save, the same on every form sheet. */
export function SheetHeader(props: {
  title: string;
  canSave: boolean;
  onCancel: () => void;
  onSave: () => void;
  cancelTestID: string;
  saveTestID: string;
}) {
  return (
    <View class="flex-row items-center justify-between p-3">
      <Button variant="ghost" size="icon" accessibilityLabel="Cancel" testID={props.cancelTestID} onPress={props.onCancel}>
        <Icon name="close" color="foreground" size="lg" />
      </Button>
      <Text class="text-lg font-semibold text-foreground">
        {props.title}
      </Text>
      <Button
        size="icon"
        accessibilityLabel="Save"
        testID={props.saveTestID}
        disabled={!props.canSave}
        onPress={props.onSave}
      >
        <Icon name="check" color="primary-foreground" size="lg" />
      </Button>
    </View>
  );
}
