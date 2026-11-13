import Dexie, { type Table } from "dexie";
import type { Pack, PillarId, Card } from "../../schema/content";
import { DEFAULT_WEIGHTS, normalizeWeights } from "./mix";

export interface PackRow {
  id: string;
  version: number;
  json: Pack;
}
export interface ProgressRow {
  packId: string;
  cardIndex: number;
  startedAt: number;
  completedAt?: number;
}
export interface SeenRow {
  cardId: string;
  seenAt: number;
}
export interface SnapshotData {
  hook: string;
  body: string;
  deeper?: string;
  quote?: Card["quote"];
  source?: Card["source"];
  packTitle: string;
  pillar: PillarId;
}
export interface SaveRow {
  cardId: string;
  packId: string;
  savedAt: number;
  snapshot: SnapshotData;
}
export interface FeedbackRow {
  id?: number;
  cardId: string;
  pillar: PillarId;
  signal: "less" | "expand" | "save";
  at: number;
}
export interface DailyRow {
  date: string;
  cardIds: string[];
  packIds: string[];
  position: number;
}
export interface SettingRow {
  key: string;
  value: unknown;
}

export class KeelDB extends Dexie {
  packs!: Table<PackRow, string>;
  progress!: Table<ProgressRow, string>;
  seen!: Table<SeenRow, string>;
  saves!: Table<SaveRow, string>;
  feedback!: Table<FeedbackRow, number>;
  daily!: Table<DailyRow, string>;
  settings!: Table<SettingRow, string>;

  constructor(name = "keel") {
    super(name);
    this.version(1).stores({
      packs: "id, version",
      progress: "packId",
      seen: "cardId, seenAt",
      saves: "cardId, packId, savedAt",
      feedback: "++id, cardId, pillar, signal, at",
      daily: "date",
      settings: "key",
    });
  }
}

export const db = new KeelDB();

export type ThemeSetting = "system" | "light" | "dark";
export interface Settings {
  weights: Record<PillarId, number>;
  stackSize: number; // 8–15
  textSize: number; // 0–3
  theme: ThemeSetting;
  lastSync: number;
}

export const DEFAULT_SETTINGS: Settings = {
  weights: { ...DEFAULT_WEIGHTS },
  stackSize: 12,
  textSize: 1,
  theme: "system",
  lastSync: 0,
};

export async function getSetting<K extends keyof Settings>(key: K, d = db): Promise<Settings[K]> {
  const row = await d.settings.get(key);
  return (row ? row.value : DEFAULT_SETTINGS[key]) as Settings[K];
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K], d = db) {
  const v = key === "weights" ? normalizeWeights(value as Settings["weights"]) : value;
  await d.settings.put({ key, value: v });
}

export async function getAllSettings(d = db): Promise<Settings> {
  const rows = await d.settings.toArray();
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key] = r.value;
  return out as unknown as Settings;
}

export const SEEN_WINDOW_MS = 90 * 86_400_000;

export async function markSeen(cardId: string, d = db, now = Date.now()) {
  await d.seen.put({ cardId, seenAt: now });
}

export async function recentlySeenIds(d = db, now = Date.now()): Promise<string[]> {
  const rows = await d.seen
    .where("seenAt")
    .above(now - SEEN_WINDOW_MS)
    .toArray();
  return rows.map((r) => r.cardId);
}

export async function saveProgress(
  packId: string,
  cardIndex: number,
  total: number,
  d = db,
  now = Date.now(),
) {
  const existing = await d.progress.get(packId);
  const done = cardIndex >= total - 1;
  await d.progress.put({
    packId,
    cardIndex: Math.max(cardIndex, existing?.cardIndex ?? 0),
    startedAt: existing?.startedAt ?? now,
    completedAt: existing?.completedAt ?? (done ? now : undefined),
  });
}

export function snapshotOf(card: Card, pack: Pack): SnapshotData {
  return {
    hook: card.hook,
    body: card.body,
    deeper: card.deeper,
    quote: card.quote,
    source: card.source,
    packTitle: pack.title,
    pillar: card.pillar,
  };
}

export async function toggleSave(
  card: Card,
  pack: Pack,
  d = db,
  now = Date.now(),
): Promise<boolean> {
  const existing = await d.saves.get(card.id);
  if (existing) {
    await d.saves.delete(card.id);
    return false;
  }
  await d.saves.put({
    cardId: card.id,
    packId: pack.id,
    savedAt: now,
    snapshot: snapshotOf(card, pack),
  });
  await addFeedback(card.id, card.pillar, "save", d, now);
  return true;
}

export async function addFeedback(
  cardId: string,
  pillar: PillarId,
  signal: FeedbackRow["signal"],
  d = db,
  now = Date.now(),
) {
  await d.feedback.add({ cardId, pillar, signal, at: now });
}

export async function undoLess(cardId: string, d = db) {
  await d.feedback
    .where("cardId")
    .equals(cardId)
    .and((f) => f.signal === "less")
    .delete();
}

export async function resetLessSignals(d = db) {
  await d.feedback.where("signal").equals("less").delete();
}

export const PERSONAL_TABLES = [
  "progress",
  "seen",
  "saves",
  "feedback",
  "daily",
  "settings",
] as const;
