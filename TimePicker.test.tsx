// The task form's "Due time": the system time picker where the app's Rust crate provides it (iOS, packaged),
// NSH's TimeField everywhere else. The headless runner has no native components, so the crate's
// `TimePicker.available` is stood in to take the native branch: the component is then an empty view of no size
// (nothing to find or press) and cannot emit `change`. That branch is seen as the TimeField's segments ("09") being
// absent; the native -> form value wiring is verified on a simulator, not here.
import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";

const launch = (options: Record<string, unknown> = {}) =>
  open("./App.tsx", { clock: { time: new Date(2026, 2, 15, 12, 0, 0) }, ...options });

/** Opens the add sheet with a due date and a due time (09:00), so the "Due time" row shows its control. */
async function openDueTime(app: App) {
  await app.openWithUrl("nshtodo://tasks");
  await app.press("id:add-task");
  await app.waitFor("id:form-title");
  await app.press("id:form-due");
  await app.press("20");
  await app.press("id:form-add-time");
}

test("on Android the due time is NSH's TimeField", async () => {
  const app = await launch({ platform: "android" });
  await openDueTime(app);
  expect(app.shows("id:form-time")).toBe(true);
  expect(app.texts()).toContain("09");
});

test("on iOS without the crate's picker (headless, a dev host) the TimeField stays", async () => {
  const app = await launch({ platform: "ios" });
  await openDueTime(app);
  expect(app.shows("id:form-time")).toBe(true);
  expect(app.texts()).toContain("09");
});

test("a crate that says its picker is unavailable keeps the TimeField", async () => {
  const app = await launch({ platform: "ios", modules: { "nshtodo/native": { "TimePicker.available": false } } });
  await openDueTime(app);
  expect(app.texts()).toContain("09");
});

test("where the crate provides the picker the TimeField is replaced by the native component", async () => {
  const app = await launch({ platform: "ios", modules: { "nshtodo/native": { "TimePicker.available": true } } });
  await openDueTime(app);
  expect(app.texts()).toContain("Due time");
  expect(app.texts()).not.toContain("09");
  expect(app.texts()).not.toContain(":");
});
