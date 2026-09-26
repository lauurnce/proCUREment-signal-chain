import type { SeatStatus, Track } from "@hq/shared";
import { typeStyle } from "../../theme/style";
import { status, track } from "../../theme/tokens";
import { StatusChip } from "../../ui/StatusChip";
import { TrackBadge } from "../../ui/TrackBadge";

export function StatusSection() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <h3 className="m-0" style={typeStyle("sectionTitle")}>
          Helper status
        </h3>
        <div className="flex flex-wrap gap-2 rounded-card bg-panel p-4">
          {(Object.keys(status) as SeatStatus[]).map((id) => (
            <StatusChip key={id} id={id} />
          ))}
        </div>
        <p className="m-0" style={typeStyle("small")}>
          Shape plus words, never color alone. In a meeting is a pair of dots, so it never looks
          like Working.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="m-0" style={typeStyle("sectionTitle")}>
          Track badges
        </h3>
        <div className="flex flex-wrap gap-4 rounded-card bg-panel p-4">
          {(Object.keys(track) as Track[]).map((id) => (
            <span key={id} className="inline-flex items-center gap-1.5">
              <TrackBadge id={id} size={16} />
              <span style={typeStyle("small", "ink")}>{track[id].label}</span>
            </span>
          ))}
        </div>
        <p className="m-0" style={typeStyle("small")}>
          The Lead triangle is an outline with nothing behind it, so it never looks like a logo.
        </p>
      </div>
    </div>
  );
}
