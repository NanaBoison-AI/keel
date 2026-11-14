import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { PILLARS } from "../lib/mix";
import { PILLAR_SHORT } from "../lib/pillars";
import { Markdown } from "../components/Markdown";
import { PillarChip } from "../components/PillarChip";
import { FilterChip } from "./Library";
import type { PillarId } from "../../schema/content";

export function Notebook() {
  const saves = useLiveQuery(() => db.saves.orderBy("savedAt").reverse().toArray(), []);
  const [pillar, setPillar] = useState<PillarId | "all">("all");
  const [open, setOpen] = useState<string | null>(null);

  if (!saves) return <div className="h-full" aria-busy="true" />;
  const shown = saves.filter((s) => pillar === "all" || s.snapshot.pillar === pillar);
  const groups = new Map<string, typeof shown>();
  for (const s of shown) {
    const list = groups.get(s.snapshot.packTitle) ?? [];
    list.push(s);
    groups.set(s.snapshot.packTitle, list);
  }

  return (
    <div className="screen">
      <div
        className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-2"
        role="group"
        aria-label="Filter by pillar"
      >
        <FilterChip active={pillar === "all"} onClick={() => setPillar("all")}>
          All
        </FilterChip>
        {PILLARS.map((p) => (
          <FilterChip key={p} active={pillar === p} onClick={() => setPillar(p)}>
            {PILLAR_SHORT[p]}
          </FilterChip>
        ))}
      </div>

      {saves.length === 0 && (
        <p className="mt-10 text-center font-serif text-ink/70 dark:text-paper/70">
          Nothing saved yet. Double-tap a card, or tap the bookmark, to keep it here.
        </p>
      )}
      {saves.length > 0 && shown.length === 0 && (
        <p className="mt-10 text-center font-serif text-ink/70 dark:text-paper/70">
          Nothing saved in that pillar.
        </p>
      )}

      {[...groups.entries()].map(([title, list]) => (
        <section key={title} className="mb-6">
          <h2 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wider text-ink/70 dark:text-paper/70">
            {title}
          </h2>
          <ul className="space-y-3">
            {list.map((s) => {
              const isOpen = open === s.cardId;
              return (
                <li key={s.cardId} className="card-surface">
                  <button
                    className="block w-full text-left"
                    onClick={() => setOpen(isOpen ? null : s.cardId)}
                    aria-expanded={isOpen}
                  >
                    <PillarChip pillar={s.snapshot.pillar} />
                    <h3 className="mt-2 font-serif text-lg font-semibold leading-snug">
                      {s.snapshot.hook}
                    </h3>
                  </button>
                  {isOpen && (
                    <div className="mt-3">
                      <Markdown text={s.snapshot.body} className="font-serif leading-[1.6]" />
                      {s.snapshot.quote && (
                        <blockquote className="mt-3 border-l-2 border-brass pl-3 font-serif italic">
                          “{s.snapshot.quote.text}”
                          <footer className="mt-1 font-sans text-xs not-italic text-ink/70 dark:text-paper/70">
                            {s.snapshot.quote.attribution}
                          </footer>
                        </blockquote>
                      )}
                      {s.snapshot.deeper && (
                        <Markdown
                          text={s.snapshot.deeper}
                          className="mt-3 border-t border-ink/10 pt-3 font-serif leading-[1.6] dark:border-paper/15"
                        />
                      )}
                      {s.snapshot.pillar === "mentor" && (
                        <p className="mt-3 font-sans text-xs text-ink/70 dark:text-paper/70">
                          Written by Claude
                        </p>
                      )}
                      {s.snapshot.source?.ref && (
                        <p className="mt-3 font-sans text-xs text-ink/70 dark:text-paper/70">
                          {s.snapshot.source.ref}
                        </p>
                      )}
                      <button
                        className="btn btn-secondary mt-3 min-h-[44px]"
                        onClick={() => void db.saves.delete(s.cardId)}
                      >
                        Remove from Notebook
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
