import { NavLink } from "react-router";
import { Compass, Notebook, Shelf, Sun } from "./icons";

const TABS = [
  { to: "/", label: "Today", Icon: Sun, end: true },
  { to: "/journey", label: "Journey", Icon: Compass },
  { to: "/library", label: "Library", Icon: Shelf },
  { to: "/notebook", label: "Notebook", Icon: Notebook },
];

export function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="border-t border-ink/10 bg-paper dark:border-paper/10 dark:bg-ink"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-2xl">
        {TABS.map(({ to, label, Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-[56px] flex-col items-center justify-center gap-0.5 font-sans text-[11px] font-medium ${
                  isActive ? "text-brass dark:text-brass-light" : "text-ink/55 dark:text-paper/55"
                }`
              }
            >
              <Icon width={22} height={22} />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
