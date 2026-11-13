import { useEffect } from "react";
import { Link, Outlet } from "react-router";
import { TabBar } from "../components/TabBar";
import { Gear, KeelMark } from "../components/icons";
import { useToast } from "../components/Toast";
import { describeSync, shouldSync, syncContent } from "../lib/content";
import { useAppearance, useSettings } from "../lib/hooks";
import { db } from "../lib/db";

export function Layout() {
  const settings = useSettings();
  const toast = useToast();
  useAppearance(settings);

  useEffect(() => {
    let alive = true;
    const run = async (force = false) => {
      if (!force && !(await shouldSync())) return;
      const r = await syncContent();
      const msg = describeSync(r);
      if (alive && msg) toast.show(msg);
    };
    void run(true);
    const onVisible = () => {
      if (document.visibilityState === "visible") void run();
    };
    document.addEventListener("visibilitychange", onVisible);

    // Ask for durable storage on first run only.
    void (async () => {
      const asked = await db.settings.get("persistAsked");
      if (!asked) {
        await navigator.storage?.persist?.();
        await db.settings.put({ key: "persistAsked", value: true });
      }
    })();
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [toast]);

  return (
    <div className="app-shell flex flex-col">
      <header className="flex items-center justify-between px-5 py-2">
        <Link
          to="/"
          className="flex min-h-[44px] items-center gap-2 font-serif text-lg font-semibold"
          aria-label="Keel, Today"
        >
          <KeelMark className="text-brass" width={22} height={22} />
          Keel
        </Link>
        <Link
          to="/settings"
          aria-label="Settings"
          className="flex h-11 w-11 items-center justify-center text-ink/70 dark:text-paper/70"
        >
          <Gear />
        </Link>
      </header>
      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
