import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useDrag } from "@use-gesture/react";
import { CardFace, type CardView } from "./Card";
import { Bookmark, OpenBook, ThumbDown } from "./icons";
import { useReducedMotion, useSettingsState } from "../lib/hooks";
import { useKeepAwake } from "../lib/wakelock";

export interface StackItem {
  key: string;
  view: CardView;
}

interface Props {
  items: StackItem[];
  index: number;
  onIndexChange: (i: number) => void;
  /** Called when "next" is pressed on the last card. */
  onFinish: () => void;
  isSaved: (key: string) => boolean;
  onToggleSave: (key: string) => void;
  onExpand?: (key: string) => void;
  /** "Less like this". The stack advances after calling. */
  onLess: (key: string) => void;
  /** Shows the open-book button (Today): opens the deck the card comes from. */
  onOpenBook?: (key: string) => void;
  /** Wrapper content shown above the card (progress dots, counters). */
  header?: React.ReactNode;
}

const SWIPE_DIST = 70;

export function CardStack({
  items,
  index,
  onIndexChange,
  onFinish,
  isSaved,
  onToggleSave,
  onExpand,
  onLess,
  onOpenBook,
  header,
}: Props) {
  const { settings, loaded } = useSettingsState();
  useKeepAwake(loaded && settings.keepScreenOn);
  const reduced = useReducedMotion();
  const item = items[index];
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const expanded = !!item && expandedKey === item.key;
  const [dir, setDir] = useState(1);
  const [flash, setFlash] = useState(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const next = useCallback(() => {
    setDir(1);
    if (index >= items.length - 1) onFinish();
    else onIndexChange(index + 1);
  }, [index, items.length, onFinish, onIndexChange]);

  const prev = useCallback(() => {
    if (index <= 0) return;
    setDir(-1);
    onIndexChange(index - 1);
  }, [index, onIndexChange]);

  const toggleExpand = useCallback(() => {
    if (!item) return;
    if (expandedKey !== item.key) onExpand?.(item.key);
    setExpandedKey(expandedKey === item.key ? null : item.key);
  }, [item, onExpand, expandedKey]);

  const save = useCallback(() => {
    if (!item) return;
    onToggleSave(item.key);
    setFlash((f) => f + 1);
  }, [item, onToggleSave]);

  const less = useCallback(() => {
    if (!item) return;
    onLess(item.key);
    next();
  }, [item, onLess, next]);

  const openBook = useCallback(() => {
    if (item) onOpenBook?.(item.key);
  }, [item, onOpenBook]);

  useEffect(() => () => clearTimeout(tapTimer.current), []);

  const bind = useDrag(
    ({ tap, last, movement: [mx, my], velocity: [vx], event }) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-nogesture]")) return;
      if (tap) {
        // single tap expands, double tap saves
        if (tapTimer.current) {
          clearTimeout(tapTimer.current);
          tapTimer.current = undefined;
          save();
        } else {
          tapTimer.current = setTimeout(() => {
            tapTimer.current = undefined;
            if (item?.view.card.deeper) toggleExpand();
          }, 260);
        }
        return;
      }
      if (!last) return;
      // Swipe left/right to move. Vertical drags are left to the card, whose text scrolls natively.
      if (Math.abs(mx) <= Math.abs(my)) return;
      if (mx < -SWIPE_DIST || (mx < -30 && vx > 0.6)) next();
      else if (mx > SWIPE_DIST || (mx > 30 && vx > 0.6)) prev();
    },
    { filterTaps: true, pointer: { touch: true } },
  );

  // use-gesture swallows clicks that weren't clean taps; let real controls through.
  const { onClickCapture, ...gestureRest } = bind();
  const gestureProps = {
    ...gestureRest,
    onClickCapture: (e: React.MouseEvent<HTMLElement>) => {
      if ((e.target as HTMLElement).closest("[data-nogesture]")) return;
      onClickCapture?.(e);
    },
  };

  // Keyboard support.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === "ArrowRight" || e.key === "j") next();
      else if (e.key === "ArrowLeft" || e.key === "k") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  if (!item) return null;

  const variants = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: (d: number) => ({ x: d > 0 ? "35%" : "-35%", opacity: 0 }),
        animate: { x: 0, opacity: 1 },
        exit: (d: number) => ({ x: d > 0 ? "-30%" : "30%", opacity: 0 }),
      };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {header}
      <div
        {...gestureProps}
        className="stack-surface relative min-h-0 flex-1 overflow-hidden"
        style={{ touchAction: "pan-y" }}
      >
        <AnimatePresence mode="popLayout" custom={dir} initial={false}>
          <motion.div
            key={item.key}
            custom={dir}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: reduced ? 0.15 : 0.28, ease: [0.25, 0.8, 0.25, 1] }}
            className="card-face absolute inset-3"
          >
            <CardFace view={item.view} expanded={expanded} onToggleExpand={toggleExpand} />
          </motion.div>
        </AnimatePresence>
        <AnimatePresence>
          {flash > 0 && (
            <motion.div
              key={flash}
              className="pointer-events-none absolute inset-0 flex items-center justify-center text-brass"
              initial={{ scale: 0.6, opacity: 0.9 }}
              animate={{ scale: reduced ? 1 : 1.5, opacity: 0 }}
              transition={{ duration: 0.6 }}
              onAnimationComplete={() => setFlash(0)}
            >
              <Bookmark width={96} height={96} filled />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls live in the bottom third for one-handed use. */}
      <div
        className="relative flex select-none items-center justify-center gap-6 px-4 pb-3 pt-1 font-sans"
        role="toolbar"
        aria-label="Card controls"
      >
        <button className="ctl ctl-lg" onClick={less} aria-label="Less like this">
          <ThumbDown width={28} height={28} />
        </button>
        {onOpenBook && (
          <button className="ctl ctl-lg" onClick={openBook} aria-label="Open the book">
            <OpenBook width={28} height={28} />
          </button>
        )}
        <button
          className={`ctl ctl-lg ${isSaved(item.key) ? "text-brass" : ""}`}
          onClick={save}
          aria-label={isSaved(item.key) ? "Remove from Notebook" : "Save to Notebook"}
          aria-pressed={isSaved(item.key)}
        >
          <Bookmark width={28} height={28} filled={isSaved(item.key)} />
        </button>
        {/* Swipes have no on-screen buttons; these keep keyboard and screen-reader access. */}
        <button className="sr-only" onClick={prev} disabled={index === 0}>
          Previous card
        </button>
        <button className="sr-only" onClick={next}>
          {index >= items.length - 1 ? "Finish" : "Next card"}
        </button>
      </div>
    </div>
  );
}
