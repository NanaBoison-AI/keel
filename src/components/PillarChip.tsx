import type { PillarId } from "../../schema/content";
import { PILLAR_CHIP, PILLAR_SHORT } from "../lib/pillars";

export function PillarChip({ pillar, className = "" }: { pillar: PillarId; className?: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 font-sans text-xs font-medium ${PILLAR_CHIP[pillar]} ${className}`}
    >
      {PILLAR_SHORT[pillar]}
    </span>
  );
}
