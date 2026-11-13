import { Pack, type ContentIndex } from "../../schema/content";
import { db as defaultDb, getSetting, setSetting, type KeelDB } from "./db";

export const SYNC_INTERVAL_MS = 30 * 60 * 1000;

export interface SyncResult {
  ok: boolean;
  added: number;
  updated: number;
}

type Fetcher = (url: string) => Promise<Response>;

/** Fetch index.json and download any pack that is new or has a newer version. Same-origin only. */
export async function syncContent(
  d: KeelDB = defaultDb,
  fetcher: Fetcher = (u) => fetch(u),
  now = Date.now(),
): Promise<SyncResult> {
  const result: SyncResult = { ok: false, added: 0, updated: 0 };
  try {
    const res = await fetcher("/content/index.json");
    if (!res.ok) return result;
    const index = (await res.json()) as ContentIndex;
    const cached = new Map((await d.packs.toArray()).map((p) => [p.id, p.version]));
    for (const entry of index.packs) {
      const have = cached.get(entry.id);
      if (have !== undefined && have >= entry.version) continue;
      const pr = await fetcher(entry.path);
      if (!pr.ok) continue;
      const pack = Pack.parse(await pr.json());
      await d.packs.put({ id: pack.id, version: pack.version, json: pack });
      if (have === undefined) result.added++;
      else result.updated++;
    }
    await setSetting("lastSync", now, d);
    result.ok = true;
  } catch {
    // Offline or bad response: the cache keeps working.
  }
  return result;
}

export async function shouldSync(d: KeelDB = defaultDb, now = Date.now()): Promise<boolean> {
  return now - (await getSetting("lastSync", d)) > SYNC_INTERVAL_MS;
}

export function describeSync(r: SyncResult): string | null {
  const n = r.added + r.updated;
  if (!r.ok || n === 0) return null;
  if (r.added > 0 && r.updated === 0)
    return `Updated: ${r.added} new ${r.added === 1 ? "deck" : "decks"}`;
  return `Updated: ${n} ${n === 1 ? "deck" : "decks"}`;
}
