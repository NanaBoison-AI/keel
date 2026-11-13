import { describe, it, expect } from "vitest";
import type { Card, Pack, PillarId } from "../schema/content";
import {
  buildDailyStack,
  allocateSlots,
  computeAffinity,
  normalizeWeights,
  DEFAULT_WEIGHTS,
  PILLARS,
} from "../src/lib/mix";

const FORMATS = [
  "idea",
  "story",
  "fact",
  "challenge",
  "conversation",
  "reflection",
  "quote",
  "howto",
] as const;

function mkPack(id: string, pillar: PillarId, n: number, over: Partial<Pack> = {}): Pack {
  const cards: Card[] = Array.from({ length: n }, (_, i) => ({
    id: `${id}-${i + 1}`,
    pillar,
    format: FORMATS[i % FORMATS.length],
    hook: `Hook for ${id} number ${i + 1}`,
    body: "Body text that is long enough to pass.",
    mixable: true,
    version: 1,
  }));
  return {
    schemaVersion: 1,
    id,
    type: "standalone",
    title: id,
    pillar,
    publicDomain: false,
    summary: "s",
    estMinutes: 5,
    version: 1,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    cards,
    ...over,
  };
}
const allPacks = () => PILLARS.map((p) => mkPack(p, p, 8));
const base = { date: "2026-11-13", weights: DEFAULT_WEIGHTS, size: 12 };
const pillarOf = (packs: Pack[]) => {
  const m = new Map<string, Card>();
  packs.forEach((p) => p.cards.forEach((c) => m.set(c.id, c)));
  return (id: string) => m.get(id)!;
};

describe("buildDailyStack", () => {
  it("is deterministic for a date", () => {
    const packs = allPacks();
    expect(buildDailyStack({ ...base, packs })).toEqual(buildDailyStack({ ...base, packs }));
  });
  it("differs across dates", () => {
    const packs = allPacks();
    const a = buildDailyStack({ ...base, packs })
      .map((r) => r.cardId)
      .join();
    const b = buildDailyStack({ ...base, date: "2026-11-14", packs })
      .map((r) => r.cardId)
      .join();
    expect(a).not.toEqual(b);
  });
  it("returns the requested size with no duplicates", () => {
    const s = buildDailyStack({ ...base, packs: allPacks() });
    expect(s).toHaveLength(12);
    expect(new Set(s.map((r) => r.cardId)).size).toBe(12);
  });
  it("gives family the most slots by default weights", () => {
    const packs = allPacks();
    const get = pillarOf(packs);
    const s = buildDailyStack({ ...base, packs, size: 15 });
    const fam = s.filter((r) => get(r.cardId).pillar === "family").length;
    expect(fam).toBeGreaterThanOrEqual(3);
  });
  it("respects user weights", () => {
    const packs = allPacks();
    const get = pillarOf(packs);
    const weights = { ...DEFAULT_WEIGHTS, family: 0, money: 1000 };
    const s = buildDailyStack({ ...base, packs, weights, size: 8 });
    expect(s.filter((r) => get(r.cardId).pillar === "money").length).toBeGreaterThanOrEqual(6);
  });
  it("family always gets at least one slot when it has candidates", () => {
    const packs = allPacks();
    const get = pillarOf(packs);
    const weights = { ...DEFAULT_WEIGHTS, family: 0.1 };
    const s = buildDailyStack({ ...base, packs, weights, size: 8 });
    expect(s.some((r) => get(r.cardId).pillar === "family")).toBe(true);
  });
  it("clamps affinity to [0.7, 1.3]", () => {
    const packs = allPacks();
    const get = pillarOf(packs);
    const s = buildDailyStack({ ...base, packs, affinity: { family: 999, mind: -5 } });
    const fam = s.filter((r) => get(r.cardId).pillar === "family").length;
    expect(fam).toBeLessThanOrEqual(5);
  });
  it("excludes seen cards, less-feedback cards and non-mixable cards", () => {
    const packs = [mkPack("a", "family", 5)];
    packs[0].cards[4].mixable = false;
    const s = buildDailyStack({ ...base, packs, seen: ["a-1"], less: ["a-2"] });
    expect(s.map((r) => r.cardId).sort()).toEqual(["a-3", "a-4"]);
  });
  it("excludes expired packs", () => {
    const packs = [
      mkPack("old", "world", 5, { type: "briefing", expiresAt: "2026-11-01" }),
      mkPack("ok", "family", 3),
    ];
    const s = buildDailyStack({ ...base, packs });
    expect(s.every((r) => r.packId === "ok")).toBe(true);
  });
  it("uses at most 2 cards from the latest briefing and ignores older ones", () => {
    const packs = [
      mkPack("2026-w45", "world", 10, {
        type: "briefing",
        createdAt: "2026-11-02",
        expiresAt: "2026-12-30",
      }),
      mkPack("2026-w46", "world", 10, {
        type: "briefing",
        createdAt: "2026-11-09",
        expiresAt: "2026-12-30",
      }),
      ...allPacks().filter((p) => p.pillar !== "world"),
    ];
    const s = buildDailyStack({ ...base, packs, weights: { ...DEFAULT_WEIGHTS, world: 100 } });
    expect(s.some((r) => r.packId === "2026-w45")).toBe(false);
    expect(s.filter((r) => r.packId === "2026-w46").length).toBeLessThanOrEqual(2);
  });
  it("redistributes slots from empty pillars", () => {
    const packs = [mkPack("f", "family", 10), mkPack("m", "mind", 10)];
    expect(buildDailyStack({ ...base, packs })).toHaveLength(12);
  });
  it("returns what exists if the pool is smaller than size", () => {
    expect(buildDailyStack({ ...base, packs: [mkPack("f", "family", 4)] })).toHaveLength(4);
  });
  it("returns an empty stack for an empty pool", () => {
    expect(buildDailyStack({ ...base, packs: [] })).toEqual([]);
  });
  it("starts with idea/story/fact and ends with challenge/conversation/reflection", () => {
    for (let d = 1; d <= 20; d++) {
      const packs = allPacks();
      const get = pillarOf(packs);
      const s = buildDailyStack({ ...base, date: `2026-12-${String(d).padStart(2, "0")}`, packs });
      expect(["idea", "story", "fact"]).toContain(get(s[0].cardId).format);
      expect(["challenge", "conversation", "reflection"]).toContain(
        get(s[s.length - 1].cardId).format,
      );
    }
  });
  it("avoids consecutive cards from the same pillar", () => {
    for (let d = 1; d <= 20; d++) {
      const packs = allPacks();
      const get = pillarOf(packs);
      const s = buildDailyStack({ ...base, date: `2026-12-${String(d).padStart(2, "0")}`, packs });
      let adjacent = 0;
      for (let i = 1; i < s.length; i++)
        if (get(s[i].cardId).pillar === get(s[i - 1].cardId).pillar) adjacent++;
      expect(adjacent).toBeLessThanOrEqual(1);
    }
  });
});

describe("allocateSlots", () => {
  it("sums to total and follows weights", () => {
    const r = allocateSlots({ a: 50, b: 30, c: 20 }, { a: 99, b: 99, c: 99 }, 10);
    expect(r).toEqual({ a: 5, b: 3, c: 2 });
  });
  it("uses the largest remainder", () => {
    const r = allocateSlots({ a: 1, b: 1, c: 1 }, { a: 9, b: 9, c: 9 }, 10);
    expect(Object.values(r).reduce((x, y) => x + y)).toBe(10);
  });
  it("redistributes when a cap is hit", () => {
    const r = allocateSlots({ a: 90, b: 10 }, { a: 2, b: 20 }, 10);
    expect(r).toEqual({ a: 2, b: 8 });
  });
});

describe("computeAffinity / normalizeWeights", () => {
  const now = Date.now();
  it("rises with saves and falls with less, within bounds", () => {
    const up = computeAffinity(
      Array.from({ length: 100 }, () => ({
        pillar: "mind" as const,
        signal: "save" as const,
        at: now,
      })),
      now,
    );
    const down = computeAffinity(
      Array.from({ length: 100 }, () => ({
        pillar: "mind" as const,
        signal: "less" as const,
        at: now,
      })),
      now,
    );
    expect(up.mind).toBe(1.3);
    expect(down.mind).toBe(0.7);
    expect(up.family).toBe(1);
  });
  it("decays toward 1.0", () => {
    const e = [{ pillar: "mind" as const, signal: "save" as const, at: now }];
    const fresh = computeAffinity(e, now).mind;
    const old = computeAffinity(e, now + 90 * 86_400_000).mind;
    expect(fresh).toBeGreaterThan(old);
    expect(old).toBeGreaterThan(1);
  });
  it("normalizes weights to exactly 100", () => {
    const n = normalizeWeights({ ...DEFAULT_WEIGHTS, family: 77, mind: 3 });
    expect(PILLARS.reduce((s, p) => s + n[p], 0)).toBe(100);
  });
});
