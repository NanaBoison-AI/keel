import { z } from "zod";

export const PillarId = z.enum([
  "family",
  "mind",
  "psychology",
  "character",
  "money",
  "world",
  "work",
  "body",
  "competence",
]);
export type PillarId = z.infer<typeof PillarId>;

export const CardFormat = z.enum([
  "hook",
  "idea",
  "story",
  "quote",
  "fact",
  "challenge",
  "conversation",
  "reflection",
  "howto",
  "recap",
]);
export type CardFormat = z.infer<typeof CardFormat>;

export const Card = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  pillar: PillarId,
  format: CardFormat,
  hook: z.string().min(10).max(140),
  body: z.string().min(20).max(900),
  deeper: z.string().max(2200).optional(),
  quote: z.object({ text: z.string().max(400), attribution: z.string() }).optional(),
  source: z.object({ ref: z.string().optional(), url: z.string().url().optional() }).optional(),
  mixable: z.boolean().default(true),
  version: z.number().int().min(1).default(1),
});
export type Card = z.infer<typeof Card>;

export const Pack = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9-]+$/),
  type: z.enum(["book", "briefing", "series", "standalone"]),
  title: z.string(),
  author: z.string().optional(),
  year: z.number().int().optional(),
  pillar: PillarId,
  publicDomain: z.boolean().default(false),
  translation: z.string().optional(),
  summary: z.string().max(200),
  estMinutes: z.number().int().min(1),
  version: z.number().int().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string().optional(),
  sources: z.array(z.object({ title: z.string(), url: z.string().url() })).optional(),
  cards: z.array(Card).min(1),
});
export type Pack = z.infer<typeof Pack>;
export type PackType = Pack["type"];

export const QueueItem = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  author: z.string(),
  year: z.number().int(),
  pillar: PillarId,
  publicDomain: z.boolean(),
  translation: z.string().optional(),
  status: z.enum(["queued", "in_progress", "done", "skipped"]),
  note: z.string().optional(),
});
export type QueueItem = z.infer<typeof QueueItem>;
export const Queue = z.array(QueueItem);

export const PACK_FOLDERS: Record<PackType, string> = {
  book: "books",
  briefing: "briefings",
  series: "series",
  standalone: "standalone",
};

export interface IndexEntry {
  id: string;
  type: PackType;
  title: string;
  author?: string;
  pillar: PillarId;
  version: number;
  path: string;
  cardCount: number;
  estMinutes: number;
  expiresAt?: string;
}
export interface ContentIndex {
  generatedAt: string;
  packs: IndexEntry[];
}
