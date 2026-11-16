// The animated splash and the first-launch onboarding. The splash plays on the app's manual clock, so a test
// moves time instead of waiting; the carousel is swiped and pressed like a user would.
import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { parseSaved } from "./domain";
import { KEY, RETURNING } from "./testing";
const launch = (storage?: Record<string, string> | null, reducedMotion = false) =>
  open("./App.tsx", { clock: { time: new Date(2026, 2, 15, 12, 0, 0) }, storage: storage ?? null, reducedMotion });
const saved = (app: App) => JSON.parse(app.storage()[KEY] ?? "{}");

/** Waits out the splash and lands on the page the app chose. */
const afterSplash = (app: App) => app.waitFor("id:splash", { state: "gone" });

test("the splash shows first and holds back the onboarding and the tabs", async () => {
  const app = await launch();
  expect(app.shows("id:splash")).toBe(true);
  expect(app.shows("id:onboarding")).toBe(false);
  expect(app.shows("id:greeting")).toBe(false);
  await afterSplash(app);
  expect(app.shows("id:onboarding")).toBe(true);
});

test("the splash is a short plain fade with reduced motion", async () => {
  const app = await launch(null, true);
  expect(app.shows("id:splash")).toBe(true);
  await app.wait(700);
  expect(app.shows("id:splash")).toBe(false);
  expect(app.shows("id:onboarding")).toBe(true);
});

test("a returning user goes from the splash straight to the tabs", async () => {
  const app = await launch(RETURNING);
  expect(app.shows("id:splash")).toBe(true);
  expect(app.shows("id:greeting")).toBe(false);
  await afterSplash(app);
  expect(app.shows("id:greeting")).toBe(true);
  expect(app.shows("id:onboarding")).toBe(false);
});

test("data saved before the onboarding existed counts as onboarded", async () => {
  const app = await launch({ [KEY]: JSON.stringify({ tasks: [], categories: [], name: "Ada" }) });
  await afterSplash(app);
  expect(app.shows("id:greeting")).toBe(true);
});

test("the first launch shows four steps, each with a title and a line", async () => {
  const app = await launch();
  await afterSplash(app);
  for (const text of [
    "Capture it all",
    "Add a task in seconds, before it slips away.",
    "Sort by category",
    "Color-coded lists keep work, home and errands apart.",
    "Never miss a time",
    "Give tasks a due date and a time.",
    "Watch progress grow",
    "Your dashboard shows what is done today.",
  ])
    expect(app.texts()).toContain(text);
  for (const i of [0, 1, 2, 3]) expect(app.shows(`id:dot-${i}`)).toBe(true);
  expect(app.shows("id:onboarding-skip")).toBe(true);
  expect(app.shows("id:onboarding-next >> text:Next")).toBe(true);
});

test("Skip lands on the tabs and the next launch does not show the onboarding", async () => {
  const first = await launch();
  await afterSplash(first);
  await first.press("id:onboarding-skip");
  expect(first.shows("id:greeting")).toBe(true);
  expect(first.shows("id:onboarding")).toBe(false);
  await first.waitUntil(() => saved(first).onboarded === true);

  const second = await launch(first.storage());
  await afterSplash(second);
  expect(second.shows("id:greeting")).toBe(true);
  expect(second.shows("id:onboarding")).toBe(false);
});

test("Next walks the steps and the last one says Get started", async () => {
  const app = await launch();
  await afterSplash(app);
  for (let i = 0; i < 3; i++) {
    expect(app.shows("id:onboarding-next >> text:Next")).toBe(true);
    await app.press("id:onboarding-next");
  }
  expect(app.shows("id:onboarding-next >> text:Get started")).toBe(true);
  await app.press("id:onboarding-next");
  expect(app.shows("id:greeting")).toBe(true);
  await app.waitUntil(() => saved(app).onboarded === true);
});

test("a page dot jumps to its step", async () => {
  const app = await launch();
  await afterSplash(app);
  await app.press("id:dot-3");
  await app.waitUntil(() => app.shows("id:onboarding-next >> text:Get started"));
});

test("swiping moves between the steps", async () => {
  const app = await launch();
  await afterSplash(app);
  for (let i = 0; i < 3; i++) await app.drag("id:onboarding-steps", { x: -300 });
  await app.waitUntil(() => app.shows("id:onboarding-next >> text:Get started"));
  await app.drag("id:onboarding-steps", { x: 300 });
  await app.waitUntil(() => app.shows("id:onboarding-next >> text:Next"));
});

test("the saved data tells a first launch from an older save", () => {
  expect(parseSaved(null).onboarded).toBe(false);
  expect(parseSaved("{}").onboarded).toBe(true);
  expect(parseSaved('{"onboarded":false}').onboarded).toBe(false);
  expect(parseSaved('{"onboarded":"yes"}').onboarded).toBe(true);
  expect(parseSaved("nope").onboarded).toBe(false);
});
