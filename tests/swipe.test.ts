import { describe, expect, it } from "vitest";
import { FLICK_MIN_DISTANCE, FLICK_SPEED, SWIPE_DISTANCE, swipeDirection } from "../src/lib/swipe";

describe("swipeDirection (when a released drag moves to another card)", () => {
  it("a long drag left goes to the next card, a long drag right goes back", () => {
    expect(swipeDirection(-SWIPE_DISTANCE, 0)).toBe("next");
    expect(swipeDirection(-200, -50)).toBe("next");
    expect(swipeDirection(SWIPE_DISTANCE, 0)).toBe("prev");
    expect(swipeDirection(200, 50)).toBe("prev");
  });
  it("a short, slow drag springs back", () => {
    expect(swipeDirection(-(SWIPE_DISTANCE - 1), -100)).toBeNull();
    expect(swipeDirection(SWIPE_DISTANCE - 1, 100)).toBeNull();
    expect(swipeDirection(0, 0)).toBeNull();
  });
  it("a quick flick commits even when short", () => {
    expect(swipeDirection(-FLICK_MIN_DISTANCE, -FLICK_SPEED)).toBe("next");
    expect(swipeDirection(FLICK_MIN_DISTANCE, FLICK_SPEED)).toBe("prev");
  });
  it("a fast flick that is too short, or in the wrong direction, does not commit", () => {
    expect(swipeDirection(-(FLICK_MIN_DISTANCE - 1), -2000)).toBeNull();
    expect(swipeDirection(-60, FLICK_SPEED)).toBeNull(); // dragged left but flicked back right
  });
});
