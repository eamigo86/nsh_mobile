// Tasks: status chips, a category filter, the list, a floating add button and the add / edit sheet.
import { List, signal, Scroll, Text, View } from "nsh";
import { ContextMenu, MenuItem } from "nsh/base";
import { Button } from "nsh/base";
import {
  type Status,
  STATUSES,
  categoryOf,
  isOverdue,
  metaText,
  passes,
  type Task,
} from "../domain";
import {
  allCategories,
  allTasks,
  categoryFilterId,
  removeTask,
  setCategoryFilter,
  setDone,
  setStatusFilter,
  statusFilter,
  today,
} from "../store";
import { TaskSheet } from "../sheets/TaskSheet";
import { Button as UiButton } from "../ui/button";
import { ColorDot } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Chip } from "../ui/chip";
import { SelectRow } from "../ui/field";
import { Icon } from "../ui/icon";
import { motion } from "../ui/motion";
import { heroLinear } from "../ui/surfaces";
import { Title } from "./Title";

const LABELS: Record<Status, string> = { all: "All", active: "Active", done: "Done", today: "Today", overdue: "Overdue" };

export function Tasks() {
  // `null`: closed; a task: editing it; `"new"`: adding.
  const sheet = signal<Task | "new" | null>(null);
  const shown = () => allTasks().filter((t) => passes(t, statusFilter(), categoryFilterId(), today()));
  const categoryItems = () => [{ value: "", title: "All categories" }, ...allCategories().map((c) => ({ value: c.id, title: c.name }))];

  return (
    <View class="flex-1">
      <Title>Tasks</Title>
      <View class="mx-4 gap-1 rounded-3xl bg-card p-2">
        <Scroll horizontal class="rounded-2xl" contentClass="flex-row gap-2 p-2" style={{ backgroundImage: heroLinear() }} testID="chips">
          <Each of={STATUSES}>
            {(k) => <Chip testID={`chip-${k()}`} label={LABELS[k()]} selected={statusFilter() === k()} onPress={() => setStatusFilter(k())} />}
          </Each>
        </Scroll>
        <SelectRow label="Category" testID="filter-category" value={categoryFilterId()} items={categoryItems()} onChange={setCategoryFilter} />
      </View>

      <If
        when={allTasks().length > 0}
        else={
          <View class="flex-1 items-center justify-center gap-2 px-8">
            <Text class="text-xl font-semibold text-foreground">No Tasks</Text>
            <Text class="text-base text-muted-foreground">Tasks you add appear here.</Text>
          </View>
        }
      >
        <If when={shown().length > 0} else={<Text class="p-6 text-center text-base text-muted-foreground" testID="no-match">No tasks match.</Text>}>
          <List each={shown()} keyExtractor={(t) => t.id} estimatedItemSize={64} class="mt-3 flex-1" contentClass="px-4 pb-28">
            {(task) => <TaskRow task={task} onOpen={() => sheet.set(task())} />}
          </List>
        </If>
      </If>

      <View class="absolute bottom-4 right-4">
        <UiButton size="fab" accessibilityLabel="Add Task" testID="add-task" onPress={() => sheet.set("new")} class="shadow-lg">
          <Icon name="plus" size="lg" color="primary-foreground" />
        </UiButton>
      </View>

      <TaskSheet open={sheet() !== null} task={sheet() === "new" ? null : (sheet() as Task | null)} onClose={() => sheet.set(null)} />
    </View>
  );
}

/** One row. A cell is reused for other tasks as the list scrolls, so it reads `task()` where used and keeps no state. */
function TaskRow(props: { task: () => Task; onOpen: () => void }) {
  const task = props.task;
  return (
    <ContextMenu
      popupClass="rounded-t-3xl bg-popover p-2 pb-[env(safe-area-inset-bottom)]"
      backdropClass="bg-scrim"
      trigger={
        <View testID={`task-${task().id}`} class="mb-2 min-h-14 flex-row items-center gap-3 rounded-2xl bg-card px-4 py-2">
          <Checkbox
            testID={`done-${task().id}`}
            checked={task().done}
            label={`Done: ${task().title}`}
            onChange={(done) => setDone(task().id, done)}
          />
          <Button testID={`open-${task().id}`} onPress={props.onOpen} class={`min-h-11 flex-1 flex-row items-center gap-2 ${motion.fade}`}>
            <ColorDot color={categoryOf(allCategories(), task().categoryId)?.color ?? null} class="size-2.5" />
            <View class="flex-1">
              <View testID={`title-${task().id}`}>
                <Text class={`text-base ${task().done ? "text-muted-foreground" : "text-card-foreground"}`}>{task().title}</Text>
              </View>
              <If when={metaText(task(), allCategories()) !== ""}>
                <View testID={`meta-${task().id}`}>
                  <Text class={`text-sm ${isOverdue(task(), today()) ? "text-destructive" : "text-muted-foreground"}`}>
                    {metaText(task(), allCategories())}
                  </Text>
                </View>
              </If>
            </View>
            <Icon name="chevron" size="sm" color="muted-foreground" />
          </Button>
        </View>
      }
    >
      <MenuItem testID={`task-${task().id}-delete`} onSelect={() => removeTask(task().id)} class="min-h-12 justify-center rounded-xl px-4">
        <Text class="text-base text-destructive">Delete</Text>
      </MenuItem>
    </ContextMenu>
  );
}
