// A row with swipe actions: right reveals Complete, left reveals Edit and Delete (Delete outermost). The drag is
// native (`pan` drives an animated value on the UI thread); JS only decides where the row settles on release.
import { batch, createAnimatedValue, effect, signal, type JSX, View } from "nsh";
import { Button } from "nsh/base";
import { Icon, type IconName } from "./icon";
import { ACTION_WIDTH, GAP, settle, type SwipeFull } from "./swipe";

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
  const grow = createAnimatedValue(0);
  const deleting = signal(false);
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
  // Complete pushes the row off; Delete spreads over the whole row first (the cover slides in from 600 pt away, past any phone width).
  const finish = (full: SwipeFull) =>
    void (full === "complete" ? moveTo(width).then(props.onComplete) : (deleting.set(true), grow.timing(1, { duration: 160 })).then(props.onDelete));
  // The row follows only right drags; the Edit and Delete group follows left drags, from off the right edge down to rest.
  const rowX = x.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolateLeft: "clamp" });
  const actionsX = x.interpolate({ inputRange: [-2 * ACTION_WIDTH, 0], outputRange: [0, 2 * ACTION_WIDTH], extrapolate: "clamp" });
  // Green only up to the open Complete action plus the gap, so the card shows in the gap at rest.
  const trailX = x.interpolate({ inputRange: [GAP, GAP + 1], outputRange: [0, 1], extrapolateLeft: "clamp" });
  const coverX = grow.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  return (
    <View class="overflow-hidden bg-card" testID={props.testID} onLayout={(e) => (width = e.bounds.size.width)}>
      <View class="absolute inset-y-0 bg-swipe-complete" style={{ left: -600, width: 600, transform: [{ translateX: trailX }] }} />
      <View class="absolute inset-y-0 left-0 flex-row">
        <Action icon="check" label="Complete" enabled={rested() > 0} testID={`${props.testID}-complete`} class="bg-swipe-complete" onPress={act(props.onComplete)} />
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
        style={{ transform: [{ translateX: rowX }] }}
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
      <View class="absolute inset-y-0 right-0 flex-row" style={{ transform: [{ translateX: actionsX }] }}>
        <Action icon="edit" label="Edit" enabled={rested() < 0} testID={`${props.testID}-edit`} class="bg-swipe-edit" onPress={act(props.onEdit)} />
        <Action icon="trash" label="Delete" enabled={rested() < 0} testID={`${props.testID}-delete`} class="bg-swipe-delete" onPress={act(props.onDelete)} />
      </View>
      {deleting() && (
        <View class="absolute inset-0 items-end justify-center bg-swipe-delete" style={{ transform: [{ translateX: coverX }] }}>
          <View class="items-center" style={{ width: ACTION_WIDTH }}>
            <Icon name="trash" size="lg" color="swipe-ink" />
          </View>
        </View>
      )}
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
      <Icon name={props.icon} size="lg" color="swipe-ink" />
    </Button>
  );
}
