import { Link } from "react-router";
import type { Card as CardT, PillarId } from "../../schema/content";
import { Markdown } from "./Markdown";
import { PillarChip } from "./PillarChip";

export interface CardView {
  card: Pick<CardT, "hook" | "body" | "deeper" | "quote" | "source"> & { format?: string };
  pillar: PillarId;
  packId: string;
  packTitle: string;
  /** Show "From <title> → Continue the book" (daily mix). */
  fromDeck?: boolean;
}

interface Props {
  view: CardView;
  expanded: boolean;
  onToggleExpand: () => void;
  scrollRef?: React.Ref<HTMLDivElement>;
}

export function CardFace({ view, expanded, onToggleExpand, scrollRef }: Props) {
  const { card, pillar, packId, packTitle, fromDeck } = view;
  return (
    <article className="flex h-full min-h-0 flex-col" data-testid="card">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-6 pt-3 [overscroll-behavior:contain]"
      >
        <div className="mx-auto max-w-[38em]">
          <h2 className="font-serif text-[1.4em] font-semibold leading-snug text-ink dark:text-paper">
            {card.hook}
          </h2>
          <Markdown
            text={card.body}
            className="mt-5 font-serif leading-[1.6] text-ink/90 dark:text-paper/90"
          />
          {card.quote && (
            <blockquote className="mt-5 border-l-2 border-brass pl-4 font-serif italic leading-[1.6] text-ink/90 dark:text-paper/90">
              “{card.quote.text}”
              <footer className="mt-2 font-sans text-xs not-italic text-ink/60 dark:text-paper/60">
                {card.quote.attribution}
              </footer>
            </blockquote>
          )}
          {card.deeper && (
            <div className="mt-5">
              {expanded && (
                <Markdown
                  text={card.deeper}
                  className="border-t border-ink/10 pt-4 font-serif leading-[1.6] text-ink/90 dark:border-paper/15 dark:text-paper/90"
                />
              )}
              <button
                type="button"
                data-nogesture
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
                className="mt-2 min-h-[44px] font-sans text-sm font-semibold text-brass dark:text-brass-light"
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            </div>
          )}
        </div>
        {/* Fade hints that more text sits below; end padding keeps the last line clear of it. */}
        <div className="pointer-events-none sticky bottom-0 -mx-6 h-8 bg-gradient-to-t from-paper to-transparent dark:from-ink" />
      </div>
      <footer className="select-none px-6 pb-2 pt-1">
        <div className="mx-auto flex max-w-[38em] flex-wrap items-center gap-x-3 gap-y-1 font-sans text-xs text-ink/65 dark:text-paper/65">
          <PillarChip pillar={pillar} />
          <Link
            to={`/deck/${packId}`}
            data-nogesture
            className="min-h-[32px] max-w-[60%] truncate py-1.5 underline-offset-2 hover:underline"
          >
            {fromDeck ? (
              <>
                From <em>{packTitle}</em> → Continue
              </>
            ) : (
              packTitle
            )}
          </Link>
          {card.source?.ref && <span className="truncate">{card.source.ref}</span>}
        </div>
      </footer>
    </article>
  );
}
