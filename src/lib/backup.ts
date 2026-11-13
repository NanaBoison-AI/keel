import { z } from "zod";
import { PillarId } from "../../schema/content";
import { db as defaultDb, PERSONAL_TABLES, type KeelDB } from "./db";

const Snapshot = z.object({
  hook: z.string(),
  body: z.string(),
  deeper: z.string().optional(),
  quote: z.object({ text: z.string(), attribution: z.string() }).optional(),
  source: z.object({ ref: z.string().optional(), url: z.string().optional() }).optional(),
  packTitle: z.string(),
  pillar: PillarId,
});

export const BackupSchema = z.object({
  app: z.literal("keel"),
  backupVersion: z.literal(1),
  exportedAt: z.string(),
  progress: z.array(
    z.object({
      packId: z.string(),
      cardIndex: z.number(),
      startedAt: z.number(),
      completedAt: z.number().optional(),
      updatedAt: z.number().optional(),
    }),
  ),
  seen: z.array(z.object({ cardId: z.string(), seenAt: z.number() })),
  saves: z.array(
    z.object({ cardId: z.string(), packId: z.string(), savedAt: z.number(), snapshot: Snapshot }),
  ),
  feedback: z.array(
    z.object({
      id: z.number().optional(),
      cardId: z.string(),
      pillar: PillarId,
      signal: z.enum(["less", "expand", "save"]),
      at: z.number(),
    }),
  ),
  daily: z.array(
    z.object({
      date: z.string(),
      cardIds: z.array(z.string()),
      packIds: z.array(z.string()),
      position: z.number(),
    }),
  ),
  settings: z.array(z.object({ key: z.string(), value: z.unknown() })),
});
export type Backup = z.infer<typeof BackupSchema>;

export async function exportBackup(
  d: KeelDB = defaultDb,
  now = new Date(),
): Promise<{ filename: string; json: string }> {
  const data: Record<string, unknown> = {
    app: "keel",
    backupVersion: 1,
    exportedAt: now.toISOString(),
  };
  for (const t of PERSONAL_TABLES) data[t] = await d.table(t).toArray();
  return {
    filename: `keel-backup-${now.toISOString().slice(0, 10)}.json`,
    json: JSON.stringify(data, null, 2),
  };
}

export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const parsed = BackupSchema.safeParse(raw);
  if (!parsed.success) throw new Error("That file isn't a Keel backup.");
  return parsed.data;
}

/** Replace all personal data with the backup contents. Caller must confirm first. */
export async function importBackup(text: string, d: KeelDB = defaultDb): Promise<void> {
  const backup = parseBackup(text);
  await d.transaction(
    "rw",
    PERSONAL_TABLES.map((t) => d.table(t)),
    async () => {
      for (const t of PERSONAL_TABLES) {
        await d.table(t).clear();
        await d.table(t).bulkAdd(backup[t] as never[]);
      }
    },
  );
}

export function downloadFile(filename: string, json: string) {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
