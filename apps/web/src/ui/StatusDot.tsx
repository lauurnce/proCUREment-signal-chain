import type { SeatStatus } from "@hq/shared";
import { cssColor } from "../theme/style";
import { status } from "../theme/tokens";

/** The status shape alone. Always shown next to its label, never by itself. */
export function StatusDot({ id, size = 10 }: { id: SeatStatus; size?: number }) {
  const s = status[id];
  const color = cssColor(s.colorKey);
  const pair = s.shape === "dot-pair";
  return (
    <svg
      width={pair ? size * 1.5 : size}
      height={size}
      viewBox={pair ? "0 0 15 10" : "0 0 10 10"}
      aria-hidden="true"
      className="shrink-0"
    >
      {s.shape === "ring" && (
        <circle cx="5" cy="5" r="3.9" fill="none" stroke={color} strokeWidth="1.8" />
      )}
      {(s.shape === "dot" || s.shape === "dot-bang") && <circle cx="5" cy="5" r="5" fill={color} />}
      {s.shape === "dot-bang" && (
        <path d="M5 2.2v3.4M5 7.1v.7" stroke={cssColor("white")} strokeWidth="1.4" />
      )}
      {pair && (
        <>
          <circle cx="4.5" cy="5" r="4.5" fill={color} />
          <circle cx="12.2" cy="5" r="2.8" fill={color} />
        </>
      )}
    </svg>
  );
}
