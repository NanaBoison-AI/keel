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
  mentor: "Mentor",
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
  mentor: "Mentor",
};

// Muted chip colours. Full class strings so Tailwind can see them.
export const PILLAR_CHIP: Record<PillarId, string> = {
  family: "bg-[#ffd9d0] text-[#8a3a2a] dark:bg-[#4a2a26] dark:text-[#ffc9bd]",
  mind: "bg-[#d6e6ff] text-[#234a85] dark:bg-[#1f3459] dark:text-[#bcd3ff]",
  psychology: "bg-[#e8dcff] text-[#503a8a] dark:bg-[#34285a] dark:text-[#d9c9ff]",
  character: "bg-[#ffe9b8] text-[#7a4f00] dark:bg-[#4a3a14] dark:text-[#ffdc8c]",
  money: "bg-[#cdeed7] text-[#1e6b3a] dark:bg-[#1d4a30] dark:text-[#a9e6bf]",
  world: "bg-[#c9ebf2] text-[#1a5f72] dark:bg-[#17444f] dark:text-[#a5dbe8]",
  work: "bg-[#ffe0c2] text-[#8a4a10] dark:bg-[#4d3318] dark:text-[#ffcf9f]",
  body: "bg-[#ffd3dc] text-[#8a2c45] dark:bg-[#4d2432] dark:text-[#ffbccc]",
  competence: "bg-[#e0eccb] text-[#4a6420] dark:bg-[#34431b] dark:text-[#cfe5a3]",
  mentor: "bg-[#ffecc2] text-[#7a5410] dark:bg-[#4a3b12] dark:text-[#ffd98a]",
};
