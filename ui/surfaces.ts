// Backgrounds that need several theme colours at once (gradients and glass). The colours come from
// `token()`, which follows the appearance, so these are read inside bindings: `style={{ ... }}`.
import { colorScheme, token } from "nsh";

/** The peach mesh behind Home's hero: three soft glows over the base. */
export const heroMesh = () =>
  [
    `radial-gradient(circle at 15% 10%, ${token("hero-glow-1")}, transparent 60%)`,
    `radial-gradient(circle at 90% 20%, ${token("hero-glow-2")}, transparent 55%)`,
    `radial-gradient(circle at 60% 100%, ${token("hero-glow-3")}, transparent 60%)`,
  ].join(", ");

/** A two-glow diagonal, for the avatar and the filter strip. */
export const heroLinear = () => `linear-gradient(150deg, ${token("hero-glow-1")}, ${token("hero-glow-2")})`;

/** The tint where there is no native glass: the material itself carries it on iOS. */
export const glassFallback = "android:bg-glass-tint web:bg-glass-tint dark:bg-glass-tint";

/** Liquid Glass on iOS 26 and macOS 26, tinted with white; a blur elsewhere (also under the tint).
 * In dark appearance the native glass over the deep hero turns near-black, so the tinted blur is used there. */
export const glassStyle = () =>
  colorScheme() === "dark"
    ? { backdropFilter: "blur(20px)" }
    : { glassEffect: "regular" as const, glassTintColor: token("glass-tint"), backdropFilter: "blur(20px)" };
