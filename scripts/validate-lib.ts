import { Pack, Queue, PACK_FOLDERS, type PackType } from "../schema/content";

export interface LoadedPack {
  file: string; // e.g. books/meditations.json
  folder: string;
  raw: unknown;
}

export interface Problem {
  file: string;
  cardId?: string;
  rule: string;
}

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Pure validation: takes loaded JSON, returns problems. */
export function validatePacks(files: LoadedPack[]): { problems: Problem[]; packs: Pack[] } {
  const problems: Problem[] = [];
  const packs: { file: string; pack: Pack }[] = [];

  for (const f of files) {
    const parsed = Pack.safeParse(f.raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        problems.push({ file: f.file, rule: `schema: ${issue.path.join(".")} — ${issue.message}` });
      }
      continue;
    }
    packs.push({ file: f.file, pack: parsed.data });
  }

  const cardIds = new Map<string, string>();
  const hooks = new Map<string, string>();

  for (const { file, pack } of packs) {
    const base = file
      .split("/")
      .pop()!
      .replace(/\.json$/, "");
    if (base !== pack.id)
      problems.push({ file, rule: `filename "${base}" must equal pack id "${pack.id}"` });
    const folder = file.split("/")[0];
    if (folder !== PACK_FOLDERS[pack.type as PackType]) {
      problems.push({
        file,
        rule: `type "${pack.type}" must live in content/${PACK_FOLDERS[pack.type as PackType]}/`,
      });
    }

    let quoteCount = 0;
    pack.cards.forEach((card, i) => {
      const p = (rule: string) => problems.push({ file, cardId: card.id, rule });
      if (cardIds.has(card.id)) p(`duplicate card id (also in ${cardIds.get(card.id)})`);
      cardIds.set(card.id, file);
      if (!card.id.startsWith(`${pack.id}-`)) p(`card id must start with "${pack.id}-"`);
      const key = card.hook.trim().toLowerCase();
      if (hooks.has(key)) p(`duplicate hook text (also in ${hooks.get(key)})`);
      hooks.set(key, file);

      if (card.quote) {
        quoteCount++;
        if (!pack.publicDomain && wordCount(card.quote.text) > 15) {
          p(
            `quote in non-public-domain pack must be ≤ 15 words (is ${wordCount(card.quote.text)})`,
          );
        }
      }
      if (pack.type === "standalone" && card.pillar !== pack.pillar) {
        p(`card pillar "${card.pillar}" must match standalone pack pillar "${pack.pillar}"`);
      }
      if (pack.type === "briefing" && !card.source?.url) p("briefing card requires source.url");
      if (pack.type === "book") {
        if (i === 0 && card.format !== "hook") p('first card of a book must be format "hook"');
        if (i === pack.cards.length - 1 && card.format !== "recap")
          p('last card of a book must be format "recap"');
        if ((card.format === "hook" || card.format === "recap") && card.mixable) {
          p(`${card.format} card must have mixable: false`);
        }
      }
    });

    if (!pack.publicDomain && quoteCount > 1) {
      problems.push({
        file,
        rule: `non-public-domain pack may contain at most one quote (has ${quoteCount})`,
      });
    }
    if (pack.type === "book") {
      if (!pack.author) problems.push({ file, rule: "book requires author" });
      if (pack.year === undefined) problems.push({ file, rule: "book requires year" });
      if (pack.cards.length < 10 || pack.cards.length > 20) {
        problems.push({ file, rule: `book must have 10–20 cards (has ${pack.cards.length})` });
      }
    }
    if (pack.type === "briefing") {
      if (!pack.expiresAt) problems.push({ file, rule: "briefing requires expiresAt" });
      if (!pack.sources?.length)
        problems.push({ file, rule: "briefing requires non-empty sources" });
      if (!/^\d{4}-w\d{2}$/.test(pack.id))
        problems.push({ file, rule: "briefing id must be YYYY-wNN" });
    }
  }

  return { problems, packs: packs.map((p) => p.pack) };
}

export function validateQueue(raw: unknown, packIds: Set<string>): Problem[] {
  const problems: Problem[] = [];
  const parsed = Queue.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      problems.push({
        file: "queue.json",
        rule: `schema: ${issue.path.join(".")} — ${issue.message}`,
      });
    }
    return problems;
  }
  for (const item of parsed.data) {
    if (item.status === "done" && !packIds.has(item.id)) {
      problems.push({ file: "queue.json", rule: `"${item.id}" is done but has no pack file` });
    }
  }
  return problems;
}

export function formatProblem(p: Problem): string {
  return `${p.file}${p.cardId ? ` [${p.cardId}]` : ""}: ${p.rule}`;
}
