import { typeStyle } from "../../theme/style";
import { world } from "../../theme/tokens";
import { StatsCard } from "../../ui/StatsCard";

const STATS = [
  // D-042: items only, never people. "Handoffs today" joins when the handoff data exists.
  { label: "Needs you", value: "3" },
  { label: "Drafts to review", value: "1" },
  { label: "Waiting on others", value: "1" },
];

export function HudSection() {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-card p-6" style={{ background: world.backdropDay }}>
        <StatsCard stats={STATS} />
      </div>
      <p className="m-0" style={typeStyle("small")}>
        Team numbers only. No counts per person, no time on task, no rankings.
      </p>
    </div>
  );
}
