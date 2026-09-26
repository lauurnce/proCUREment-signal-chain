import type { SeatStatus } from "@hq/shared";
import { typeStyle } from "../theme/style";
import { status } from "../theme/tokens";
import { StatusDot } from "./StatusDot";

/** A helper's status: shape plus plain words. Describes the AI helper, never a person. */
export function StatusChip({ id }: { id: SeatStatus }) {
  return (
    <span
      data-testid={`status-chip-${id}`}
      className="inline-flex items-center gap-1.5 rounded-chip border border-hairline bg-white px-2 py-1"
    >
      <StatusDot id={id} />
      <span style={typeStyle("small", "ink")}>{status[id].label}</span>
    </span>
  );
}
