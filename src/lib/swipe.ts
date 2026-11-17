/** Finger travel beyond the end of the text that counts as "go to the next/previous card". */
export const OVERSHOOT = 60;
/** A quick flick needs less. */
export const FAST_OVERSHOOT = 30;

export interface ScrollSwipe {
  /** scrollTop when the finger went down. */
  startTop: number;
  /** scrollTop when it lifted. */
  endTop: number;
  /** scrollHeight - clientHeight. */
  max: number;
  /** Finger travel in px, end minus start (negative = swiped up). */
  dy: number;
  /** The swipe was a quick flick. */
  fast?: boolean;
}

/**
 * On a card whose text scrolls, a vertical swipe first scrolls the text (the browser does that).
 * If the swipe scrolled the text to its end and the finger kept going, it chains to the next card
 * ("forward") or, at the top, the previous one ("back"). A swipe that starts at the end counts
 * the same way, so one swipe is enough whether the overflow is a few lines or a lot.
 */
export function chainedSwipe({
  startTop,
  endTop,
  max,
  dy,
  fast = false,
}: ScrollSwipe): "forward" | "back" | null {
  const over = fast ? FAST_OVERSHOOT : OVERSHOOT;
  const up = -dy;
  const down = dy;
  if (up > 0 && endTop >= max - 2 && up > max - startTop + over) return "forward";
  if (down > 0 && endTop <= 2 && down > startTop + over) return "back";
  return null;
}
