// Swipe actions on Home's "Up next" rows: the snap maths as pure functions, then the gestures and the actions driven like a user.
import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { ACTION_WIDTH, GAP, settle } from "./ui/swipe";
import theme from "./theme.json";
import { KEY, launchApp } from "./testing";

const task = (id: string, title: string) => ({ id, title, notes: "", categoryId: "", due: "", time: "", done: false });
const STORAGE = { [KEY]: JSON.stringify({ onboarded: true, tasks: [task("1", "Water plants"), task("2", "Pay rent")], categories: [] }) };
const saved = (app: App): { tasks: { id: string; title: string; done: boolean }[] } => JSON.parse(app.storage()[KEY]);
const home = () => launchApp({ storage: STORAGE });
const row = (id: string) => `id:upnext-${id}-row`;
const swipe = (app: App, id: string, x: number) => app.drag(row(id), { x });
const hidden = (app: App, id: string) => expect(app.enabled(`id:upnext-${id}-delete`)).toBe(false);

const W = 320;
test("a short drag snaps back, a drag past half an action opens that side", () => {
  expect(settle(0, 10, W)).toEqual({ to: 0 });
  expect(settle(0, ACTION_WIDTH, W)).toEqual({ to: ACTION_WIDTH + GAP });
  expect(GAP).toBe(12);
  expect(settle(0, -ACTION_WIDTH, W)).toEqual({ to: -2 * ACTION_WIDTH });
});

test("a drag back past half an action closes an open row, a short one keeps it open", () => {
  expect(settle(-2 * ACTION_WIDTH, 30, W)).toEqual({ to: -2 * ACTION_WIDTH });
  expect(settle(-2 * ACTION_WIDTH, 150, W)).toEqual({ to: 0 });
  expect(settle(ACTION_WIDTH + GAP, -60, W)).toEqual({ to: 0 });
  expect(settle(ACTION_WIDTH + GAP, -20, W)).toEqual({ to: ACTION_WIDTH + GAP });
});

test("a drag past 60% of the width performs the outermost action", () => {
  expect(settle(0, 0.7 * W, W)).toEqual({ to: W, full: "complete" });
  expect(settle(0, -0.7 * W, W)).toEqual({ to: -W, full: "delete" });
  expect(settle(0, -0.5 * W, W).full).toBeUndefined();
});

test("a drag never moves the row past one side's actions beyond the full swipe", () => {
  expect(settle(0, 5 * W, W)).toEqual({ to: W, full: "complete" });
});

test("swiping left reveals Edit and Delete, and Delete removes the task", async () => {
  const app = await home();
  await swipe(app, "1", -2 * ACTION_WIDTH);
  await app.press("id:upnext-1-delete");
  await app.waitUntil(() => saved(app).tasks.length === 1);
  expect(app.shows("id:upnext-1")).toBe(false);
  expect(app.shows("id:upnext-2")).toBe(true);
});

test("swiping right reveals Complete, which completes the task", async () => {
  const app = await home();
  await swipe(app, "1", ACTION_WIDTH);
  await app.press("id:upnext-1-complete");
  await app.waitUntil(() => saved(app).tasks.find((t) => t.id === "1")?.done === true);
  expect(app.shows("id:upnext-1")).toBe(false);
});

test("Edit opens the editor for that task", async () => {
  const app = await home();
  await swipe(app, "2", -2 * ACTION_WIDTH);
  await app.press("id:upnext-2-edit");
  await app.waitFor("id:form-title");
  await app.type("id:form-title", "!");
  await app.press("id:form-save");
  await app.waitUntil(() => saved(app).tasks.find((t) => t.id === "2")?.title === "Pay rent!");
  expect(saved(app).tasks.find((t) => t.id === "1")?.title).toBe("Water plants");
});

test("a short swipe leaves the actions hidden", async () => {
  const app = await home();
  await swipe(app, "1", -20);
  hidden(app, "1");
});

test("only one row is open at a time", async () => {
  const app = await home();
  await swipe(app, "1", -2 * ACTION_WIDTH);
  await swipe(app, "2", -2 * ACTION_WIDTH);
  await app.waitUntil(() => app.enabled("id:upnext-2-delete"));
  hidden(app, "1");
});

test("pressing the open row closes it", async () => {
  const app = await home();
  await swipe(app, "1", -2 * ACTION_WIDTH);
  await app.press(row("1"));
  hidden(app, "1");
  expect(saved(app).tasks).toHaveLength(2);
});

test("a full swipe left deletes, a full swipe right completes", async () => {
  const app = await home();
  await swipe(app, "1", -0.8 * W);
  await app.waitUntil(() => saved(app).tasks.length === 1);
  await swipe(app, "2", 0.8 * W);
  await app.waitUntil(() => saved(app).tasks.every((t) => t.done));
});

// The test API reads no view or canvas colour (only `spanStyle`), so the closest observable is the theme the row paints with.
test("the swipe actions keep saturated fills and white glyphs in light and dark", () => {
  const { light, dark } = theme.cssVars as unknown as Record<"light" | "dark", Record<string, string>>;
  for (const scheme of [light, dark]) expect(scheme["swipe-ink"]).toBe("#ffffff");
  expect(dark["swipe-complete"]).toBe("#2e9b4f");
  expect(dark["swipe-edit"]).toBe("#2f7fe0");
  expect(dark["swipe-delete"]).toBe("#e5484d");
  expect([light["swipe-complete"], light["swipe-edit"], light["swipe-delete"]]).toEqual([light.up, light["cat-blue"], light.destructive]);
});
