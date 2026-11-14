import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { CardStack, type StackItem } from "../components/CardStack";
import { useToast } from "../components/Toast";
import { db, addFeedback, markSeen, saveProgress, toggleSave, undoLess } from "../lib/db";
import { useAllPacks, useLivePacks, useSettings } from "../lib/hooks";
import { suggestDecks } from "../lib/suggest";
import { useAffinity, useSavedIds } from "../lib/session";

export function Deck() {
  const { packId = "" } = useParams();
  const allPacks = useAllPacks();
  const livePacks = useLivePacks();
  const settings = useSettings();
  const affinity = useAffinity();
  const saved = useSavedIds();
  const toast = useToast();
  const navigate = useNavigate();
  const pack = allPacks?.find((p) => p.id === packId);
  const progressRows = useLiveQuery(() => db.progress.toArray(), []);

  const [index, setIndex] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const init = useRef<string | null>(null);

  // Initial position: resume where the reader left off (restart if the deck was completed).
  useEffect(() => {
    if (!pack || init.current === pack.id) return;
    (async () => {
      const row = await db.progress.get(pack.id);
      init.current = pack.id;
      setFinished(false);
      setIndex(row && !row.completedAt ? Math.min(row.cardIndex, pack.cards.length - 1) : 0);
    })();
  }, [pack]);

  useEffect(() => {
    if (!pack || index === null || finished) return;
    void saveProgress(pack.id, index, pack.cards.length);
    void markSeen(pack.cards[index].id);
  }, [pack, index, finished]);

  const items: StackItem[] = useMemo(
    () =>
      pack
        ? pack.cards.map((c) => ({
            key: c.id,
            view: { card: c, pillar: c.pillar, packId: pack.id, packTitle: pack.title },
          }))
        : [],
    [pack],
  );

  const onToggleSave = useCallback(
    (key: string) => {
      const card = pack?.cards.find((c) => c.id === key);
      if (card && pack) void toggleSave(card, pack);
    },
    [pack],
  );
  const onExpand = useCallback(
    (key: string) => {
      const card = pack?.cards.find((c) => c.id === key);
      if (card) void addFeedback(key, card.pillar, "expand");
    },
    [pack],
  );
  const onLess = useCallback(
    (key: string) => {
      const at = pack?.cards.findIndex((c) => c.id === key) ?? -1;
      const card = pack?.cards[at];
      if (!card) return;
      void addFeedback(key, card.pillar, "less");
      toast.show("We'll show less like this", {
        action: {
          label: "Undo",
          run: () => {
            void undoLess(key);
            setIndex(at);
          },
        },
      });
    },
    [pack, toast],
  );

  const nextDeck = useMemo(() => {
    if (!livePacks || !progressRows || !pack || !affinity) return undefined;
    const started = new Set(progressRows.map((r) => r.packId));
    started.add(pack.id);
    const recent = progressRows
      .slice()
      .sort((a, b) => (b.updatedAt ?? b.startedAt) - (a.updatedAt ?? a.startedAt))
      .map((r) => livePacks.find((p) => p.id === r.packId)?.pillar)
      .filter((p): p is NonNullable<typeof p> => !!p);
    return suggestDecks({
      packs: livePacks,
      weights: settings.weights,
      affinity,
      started,
      recentPillars: recent,
      count: 1,
    })[0];
  }, [livePacks, progressRows, pack, affinity, settings.weights]);

  if (allPacks === undefined) return <div className="h-full" aria-busy="true" />;
  if (!pack) {
    return (
      <div className="screen text-center">
        <p className="mt-16 font-serif text-lg">That deck isn't available.</p>
        <Link to="/library" className="btn btn-secondary mt-6">
          Back to Library
        </Link>
      </div>
    );
  }
  if (index === null) return <div className="h-full" aria-busy="true" />;

  if (finished) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <h2 className="font-serif text-3xl font-semibold">Deck complete.</h2>
        <p className="mt-3 max-w-sm font-serif text-ink/70 dark:text-paper/70">
          You've finished <em>{pack.title}</em>. The recap is saved in your reading history; save
          any card to keep it in your Notebook.
        </p>
        <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
          {nextDeck && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setFinished(false);
                setIndex(null);
                init.current = null;
                navigate(`/deck/${nextDeck.id}`);
              }}
            >
              Next deck: {nextDeck.title}
            </button>
          )}
          <Link to="/journey" className="btn btn-secondary">
            Back to Journey
          </Link>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setFinished(false);
              setIndex(0);
            }}
          >
            Read again
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setFinished(false);
              setIndex(pack.cards.length - 1);
            }}
          >
            Back to the last card
          </button>
        </div>
      </div>
    );
  }

  return (
    <CardStack
      items={items}
      index={index}
      onIndexChange={setIndex}
      onFinish={() => {
        void saveProgress(pack.id, pack.cards.length - 1, pack.cards.length);
        setFinished(true);
      }}
      isSaved={(k) => saved.has(k)}
      onToggleSave={onToggleSave}
      onExpand={onExpand}
      onLess={onLess}
      header={
        <div className="flex items-center justify-between px-5 py-2 font-sans text-xs text-ink/70 dark:text-paper/70">
          <Link to="/journey" className="flex min-h-[32px] items-center truncate">
            ← {pack.title}
          </Link>
          <span>
            Card {index + 1} of {pack.cards.length}
          </span>
        </div>
      }
    />
  );
}
