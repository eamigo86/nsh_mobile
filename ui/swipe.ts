// The snap maths of a swipe row: where it rests after a drag. Positions are points, right positive.
export const ACTION_WIDTH = 74;
const RIGHT_OPEN = -2 * ACTION_WIDTH;
/** Past this share of the row's width, a drag performs the outermost action. */
const FULL = 0.6;

export type SwipeFull = "complete" | "delete";

/** Where a row dragged by `dx` from rest position `start` settles; `full` when the drag performs an action. */
export function settle(start: number, dx: number, width: number): { to: number; full?: SwipeFull } {
  const pos = start + dx;
  if (pos > FULL * width) return { to: width, full: "complete" };
  if (pos < -FULL * width) return { to: -width, full: "delete" };
  if (pos > 0) return { to: pos > ACTION_WIDTH / 2 ? ACTION_WIDTH : 0 };
  return { to: pos < -ACTION_WIDTH / 2 ? RIGHT_OPEN : 0 };
}
