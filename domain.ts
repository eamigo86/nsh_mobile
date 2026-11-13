// The app's rules as plain functions: no signals, no storage, so they are easy to test and reuse.
// Days are `YYYY-MM-DD` strings in the device's own time zone; "today" is passed in, never read here.

export interface Task {
  id: string;
  title: string;
  notes: string;
  categoryId: string;
  due: string;
  time: string;
  done: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: CategoryColor;
}

export const COLORS = ["blue", "violet", "pink", "orange", "green", "teal"] as const;
export type CategoryColor = (typeof COLORS)[number];
export type Status = "all" | "active" | "done" | "today" | "overdue";
export const STATUSES: Status[] = ["all", "active", "done", "today", "overdue"];

export const SEED_CATEGORIES: Category[] = [
  { id: "1", name: "Home", color: "blue" },
  { id: "2", name: "Work", color: "violet" },
  { id: "3", name: "Personal", color: "pink" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad = (n: number) => String(n).padStart(2, "0");

/** The calendar day of a moment, as the device's clock shows it. */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const hourOf = (ms: number) => new Date(ms).getHours();

export const salutation = (hour: number) => (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");

export function greeting(name: string, hour: number): string {
  const who = name.trim();
  return who === "" ? "Hello" : `${salutation(hour)}, ${who}`;
}

/** Overdue is day-based: open, with a due day before today (a time that has passed today does not count). */
export const isOverdue = (t: Task, today: string) => !t.done && t.due !== "" && t.due < today;
export const isToday = (t: Task, today: string) => t.due === today;

export function passes(t: Task, status: Status, categoryId: string, today: string): boolean {
  if (categoryId !== "" && t.categoryId !== categoryId) return false;
  switch (status) {
    case "all":
      return true;
    case "active":
      return !t.done;
    case "done":
      return t.done;
    case "today":
      return isToday(t, today);
    case "overdue":
      return isOverdue(t, today);
  }
}

/** "Mar 10, 2026", or "Mar 10, 2026 09:30" with a time; empty without a due day. */
export function dueText(t: Pick<Task, "due" | "time">): string {
  if (t.due === "") return "";
  const [y, m, d] = t.due.split("-").map(Number);
  const day = `${MONTHS[m - 1]} ${d}, ${y}`;
  return t.time === "" ? day : `${day} ${t.time}`;
}

export const categoryOf = (cats: Category[], id: string) => cats.find((c) => c.id === id);

/** "Work · Mar 10, 2026": the category and the due text, whichever exist. */
export const metaText = (t: Task, cats: Category[]) =>
  [categoryOf(cats, t.categoryId)?.name ?? "", dueText(t)].filter((s) => s !== "").join(" · ");

export const countText = (n: number) => `${n} ${n === 1 ? "task" : "tasks"}`;

/** The earliest open tasks first (no due day last, then by time), at most `limit`. */
export function upNext(tasks: Task[], limit = 5): Task[] {
  const key = (t: Task) => (t.due === "" ? "9999-99-99" : t.due);
  return tasks
    .filter((t) => !t.done)
    .sort((a, b) => (key(a) === key(b) ? a.time.localeCompare(b.time) : key(a).localeCompare(key(b))))
    .slice(0, limit);
}

export const nextId = (rows: { id: string }[]) => String(Math.max(0, ...rows.map((r) => Number(r.id))) + 1);

export const initial = (name: string) => name.trim().slice(0, 1).toUpperCase();

export const colorLabel = (c: CategoryColor) => c.charAt(0).toUpperCase() + c.slice(1);

/** Parses what the file holds; anything unreadable is the seeded, empty app. */
export function parseSaved(raw: string | null): { tasks: Task[]; categories: Category[]; name: string } {
  const empty = { tasks: [], categories: SEED_CATEGORIES, name: "" };
  if (!raw) return empty;
  try {
    const data = JSON.parse(raw);
    const categories: Category[] = (data.categories ?? []).map((c: Category, i: number) => ({
      ...c,
      color: (COLORS as readonly string[]).includes(c.color) ? c.color : COLORS[i % COLORS.length],
    }));
    return {
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      categories: categories.length > 0 ? categories : SEED_CATEGORIES,
      name: typeof data.name === "string" ? data.name : "",
    };
  } catch {
    return empty;
  }
}
