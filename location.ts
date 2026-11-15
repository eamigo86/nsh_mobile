// The device position. NSH has no geolocation module of its own, so two native answers share one contract:
// resolve { latitude, longitude, accuracy } (degrees, metres), reject with "denied", "disabled" or another text.
//  1. The app's own Rust crate (rust/, set "nshtodo/native"), where the runtime was built with it (iOS packaged
//     or `nsh run --target ios`). Elsewhere the crate answers "unavailable" (no CoreLocation), or the set is not
//     registered at all (a host that loads a plain `nsh build` bundle) and `nativeModule` throws.
//  2. `host.call("location.current")`, answered by the native app that embeds NSH (native/ios, native/android).
import { host, nativeModule } from "nsh";

export interface Position {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export const LOCATION_CALL = "location.current";

const CRATE_SET = "nshtodo/native";
const UNAVAILABLE = "unavailable";
const NEEDS_NATIVE = "Location needs the native app.";

/** The crate's `Location.current`, or undefined where the crate is not part of the runtime. */
function crateLocation(): (() => Promise<Position>) | undefined {
  try {
    return nativeModule<{ Location: { current(): Promise<Position> } }>(CRATE_SET).Location.current;
  } catch {
    return undefined; // ReferenceError: nothing registered under CRATE_SET
  }
}

async function ask(): Promise<Position> {
  const current = crateLocation();
  if (current) {
    try {
      return await current();
    } catch (e) {
      if ((e as { message?: string }).message !== UNAVAILABLE) throw e;
    }
  }
  if (!host.available()) throw new Error(NEEDS_NATIVE);
  return (await host.call(LOCATION_CALL)) as Position;
}

/** The position, or an Error whose message is the text to show the user. */
export async function currentPosition(): Promise<Position> {
  try {
    return await ask();
  } catch (e) {
    const err = e as { code?: string; message?: string };
    const message = err.message ?? "";
    if (message === NEEDS_NATIVE) throw e;
    if (message === "denied") throw new Error("Location permission denied. Allow it in the system settings.");
    if (message === "disabled") throw new Error("Location services are off. Turn them on and try again.");
    // A host without a handler for the name, or one that does not grant it, is not a native app of ours.
    if (err.code === "ERR_ACCESS_DENIED" || /no (host )?(function|handler)|not handled|unknown/i.test(message)) {
      throw new Error(NEEDS_NATIVE);
    }
    throw new Error(`Could not get the location: ${message}`);
  }
}

export const decimals5 = (n: number) => n.toFixed(5);
