import { Fragment, type ReactNode } from "react";

export function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={i++}>{tok.slice(2, -2)}</strong>);
    else out.push(<em key={i++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Light markdown: paragraphs, **bold**, *italic*, bullet and numbered lists. */
export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className={className}>
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim() !== "");
        const bullets = lines.every((l) => /^\s*[-*•]\s+/.test(l));
        const numbered = lines.every((l) => /^\s*\d+[.)]\s+/.test(l));
        if (lines.length > 0 && (bullets || numbered)) {
          const Tag = numbered ? "ol" : "ul";
          return (
            <Tag
              key={bi}
              className={`my-3 ml-5 space-y-2 ${numbered ? "list-decimal" : "list-disc"}`}
            >
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""))}</li>
              ))}
            </Tag>
          );
        }
        // A block of plain lines: treat single newlines as line breaks.
        return (
          <p key={bi} className="my-3 first:mt-0">
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {renderInline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
