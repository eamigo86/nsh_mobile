// The task form's "Due time": NSH's DateTimePicker on iOS and Android, NSH's TimeField on desktops and the web. The headless runner
// draws no native controls and has no driver for the picker's change, so what is observable is which control the
// form shows (the TimeField's segments, "09", are present or absent; the native picker itself has no text and is
// not found by `id:form-time-native` headless); a pick reaching the saved task is verified on
// a simulator, not here.
import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { launchApp } from "./testing";

const launch = (options: Record<string, unknown> = {}) =>
  launchApp({ clock: { time: new Date(2026, 2, 15, 12, 0, 0) }, ...options });

/** Opens the add sheet with a due date and a due time (09:00), so the "Due time" row shows its control. */
async function openDueTime(app: App) {
  await app.openWithUrl("nshtodo://tasks");
  await app.press("id:add-task");
  await app.waitFor("id:form-title");
  await app.press("id:form-due");
  await app.press("20");
  await app.press("id:form-add-time");
}

for (const platform of ["ios", "android"]) {
  test(`on ${platform} the due time is the native DateTimePicker, not the TimeField`, async () => {
    const app = await launch({ platform });
    await openDueTime(app);
    expect(app.texts()).toContain("Due time");
    expect(app.shows("id:form-time")).toBe(false);
    expect(app.texts()).not.toContain("09");
  });
}

test("on a desktop, where DateTimePicker shows nothing, the due time is NSH's TimeField", async () => {
  const app = await launch({ platform: "macos" });
  await openDueTime(app);
  expect(app.shows("id:form-time")).toBe(true);
  expect(app.texts()).toContain("09");
});
