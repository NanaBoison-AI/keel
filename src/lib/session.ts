import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import type { Card, Pack } from "../../schema/content";
import { db } from "./db";
import { computeAffinity } from "./mix";

export function useSavedIds(): Set<string> {
  const rows = useLiveQuery(() => db.saves.toArray(), []);
  return useMemo(() => new Set(rows?.map((r) => r.cardId) ?? []), [rows]);
}

export function useAffinity() {
  return useLiveQuery(async () => computeAffinity(await db.feedback.toArray(), Date.now()), []);
}

export function cardIndex(packs: Pack[]): Map<string, { card: Card; pack: Pack }> {
  const m = new Map<string, { card: Card; pack: Pack }>();
  for (const pack of packs) for (const card of pack.cards) m.set(card.id, { card, pack });
  return m;
}
