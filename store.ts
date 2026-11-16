// The app's state. Signals stay private; screens read and change them through these functions.
// Tasks, categories and the name are kept in one `Storage` entry, written after every change.
import { batch, Keyboard, Picker, setColorScheme, signal, Storage } from "nsh";
import {
  type Appearance,
  type Category,
  type CategoryColor,
  COLORS,
  dayKey,
  nextId,
  parseSaved,
  SEED_CATEGORIES,
  type Status,
  type Task,
} from "./domain";

const KEY = "exact-todo";
// The profile photo is a JPEG data URI under its own key: the main entry is rewritten on every task change.
const PHOTO_KEY = "nsh-avatar";

const tasks = signal<Task[]>([]);
const categories = signal<Category[]>(SEED_CATEGORIES);
const name = signal("");
const photo = signal("");
const onboarded = signal(false);
const appearance = signal<Appearance>("system");
const onboardingOpen = signal(false);
const isLoaded = signal(false);
const filter = signal<Status>("all");
const categoryFilter = signal("");
const now = signal(Date.now());
export type Tab = "home" | "tasks" | "categories" | "settings";
export const TABS: Tab[] = ["home", "tasks", "categories", "settings"];
const tab = signal<Tab>("home");

// The seed is shown until the saved data arrives. Changes wait for it (`afterLoad`), so a slow read
// can neither lose a change nor overwrite the file with the seed.
let loaded = false;
const read = (key: string) => Storage.getItem(key).catch(() => null);
let ready: Promise<void> = Promise.all([read(KEY), read(PHOTO_KEY)])
  .then(([raw, savedPhoto]) => {
    const saved = parseSaved(raw);
    batch(() => {
      photo.set(savedPhoto ?? "");
      tasks.set(saved.tasks);
      categories.set(saved.categories);
      name.set(saved.name);
      onboarded.set(saved.onboarded);
      appearance.set(saved.appearance);
      isLoaded.set(true);
    });
    setColorScheme(saved.appearance);
    loaded = true;
    return persist();
  });
const persist = () =>
  Storage.setItem(KEY, JSON.stringify({ tasks: tasks(), categories: categories(), name: name(), onboarded: onboarded(), appearance: appearance() })).catch(() => {});
const afterLoad = (change: () => void) => {
  if (loaded) change();
  else ready = ready.then(change);
};
const commit = (change: () => void) =>
  afterLoad(() => {
    change();
    persist();
  });

// "Today" moves on without a restart: re-read the clock every minute.
setInterval(() => now.set(Date.now()), 60_000);

export const allTasks = () => tasks();
export const allCategories = () => categories();
export const displayName = () => name();
/** The profile photo as a data URI, "" when there is none. */
export const photoUri = () => photo();
export const statusFilter = () => filter();
export const categoryFilterId = () => categoryFilter();
export const today = () => dayKey(now());
export const nowMs = () => now();
export const currentTab = () => tab();
/** True once the saved data has been read. */
export const isReady = () => isLoaded();
/** The onboarding shows on a first launch, and whenever Settings asks for it. */
export const onboardingVisible = () => isLoaded() && (!onboarded() || onboardingOpen());

export const setTab = (next: Tab) => {
  Keyboard.dismiss();
  tab.set(next);
};
export const setStatusFilter = (next: Status) => filter.set(next);
export const setCategoryFilter = (id: string) => categoryFilter.set(id);
export const appearanceChoice = () => appearance();
/** System, Light or Dark: applied at once and kept; the next launch applies it after the data loads. */
export const setAppearance = (next: Appearance) =>
  commit(() => {
    appearance.set(next);
    setColorScheme(next);
  });
export const showOnboarding = () => onboardingOpen.set(true);
/** Skip and Get started: the onboarding is done for good. */
export const finishOnboarding = () => {
  onboardingOpen.set(false);
  commit(() => onboarded.set(true));
};
/** Bytes as a JPEG data URI (`btoa` wants a binary string; chunks keep `fromCharCode` within the stack). */
function jpegUri(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:image/jpeg;base64,${btoa(bin)}`;
}

/** Sets or clears the photo (shown at once) and keeps it. */
export const setPhoto = (uri: string) =>
  afterLoad(() => {
    photo.set(uri);
    (uri === "" ? Storage.removeItem(PHOTO_KEY) : Storage.setItem(PHOTO_KEY, uri)).catch(() => {});
  });

/** Opens the system photo picker for one 256 px JPEG; returns the error to show, or "" (a cancel changes nothing). */
export async function pickPhoto(): Promise<string> {
  try {
    const [picked] = await Picker.pickImages({ multiple: false, maxDimension: 256, quality: 0.8 });
    if (picked) setPhoto(jpegUri(new Uint8Array(await picked.file.arrayBuffer())));
    return "";
  } catch {
    return "The photo could not be loaded.";
  }
}

export const setName = (next: string) => commit(() => name.set(next));

export type TaskDraft = Omit<Task, "id" | "done">;

/** Adds a task (`id` empty) or updates one; a blank title changes nothing. */
export function saveTask(id: string, draft: TaskDraft) {
  const title = draft.title.trim();
  if (title === "") return;
  const clean = { ...draft, title, notes: draft.notes.trim() };
  commit(() => {
    if (id === "") tasks.update((list) => [...list, { ...clean, id: nextId(list), done: false }]);
    else tasks.update((list) => list.map((t) => (t.id === id ? { ...t, ...clean } : t)));
  });
}

export function setDone(id: string, done: boolean) {
  commit(() => tasks.update((list) => list.map((t) => (t.id === id ? { ...t, done } : t))));
}

export function removeTask(id: string) {
  commit(() => tasks.update((list) => list.filter((t) => t.id !== id)));
}

/** Adds a category; returns the refusal to show, or "" when it was added. Duplicates ignore case. */
export function addCategory(rawName: string, color: CategoryColor): string {
  const clean = rawName.trim();
  if (clean === "") return "Enter a name to save.";
  const same = categories().find((c) => c.name.toLowerCase() === clean.toLowerCase());
  if (same) return `There is already a category called ${same.name}.`;
  const picked = COLORS.includes(color) ? color : COLORS[0];
  commit(() => categories.update((list) => [...list, { id: nextId(list), name: clean, color: picked }]));
  return "";
}
