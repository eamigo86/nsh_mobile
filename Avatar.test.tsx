// The profile photo: picked in Settings (Picker.pickImages, answered here by `app.onPick`), shown in
// Settings and on Home, kept under its own Storage key, and the "Hello, <name>" greeting beside it.
import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { launchApp } from "./testing";

const PHOTO = "nsh-avatar";
const BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
const URI = "data:image/jpeg;base64,/9j/2Q==";
const tab = (app: App, name: "home" | "settings") => app.openWithUrl(`nshtodo://${name}`);
const pickPhoto = (app: App) => app.onPick(() => [{ name: "me.jpg", type: "image/jpeg", data: BYTES }]);
const settings = async (options: Parameters<typeof launchApp>[0] = {}) => {
  const app = await launchApp(options);
  await tab(app, "settings");
  return app;
};

test("tapping the avatar picks one 256 px JPEG, shows it at once in Settings and Home, and saves it", async () => {
  const app = await settings();
  pickPhoto(app);
  expect(app.shows("id:avatar-photo")).toBe(false);
  await app.press("id:avatar");
  await app.waitFor("id:avatar-photo");
  expect(app.picks()).toMatchObject([{ kind: "images", multiple: false, maxDimension: 256 }]);
  expect(Math.abs((app.picks()[0]?.quality ?? 0) - 0.8) < 1e-6).toBe(true);
  await app.waitUntil(() => app.storage()[PHOTO] === URI);
  await tab(app, "home");
  expect(app.shows("id:home-avatar-photo")).toBe(true);
});

test("the Choose photo button picks too", async () => {
  const app = await settings();
  pickPhoto(app);
  await app.press("id:choose-photo");
  await app.waitFor("id:avatar-photo");
});

test("a relaunch shows the saved photo", async () => {
  const first = await settings();
  pickPhoto(first);
  await first.press("id:avatar");
  await first.waitUntil(() => first.storage()[PHOTO] === URI);
  const second = await launchApp({ storage: first.storage() });
  await second.waitFor("id:home-avatar-photo");
  await tab(second, "settings");
  expect(second.shows("id:avatar-photo")).toBe(true);
});

test("cancelling keeps the current avatar", async () => {
  const app = await settings();
  await app.press("id:avatar");
  expect(app.shows("id:avatar-photo")).toBe(false);
  expect(app.storage()[PHOTO]).toBeUndefined();
  pickPhoto(app);
  await app.press("id:choose-photo");
  await app.waitFor("id:avatar-photo");
  app.onPick(() => null);
  await app.press("id:choose-photo");
  expect(app.shows("id:avatar-photo")).toBe(true);
  expect(app.shows("id:photo-error")).toBe(false);
  expect(app.storage()[PHOTO]).toBe(URI);
});

test("Remove photo restores the initial and clears the storage", async () => {
  const app = await settings();
  expect(app.shows("id:remove-photo")).toBe(false);
  await app.type("id:settings-name", "Ada");
  pickPhoto(app);
  await app.press("id:avatar");
  await app.waitFor("id:remove-photo");
  await app.press("id:remove-photo");
  expect(app.shows("id:avatar-photo")).toBe(false);
  expect(app.shows("id:remove-photo")).toBe(false);
  expect(app.shows("id:avatar >> text:A")).toBe(true);
  await app.waitUntil(() => app.storage()[PHOTO] === undefined);
  await tab(app, "home");
  expect(app.shows("id:home-avatar-photo")).toBe(false);
  expect(app.shows("id:home-avatar >> text:A")).toBe(true);
});

test("the greeting is Hello, with the name once there is one", async () => {
  const app = await launchApp();
  expect(app.shows("id:greeting >> text:Hello")).toBe(true);
  expect(app.shows("id:greeting >> text:Hello,")).toBe(false);
  await tab(app, "settings");
  await app.type("id:settings-name", "Ada");
  await tab(app, "home");
  expect(app.shows("id:greeting >> text:Hello, Ada")).toBe(true);
});
