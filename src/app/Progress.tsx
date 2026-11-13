export function Dots({ total, index }: { total: number; index: number }) {
  return (
    <div
      className="flex items-center justify-center gap-1.5 px-6 py-2"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={Math.min(index + 1, total)}
      aria-label={`Card ${Math.min(index + 1, total)} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === index
              ? "w-5 bg-brass"
              : i < index
                ? "w-1.5 bg-ink/60 dark:bg-paper/60"
                : "w-1.5 bg-ink/20 dark:bg-paper/20"
          }`}
        />
      ))}
    </div>
  );
}

export function Bar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-ink/10 dark:bg-paper/15 ${className}`}>
      <div
        className="h-full rounded-full bg-brass"
        style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }}
      />
    </div>
  );
}
