// The Settings "Location" card: it asks the native host for the position (`host.call("location.current")`)
// and says why there is none. The host is a stand-in here; the real ones are in native/ios and native/android.
import { expect, test } from "nsh/test";
import { launchApp } from "./testing";

type Handler = () => Promise<unknown>;
const launch = (handler?: Handler) =>
  launchApp({ host: handler ? { handlers: { "location.current": handler } } : undefined });

async function showLocation(handler?: Handler) {
  const app = await launch(handler);
  await app.openWithUrl("nshtodo://settings");
  await app.press("id:location-button");
  return app;
}

test("the position from the host is shown with 5 decimals and the accuracy in metres", async () => {
  const app = await showLocation(async () => ({ latitude: 40.4168, longitude: -3.7038, accuracy: 12.4 }));
  await app.waitFor("id:location-latitude");
  expect(app.shows("id:location-latitude >> text:Latitude 40.41680")).toBe(true);
  expect(app.shows("id:location-longitude >> text:Longitude -3.70380")).toBe(true);
  expect(app.shows("id:location-accuracy >> text:Accuracy 12 m")).toBe(true);
  expect(app.host.calls()).toEqual([{ name: "location.current", data: null }]);
});

test("a denied permission is explained", async () => {
  const app = await showLocation(async () => {
    throw new Error("denied");
  });
  await app.waitFor("id:location-message");
  expect(app.shows("id:location-message >> text:Location permission denied. Allow it in the system settings.")).toBe(true);
  expect(app.shows("id:location-latitude")).toBe(false);
});

test("location services turned off are explained", async () => {
  const app = await showLocation(async () => {
    throw new Error("disabled");
  });
  await app.waitFor("id:location-message");
  expect(app.shows("id:location-message >> text:Location services are off. Turn them on and try again.")).toBe(true);
});

test("any other host error is shown as it came", async () => {
  const app = await showLocation(async () => {
    throw new Error("timeout waiting for a fix");
  });
  await app.waitFor("id:location-message");
  expect(app.shows("id:location-message >> text:Could not get the location: timeout waiting for a fix")).toBe(true);
});

test("without a host the card says it needs the native app", async () => {
  const app = await showLocation();
  await app.waitFor("id:location-message");
  expect(app.shows("id:location-message >> text:Location needs the native app.")).toBe(true);
});

test("a host that does not handle location.current says it needs the native app", async () => {
  const app = await launchApp({ host: { handlers: {} } });
  await app.openWithUrl("nshtodo://settings");
  await app.press("id:location-button");
  await app.waitFor("id:location-message");
  expect(app.shows("id:location-message >> text:Location needs the native app.")).toBe(true);
});

// The app's own Rust crate (`rust/`, `nshtodo/native`) answers where it is built in (iOS, packaged).
// Its stand-in here replaces `Location.current`; the host then must not be asked.
const withCrate = (current: Handler) =>
  launchApp({
    modules: { "nshtodo/native": { "Location.current": current } },
    host: { handlers: { "location.current": async () => ({ latitude: 1, longitude: 2, accuracy: 3 }) } },
  });

test("the Rust crate's position is shown and the host is not asked", async () => {
  const app = await withCrate(async () => ({ latitude: 40.4168, longitude: -3.7038, accuracy: 5 }));
  await app.openWithUrl("nshtodo://settings");
  await app.press("id:location-button");
  await app.waitFor("id:location-latitude");
  expect(app.shows("id:location-latitude >> text:Latitude 40.41680")).toBe(true);
  expect(app.shows("id:location-accuracy >> text:Accuracy 5 m")).toBe(true);
  expect(app.host.calls()).toEqual([]);
});

test("a denied permission in the Rust crate is explained", async () => {
  const app = await withCrate(async () => {
    throw new Error("denied");
  });
  await app.openWithUrl("nshtodo://settings");
  await app.press("id:location-button");
  await app.waitFor("id:location-message");
  expect(app.shows("id:location-message >> text:Location permission denied. Allow it in the system settings.")).toBe(true);
  expect(app.host.calls()).toEqual([]);
});

test("a crate without a bridge on this platform falls back to the host", async () => {
  const app = await withCrate(async () => {
    throw new Error("unavailable");
  });
  await app.openWithUrl("nshtodo://settings");
  await app.press("id:location-button");
  await app.waitFor("id:location-latitude");
  expect(app.shows("id:location-latitude >> text:Latitude 1.00000")).toBe(true);
  expect(app.host.calls()).toEqual([{ name: "location.current", data: null }]);
});
