import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { CardStack, type StackItem } from "../components/CardStack";
import { useToast } from "../components/Toast";
import { Dots } from "./Progress";
import { db, addFeedback, markSeen, recentlySeenIds, toggleSave, undoLess } from "../lib/db";
import { localDate, useLivePacks, useSettings } from "../lib/hooks";
import { buildDailyStack } from "../lib/mix";
import { cardIndex, useAffinity, useSavedIds } from "../lib/session";

export function DoneScreen({
  title = "You're done for today.",
  note,
}: {
  title?: string;
  note?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <h2 className="font-serif text-3xl font-semibold">{title}</h2>
      <p className="mt-3 max-w-sm font-serif text-ink/70 dark:text-paper/70">
        {note ?? "That's the stack. Nothing more to scroll. Come back tomorrow, or go deeper now."}
      </p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <Link to="/journey" className="btn btn-primary">
          Start a Journey
        </Link>
        <Link to="/notebook" className="btn btn-secondary">
          See what you saved
        </Link>
      </div>
    </div>
  );
}

export function Today() {
  const packs = useLivePacks();
  const settings = useSettings();
  const affinity = useAffinity();
  const saved = useSavedIds();
  const toast = useToast();
  const date = localDate();

  const [items, setItems] = useState<StackItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const built = useRef(false);
  const [isBuilt, setIsBuilt] = useState(false);
  const ready = packs !== undefined && affinity !== undefined;

  useEffect(() => {
    if (!ready || built.current) return;
    (async () => {
      const lookup = cardIndex(packs);
      const toItems = (ids: string[], packIds: string[]): StackItem[] =>
        ids.flatMap((id, i) => {
          const hit = lookup.get(id);
          if (!hit || hit.pack.id !== packIds[i]) return [];
          return [
            {
              key: id,
              view: {
                card: hit.card,
                pillar: hit.card.pillar,
                packId: hit.pack.id,
                packTitle: hit.pack.title,
                fromDeck: hit.pack.type === "book" || hit.pack.type === "series",
              },
            },
          ];
        });

      const existing = await db.daily.get(date);
      if (existing) {
        const its = toItems(existing.cardIds, existing.packIds);
        if (its.length > 0 || packs.length > 0) {
          built.current = true;
          setIsBuilt(true);
          setItems(its);
          setIndex(Math.min(existing.position, its.length));
          return;
        }
      }
      if (packs.length === 0) {
        setItems([]);
        return; // wait for the first sync
      }
      const less = (await db.feedback.where("signal").equals("less").toArray()).map(
        (f) => f.cardId,
      );
      const stack = buildDailyStack({
        date,
        packs,
        weights: settings.weights,
        affinity,
        size: settings.stackSize,
        seen: await recentlySeenIds(),
        less,
      });
      await db.daily.put({
        date,
        cardIds: stack.map((r) => r.cardId),
        packIds: stack.map((r) => r.packId),
        position: 0,
      });
      built.current = true;
      setIsBuilt(true);
      setItems(
        toItems(
          stack.map((r) => r.cardId),
          stack.map((r) => r.packId),
        ),
      );
      setIndex(0);
    })();
  }, [ready, packs, date, settings.weights, settings.stackSize, affinity]);

  const total = items?.length ?? 0;
  const done = items !== null && isBuilt && index >= total;

  // Persist position and mark cards as seen when shown.
  useEffect(() => {
    if (!items || !built.current) return;
    void db.daily.update(date, { position: index });
    if (items[index]) void markSeen(items[index].key);
  }, [index, items, date]);

  const lookup = useMemo(() => cardIndex(packs ?? []), [packs]);

  const onToggleSave = useCallback(
    (key: string) => {
      const hit = lookup.get(key);
      if (hit) void toggleSave(hit.card, hit.pack);
    },
    [lookup],
  );
  const onExpand = useCallback(
    (key: string) => {
      const hit = lookup.get(key);
      if (hit) void addFeedback(key, hit.card.pillar, "expand");
    },
    [lookup],
  );
  const onLess = useCallback(
    (key: string) => {
      const hit = lookup.get(key);
      if (!hit || !items) return;
      void addFeedback(key, hit.card.pillar, "less");
      const at = items.findIndex((i) => i.key === key);
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
    [lookup, items, toast],
  );

  if (items === null) return <div className="h-full" aria-busy="true" />;
  if (items.length === 0 && !isBuilt) {
    return (
      <DoneScreen
        title="Getting your reading ready"
        note="Keel downloads its reading the first time you open it online. After that it works anywhere, even without signal."
      />
    );
  }
  if (done)
    return <DoneScreen note={total === 0 ? "There's nothing new to show today." : undefined} />;

  return (
    <CardStack
      items={items}
      index={index}
      onIndexChange={setIndex}
      onFinish={() => setIndex(total)}
      isSaved={(k) => saved.has(k)}
      onToggleSave={onToggleSave}
      onExpand={onExpand}
      onLess={onLess}
      header={<Dots total={total} index={index} />}
    />
  );
}
