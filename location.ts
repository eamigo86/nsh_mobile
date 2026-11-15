// The device position, asked of the native app that embeds NSH (see native/ios and native/android).
// Contract: `host.call("location.current")` resolves { latitude, longitude, accuracy } (degrees, metres)
// and rejects with "denied", "disabled" or another error text. NSH has no geolocation module of its own.
import { host } from "nsh";

export interface Position {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export const LOCATION_CALL = "location.current";

/** The position, or an Error whose message is the text to show the user. */
export async function currentPosition(): Promise<Position> {
  if (!host.available()) throw new Error("Location needs the native app.");
  try {
    return (await host.call(LOCATION_CALL)) as Position;
  } catch (e) {
    const err = e as { code?: string; message?: string };
    const message = err.message ?? "";
    if (message === "denied") throw new Error("Location permission denied. Allow it in the system settings.");
    if (message === "disabled") throw new Error("Location services are off. Turn them on and try again.");
    // A host without a handler for the name, or one that does not grant it, is not a native app of ours.
    if (err.code === "ERR_ACCESS_DENIED" || /no (host )?(function|handler)|not handled|unknown/i.test(message)) {
      throw new Error("Location needs the native app.");
    }
    throw new Error(`Could not get the location: ${message}`);
  }
}

export const decimals5 = (n: number) => n.toFixed(5);
