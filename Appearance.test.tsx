// Settings: the Appearance choice (System, Light, Dark) and "Show onboarding again".
// The scheme in force is read from the colour a themed text resolves to: the "Your name" label is `card-foreground`.
import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { parseSaved } from "./domain";
import { KEY, launchApp, RETURNING } from "./testing";

const LIGHT_INK = "#1f1b16ff";
const DARK_INK = "#f5eee8ff";
const ink = (app: App) => app.spanStyle("id:settings-profile >> text:Your name").color;
const saved = (app: App) => JSON.parse(app.storage()[KEY] ?? "{}");
const settings = async (options: Parameters<typeof launchApp>[0] = {}) => {
  const app = await launchApp(options);
  await app.openWithUrl("nshtodo://settings");
  return app;
};

test("Settings offers System, Light and Dark, following the system at first", async () => {
  const app = await settings();
  for (const choice of ["system", "light", "dark"]) expect(app.shows(`id:appearance-${choice}`)).toBe(true);
  expect(ink(app)).toBe(LIGHT_INK);
});

test("Dark applies at once in a light system and is saved", async () => {
  const app = await settings({ colorScheme: "light" });
  await app.press("id:appearance-dark");
  expect(ink(app)).toBe(DARK_INK);
  await app.waitUntil(() => saved(app).appearance === "dark");
});

test("Light applies at once in a dark system", async () => {
  const app = await settings({ colorScheme: "dark" });
  expect(ink(app)).toBe(DARK_INK);
  await app.press("id:appearance-light");
  expect(ink(app)).toBe(LIGHT_INK);
  await app.waitUntil(() => saved(app).appearance === "light");
});

test("System follows the system's appearance again", async () => {
  const app = await settings({ colorScheme: "light" });
  await app.press("id:appearance-dark");
  await app.press("id:appearance-system");
  expect(ink(app)).toBe(LIGHT_INK);
  await app.setColorScheme("dark");
  expect(ink(app)).toBe(DARK_INK);
  await app.waitUntil(() => saved(app).appearance === "system");
});

test("the choice is applied at launch, once the saved data has loaded", async () => {
  const first = await settings({ colorScheme: "light" });
  await first.press("id:appearance-dark");
  await first.waitUntil(() => saved(first).appearance === "dark");
  const second = await settings({ colorScheme: "light", storage: first.storage() });
  expect(ink(second)).toBe(DARK_INK);
});

test("old saved data and unknown values mean System", () => {
  expect(parseSaved(null).appearance).toBe("system");
  expect(parseSaved("{}").appearance).toBe("system");
  expect(parseSaved('{"appearance":"sepia"}').appearance).toBe("system");
  expect(parseSaved('{"appearance":"dark"}').appearance).toBe("dark");
});

test("Show onboarding again opens it from step 1 and Skip returns to Settings", async () => {
  const app = await settings();
  await app.press("id:onboarding-again");
  expect(app.shows("id:onboarding")).toBe(true);
  expect(app.shows("id:onboarding-next >> text:Next")).toBe(true);
  await app.press("id:onboarding-skip");
  expect(app.shows("id:onboarding")).toBe(false);
  expect(app.shows("id:settings-name")).toBe(true);
  expect(saved(app).onboarded).toBe(true);
});

test("Get started on a reopened onboarding returns to Settings, and a second reopen starts at step 1", async () => {
  const app = await settings();
  await app.press("id:onboarding-again");
  for (let i = 0; i < 3; i++) await app.press("id:onboarding-next");
  await app.press("id:onboarding-next");
  expect(app.shows("id:settings-name")).toBe(true);
  await app.press("id:onboarding-again");
  expect(app.shows("id:onboarding-next >> text:Next")).toBe(true);
});

test("the stored first-launch flag is kept when the onboarding is reopened", async () => {
  const app = await settings({ storage: RETURNING });
  await app.press("id:onboarding-again");
  await app.press("id:onboarding-skip");
  expect(saved(app).onboarded).toBe(true);
});

test("a select's choices use the popover ink, so they read in dark mode", async () => {
  const app = await launchApp({ colorScheme: "dark" });
  await app.openWithUrl("nshtodo://tasks");
  await app.press("id:filter-category");
  expect(app.spanStyle("text:Personal").color).toBe(DARK_INK);
});
