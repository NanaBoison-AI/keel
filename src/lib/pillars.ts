import type { PillarId } from "../../schema/content";

export const PILLAR_LABEL: Record<PillarId, string> = {
  family: "Family & Relationships",
  mind: "Mind",
  psychology: "Psychology",
  character: "Character",
  money: "Money",
  world: "The World",
  work: "Work & Productivity",
  body: "Body",
  competence: "Competence",
};

export const PILLAR_SHORT: Record<PillarId, string> = {
  family: "Family",
  mind: "Mind",
  psychology: "Psychology",
  character: "Character",
  money: "Money",
  world: "World",
  work: "Work",
  body: "Body",
  competence: "Competence",
};

// Muted chip colours. Full class strings so Tailwind can see them.
export const PILLAR_CHIP: Record<PillarId, string> = {
  family: "bg-[#e8d9d2] text-[#6b4034] dark:bg-[#3b2a27] dark:text-[#e6c4b8]",
  mind: "bg-[#dbe1ea] text-[#33445e] dark:bg-[#222d40] dark:text-[#b9c8e0]",
  psychology: "bg-[#e3dcea] text-[#4f3f68] dark:bg-[#2e2640] dark:text-[#cfc3e3]",
  character: "bg-[#ddd9cd] text-[#4d4631] dark:bg-[#322f22] dark:text-[#d6cfb3]",
  money: "bg-[#d9e4d8] text-[#32503a] dark:bg-[#223427] dark:text-[#b6d3bb]",
  world: "bg-[#d6e3e6] text-[#2f4f58] dark:bg-[#1f3238] dark:text-[#b0d0d8]",
  work: "bg-[#e9e0cc] text-[#5e4a22] dark:bg-[#38301c] dark:text-[#e0cf9f]",
  body: "bg-[#e7d8d5] text-[#6a3a37] dark:bg-[#3a2523] dark:text-[#e6bcb8]",
  competence: "bg-[#dfdfd6] text-[#444a3a] dark:bg-[#2b2e25] dark:text-[#c9ceb9]",
};
