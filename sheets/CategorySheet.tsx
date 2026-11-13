// The add-category sheet: a name (required, no duplicates) and a six-colour swatch picker.
import { signal, View } from "nsh";
import { Button as BaseButton } from "nsh/base";
import { COLORS, colorLabel, type CategoryColor } from "../domain";
import { addCategory } from "../store";
import { Field, TextField } from "../ui/field";
import { FormSheet, SheetHeader } from "../ui/sheet";
import { solidClass } from "../ui/card";
import { Icon } from "../ui/icon";
import { motion } from "../ui/motion";

export function CategorySheet(props: { open: boolean; onClose: () => void }) {
  return (
    <FormSheet open={props.open} onClose={props.onClose}>
      <CategoryForm onClose={props.onClose} />
    </FormSheet>
  );
}

function CategoryForm(props: { onClose: () => void }) {
  const name = signal("");
  const color = signal<CategoryColor>("blue");
  const refusal = signal("");
  const canSave = () => name().trim() !== "";
  const save = () => {
    if (!canSave()) return;
    const error = addCategory(name(), color());
    refusal.set(error);
    if (error === "") props.onClose();
  };
  return (
    <View class="pb-[env(safe-area-inset-bottom)]">
      <SheetHeader
        title="New Category"
        canSave={canSave()}
        onCancel={props.onClose}
        onSave={save}
        cancelTestID="cat-cancel"
        saveTestID="cat-save"
      />
      <View class="gap-5 p-4 pt-1">
        <Field errorTestID="cat-error" error={refusal()} hintTestID="cat-hint" hint={canSave() ? "" : "Enter a name to save."}>
          <TextField
            testID="cat-name"
            accessibilityLabel="Name"
            placeholder="Name"
            value={name()}
            capitalize="words"
            autoFocus
            onChange={(v) => {
              name.set(v);
              refusal.set("");
            }}
            onSubmit={save}
          />
        </Field>
        <Field label="Color">
          <View class="flex-row flex-wrap gap-2 rounded-2xl bg-card p-3" role="radiogroup" accessibilityLabel="Color">
            <Each of={[...COLORS]}>
              {(c) => (
                <BaseButton
                  testID={`swatch-${c()}`}
                  role="radio"
                  selected={color() === c()}
                  accessibilityLabel={colorLabel(c())}
                  onPress={() => color.set(c())}
                  class={`size-11 items-center justify-center ${motion.press}`}
                >
                  <View
                    class={`size-9 items-center justify-center rounded-full border-4 ${solidClass(c())} ${color() === c() ? "border-foreground" : "border-transparent"}`}
                  >
                    <If when={color() === c()}>
                      <Icon name="check" size="sm" color="on-color" />
                    </If>
                  </View>
                </BaseButton>
              )}
            </Each>
          </View>
        </Field>
      </View>
    </View>
  );
}
