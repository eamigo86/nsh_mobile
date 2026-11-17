// A row with swipe actions: right reveals Complete, left reveals Edit and Delete (Delete outermost). The drag is
// native (`pan` drives an animated value on the UI thread); JS only decides where the row settles on release.
import { batch, createAnimatedValue, effect, signal, type JSX, View } from "nsh";
import { Button } from "nsh/base";
import { Icon, type IconName } from "./icon";
import { ACTION_WIDTH, settle, type SwipeFull } from "./swipe";

// One row open at a time: the id of the open row, or "".
const openId = signal("");

export function SwipeRow(props: {
  id: string;
  testID: string;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  children?: JSX.Element;
}) {
  const x = createAnimatedValue(0);
  const rested = signal(0);
  let width = 0;
  const moveTo = (to: number) => {
    batch(() => {
      openId.set(to === 0 ? (openId() === props.id ? "" : openId()) : props.id);
      rested.set(to);
    });
    return x.spring(to, { stiffness: 300, damping: 30 });
  };
  const close = () => void moveTo(0);
  effect(() => {
    if (openId() !== props.id && rested() !== 0) close();
  });
  const act = (run: () => void) => () => {
    close();
    run();
  };
  const finish = (full: SwipeFull) => void moveTo(full === "complete" ? width : -width).then(() => (full === "complete" ? props.onComplete() : props.onDelete()));

  return (
    <View class="overflow-hidden" testID={props.testID} onLayout={(e) => (width = e.bounds.size.width)}>
      <View class="absolute inset-y-0 left-0 w-1/2 bg-up" />
      <View class="absolute inset-y-0 right-0 w-1/2 bg-destructive" />
      <View class="absolute inset-y-0 left-0 flex-row">
        <Action icon="check" label="Complete" enabled={rested() > 0} testID={`${props.testID}-complete`} class="bg-up" onPress={act(props.onComplete)} />
      </View>
      <View class="absolute inset-y-0 right-0 flex-row">
        <Action icon="edit" label="Edit" enabled={rested() < 0} testID={`${props.testID}-edit`} class="bg-cat-blue" onPress={act(props.onEdit)} />
        <Action icon="trash" label="Delete" enabled={rested() < 0} testID={`${props.testID}-delete`} class="bg-destructive" onPress={act(props.onDelete)} />
      </View>
      <View
        class="bg-card"
        accessibilityActions={[
          { name: "complete", label: "Complete" },
          { name: "edit", label: "Edit" },
          { name: "delete", label: "Delete" },
        ]}
        onAccessibilityAction={(e) => ({ complete: props.onComplete, edit: props.onEdit, delete: props.onDelete } as Record<string, () => void>)[e.actionName]?.()}
        pan={{ x }}
        panActivation={{ activeOffsetX: 10, failOffsetY: 10 }}
        style={{ transform: [{ translateX: x }] }}
        onPanStart={() => x.extractOffset()}
        onPanEnd={(e) => {
          x.flattenOffset();
          const { to, full } = settle(rested(), e.translation.x, width);
          if (full) finish(full);
          else void moveTo(to);
        }}
      >
        <Button testID={`${props.testID}-row`} onPress={close} class="items-stretch">
          {props.children}
        </Button>
      </View>
    </View>
  );
}

function Action(props: { enabled: boolean; icon: IconName; label: string; testID: string; class: string; onPress: () => void }) {
  return (
    <Button
      testID={props.testID}
      accessibilityLabel={props.label}
      disabled={!props.enabled}
      onPress={props.onPress}
      class={`items-center justify-center ${props.class}`}
      style={{ width: ACTION_WIDTH }}
    >
      <Icon name={props.icon} size="lg" color="on-color" />
    </Button>
  );
}
