import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useDrag } from "@use-gesture/react";
import { CardFace, type CardView } from "./Card";
import { ArrowDown, ArrowUp, Bookmark, More } from "./icons";
import { useReducedMotion } from "../lib/hooks";

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
  /** Left swipe / menu. Stack advances after calling. */
  onLess: (key: string) => void;
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
  header,
}: Props) {
  const reduced = useReducedMotion();
  const item = items[index];
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const expanded = !!item && expandedKey === item.key;
  const menu = !!item && menuKey === item.key;
  const [dir, setDir] = useState(1);
  const [flash, setFlash] = useState(0);
  const [scrollable, setScrollable] = useState(false);
  const scrollEl = useRef<HTMLDivElement | null>(null);
  const surfaceEl = useRef<HTMLDivElement | null>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Track whether the card content scrolls (then vertical swipes belong to scrolling).
  useEffect(() => {
    const el = scrollEl.current;
    if (!el) return;
    const measure = () => setScrollable(el.scrollHeight > el.clientHeight + 2);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [index, expanded, item?.key]);

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

  useEffect(() => () => clearTimeout(tapTimer.current), []);

  const bind = useDrag(
    ({ tap, last, movement: [mx, my], velocity: [vx, vy], event }) => {
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
      const horizontal = Math.abs(mx) > Math.abs(my);
      if (horizontal) {
        if (mx < -SWIPE_DIST || (mx < -30 && vx > 0.6)) less();
      } else if (!scrollable) {
        if (my < -SWIPE_DIST || (my < -30 && vy > 0.6)) next();
        else if (my > SWIPE_DIST || (my > 30 && vy > 0.6)) prev();
      }
    },
    { filterTaps: true, axis: scrollable ? "x" : undefined, pointer: { touch: true } },
  );

  // When the card scrolls, vertical swipes scroll it natively. A swipe that begins with the text
  // already at its edge chains to next/previous card.
  useEffect(() => {
    const el = surfaceEl.current;
    if (!el || !scrollable) return;
    let startY = 0;
    let edge: "top" | "bottom" | null = null;
    const onStart = (e: TouchEvent) => {
      const s = scrollEl.current;
      edge = null;
      if (!s || e.touches.length !== 1) return;
      startY = e.touches[0].clientY;
      if (s.scrollTop <= 1) edge = "top";
      else if (s.scrollTop + s.clientHeight >= s.scrollHeight - 2) edge = "bottom";
    };
    const onEnd = (e: TouchEvent) => {
      if (!edge) return;
      const dy = e.changedTouches[0].clientY - startY;
      if (edge === "bottom" && dy < -SWIPE_DIST) next();
      else if (edge === "top" && dy > SWIPE_DIST) prev();
      edge = null;
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
    };
  }, [scrollable, next, prev]);

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
        initial: (d: number) => ({ y: d > 0 ? "40%" : "-40%", opacity: 0 }),
        animate: { y: 0, opacity: 1 },
        exit: (d: number) => ({ y: d > 0 ? "-30%" : "30%", opacity: 0 }),
      };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {header}
      <div
        ref={surfaceEl}
        {...gestureProps}
        className="stack-surface relative min-h-0 flex-1 overflow-hidden"
        style={{ touchAction: scrollable ? "pan-y" : "none" }}
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
            className="absolute inset-0"
          >
            <CardFace
              view={item.view}
              expanded={expanded}
              onToggleExpand={toggleExpand}
              scrollRef={scrollEl}
            />
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
        className="relative flex select-none items-center justify-between gap-2 px-4 pb-2 pt-1 font-sans"
        role="toolbar"
        aria-label="Card controls"
      >
        <div className="flex items-center gap-1">
          <button className="ctl" onClick={prev} disabled={index === 0} aria-label="Previous card">
            <ArrowUp />
          </button>
          <button
            className="ctl"
            onClick={() => setMenuKey(menu ? null : item.key)}
            aria-label="More options"
            aria-expanded={menu}
          >
            <More />
          </button>
        </div>
        <button
          className={`ctl ${isSaved(item.key) ? "text-brass" : ""}`}
          onClick={save}
          aria-label={isSaved(item.key) ? "Remove from Notebook" : "Save to Notebook"}
          aria-pressed={isSaved(item.key)}
        >
          <Bookmark filled={isSaved(item.key)} />
        </button>
        <button
          className="ctl ctl-primary"
          onClick={next}
          aria-label={index >= items.length - 1 ? "Finish" : "Next card"}
        >
          <ArrowDown />
        </button>
        {menu && (
          <div className="absolute bottom-full left-4 mb-2 min-w-[200px] rounded-xl border border-ink/10 bg-paper p-1 shadow-lg dark:border-paper/15 dark:bg-ink-800">
            <button
              className="menu-item"
              onClick={() => {
                setMenuKey(null);
                less();
              }}
            >
              Less like this
            </button>
            {item.view.card.deeper && (
              <button
                className="menu-item"
                onClick={() => {
                  setMenuKey(null);
                  toggleExpand();
                }}
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
