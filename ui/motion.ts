// Motion tokens: one small set the controls share. Every class pairs with its `motion-reduce:` form,
// so with reduced motion on, presses and selections change state instantly instead of animating.
export const motion = {
  /** A press: the control shrinks a little and settles back (fast, ease-out). */
  press: "transition-transform duration-150 ease-out active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100",
  /** A selection or state colour change (fast). */
  colors: "transition-colors duration-150 ease-out motion-reduce:transition-none",
  /** An opacity wash for text-only controls. */
  fade: "transition-opacity duration-150 ease-out active:opacity-60 motion-reduce:transition-none",
};
