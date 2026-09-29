import { useRef } from "react";
import { useOverlayRect } from "../state/overlays";
import { usePanelStore } from "./panel/panelStore";
import { useLiveCounts } from "./panel/useLiveCounts";
import { hudNumber, StatsCard } from "./StatsCard";

/**
 * Top left of the office: Needs you, Drafts to review and Waiting on others (D-042).
 * "Needs you" opens that tab and puts focus on the first card.
 */
export function StatsHud() {
  const ref = useRef<HTMLDivElement>(null);
  useOverlayRect("hud", ref);
  const counts = useLiveCounts();
  const showNeedsYou = usePanelStore((s) => s.showNeedsYou);
  const stats = [
    {
      label: "Needs you",
      value: hudNumber(counts?.needsYou ?? 0),
      tip: "Items waiting for your decision.",
      onClick: showNeedsYou,
    },
    {
      label: "Drafts to review",
      value: hudNumber(counts?.drafts ?? 0),
      tip: "Email drafts from helpers that wait for a person to check them.",
    },
    {
      label: "Waiting on others",
      value: hudNumber(counts?.waitingOnOthers ?? 0),
      tip: "Items that a CM, Ops Buyer or Lead would decide.",
    },
  ];
  return (
    <div ref={ref} className="pointer-events-auto" data-testid="stats-hud">
      <StatsCard stats={stats} loading={counts === null} />
    </div>
  );
}
