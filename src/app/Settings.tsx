import { useRef, useState } from "react";
import { Link } from "react-router";
import { DEFAULT_WEIGHTS, normalizeWeights, PILLARS, stepWeight } from "../lib/mix";
import { PILLAR_LABEL } from "../lib/pillars";
import { resetLessSignals, setSetting, type ThemeSetting } from "../lib/db";
import { useSettings } from "../lib/hooks";
import { downloadFile, exportBackup, importBackup, parseBackup } from "../lib/backup";
import { useToast } from "../components/Toast";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="mb-3 font-sans text-xs font-semibold uppercase tracking-wider text-ink/70 dark:text-paper/70">
      {title}
    </h2>
    {children}
  </section>
);

export function Settings() {
  const s = useSettings();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const shares = normalizeWeights(s.weights);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    const text = await file.text();
    try {
      parseBackup(text);
      setPending(text);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="screen">
      <Link
        to="/"
        className="mb-4 inline-flex min-h-[44px] items-center font-sans text-sm text-brass-dark dark:text-brass-light"
      >
        ← Back
      </Link>
      <h1 className="mb-6 font-serif text-2xl font-semibold">Settings</h1>

      <Section title="Pillar mix">
        <p className="mb-3 font-serif text-sm text-ink/70 dark:text-paper/70">
          Each pillar is set on its own: tap + or − and nothing else moves. The percentage is the
          share of your daily stack, worked out from all of them. Set a pillar to 0 to leave it out.
        </p>
        <ul className="divide-y divide-ink/10 dark:divide-paper/10">
          {PILLARS.map((p) => (
            <li key={p} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="font-sans text-sm leading-tight">{PILLAR_LABEL[p]}</div>
                <div className="font-sans text-xs tabular-nums text-ink/70 dark:text-paper/70">
                  {shares[p]}% of your stack
                </div>
              </div>
              <div
                className="flex shrink-0 items-center gap-1"
                role="group"
                aria-label={PILLAR_LABEL[p]}
              >
                <button
                  className="ctl !h-11 !w-11 border border-ink/20 dark:border-paper/25"
                  aria-label={`Less ${PILLAR_LABEL[p]}`}
                  disabled={s.weights[p] <= 0}
                  onClick={() => void setSetting("weights", stepWeight(s.weights, p, -5))}
                >
                  <span aria-hidden className="text-xl leading-none">
                    −
                  </span>
                </button>
                <output
                  className="w-10 text-center font-sans text-base font-semibold tabular-nums"
                  aria-label={`${PILLAR_LABEL[p]} weight`}
                >
                  {s.weights[p]}
                </output>
                <button
                  className="ctl !h-11 !w-11 border border-ink/20 dark:border-paper/25"
                  aria-label={`More ${PILLAR_LABEL[p]}`}
                  disabled={s.weights[p] >= 100}
                  onClick={() => void setSetting("weights", stepWeight(s.weights, p, 5))}
                >
                  <span aria-hidden className="text-xl leading-none">
                    +
                  </span>
                </button>
              </div>
            </li>
          ))}
        </ul>
        <button
          className="btn btn-secondary mt-3 w-full"
          onClick={() => void setSetting("weights", { ...DEFAULT_WEIGHTS })}
        >
          Reset pillar mix
        </button>
      </Section>

      <Section title="Daily stack">
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-sm">Cards per day</span>
          <div className="flex items-center gap-1" role="group" aria-label="Cards per day">
            <button
              className="ctl !h-11 !w-11 border border-ink/20 dark:border-paper/25"
              aria-label="Fewer cards"
              disabled={s.stackSize <= 8}
              onClick={() => void setSetting("stackSize", s.stackSize - 1)}
            >
              <span aria-hidden className="text-xl leading-none">
                −
              </span>
            </button>
            <output
              className="w-10 text-center font-sans text-base font-semibold tabular-nums"
              aria-label="Cards per day value"
            >
              {s.stackSize}
            </output>
            <button
              className="ctl !h-11 !w-11 border border-ink/20 dark:border-paper/25"
              aria-label="More cards"
              disabled={s.stackSize >= 15}
              onClick={() => void setSetting("stackSize", s.stackSize + 1)}
            >
              <span aria-hidden className="text-xl leading-none">
                +
              </span>
            </button>
          </div>
        </div>
        <p className="mt-1 font-serif text-xs text-ink/70 dark:text-paper/70">
          Applies to tomorrow's stack.
        </p>
      </Section>

      <Section title="Reading">
        <div className="mb-4 flex gap-2" role="group" aria-label="Text size">
          {["Small", "Medium", "Large", "Extra"].map((label, i) => (
            <button
              key={label}
              aria-pressed={s.textSize === i}
              onClick={() => void setSetting("textSize", i)}
              className={`min-h-[44px] flex-1 rounded-xl border font-serif ${s.textSize === i ? "border-brass bg-brass/15" : "border-ink/20 dark:border-paper/25"}`}
              style={{ fontSize: 14 + i * 2 }}
            >
              Aa
              <span className="sr-only"> {label}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2" role="group" aria-label="Theme">
          {(["system", "light", "dark"] as ThemeSetting[]).map((t) => (
            <button
              key={t}
              aria-pressed={s.theme === t}
              onClick={() => void setSetting("theme", t)}
              className={`min-h-[44px] flex-1 rounded-xl border font-sans text-sm capitalize ${s.theme === t ? "border-brass bg-brass/15" : "border-ink/20 dark:border-paper/25"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Personalisation">
        <button
          className="btn btn-secondary w-full"
          onClick={async () => {
            await resetLessSignals();
            toast.show("Cleared your “less like this” signals");
          }}
        >
          Reset “less like this”
        </button>
      </Section>

      <Section title="Backup">
        <p className="mb-3 font-serif text-sm text-ink/70 dark:text-paper/70">
          Your progress and Notebook live only on this device. Export them to a file, and restore
          them on another device.
        </p>
        <div className="flex gap-3">
          <button
            className="btn btn-secondary flex-1"
            onClick={async () => {
              const { filename, json } = await exportBackup();
              downloadFile(filename, json);
            }}
          >
            Export
          </button>
          <button className="btn btn-secondary flex-1" onClick={() => fileRef.current?.click()}>
            Restore
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        {error && (
          <p role="alert" className="mt-3 font-sans text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        {pending && (
          <div role="alertdialog" aria-label="Confirm restore" className="card-surface mt-4">
            <p className="font-serif">
              Restoring replaces your current progress, saves and settings on this device. Continue?
            </p>
            <div className="mt-3 flex gap-3">
              <button
                className="btn btn-primary flex-1"
                onClick={async () => {
                  await importBackup(pending);
                  setPending(null);
                  toast.show("Backup restored");
                }}
              >
                Replace my data
              </button>
              <button className="btn btn-secondary flex-1" onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </Section>

      <Section title="About">
        <p className="font-serif text-sm text-ink/70 dark:text-paper/70">
          Keel is a quiet reading app. No accounts, no analytics, no trackers. Everything you do
          stays on this device. All reading is written ahead of time and shipped as plain files; the
          app makes no AI calls.
        </p>
        <p className="mt-3 font-serif text-sm text-ink/70 dark:text-paper/70">
          The Mentor pillar contains original lessons written by Claude (AI). Everything else
          summarizes real books.
        </p>
      </Section>
    </div>
  );
}
