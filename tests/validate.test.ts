import { describe, it, expect } from "vitest";
import { validatePacks, validateQueue } from "../scripts/validate-lib";

type AnyObj = Record<string, unknown>;

const card = (packId: string, n: number, over: AnyObj = {}): AnyObj => ({
  id: `${packId}-${String(n).padStart(2, "0")}`,
  pillar: "character",
  format: "idea",
  hook: `Unique hook number ${packId} ${n} here`,
  body: "A body that is comfortably longer than twenty characters.",
  mixable: true,
  version: 1,
  ...over,
});

function book(id = "demo", over: AnyObj = {}, cardOver?: (cards: AnyObj[]) => AnyObj[]): AnyObj {
  let cards: AnyObj[] = Array.from({ length: 12 }, (_, i) => card(id, i + 1));
  cards[0] = card(id, 1, { format: "hook", mixable: false });
  cards[11] = card(id, 12, { format: "recap", mixable: false });
  if (cardOver) cards = cardOver(cards);
  return {
    schemaVersion: 1,
    id,
    type: "book",
    title: "Demo",
    author: "A. Author",
    year: 2000,
    pillar: "character",
    publicDomain: false,
    summary: "s",
    estMinutes: 9,
    version: 1,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    cards,
    ...over,
  };
}
const run = (raw: AnyObj, folder = "books") =>
  validatePacks([{ file: `${folder}/${raw.id}.json`, folder, raw }]).problems.map((p) => p.rule);

describe("validatePacks", () => {
  it("accepts a valid book", () => expect(run(book())).toEqual([]));

  it("rejects filename/id mismatch", () => {
    const r = validatePacks([{ file: "books/other.json", folder: "books", raw: book() }]);
    expect(r.problems.some((p) => p.rule.includes("filename"))).toBe(true);
  });
  it("rejects wrong folder for type", () =>
    expect(run(book(), "series").some((r) => r.includes("must live in"))).toBe(true));
  it("rejects card id without pack prefix", () =>
    expect(
      run(
        book("demo", {}, (c) => {
          c[3] = card("zzz", 4);
          return c;
        }),
      ).some((r) => r.includes("must start with")),
    ).toBe(true));
  it("rejects duplicate card ids across packs", () => {
    const a = book("aaa");
    const b = book("bbb", {}, (c) => {
      c[2] = { ...(c[2] as AnyObj), id: "aaa-03" };
      return c;
    });
    const r = validatePacks([
      { file: "books/aaa.json", folder: "books", raw: a },
      { file: "books/bbb.json", folder: "books", raw: b },
    ]);
    expect(r.problems.some((p) => p.rule.includes("duplicate card id"))).toBe(true);
  });
  it("rejects duplicate hooks across packs", () => {
    const a = book("aaa");
    const b = book("bbb", {}, (c) => {
      c[2] = { ...(c[2] as AnyObj), hook: (a.cards as AnyObj[])[2].hook };
      return c;
    });
    const r = validatePacks([
      { file: "books/aaa.json", folder: "books", raw: a },
      { file: "books/bbb.json", folder: "books", raw: b },
    ]);
    expect(r.problems.some((p) => p.rule.includes("duplicate hook"))).toBe(true);
  });
  it("book requires author and year", () => {
    const rules = run(book("demo", { author: undefined, year: undefined }));
    expect(rules).toContain("book requires author");
    expect(rules).toContain("book requires year");
  });
  it("book needs 10-20 cards", () =>
    expect(
      run(book("demo", {}, (c) => c.slice(0, 4).concat(c.slice(-1)))).some((r) =>
        r.includes("10–20"),
      ),
    ).toBe(true));
  it("book first card hook, last card recap, both unmixable", () => {
    const rules = run(
      book("demo", {}, (c) => {
        c[0] = card("demo", 1, { format: "hook", mixable: true });
        c[11] = card("demo", 12, { format: "idea" });
        return c;
      }),
    );
    expect(rules.some((r) => r.includes("first card"))).toBe(false); // hook is first
    expect(rules.some((r) => r.includes("mixable: false"))).toBe(true);
    expect(rules.some((r) => r.includes("last card"))).toBe(true);
  });
  it("limits quotes in non-PD packs", () => {
    const long = {
      text: "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen",
      attribution: "x",
    };
    const rules = run(
      book("demo", {}, (c) => {
        c[2] = card("demo", 3, { quote: long });
        c[3] = card("demo", 4, { quote: { text: "short", attribution: "x" } });
        return c;
      }),
    );
    expect(rules.some((r) => r.includes("≤ 15 words"))).toBe(true);
    expect(rules.some((r) => r.includes("at most one quote"))).toBe(true);
  });
  it("allows long quotes in public-domain packs", () => {
    const long = {
      text: "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen",
      attribution: "x",
    };
    expect(
      run(
        book("demo", { publicDomain: true }, (c) => {
          c[2] = card("demo", 3, { quote: long });
          return c;
        }),
      ),
    ).toEqual([]);
  });
  it("standalone card pillar must match pack", () => {
    const raw = {
      ...book("family"),
      type: "standalone",
      pillar: "family",
      cards: [card("family", 1)],
    };
    expect(run(raw, "standalone").some((r) => r.includes("must match standalone"))).toBe(true);
  });
  it("briefing rules", () => {
    const raw = {
      ...book("2026-w46"),
      type: "briefing",
      pillar: "world",
      cards: [card("2026-w46", 1)],
    };
    const rules = run(raw, "briefings");
    expect(rules).toContain("briefing requires expiresAt");
    expect(rules).toContain("briefing requires non-empty sources");
    expect(rules).toContain("briefing card requires source.url");
    expect(run({ ...raw, id: "bad", cards: [card("bad", 1)] }, "briefings")).toContain(
      "briefing id must be YYYY-wNN",
    );
  });
  it("reports schema errors", () =>
    expect(run({ ...book(), schemaVersion: 2 }).some((r) => r.startsWith("schema:"))).toBe(true));
});

describe("validateQueue", () => {
  const item = {
    id: "x",
    title: "X",
    author: "A",
    year: 1,
    pillar: "mind",
    publicDomain: false,
    status: "done",
  };
  it("flags done items without pack", () =>
    expect(validateQueue([item], new Set())).toHaveLength(1));
  it("passes when pack exists", () => expect(validateQueue([item], new Set(["x"]))).toEqual([]));
  it("flags schema errors", () =>
    expect(validateQueue([{ id: "X" }], new Set())).not.toHaveLength(0));
});
