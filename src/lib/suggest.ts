import type { Pack, PillarId } from "../../schema/content";
import { PILLARS } from "./mix";

export interface SuggestInput {
  packs: Pack[];
  weights: Record<PillarId, number>;
  affinity?: Partial<Record<PillarId, number>>;
  /** packId -> progress (started if present) */
  started: Set<string>;
  /** Pillars of recently read packs, most recent first. */
  recentPillars: PillarId[];
  count?: number;
}

/** Up Next: unstarted decks ranked by pillar weight × affinity, favouring underrepresented pillars. */
export function suggestDecks({
  packs,
  weights,
  affinity,
  started,
  recentPillars,
  count = 3,
}: SuggestInput): Pack[] {
  const recent = new Map<PillarId, number>(PILLARS.map((p) => [p, 0]));
  for (const p of recentPillars.slice(0, 10)) recent.set(p, (recent.get(p) ?? 0) + 1);
  const score = (p: Pack) =>
    ((weights[p.pillar] ?? 0) * (affinity?.[p.pillar] ?? 1)) / (1 + (recent.get(p.pillar) ?? 0));
  const candidates = packs
    .filter((p) => (p.type === "book" || p.type === "series") && !started.has(p.id))
    .sort((a, b) => score(b) - score(a) || a.title.localeCompare(b.title));
  // Prefer variety: at most one deck per pillar until we run out.
  const out: Pack[] = [];
  const usedPillars = new Set<PillarId>();
  for (const p of candidates) {
    if (out.length >= count) break;
    if (!usedPillars.has(p.pillar)) {
      out.push(p);
      usedPillars.add(p.pillar);
    }
  }
  for (const p of candidates) {
    if (out.length >= count) break;
    if (!out.includes(p)) out.push(p);
  }
  return out;
}
