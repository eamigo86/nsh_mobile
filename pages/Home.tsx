// Home: a greeting on the peach hero, today's progress, three glass counters and what is up next.
import { Scroll, Text, View } from "nsh";
import { allCategories, allTasks, displayName, nowMs, today } from "../store";
import { categoryOf, dueText, greeting, hourOf, isOverdue, isToday, upNext } from "../domain";
import { Card, ColorDot } from "../ui/card";
import { Icon, type IconName } from "../ui/icon";
import { Ring } from "../ui/ring";
import { glassFallback, glassStyle, heroMesh } from "../ui/surfaces";
import { Title } from "./Title";

export function Home() {
  const todayTasks = () => allTasks().filter((t) => isToday(t, today()));
  const todayDone = () => todayTasks().filter((t) => t.done).length;
  const overdue = () => allTasks().filter((t) => isOverdue(t, today())).length;
  const fraction = () => (todayTasks().length === 0 ? 0 : todayDone() / todayTasks().length);
  const next = () => upNext(allTasks());

  return (
    <View class="flex-1">
      <Title>Home</Title>
      <Scroll class="flex-1">
        <View class="gap-5 pb-6">
          <View class="mx-4 mt-2 gap-4 rounded-4xl bg-hero-base p-5" style={{ backgroundImage: heroMesh() }} testID="hero">
            <View testID="greeting">
              <Text class="text-xl font-semibold text-on-hero">{greeting(displayName(), hourOf(nowMs()))}</Text>
            </View>
            <View class="flex-row flex-wrap items-center gap-4 rounded-3xl bg-card p-4">
              <Ring fraction={fraction()} label={`${Math.round(fraction() * 100)}%`} caption="Done" />
              <View class="min-w-32 flex-1 gap-1">
                <View testID="progress-text">
                  <Text class="text-lg font-semibold text-card-foreground">
                    {`${todayDone()} of ${todayTasks().length} done today`}
                  </Text>
                </View>
                <Text class={`text-sm ${overdue() > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {overdue() > 0 ? `${overdue()} overdue` : "Nothing overdue"}
                </Text>
              </View>
            </View>
            <View class="flex-row gap-3">
              <Tile icon="list" label="All" value={allTasks().length} testID="count-all" />
              <Tile icon="calendar" label="Today" value={todayTasks().length} testID="count-today" />
              <Tile icon="alert" label="Overdue" value={overdue()} testID="count-overdue" alert={overdue() > 0} />
            </View>
          </View>
          <Card class="mx-4 gap-1" testID="upnext">
            <Text class="text-lg font-semibold text-card-foreground">Up next</Text>
            <Each of={next()} key={(t) => t.id}>
              {(task) => (
                <View class="min-h-11 flex-row items-center gap-3" testID={`upnext-${task().id}`}>
                  <ColorDot color={categoryOf(allCategories(), task().categoryId)?.color ?? null} class="size-2.5" />
                  <View class="flex-1">
                    <Text class="text-base text-card-foreground">{task().title}</Text>
                    <If when={dueText(task()) !== ""}>
                      <Text class={`text-sm ${isOverdue(task(), today()) ? "text-destructive" : "text-muted-foreground"}`}>
                        {dueText(task())}
                      </Text>
                    </If>
                  </View>
                </View>
              )}
            </Each>
            <If when={next().length === 0}>
              <Text class="text-base text-muted-foreground">Nothing to do.</Text>
            </If>
          </Card>
        </View>
      </Scroll>
    </View>
  );
}

function Tile(props: { icon: IconName; label: string; value: number; testID: string; alert?: boolean }) {
  const ink = () => (props.alert ? "text-destructive" : "text-on-hero");
  return (
    <View class={`min-w-0 flex-1 gap-1 rounded-3xl p-3.5 ${glassFallback}`} style={glassStyle()}>
      <Icon name={props.icon} size="lg" color={props.alert ? "destructive" : "on-hero"} />
      <View testID={props.testID}>
        <Text class={`text-3xl font-bold ${ink()}`}>{String(props.value)}</Text>
      </View>
      <Text class="text-sm text-on-hero">{props.label}</Text>
    </View>
  );
}
