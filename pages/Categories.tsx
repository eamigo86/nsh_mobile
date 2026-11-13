// Categories: tinted cards with a colour badge, a name and a task count; a sheet adds one.
import { Scroll, signal, Text, View } from "nsh";
import { allCategories, allTasks } from "../store";
import { countText } from "../domain";
import { CategorySheet } from "../sheets/CategorySheet";
import { Button } from "../ui/button";
import { Card, ColorDot, solidClass } from "../ui/card";
import { Icon } from "../ui/icon";
import { Title } from "./Title";

export function Categories() {
  const adding = signal(false);
  const count = (id: string) => allTasks().filter((t) => t.categoryId === id).length;
  return (
    <View class="flex-1">
      <Title
        action={
          <Button variant="ghost" size="icon" accessibilityLabel="Add Category" testID="add-category" onPress={() => adding.set(true)}>
            <Icon name="plus" size="lg" color="primary" />
          </Button>
        }
      >
        Categories
      </Title>
      <Scroll class="flex-1">
        <View class="flex-row flex-wrap gap-3 p-4">
          <Each of={allCategories()} key={(c) => c.id}>
            {(c) => (
              <Card tint={c().color} testID={`card-${c().id}`} class="min-w-32 flex-1 gap-3">
                <View class={`size-10 items-center justify-center rounded-full ${solidClass(c().color)}`}>
                  <Icon name="list" size="md" color="on-color" />
                </View>
                <View class="gap-0.5">
                  <View testID={`category-${c().id}`}>
                    <Text class="text-lg font-semibold text-card-foreground">{c().name}</Text>
                  </View>
                  <View testID={`count-${c().id}`}>
                    <Text class="text-sm text-muted-foreground">{countText(count(c().id))}</Text>
                  </View>
                </View>
              </Card>
            )}
          </Each>
        </View>
      </Scroll>
      <CategorySheet open={adding()} onClose={() => adding.set(false)} />
    </View>
  );
}
