// The in-app icons: every IconName has a Phosphor icon, an SVG `data:` URI drawn with `currentColor`.
import { expect, test } from "nsh/test";
import { ICONS } from "./ui/icon";

const NAMES = ["list", "calendar", "alert", "plus", "close", "check", "home", "settings", "person", "chevron", "chart", "edit", "trash", "clock"];

test("every icon name maps to a Phosphor SVG icon", () => {
  expect(Object.keys(ICONS).sort()).toEqual([...NAMES].sort());
  for (const name of NAMES) {
    const icon: string = ICONS[name as keyof typeof ICONS];
    expect(icon.startsWith("data:image/svg+xml,")).toBe(true);
    expect(icon).toContain("currentColor");
  }
});
