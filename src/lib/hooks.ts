import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Pack } from "../../schema/content";
import { db, resolveSettings, type Settings } from "./db";
import { isExpired } from "./mix";

export function localDate(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** undefined while loading. */
export function useAllPacks(): Pack[] | undefined {
  const rows = useLiveQuery(() => db.packs.toArray(), []);
  return rows?.map((r) => r.json);
}

export function useLivePacks(): Pack[] | undefined {
  const all = useAllPacks();
  const today = localDate();
  return all?.filter((p) => !isExpired(p, today));
}

export function useSettings(): Settings {
  const rows = useLiveQuery(() => db.settings.toArray(), []);
  return resolveSettings(rows ?? []);
}

const TEXT_SIZES = [17, 19, 21, 23];

/** Applies theme class, text size and theme-color meta. */
export function useAppearance(settings: Settings) {
  const [systemDark, setSystemDark] = useState(
    () => typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = () => setSystemDark(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const dark = settings.theme === "dark" || (settings.theme === "system" && systemDark);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.style.setProperty("--reader-size", `${TEXT_SIZES[settings.textSize] ?? 19}px`);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#0e1b2c" : "#f6f1e7");
  }, [dark, settings.textSize]);
}

export function useReducedMotion(): boolean {
  const [r, setR] = useState(
    () =>
      typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setR(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return r;
}
