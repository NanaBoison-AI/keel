import { useRef, useState } from "react";
import { Link } from "react-router";
import { PILLARS, setPillarWeight } from "../lib/mix";
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
          Shares always add up to 100%. Move one and the others adjust.
        </p>
        <div className="space-y-4">
          {PILLARS.map((p) => (
            <label key={p} className="block">
              <div className="flex justify-between font-sans text-sm">
                <span>{PILLAR_LABEL[p]}</span>
                <span className="tabular-nums text-ink/70 dark:text-paper/70">{s.weights[p]}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={s.weights[p]}
                aria-label={`${PILLAR_LABEL[p]} share`}
                onChange={(e) =>
                  void setSetting("weights", setPillarWeight(s.weights, p, Number(e.target.value)))
                }
                className="mt-1 h-8 w-full accent-[#b8893a]"
              />
            </label>
          ))}
        </div>
      </Section>

      <Section title="Daily stack">
        <label className="block">
          <div className="flex justify-between font-sans text-sm">
            <span>Cards per day</span>
            <span className="tabular-nums">{s.stackSize}</span>
          </div>
          <input
            type="range"
            min={8}
            max={15}
            step={1}
            value={s.stackSize}
            aria-label="Cards per day"
            onChange={(e) => void setSetting("stackSize", Number(e.target.value))}
            className="mt-1 h-8 w-full accent-[#b8893a]"
          />
        </label>
        <p className="font-serif text-xs text-ink/70 dark:text-paper/70">
          Applies to the next day's stack.
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
      </Section>
    </div>
  );
}
