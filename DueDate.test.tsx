// The task form's "Due date": NSH's DateTimePicker on iOS and Android (with an "Add date" button while there is no
// date), NSH's DatePicker calendar on desktops and the web. The headless runner draws no native control and cannot
// drive the picker's change, so picking another day is verified on a device, not here.
import { expect, test } from "nsh/test";
import { KEY, launchApp } from "./testing";

const launch = (options: Record<string, unknown> = {}) =>
  launchApp({ clock: { time: new Date(2026, 2, 15, 12, 0, 0) }, ...options });

const openForm = async (app: Awaited<ReturnType<typeof launch>>) => {
  await app.openWithUrl("nshtodo://tasks");
  await app.press("id:add-task");
  await app.waitFor("id:form-title");
};

for (const platform of ["ios", "android"]) {
  test(`on ${platform} an empty due date shows "Add date", not the calendar`, async () => {
    const app = await launch({ platform });
    await openForm(app);
    expect(app.shows("id:form-add-date")).toBe(true);
    expect(app.texts()).toContain("Due date");
    expect(app.shows("id:form-add-time")).toBe(false);
    expect(app.shows("id:form-due")).toBe(true);
    expect(app.texts()).not.toContain("20");
  });

  test(`on ${platform} "Add date" sets today and the task is saved with it`, async () => {
    const app = await launch({ platform });
    await openForm(app);
    await app.type("id:form-title", "Pay rent");
    await app.press("id:form-add-date");
    expect(app.shows("id:form-add-date")).toBe(false);
    expect(app.shows("id:form-add-time")).toBe(true);
    expect(app.texts()).toContain("Remove Due Date");
    await app.press("id:form-save");
    await app.waitFor("id:form-title", { state: "gone" });
    const saved = JSON.parse(app.storage()[KEY]);
    expect(saved.tasks[0].due).toBe("2026-03-15");
  });
}

test("on a desktop the due date is still NSH's calendar", async () => {
  const app = await launch({ platform: "macos" });
  await openForm(app);
  expect(app.shows("id:form-add-date")).toBe(false);
  await app.press("id:form-due");
  await app.press("20");
  expect(app.texts()).toContain("Remove Due Date");
});
