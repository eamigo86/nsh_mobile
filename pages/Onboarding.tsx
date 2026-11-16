// First-launch onboarding: four swipeable steps (SVG illustration, title, one line), Skip on every step,
// page dots and a Next / Get started button. The carousel owns the swipe and the scrolling animation.
import { Image, LayoutAnimation, reduceMotion, signal, Text, View } from "nsh";
import { Carousel, CarouselContent, CarouselItem, CarouselPagination, CarouselPaginationItem } from "nsh/base";
import capture from "../assets/brand/step1-capture.svg";
import organize from "../assets/brand/step2-organize.svg";
import plan from "../assets/brand/step3-plan.svg";
import progress from "../assets/brand/step4-progress.svg";
import { Button, ButtonLabel, TextButton } from "../ui/button";

const STEPS = [
  { art: capture, title: "Capture it all", line: "Add a task in seconds, before it slips away." },
  { art: organize, title: "Sort by category", line: "Color-coded lists keep work, home and errands apart." },
  { art: plan, title: "Never miss a time", line: "Give tasks a due date and a time." },
  { art: progress, title: "Watch progress grow", line: "Your dashboard shows what is done today." },
];
const LAST = STEPS.length - 1;

export function Onboarding(props: { onDone: () => void }) {
  const index = signal(0);
  const last = () => index() === LAST;
  const go = (next: number) => {
    // The dots change width: let the layout animate it.
    if (!reduceMotion()) LayoutAnimation.easeInEaseOut();
    index.set(next);
  };
  return (
    <View testID="onboarding" class="flex-1 bg-background pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <View class="min-h-12 flex-row items-center justify-end px-4">
        <TextButton testID="onboarding-skip" label="Skip" onPress={props.onDone} />
      </View>
      <Carousel class="flex-1" index={index()} onChange={({ index: i }) => go(i)} accessibilityLabel="Welcome to NSH Todo">
        <CarouselContent testID="onboarding-steps" class="flex-1">
          {STEPS.map((s, i) => (
            <CarouselItem class="w-full items-center justify-center gap-3 px-8" accessibilityLabel={`${i + 1} of ${STEPS.length}: ${s.title}`}>
              <Image src={s.art} accessibilityElementsHidden style={{ width: 280, height: 210 }} />
              <Text class="mt-4 text-center text-3xl font-bold text-foreground">{s.title}</Text>
              <Text class="text-center text-lg text-muted-foreground">{s.line}</Text>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPagination class="flex-row items-center justify-center" accessibilityLabel="Choose a step">
          {STEPS.map((s, i) => (
            <CarouselPaginationItem testID={`dot-${i}`} index={i} accessibilityLabel={`Step ${i + 1}: ${s.title}`} class="group p-2.5">
              <View class="h-2 w-2 rounded-full bg-muted-foreground/40 group-selected:w-6 group-selected:bg-primary" />
            </CarouselPaginationItem>
          ))}
        </CarouselPagination>
      </Carousel>
      <View class="px-6 pb-4 pt-2">
        <Button testID="onboarding-next" class="w-full" accessibilityLabel={last() ? "Get started" : "Next"} onPress={() => (last() ? props.onDone() : go(index() + 1))}>
          <ButtonLabel>{last() ? "Get started" : "Next"}</ButtonLabel>
        </Button>
      </View>
    </View>
  );
}
