// Behaviour tests ported from the Exact reference app (app.test.contract), driven like a user.
// The system TabBar is not pressable headless, so tabs are switched with the app's deep links
// (`nshtodo://<tab>`); the sheets, rows, chips and forms are pressed and typed into for real.
import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { KEY, launchApp, RETURNING } from "./testing";

// 2026-03-15 12:00 in the machine's own zone, so the day and the greeting do not depend on it.
const launch = (storage?: Record<string, string>) =>
  launchApp({ clock: { time: new Date(2026, 2, 15, 12, 0, 0) }, storage: storage ?? RETURNING });

// Tests that pick a given day use the calendar, which iOS and Android (the headless default is iOS) replace with the
// system picker (see DueDate.test.tsx); they run as a desktop.
const launchDesktop = () => launchApp({ clock: { time: new Date(2026, 2, 15, 12, 0, 0) }, platform: "macos" });

type Saved = {
  tasks: { id: string; title: string; notes: string; categoryId: string; due: string; time: string; done: boolean }[];
  categories: { id: string; name: string; color: string }[];
  name: string;
};
const saved = (app: App): Saved => JSON.parse(app.storage()[KEY] ?? '{"tasks":[],"categories":[],"name":""}');
const tab = (app: App, name: "home" | "tasks" | "categories" | "settings") => app.openWithUrl(`nshtodo://${name}`);

/** Adds a task through the sheet; `pick` chooses the category by its name, `due` a day of March 2026. */
async function addTask(app: App, title: string, opts: { category?: string; day?: string } = {}) {
  await app.press("id:add-task");
  await app.waitFor("id:form-title");
  await app.type("id:form-title", title);
  if (opts.category) {
    await app.press("id:form-category");
    await app.press(`role:option[${opts.category}]`);
  }
  if (opts.day) {
    await app.press("id:form-due");
    await app.press(opts.day);
  }
  await app.press("id:form-save");
  await app.waitFor("id:form-title", { state: "gone" });
}

test("default categories are seeded", async () => {
  const app = await launch();
  await tab(app, "categories");
  expect(app.shows("id:category-1")).toBe(true);
  for (const name of ["Home", "Work", "Personal"]) expect(app.texts()).toContain(name);
  expect(app.shows("id:category-4")).toBe(false);
});

test("seeded categories have distinct colours", async () => {
  const app = await launch();
  await app.waitUntil(() => app.storage()[KEY] !== undefined);
  expect(saved(app).categories.map((c) => c.color)).toEqual(["blue", "violet", "pink"]);
});

test("a category stores the colour picked in its sheet", async () => {
  const app = await launch();
  await tab(app, "categories");
  await app.press("id:add-category");
  await app.press("id:swatch-orange");
  await app.type("id:cat-name", "Errands");
  await app.press("id:cat-save");
  await app.waitFor("id:card-4");
  expect(saved(app).categories[3].color).toBe("orange");
});

test("a category added without picking gets the default colour", async () => {
  const app = await launch();
  await tab(app, "categories");
  await app.press("id:add-category");
  await app.type("id:cat-name", "Errands");
  await app.press("id:cat-save");
  await app.waitFor("id:card-4");
  expect(saved(app).categories[3].color).toBe("blue");
});

test("a task is added, an empty title refused", async () => {
  const app = await launch();
  await tab(app, "tasks");
  await app.press("id:add-task");
  await app.waitFor("id:form-title");
  expect(app.enabled("id:form-save")).toBe(false);
  await app.type("id:form-title", "Buy milk");
  await app.type("id:form-notes", "Two litres");
  await app.press("id:form-category");
  await app.press("Work");
  expect(app.enabled("id:form-save")).toBe(true);
  await app.press("id:form-save");
  await app.waitFor("id:title-1");
  expect(app.shows("id:title-1 >> text:Buy milk")).toBe(true);
  expect(app.shows("id:meta-1 >> text:Work")).toBe(true);
  expect(saved(app).tasks[0].notes).toBe("Two litres");
});

test("a task is toggled done and deleted", async () => {
  const app = await launch();
  await tab(app, "tasks");
  await addTask(app, "Call Ann");
  await app.press("id:done-1");
  await app.waitUntil(() => saved(app).tasks[0]?.done === true);
  await app.longPress("id:task-1");
  await app.press("Delete");
  await app.waitFor("id:task-1", { state: "gone" });
  expect(saved(app).tasks).toEqual([]);
  expect(app.texts()).toContain("No Tasks");
});

test("a task is edited through its sheet", async () => {
  const app = await launchDesktop();
  await tab(app, "tasks");
  await addTask(app, "Call Ann");
  await app.press("id:open-1");
  await app.waitFor("id:form-title");
  expect(app.value("id:form-title")).toBe("Call Ann");
  await app.type("id:form-title", "a");
  await app.press("id:form-due");
  await app.press("20");
  await app.press("id:form-add-time");
  await app.press("id:form-save");
  await app.waitFor("id:form-title", { state: "gone" });
  expect(app.shows("id:title-1 >> text:Call Anna")).toBe(true);
  expect(app.shows("id:meta-1 >> text:Mar 20, 2026 09:00")).toBe(true);
});

test("filters narrow the list by status and category", async () => {
  const app = await launchDesktop();
  await tab(app, "tasks");
  await addTask(app, "Late", { category: "Home", day: "10" });
  await addTask(app, "Now", { category: "Work", day: "15" });
  await addTask(app, "Later", { category: "Work", day: "30" });
  await app.press("id:done-3");
  await app.press("id:chip-overdue");
  expect(app.shows("id:task-1")).toBe(true);
  expect(app.shows("id:task-2")).toBe(false);
  expect(app.shows("id:task-3")).toBe(false);
  await app.press("id:chip-today");
  expect(app.shows("id:task-2")).toBe(true);
  expect(app.shows("id:task-1")).toBe(false);
  await app.press("id:chip-done");
  expect(app.shows("id:task-3")).toBe(true);
  expect(app.shows("id:task-2")).toBe(false);
  await app.press("id:chip-active");
  expect(app.shows("id:task-1")).toBe(true);
  expect(app.shows("id:task-3")).toBe(false);
  await app.press("id:chip-all");
  await app.press("id:filter-category");
  await app.press("role:option[Work]");
  expect(app.shows("id:task-1")).toBe(false);
  expect(app.shows("id:task-2")).toBe(true);
  expect(app.shows("id:task-3")).toBe(true);
});

test("a category is added with a count, a duplicate refused", async () => {
  const app = await launch();
  await tab(app, "tasks");
  await addTask(app, "Pay rent", { category: "Home" });
  await tab(app, "categories");
  expect(app.shows("id:count-1 >> text:1 task")).toBe(true);
  expect(app.shows("id:count-2 >> text:0 tasks")).toBe(true);
  await app.press("id:add-category");
  expect(app.enabled("id:cat-save")).toBe(false);
  await app.type("id:cat-name", "Errands");
  await app.press("id:cat-save");
  await app.waitFor("id:category-4");
  await app.press("id:add-category");
  await app.type("id:cat-name", "errands");
  await app.press("id:cat-save");
  await app.waitFor("id:cat-error");
  expect(app.shows("id:cat-error >> text:There is already a category called Errands.")).toBe(true);
  expect(saved(app).categories.length).toBe(4);
});

test("the settings name greets on Home, and Home counts", async () => {
  const app = await launchDesktop();
  expect(app.shows("id:greeting >> text:Hello")).toBe(true);
  await tab(app, "settings");
  await app.type("id:settings-name", "Ada");
  await tab(app, "tasks");
  await addTask(app, "Late", { day: "10" });
  await addTask(app, "Now", { day: "15" });
  await app.press("id:done-2");
  await tab(app, "home");
  expect(app.shows("id:greeting >> text:Hello, Ada")).toBe(true);
  expect(app.shows("id:progress-text >> text:1 of 1 done today")).toBe(true);
  expect(app.shows("id:count-all >> text:2")).toBe(true);
  expect(app.shows("id:count-today >> text:1")).toBe(true);
  expect(app.shows("id:count-overdue >> text:1")).toBe(true);
  expect(app.shows("id:upnext-1")).toBe(true);
  expect(app.shows("id:upnext-2")).toBe(false);
});

test("tasks and the name survive a reload", async () => {
  const first = await launch();
  await tab(first, "settings");
  await first.type("id:settings-name", "Ada");
  await tab(first, "tasks");
  await addTask(first, "Keep me");
  await first.waitUntil(() => saved(first).tasks.length === 1 && saved(first).name === "Ada");

  const second = await launch(first.storage());
  await tab(second, "tasks");
  await second.waitFor("id:title-1");
  expect(second.shows("id:title-1 >> text:Keep me")).toBe(true);
  await tab(second, "settings");
  expect(second.value("id:settings-name")).toBe("Ada");
});

test("on a desktop the tabs are pressable: a sidebar opens the pages", async () => {
  const app = await launchApp({ platform: "macos", clock: { time: new Date(2026, 2, 15, 12, 0, 0) } });
  expect(app.shows("id:greeting")).toBe(true);
  await app.press("id:tab-tasks");
  expect(app.shows("id:add-task")).toBe(true);
  expect(app.shows("id:greeting")).toBe(false);
  await app.press("id:tab-categories");
  expect(app.shows("id:add-category")).toBe(true);
  await tab(app, "settings");
  expect(app.shows("id:settings-name")).toBe(true);
});
