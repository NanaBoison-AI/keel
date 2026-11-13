import { Link } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { useLivePacks, useSettings } from "../lib/hooks";
import { suggestDecks } from "../lib/suggest";
import { useAffinity } from "../lib/session";
import { PillarChip } from "../components/PillarChip";
import { Bar } from "./Progress";
import type { Pack } from "../../schema/content";

function DeckRow({
  pack,
  note,
  cta,
  progress,
}: {
  pack: Pack;
  note?: string;
  cta: string;
  progress?: number;
}) {
  return (
    <Link to={`/deck/${pack.id}`} className="card-surface block active:opacity-80">
      <div className="flex items-center justify-between gap-3">
        <PillarChip pillar={pack.pillar} />
        <span className="font-sans text-xs text-ink/70 dark:text-paper/70">
          {pack.estMinutes} min
        </span>
      </div>
      <h3 className="mt-2 font-serif text-lg font-semibold leading-snug">{pack.title}</h3>
      {pack.author && (
        <p className="font-sans text-xs text-ink/70 dark:text-paper/70">{pack.author}</p>
      )}
      <p className="mt-1 font-serif text-sm text-ink/75 dark:text-paper/75">
        {note ?? pack.summary}
      </p>
      {progress !== undefined && <Bar value={progress} className="mt-3" />}
      <span className="mt-3 inline-block font-sans text-sm font-semibold text-brass-dark dark:text-brass-light">
        {cta} →
      </span>
    </Link>
  );
}

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-2 mt-6 font-sans text-xs font-semibold uppercase tracking-wider text-ink/70 first:mt-0 dark:text-paper/70">
    {children}
  </h2>
);

export function Journey() {
  const packs = useLivePacks();
  const settings = useSettings();
  const affinity = useAffinity();
  const progress = useLiveQuery(() => db.progress.toArray(), []);

  if (!packs || !progress || !affinity) return <div className="h-full" aria-busy="true" />;

  const byId = new Map(packs.map((p) => [p.id, p]));
  const inProgress = progress
    .filter(
      (r) => !r.completedAt && byId.get(r.packId) && byId.get(r.packId)!.type !== "standalone",
    )
    .sort((a, b) => (b.updatedAt ?? b.startedAt) - (a.updatedAt ?? a.startedAt));
  const current = inProgress[0];
  const currentPack = current ? byId.get(current.packId) : undefined;

  const briefing = packs
    .filter((p) => p.type === "briefing")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];

  const started = new Set(progress.map((r) => r.packId));
  const recentPillars = progress
    .slice()
    .sort((a, b) => (b.updatedAt ?? b.startedAt) - (a.updatedAt ?? a.startedAt))
    .map((r) => byId.get(r.packId)?.pillar)
    .filter((p): p is NonNullable<typeof p> => !!p);
  const upNext = suggestDecks({
    packs,
    weights: settings.weights,
    affinity,
    started,
    recentPillars,
  });

  return (
    <div className="screen">
      <H>Continue</H>
      {currentPack && current ? (
        <DeckRow
          pack={currentPack}
          note={`Card ${current.cardIndex + 1} of ${currentPack.cards.length}`}
          cta="Resume"
          progress={(current.cardIndex + 1) / currentPack.cards.length}
        />
      ) : (
        <p className="font-serif text-ink/70 dark:text-paper/70">
          Nothing in progress. Pick a deck below.
        </p>
      )}

      <H>This week</H>
      {briefing ? (
        <DeckRow pack={briefing} cta="Read the briefing" />
      ) : (
        <div className="card-surface font-serif text-ink/75 dark:text-paper/75">
          Your first weekly briefing arrives Sunday evening.
        </div>
      )}

      <H>Up next</H>
      {upNext.length > 0 ? (
        <div className="space-y-3">
          {upNext.map((p) => (
            <DeckRow key={p.id} pack={p} cta="Start" />
          ))}
        </div>
      ) : (
        <p className="font-serif text-ink/70 dark:text-paper/70">
          You've started every deck available. New ones arrive regularly.
        </p>
      )}
      <p className="mt-6 text-center font-sans text-xs text-ink/70 dark:text-paper/70">
        Or{" "}
        <Link to="/library" className="underline">
          browse the Library
        </Link>
        .
      </p>
    </div>
  );
}
