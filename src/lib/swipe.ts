/** Drag distance (px) that commits a swipe. */
export const SWIPE_DISTANCE = 80;
/** A shorter drag still commits if it was a quick flick (px/s). */
export const FLICK_SPEED = 500;
export const FLICK_MIN_DISTANCE = 30;

/**
 * Decide what a finished horizontal drag means. Swiping left moves to the next card and swiping
 * right to the previous one; a short, slow drag just springs back.
 */
export function swipeDirection(offsetX: number, velocityX: number): "next" | "prev" | null {
  if (offsetX <= -SWIPE_DISTANCE || (offsetX <= -FLICK_MIN_DISTANCE && velocityX <= -FLICK_SPEED)) {
    return "next";
  }
  if (offsetX >= SWIPE_DISTANCE || (offsetX >= FLICK_MIN_DISTANCE && velocityX >= FLICK_SPEED)) {
    return "prev";
  }
  return null;
}
