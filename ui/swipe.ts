// The snap maths of a swipe row: where it rests after a drag. Positions are points, right positive: the row itself
// moves right (Complete) or left (Edit and Delete), revealing the fixed actions underneath.
export const ACTION_WIDTH = 74;
/** The card shows between the open Complete action and the row. */
export const GAP = 12;
/** Space between the Edit and Delete actions. */
const ACTION_GAP = 8;
const LEFT_OPEN = ACTION_WIDTH + GAP;
const RIGHT_OPEN = -(2 * ACTION_WIDTH + ACTION_GAP);
/** Past this share of the row's width, a drag performs the outermost action. */
const FULL = 0.6;

export type SwipeFull = "complete" | "delete";

/** Where a row dragged by `dx` from rest position `start` settles; `full` when the drag performs an action. */
export function settle(start: number, dx: number, width: number): { to: number; full?: SwipeFull } {
  const pos = start + dx;
  // Until the row has been laid out its width is 0, and any drag would be "past 60%": never complete or delete then.
  if (width > 0 && pos > FULL * width) return { to: width, full: "complete" };
  if (width > 0 && pos < -FULL * width) return { to: -width, full: "delete" };
  if (pos > 0) return { to: pos > ACTION_WIDTH / 2 ? LEFT_OPEN : 0 };
  return { to: pos < -ACTION_WIDTH / 2 ? RIGHT_OPEN : 0 };
}
