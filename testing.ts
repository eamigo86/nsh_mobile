// Shared by the tests: opens the app as a returning user (the onboarding is already done) with reduced
// motion, so the splash is a short fade, and waits for it to leave. Pass `storage` for another start.
import { open } from "nsh/test";
import type { OpenOptions } from "nsh/test";

export const KEY = "exact-todo";
export const RETURNING = { [KEY]: JSON.stringify({ onboarded: true }) };

export async function launchApp(options: OpenOptions = {}) {
  const app = await open("./App.tsx", { storage: RETURNING, reducedMotion: true, ...options });
  await app.waitFor("id:splash", { state: "gone" });
  return app;
}
