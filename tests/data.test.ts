import { describe, it, expect, beforeEach } from "vitest";
import {
  KeelDB,
  resolveSettings,
  toggleSave,
  markSeen,
  recentlySeenIds,
  saveProgress,
  setSetting,
  getAllSettings,
  addFeedback,
  undoLess,
  SEEN_WINDOW_MS,
} from "../src/lib/db";
import { exportBackup, importBackup, parseBackup } from "../src/lib/backup";
import { syncContent, describeSync } from "../src/lib/content";
import type { Pack } from "../schema/content";

const pack: Pack = {
  schemaVersion: 1,
  id: "p",
  type: "standalone",
  title: "P Title",
  pillar: "mind",
  origin: "source",
  publicDomain: false,
  summary: "s",
  estMinutes: 1,
  version: 1,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  cards: [
    {
      id: "p-01",
      pillar: "mind",
      format: "idea",
      hook: "A hook long enough",
      body: "Body long enough to pass the schema.",
      mixable: true,
      version: 1,
    },
  ],
};

let d: KeelDB;
beforeEach(async () => {
  d = new KeelDB(`test-${Math.random()}`);
  await d.open();
});

describe("personal data", () => {
  it("saves with a snapshot and toggles off", async () => {
    expect(await toggleSave(pack.cards[0], pack, d)).toBe(true);
    const row = await d.saves.get("p-01");
    expect(row?.snapshot.packTitle).toBe("P Title");
    expect(row?.snapshot.hook).toBe("A hook long enough");
    expect(await toggleSave(pack.cards[0], pack, d)).toBe(false);
    expect(await d.saves.count()).toBe(0);
  });
  it("only counts seen cards inside 90 days", async () => {
    const now = Date.now();
    await markSeen("old", d, now - SEEN_WINDOW_MS - 1000);
    await markSeen("new", d, now);
    expect(await recentlySeenIds(d, now)).toEqual(["new"]);
  });
  it("progress never goes backwards and records completion", async () => {
    await saveProgress("p", 5, 10, d);
    await saveProgress("p", 2, 10, d);
    expect((await d.progress.get("p"))?.cardIndex).toBe(5);
    await saveProgress("p", 9, 10, d);
    expect((await d.progress.get("p"))?.completedAt).toBeTypeOf("number");
  });
  it("settings default and store weights independently", async () => {
    expect((await getAllSettings(d)).stackSize).toBe(12);
    await setSetting(
      "weights",
      {
        family: 50,
        mind: 50,
        psychology: 0,
        character: 0,
        money: 0,
        world: 0,
        work: 0,
        body: 0,
        competence: 0,
        mentor: 0,
      },
      d,
    );
    const w = (await getAllSettings(d)).weights;
    expect(w.family).toBe(50);
    expect(w.competence).toBe(0);
  });
  it("undo removes only 'less' feedback for the card", async () => {
    await addFeedback("p-01", "mind", "less", d);
    await addFeedback("p-01", "mind", "save", d);
    await undoLess("p-01", d);
    expect((await d.feedback.toArray()).map((f) => f.signal)).toEqual(["save"]);
  });
});

describe("backup", () => {
  it("round-trips and does not include packs", async () => {
    await toggleSave(pack.cards[0], pack, d);
    await d.packs.put({ id: "p", version: 1, json: pack });
    await markSeen("p-01", d);
    const { filename, json } = await exportBackup(d, new Date("2026-11-13T10:00:00Z"));
    expect(filename).toBe("keel-backup-2026-11-13.json");
    expect(JSON.parse(json).packs).toBeUndefined();
    const d2 = new KeelDB(`test-${Math.random()}`);
    await importBackup(json, d2);
    expect(await d2.saves.count()).toBe(1);
    expect(await d2.seen.count()).toBe(1);
  });
  it("replaces existing data on import", async () => {
    const { json } = await exportBackup(d);
    await markSeen("later", d);
    await importBackup(json, d);
    expect(await d.seen.count()).toBe(0);
  });
  it("rejects invalid files", () => {
    expect(() => parseBackup("nope")).toThrow();
    expect(() => parseBackup('{"app":"other"}')).toThrow();
  });
});

describe("syncContent", () => {
  const index = {
    generatedAt: "x",
    packs: [
      {
        id: "p",
        type: "standalone",
        title: "P",
        pillar: "mind",
        version: 1,
        path: "/content/standalone/p.json",
        cardCount: 1,
        estMinutes: 1,
      },
    ],
  };
  const fetcher =
    (p: Pack, idx = index) =>
    async (url: string) =>
      ({ ok: true, json: async () => (url.endsWith("index.json") ? idx : p) }) as Response;

  it("downloads new packs, then skips unchanged, then updates newer versions", async () => {
    const r1 = await syncContent(d, fetcher(pack));
    expect(r1).toMatchObject({ ok: true, added: 1, updated: 0 });
    expect(describeSync(r1)).toBe("Updated: 1 new deck");
    const r2 = await syncContent(d, fetcher(pack));
    expect(r2).toMatchObject({ added: 0, updated: 0 });
    expect(describeSync(r2)).toBeNull();
    const v2 = { ...pack, version: 2 };
    const r3 = await syncContent(
      d,
      fetcher(v2, { ...index, packs: [{ ...index.packs[0], version: 2 }] }),
    );
    expect(r3.updated).toBe(1);
    expect((await d.packs.get("p"))?.version).toBe(2);
  });
  it("fails quietly when offline", async () => {
    const r = await syncContent(d, async () => {
      throw new Error("offline");
    });
    expect(r.ok).toBe(false);
  });
});

describe("settings migration", () => {
  it("fills the new Mentor weight for installs saved before it existed", async () => {
    const old = {
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
    await d.settings.put({ key: "weights", value: old });
    const w = (await getAllSettings(d)).weights;
    expect(w.mentor).toBeGreaterThan(0);
    expect(Object.values(w).reduce((a, b) => a + b, 0)).toBe(100);
    expect(w.family).toBeGreaterThan(w.mind);
    expect(resolveSettings([]).weights.mentor).toBe(10);
  });
});
