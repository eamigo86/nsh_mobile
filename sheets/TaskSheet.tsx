// The add / edit sheet. Its drafts are signals of this sheet, created on each opening from the task shown.
import { Scroll, signal, Text, View } from "nsh";
import { TimeField } from "nsh/base";
import { type Task, dueText } from "../domain";
import { allCategories, removeTask, saveTask } from "../store";
import { Field, DateRow, SelectRow, TextField } from "../ui/field";
import { FormSheet, SheetHeader } from "../ui/sheet";
import { TextButton } from "../ui/button";

const DEFAULT_TIME = "09:00";

export function TaskSheet(props: { open: boolean; task: Task | null; onClose: () => void }) {
  return (
    <FormSheet open={props.open} onClose={props.onClose}>
      <TaskForm task={props.task} onClose={props.onClose} />
    </FormSheet>
  );
}

function TaskForm(props: { task: Task | null; onClose: () => void }) {
  // Read once: the drafts start from the task the sheet opened on.
  const start = props.task;
  const title = signal(start?.title ?? "");
  const notes = signal(start?.notes ?? "");
  const categoryId = signal(start?.categoryId ?? "");
  const due = signal(start?.due ?? "");
  const time = signal(start?.time ?? "");

  const canSave = () => title().trim() !== "";
  const save = () => {
    if (!canSave()) return;
    saveTask(start?.id ?? "", { title: title(), notes: notes(), categoryId: categoryId(), due: due(), time: time() });
    props.onClose();
  };
  const items = () => [{ value: "", title: "None" }, ...allCategories().map((c) => ({ value: c.id, title: c.name }))];

  return (
    <View class="max-h-full pb-[env(safe-area-inset-bottom)]">
      <SheetHeader
        title={start ? "Edit Task" : "New Task"}
        canSave={canSave()}
        onCancel={props.onClose}
        onSave={save}
        cancelTestID="form-cancel"
        saveTestID="form-save"
      />
      <Scroll class="shrink">
        <View class="gap-5 p-4 pt-1">
          <Field hintTestID="form-hint" hint={canSave() ? "" : "Enter a title to save."}>
            <TextField
              testID="form-title"
              accessibilityLabel="Title"
              placeholder="Title"
              value={title()}
              onChange={(v) => title.set(v)}
              onSubmit={save}
              autoFocus
            />
          </Field>
          <Field label="Notes">
            <TextField
              testID="form-notes"
              accessibilityLabel="Notes"
              placeholder="Optional"
              multiline
              value={notes()}
              onChange={(v) => notes.set(v)}
            />
          </Field>
          <View class="gap-2">
            <SelectRow label="Category" testID="form-category" value={categoryId()} items={items()} onChange={(v) => categoryId.set(v)} />
            <DateRow
              label="Due date"
              testID="form-due"
              value={due()}
              text={due() === "" ? "None" : dueText({ due: due(), time: "" })}
              onChange={(v) => due.set(v)}
            />
            <If when={due() !== ""}>
              <View class="min-h-12 flex-row items-center justify-between gap-3 rounded-2xl bg-card px-4">
                <Text class="text-base text-card-foreground">Due time</Text>
                <If
                  when={time() !== ""}
                  else={<TextButton testID="form-add-time" label="Add time" onPress={() => time.set(DEFAULT_TIME)} />}
                >
                  <View testID="form-time">
                    <TimeField accessibilityLabel="Due time" value={time()} onChange={({ value }) => time.set(value)} segmentClass="text-base text-primary" separatorClass="text-base text-primary" />
                  </View>
                </If>
              </View>
              <TextButton
                testID="form-clear-due"
                destructive
                label="Remove Due Date"
                onPress={() => {
                  due.set("");
                  time.set("");
                }}
              />
            </If>
          </View>
        </View>
      </Scroll>
    </View>
  );
}
