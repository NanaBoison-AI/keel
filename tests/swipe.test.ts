import { describe, expect, it } from "vitest";
import { chainedSwipe, OVERSHOOT } from "../src/lib/swipe";

describe("chainedSwipe (card text scrolls)", () => {
  it("a long swipe up that scrolls a slightly overflowing card to its end moves on", () => {
    // 20px of overflow, finger travels 240px up: scrolled 20, 220 left over.
    expect(chainedSwipe({ startTop: 0, endTop: 20, max: 20, dy: -240 })).toBe("forward");
  });
  it("a swipe that only scrolls part of a long card does not move on", () => {
    expect(chainedSwipe({ startTop: 0, endTop: 200, max: 400, dy: -200 })).toBeNull();
  });
  it("a swipe that just reaches the end exactly does not move on (needs overshoot)", () => {
    expect(chainedSwipe({ startTop: 0, endTop: 100, max: 100, dy: -100 })).toBeNull();
    expect(chainedSwipe({ startTop: 0, endTop: 100, max: 100, dy: -(100 + OVERSHOOT) })).toBeNull();
    expect(chainedSwipe({ startTop: 0, endTop: 100, max: 100, dy: -(100 + OVERSHOOT + 1) })).toBe(
      "forward",
    );
  });
  it("starting already at the end, a normal swipe up moves on", () => {
    expect(chainedSwipe({ startTop: 300, endTop: 300, max: 300, dy: -120 })).toBe("forward");
    expect(chainedSwipe({ startTop: 300, endTop: 300, max: 300, dy: -40 })).toBeNull();
  });
  it("swiping down from the top moves back; from the middle it only scrolls", () => {
    expect(chainedSwipe({ startTop: 0, endTop: 0, max: 300, dy: 120 })).toBe("back");
    expect(chainedSwipe({ startTop: 150, endTop: 0, max: 300, dy: 150 })).toBeNull();
    expect(chainedSwipe({ startTop: 30, endTop: 0, max: 300, dy: 200 })).toBe("back");
  });
  it("ignores swipes whose text did not end at an edge", () => {
    expect(chainedSwipe({ startTop: 0, endTop: 50, max: 400, dy: -300 })).toBeNull();
  });
});

describe("chainedSwipe: cards that do not scroll, and quick flicks", () => {
  it("a normal swipe up on a card that fits moves on", () => {
    expect(chainedSwipe({ startTop: 0, endTop: 0, max: 0, dy: -150 })).toBe("forward");
  });
  it("a tiny drag does not", () => {
    expect(chainedSwipe({ startTop: 0, endTop: 0, max: 0, dy: -40 })).toBeNull();
  });
  it("a short quick flick on a card that fits moves on", () => {
    expect(chainedSwipe({ startTop: 0, endTop: 0, max: 0, dy: -45, fast: true })).toBe("forward");
    expect(chainedSwipe({ startTop: 0, endTop: 0, max: 0, dy: -25, fast: true })).toBeNull();
  });
  it("swipe down on a card that fits goes back", () => {
    expect(chainedSwipe({ startTop: 0, endTop: 0, max: 0, dy: 150 })).toBe("back");
  });
});
