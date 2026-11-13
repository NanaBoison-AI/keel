import { useState } from "react";
import { Link } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { PILLARS } from "../lib/mix";
import { PILLAR_SHORT } from "../lib/pillars";
import { db } from "../lib/db";
import { useLivePacks } from "../lib/hooks";
import { PillarChip } from "../components/PillarChip";
import { Bar } from "./Progress";
import type { PackType, PillarId } from "../../schema/content";

const TYPES: { id: PackType | "all"; label: string }[] = [
  { id: "all", label: "All types" },
  { id: "book", label: "Books" },
  { id: "series", label: "Series" },
  { id: "standalone", label: "Standalone" },
  { id: "briefing", label: "Briefings" },
];

export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[40px] shrink-0 rounded-full border px-4 font-sans text-sm ${
        active
          ? "border-ink bg-ink text-paper dark:border-brass dark:bg-brass dark:text-ink"
          : "border-ink/20 text-ink/80 dark:border-paper/25 dark:text-paper/80"
      }`}
    >
      {children}
    </button>
  );
}

export function Library() {
  const packs = useLivePacks();
  const progress = useLiveQuery(() => db.progress.toArray(), []);
  const [pillar, setPillar] = useState<PillarId | "all">("all");
  const [type, setType] = useState<PackType | "all">("all");

  if (!packs || !progress) return <div className="h-full" aria-busy="true" />;
  const prog = new Map(progress.map((r) => [r.packId, r]));
  const shown = packs.filter(
    (p) => (pillar === "all" || p.pillar === pillar) && (type === "all" || p.type === type),
  );

  return (
    <div className="screen">
      <div
        className="-mx-5 mb-2 flex gap-2 overflow-x-auto px-5 pb-2"
        role="group"
        aria-label="Filter by type"
      >
        {TYPES.map((t) => (
          <FilterChip key={t.id} active={type === t.id} onClick={() => setType(t.id)}>
            {t.label}
          </FilterChip>
        ))}
      </div>
      <div
        className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-2"
        role="group"
        aria-label="Filter by pillar"
      >
        <FilterChip active={pillar === "all"} onClick={() => setPillar("all")}>
          All pillars
        </FilterChip>
        {PILLARS.map((p) => (
          <FilterChip key={p} active={pillar === p} onClick={() => setPillar(p)}>
            {PILLAR_SHORT[p]}
          </FilterChip>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="mt-8 text-center font-serif text-ink/70 dark:text-paper/70">
          {packs.length === 0
            ? "Nothing downloaded yet. Open Keel online once to fetch the reading."
            : "Nothing matches those filters."}
        </p>
      )}

      <ul className="space-y-3">
        {shown.map((p) => {
          const r = prog.get(p.id);
          const value = r ? (r.completedAt ? 1 : (r.cardIndex + 1) / p.cards.length) : 0;
          return (
            <li key={p.id}>
              <Link to={`/deck/${p.id}`} className="card-surface block active:opacity-80">
                <div className="flex flex-wrap items-center gap-2">
                  <PillarChip pillar={p.pillar} />
                  <span className="font-sans text-xs capitalize text-ink/70 dark:text-paper/70">
                    {p.type}
                  </span>
                  {p.publicDomain && (
                    <span className="rounded-full border border-brass/50 px-2 py-0.5 font-sans text-[11px] text-brass-dark dark:text-brass-light">
                      Public domain
                    </span>
                  )}
                </div>
                <h3 className="mt-2 font-serif text-lg font-semibold leading-snug">{p.title}</h3>
                <p className="font-sans text-xs text-ink/70 dark:text-paper/70">
                  {[p.author, p.year && p.year > 0 ? p.year : undefined, `${p.estMinutes} min`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="mt-1 font-serif text-sm text-ink/75 dark:text-paper/75">
                  {p.summary}
                </p>
                {value > 0 && <Bar value={value} className="mt-3" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
