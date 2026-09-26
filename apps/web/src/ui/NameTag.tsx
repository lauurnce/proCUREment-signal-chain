import type { SeatStatus, Track } from "@hq/shared";
import { typeStyle } from "../theme/style";
import { status } from "../theme/tokens";
import { StatusDot } from "./StatusDot";
import { TrackBadge } from "./TrackBadge";

type Props = {
  track: Track;
  /** Seat plus "helper", for example "CM 03 helper" (D-028). */
  name: string;
  /** The job nickname, or the track name when there is none. Replaced by "Off duty" when off. */
  role: string;
  status: SeatStatus;
  /** Overview size: the dot and the name only, no role line (council review, Must 4). */
  compact?: boolean;
};

/**
 * The pill that floats above a helper in the office. Always a white pill,
 * so status colors keep their contrast on the oak floor and at night.
 */
export function NameTag({ track, name, role, status: statusId, compact = false }: Props) {
  return (
    <div
      data-testid="name-tag"
      className={`inline-flex items-center gap-2 rounded-pill border border-hairline bg-white pr-3.5 pl-2.5 shadow-float ${compact ? "py-1" : "py-1.5"}`}
    >
      <TrackBadge id={track} />
      <span className="flex flex-col">
        <span style={typeStyle("tagName")}>{name}</span>
        {!compact && (
          <span style={typeStyle("tagRole")}>
            {statusId === "off-duty" ? status["off-duty"].label : role}
          </span>
        )}
      </span>
      <span className="ml-1 flex items-center" title={status[statusId].label}>
        <StatusDot id={statusId} />
        <span className="sr-only">{status[statusId].label}</span>
      </span>
    </div>
  );
}
