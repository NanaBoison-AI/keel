import type { Card, PillarId, Pack } from "../../schema/content";

export const PILLARS: PillarId[] = [
  "family",
  "mind",
  "psychology",
  "character",
  "money",
  "world",
  "work",
  "body",
  "competence",
];

export const DEFAULT_WEIGHTS: Record<PillarId, number> = {
  family: 25,
  mind: 10,
  psychology: 10,
  character: 10,
  money: 10,
  world: 10,
  work: 10,
  body: 8,
  competence: 7,
};

export interface CardRef {
  cardId: string;
  packId: string;
}

export interface MixInput {
  /** YYYY-MM-DD */
  date: string;
  packs: Pack[];
  weights: Record<PillarId, number>;
  /** Per-pillar affinity, clamped to [0.7, 1.3]. Missing = 1. */
  affinity?: Partial<Record<PillarId, number>>;
  /** Card ids seen in the last 90 days (caller computes the window). */
  seen?: Iterable<string>;
  /** Card ids with "less like this" feedback. */
  less?: Iterable<string>;
  size: number;
}

interface Candidate {
  ref: CardRef;
  card: Card;
}

const OPENERS = new Set(["idea", "story", "fact"]);
const CLOSERS = new Set(["challenge", "conversation", "reflection"]);

export function hashString(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pickOne = <T>(arr: T[], rng: Rng): T => arr[Math.floor(rng() * arr.length)];

export function clampAffinity(n: number): number {
  return Math.min(1.3, Math.max(0.7, n));
}

/**
 * Largest-remainder allocation of `total` slots by weight, capped per key by `cap`.
 * Keys whose cap is hit are removed and the remaining slots redistributed.
 */
export function allocateSlots(
  weights: Record<string, number>,
  caps: Record<string, number>,
  total: number,
): Record<string, number> {
  const result: Record<string, number> = {};
  let active = Object.keys(weights).filter((k) => (caps[k] ?? 0) > 0 && weights[k] > 0);
  // Pillars with candidates but zero weight still count as a last resort below.
  let remaining = total;
  for (const k of Object.keys(weights)) result[k] = 0;

  while (remaining > 0 && active.length > 0) {
    const sum = active.reduce((s, k) => s + weights[k], 0);
    const raw = active.map((k) => ({ k, exact: (weights[k] / sum) * remaining }));
    const base: Record<string, number> = {};
    let used = 0;
    for (const r of raw) {
      base[r.k] = Math.floor(r.exact);
      used += base[r.k];
    }
    let leftover = remaining - used;
    const byRemainder = raw
      .slice()
      .sort(
        (a, b) =>
          b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)) ||
          weights[b.k] - weights[a.k],
      );
    for (const r of byRemainder) {
      if (leftover <= 0) break;
      base[r.k] += 1;
      leftover--;
    }
    let capped = false;
    for (const k of active) {
      const room = caps[k] - result[k];
      const give = Math.min(base[k], room);
      result[k] += give;
      remaining -= give;
      if (result[k] >= caps[k]) capped = true;
    }
    active = active.filter((k) => result[k] < caps[k]);
    if (!capped) break;
  }
  return result;
}

export function isExpired(pack: Pack, date: string): boolean {
  return !!pack.expiresAt && pack.expiresAt.slice(0, 10) < date;
}

export function buildDailyStack(input: MixInput): CardRef[] {
  const { date, packs, weights, size } = input;
  const rng = mulberry32(hashString(date));
  const seen = new Set(input.seen ?? []);
  const less = new Set(input.less ?? []);

  const live = packs.filter((p) => !isExpired(p, date));
  const briefings = live
    .filter((p) => p.type === "briefing")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  const latestBriefing = briefings[0];

  const pool: Candidate[] = [];
  const briefingPool: Candidate[] = [];
  for (const pack of live) {
    if (pack.type === "briefing" && pack !== latestBriefing) continue;
    for (const card of pack.cards) {
      if (!card.mixable || seen.has(card.id) || less.has(card.id)) continue;
      const cand = { ref: { cardId: card.id, packId: pack.id }, card };
      (pack.type === "briefing" ? briefingPool : pool).push(cand);
    }
  }
  // Latest briefing contributes at most 2 cards per day.
  pool.push(...shuffle(briefingPool, rng).slice(0, 2));

  if (size <= 0 || pool.length === 0) return [];

  const byPillar = new Map<PillarId, Candidate[]>();
  for (const c of pool) {
    const list = byPillar.get(c.card.pillar) ?? [];
    list.push(c);
    byPillar.set(c.card.pillar, list);
  }

  const target = Math.min(size, pool.length);
  const eff: Record<string, number> = {};
  const caps: Record<string, number> = {};
  for (const p of PILLARS) {
    const n = byPillar.get(p)?.length ?? 0;
    if (n === 0) continue;
    eff[p] = Math.max(0, (weights[p] ?? 0) * clampAffinity(input.affinity?.[p] ?? 1));
    caps[p] = n;
  }
  let slots = allocateSlots(eff, caps, target);

  // If the weights gave out (e.g. zero weights), fill the rest from any pillar.
  let allocated = Object.values(slots).reduce((a, b) => a + b, 0);
  if (allocated < target) {
    for (const p of Object.keys(caps)) {
      while (allocated < target && (slots[p] ?? 0) < caps[p]) {
        slots[p] = (slots[p] ?? 0) + 1;
        allocated++;
      }
    }
  }

  // Family always gets at least one slot when it has candidates.
  if (caps.family && (slots.family ?? 0) === 0 && target >= 1) {
    const donor = Object.keys(slots)
      .filter((p) => p !== "family" && slots[p] > 0)
      .sort((a, b) => slots[b] - slots[a])[0];
    if (donor) {
      slots = { ...slots, [donor]: slots[donor] - 1, family: 1 };
    }
  }

  // Pick cards, preferring formats not yet used today.
  const usedFormats = new Set<string>();
  const picked: Candidate[] = [];
  const slotList = shuffle(
    Object.entries(slots).flatMap(([p, n]) => Array<string>(n).fill(p)),
    rng,
  );
  const remainingByPillar = new Map<string, Candidate[]>(
    [...byPillar.entries()].map(([k, v]) => [k, shuffle(v, rng)]),
  );
  for (const p of slotList) {
    const list = remainingByPillar.get(p)!;
    if (!list.length) continue;
    const fresh = list.filter((c) => !usedFormats.has(c.card.format));
    const choice = fresh.length ? pickOne(fresh, rng) : pickOne(list, rng);
    list.splice(list.indexOf(choice), 1);
    picked.push(choice);
    usedFormats.add(choice.card.format);
  }

  return order(picked, rng).map((c) => c.ref);
}

/** Order cards: opener first, closer last, avoiding adjacent same pillar/format. */
export function order(cards: Candidate[], rng: Rng): Candidate[] {
  if (cards.length <= 1) return cards.slice();
  let rest = shuffle(cards, rng);

  const takeWhere = (pred: (c: Candidate) => boolean): Candidate | undefined => {
    const options = rest.filter(pred);
    if (!options.length) return undefined;
    const c = pickOne(options, rng);
    rest = rest.filter((x) => x !== c);
    return c;
  };

  const first = takeWhere((c) => OPENERS.has(c.card.format)) ?? takeWhere(() => true)!;
  const last =
    rest.length > 0
      ? (takeWhere((c) => CLOSERS.has(c.card.format) && c.card.pillar !== first.card.pillar) ??
        takeWhere((c) => CLOSERS.has(c.card.format)))
      : undefined;

  const out: Candidate[] = [first];
  while (rest.length) {
    const prev = out[out.length - 1];
    const good = rest.filter(
      (c) => c.card.pillar !== prev.card.pillar && c.card.format !== prev.card.format,
    );
    const ok = rest.filter((c) => c.card.pillar !== prev.card.pillar);
    const pool = good.length ? good : ok.length ? ok : rest;
    const c = pickOne(pool, rng);
    rest = rest.filter((x) => x !== c);
    out.push(c);
  }
  if (last) out.push(last);
  return out;
}

export interface FeedbackEvent {
  pillar: PillarId;
  signal: "less" | "expand" | "save";
  at: number;
}

const STEP: Record<FeedbackEvent["signal"], number> = { save: 0.04, expand: 0.015, less: -0.06 };
const DECAY_DAYS = 30;

/** Affinity per pillar in [0.7, 1.3]; each signal decays toward neutral over ~30 days. */
export function computeAffinity(events: FeedbackEvent[], now: number): Record<PillarId, number> {
  const out = Object.fromEntries(PILLARS.map((p) => [p, 1])) as Record<PillarId, number>;
  for (const e of events) {
    const ageDays = Math.max(0, (now - e.at) / 86_400_000);
    out[e.pillar] += STEP[e.signal] * Math.exp(-ageDays / DECAY_DAYS);
  }
  for (const p of PILLARS) out[p] = clampAffinity(out[p]);
  return out;
}

export function normalizeWeights(w: Record<PillarId, number>): Record<PillarId, number> {
  const sum = PILLARS.reduce((s, p) => s + Math.max(0, w[p] ?? 0), 0);
  if (sum <= 0) return { ...DEFAULT_WEIGHTS };
  const exact = PILLARS.map((p) => (Math.max(0, w[p] ?? 0) / sum) * 100);
  const floor = exact.map(Math.floor);
  let left = 100 - floor.reduce((a, b) => a + b, 0);
  const idx = exact.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r);
  for (const { i } of idx) {
    if (left <= 0) break;
    floor[i]++;
    left--;
  }
  return Object.fromEntries(PILLARS.map((p, i) => [p, floor[i]])) as Record<PillarId, number>;
}

/** Set one pillar to `value` (0–100); the other pillars share the rest proportionally. Sums to 100. */
export function setPillarWeight(
  weights: Record<PillarId, number>,
  pillar: PillarId,
  value: number,
): Record<PillarId, number> {
  const v = Math.round(Math.min(100, Math.max(0, value)));
  const others = PILLARS.filter((p) => p !== pillar);
  const otherSum = others.reduce((s, p) => s + (weights[p] ?? 0), 0);
  const raw = { ...weights, [pillar]: v } as Record<PillarId, number>;
  for (const p of others) {
    raw[p] = otherSum > 0 ? ((weights[p] ?? 0) / otherSum) * (100 - v) : (100 - v) / others.length;
  }
  return normalizeWeights(raw);
}
