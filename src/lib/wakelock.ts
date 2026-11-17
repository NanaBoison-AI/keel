import { useEffect } from "react";

/** Release the lock after this long without a touch, so a forgotten phone can still sleep. */
export const IDLE_MS = 10 * 60 * 1000;

export function wakeLockSupported(): boolean {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

/**
 * Keeps the screen on while `enabled` (Screen Wake Lock API). The browser drops the lock whenever
 * the page is hidden, so it is re-acquired on return. After `idleMs` without input it is released;
 * the next touch takes it again. Does nothing where the API is missing.
 */
export function useKeepAwake(enabled: boolean, idleMs = IDLE_MS) {
  useEffect(() => {
    if (!enabled || !wakeLockSupported()) return;
    let sentinel: WakeLockSentinel | null = null;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    const acquire = async () => {
      if (disposed || sentinel || document.visibilityState !== "visible") return;
      try {
        const s = await navigator.wakeLock.request("screen");
        if (disposed) {
          void s.release().catch(() => {});
          return;
        }
        sentinel = s;
        s.addEventListener("release", () => {
          if (sentinel === s) sentinel = null;
        });
      } catch {
        // Denied (e.g. battery saver). Reading still works; the screen just sleeps normally.
      }
    };

    const release = () => {
      const s = sentinel;
      sentinel = null;
      void s?.release().catch(() => {});
    };

    const arm = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(release, idleMs);
    };

    const onActivity = () => {
      void acquire();
      arm();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") onActivity();
    };

    void acquire();
    arm();
    const opts = { capture: true, passive: true } as const;
    const events = ["pointerdown", "touchstart", "keydown"] as const;
    for (const e of events) document.addEventListener(e, onActivity, opts);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      clearTimeout(idleTimer);
      for (const e of events) document.removeEventListener(e, onActivity, opts);
      document.removeEventListener("visibilitychange", onVisibility);
      release();
    };
  }, [enabled, idleMs]);
}
