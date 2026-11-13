import type { SVGProps } from "react";

const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};
type P = SVGProps<SVGSVGElement>;

export const ArrowDown = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </svg>
);
export const ArrowUp = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);
export const Bookmark = ({ filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base} {...p} fill={filled ? "currentColor" : "none"}>
    <path d="M6 4h12v17l-6-4.5L6 21z" />
  </svg>
);
export const More = (p: P) => (
  <svg {...base} {...p} fill="currentColor" stroke="none">
    <circle cx="5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="12" r="1.8" />
  </svg>
);
export const Gear = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </svg>
);
export const Sun = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 6v3M4.8 10.8l2 2M19.2 10.8l-2 2" />
  </svg>
);
export const Compass = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5z" />
  </svg>
);
export const Shelf = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 4v16M10 4v16M15 6l4 14" />
  </svg>
);
export const Notebook = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 3h12v18H6zM9 8h6M9 12h6" />
  </svg>
);
export const Check = (p: P) => (
  <svg {...base} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

/** Original keel/hull mark. */
export const KeelMark = (p: P) => (
  <svg viewBox="0 0 64 64" width={24} height={24} aria-hidden {...p}>
    <path d="M8 22h48c0 14-10 26-24 34C18 48 8 36 8 22z" fill="currentColor" opacity=".16" />
    <path
      d="M8 22h48c0 14-10 26-24 34C18 48 8 36 8 22z"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinejoin="round"
    />
    <path d="M32 8v48" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
  </svg>
);
