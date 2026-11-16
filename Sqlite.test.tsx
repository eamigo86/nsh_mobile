// Tasks and categories in SQLite: the store reaches the crate's `Db` module (`nshtodo/native`), faked here with an
// in-memory copy of its contract (the real SQL is covered by `cargo test` in rust/). Settings stay in the Storage blob.
import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { KEY, launchApp, RETURNING } from "./testing";

type Task = { id: string; title: string; notes: string; categoryId: string; due: string; time: string; done: boolean };
type Category = { id: string; name: string; color: string };

/** The Db module over arrays; `calls` lists each call as `[name, ...args]`. */
function fakeDb(seed: { version?: number; tasks?: Task[]; categories?: Category[]; open?: () => unknown } = {}) {
  const state = { version: seed.version ?? 1, tasks: [...(seed.tasks ?? [])], categories: [...(seed.categories ?? [])] };
  const calls: unknown[][] = [];
  const next = (rows: { id: string }[]) => String(Math.max(0, ...rows.map((r) => Number(r.id))) + 1);
  const rec = <A extends unknown[], R>(name: string, fn: (...args: A) => R) => async (...args: A) => {
    calls.push([name, ...args]);
    return fn(...args);
  };
  const modules = {
    "nshtodo/native": {
      "Db.open": rec("open", (dir: string) => seed.open?.() ?? void dir),
      "Db.version": rec("version", () => state.version),
      "Db.categories": rec("categories", () => state.categories),
      "Db.tasks": rec("tasks", () => state.tasks),
      "Db.saveTask": rec("saveTask", (t: Task) => {
        if (t.id === "") {
          const id = next(state.tasks);
          state.tasks.push({ ...t, id });
          return id;
        }
        state.tasks = state.tasks.map((x) => (x.id === t.id ? { ...t, done: x.done } : x));
        return t.id;
      }),
      "Db.setDone": rec("setDone", (id: string, done: boolean) => void (state.tasks = state.tasks.map((x) => (x.id === id ? { ...x, done } : x)))),
      "Db.removeTask": rec("removeTask", (id: string) => void (state.tasks = state.tasks.filter((x) => x.id !== id))),
      "Db.addCategory": rec("addCategory", (name: string, color: string) => {
        const c = { id: next(state.categories), name, color };
        state.categories.push(c);
        return c;
      }),
      "Db.import": rec("import", (tasks: Task[], categories: Category[]) => {
        if (state.version !== 0) return false;
        Object.assign(state, { version: 1, tasks, categories });
        return true;
      }),
    },
  };
  return { state, calls, modules };
}

const launch = (db: ReturnType<typeof fakeDb>, storage: Record<string, string> = RETURNING) =>
  launchApp({ clock: { time: new Date(2026, 2, 15, 12, 0, 0) }, storage, modules: db.modules });
const tab = (app: App, name: "home" | "tasks" | "categories" | "settings") => app.openWithUrl(`nshtodo://${name}`);
const blob = (app: App) => JSON.parse(app.storage()[KEY] ?? "{}");
const names = (db: ReturnType<typeof fakeDb>) => db.calls.map((c) => c[0]);

const T = (id: string, title: string, over: Partial<Task> = {}): Task => ({ id, title, notes: "", categoryId: "", due: "", time: "", done: false, ...over });
const HOME: Category = { id: "5", name: "Errands", color: "teal" };

test("tasks and categories load from the module", async () => {
  const db = fakeDb({ tasks: [T("7", "From SQLite")], categories: [HOME] });
  const app = await launch(db);
  await tab(app, "tasks");
  await app.waitFor("id:title-7");
  expect(app.shows("id:title-7 >> text:From SQLite")).toBe(true);
  await tab(app, "categories");
  expect(app.texts()).toContain("Errands");
  expect(names(db)).not.toContain("import");
});

test("the database is opened first, with the data directory (an empty text where there is none)", async () => {
  const db = fakeDb();
  const app = await launch(db);
  await tab(app, "tasks");
  expect(db.calls[0]).toEqual(["open", ""]);
  expect(names(db).slice(1)).toContain("version");
  expect(app.shows("id:add-task")).toBe(true);
});

test("a database that cannot be opened leaves tasks and categories in the Storage blob", async () => {
  const db = fakeDb({
    open: () => {
      throw new Error("this platform keeps no data directory");
    },
  });
  const app = await launch(db);
  await tab(app, "tasks");
  await app.press("id:add-task");
  await app.waitFor("id:form-title");
  await app.type("id:form-title", "Buy milk");
  await app.press("id:form-save");
  await app.waitFor("id:title-1");
  await app.waitUntil(() => blob(app).tasks?.length === 1);
  expect(names(db)).toEqual(["open"]);
});

test("the first run imports the saved tasks and categories once, then reads them back", async () => {
  const old = { onboarded: true, name: "Ann", tasks: [T("3", "Old task", { done: true })], categories: [HOME] };
  const db = fakeDb({ version: 0 });
  const app = await launch(db, { [KEY]: JSON.stringify(old) });
  await tab(app, "tasks");
  await app.waitFor("id:title-3");
  expect(db.calls.find((c) => c[0] === "import")).toEqual(["import", old.tasks, old.categories]);
  expect(db.state.version).toBe(1);
  const before = db.calls.length;
  const second = await launch(db, app.storage());
  await tab(second, "tasks");
  await second.waitFor("id:title-3");
  expect(db.calls.slice(before).map((c) => c[0])).not.toContain("import");
  expect(db.calls.slice(before).map((c) => c[0])).toContain("tasks");
});

test("a first run without saved data imports the seed categories", async () => {
  const db = fakeDb({ version: 0 });
  const app = await launch(db);
  await tab(app, "categories");
  await app.waitFor("id:category-3");
  expect(db.state.categories.map((c) => c.name)).toEqual(["Home", "Work", "Personal"]);
  expect(db.state.tasks).toEqual([]);
});

test("the settings stay in the blob and the tasks and categories leave it once SQLite is in use", async () => {
  const old = { onboarded: true, name: "Ann", tasks: [T("3", "Old")], categories: [HOME] };
  const db = fakeDb({ version: 0 });
  const app = await launch(db, { [KEY]: JSON.stringify(old) });
  await tab(app, "tasks");
  await app.waitFor("id:title-3");
  await app.waitUntil(() => blob(app).tasks === undefined);
  expect(blob(app)).toEqual({ name: "Ann", onboarded: true, appearance: "system" });
});

test("a task is added, edited, toggled and deleted through the module", async () => {
  const db = fakeDb({ categories: [HOME] });
  const app = await launch(db);
  await tab(app, "tasks");
  await app.press("id:add-task");
  await app.waitFor("id:form-title");
  await app.type("id:form-title", "Buy milk");
  await app.press("id:form-save");
  await app.waitFor("id:title-1");
  expect(db.calls.find((c) => c[0] === "saveTask")).toEqual(["saveTask", T("", "Buy milk")]);

  await app.press("id:open-1");
  await app.waitFor("id:form-title");
  await app.type("id:form-title", "!");
  await app.press("id:form-save");
  await app.waitFor("id:form-title", { state: "gone" });
  await app.waitFor("id:title-1 >> text:Buy milk!");
  expect(db.state.tasks[0]?.title).toBe("Buy milk!");

  await app.press("id:done-1");
  await app.waitUntil(() => db.state.tasks[0]?.done === true);
  expect(db.calls).toContainEqual(["setDone", "1", true]);

  await app.longPress("id:task-1");
  await app.press("Delete");
  await app.waitFor("id:task-1", { state: "gone" });
  expect(db.calls).toContainEqual(["removeTask", "1"]);
  expect(db.state.tasks).toEqual([]);
});

test("a category is added through the module and a duplicate is refused without a call", async () => {
  const db = fakeDb({ categories: [HOME] });
  const app = await launch(db);
  await tab(app, "categories");
  await app.press("id:add-category");
  await app.press("id:swatch-orange");
  await app.type("id:cat-name", "Trips");
  await app.press("id:cat-save");
  await app.waitFor("id:card-6");
  expect(db.calls).toContainEqual(["addCategory", "Trips", "orange"]);

  await app.press("id:add-category");
  await app.type("id:cat-name", "errands");
  await app.press("id:cat-save");
  expect(app.texts()).toContain("There is already a category called Errands.");
  expect(db.state.categories.length).toBe(2);
});

test("without the module the Storage blob keeps everything, as before", async () => {
  const app = await launchApp({ clock: { time: new Date(2026, 2, 15, 12, 0, 0) }, storage: RETURNING });
  await tab(app, "tasks");
  await app.press("id:add-task");
  await app.waitFor("id:form-title");
  await app.type("id:form-title", "Buy milk");
  await app.press("id:form-save");
  await app.waitFor("id:title-1");
  await app.waitUntil(() => blob(app).tasks?.length === 1);
  expect(blob(app).categories.length).toBe(3);
});
