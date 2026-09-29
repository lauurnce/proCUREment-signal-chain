import { cssColor, typeStyle } from "../../theme/style";
import type { LinkState } from "./linkState";

/** Copy deck, section 3 (live.*). `{time}` is the last update. */
const LIVE: Record<LinkState, { word: string; tip: string; filled: boolean }> = {
  live: { word: "Live", tip: "Updates arrive as the helpers work.", filled: true },
  connecting: { word: "Connecting", tip: "Connecting to the local server.", filled: false },
  reconnecting: {
    word: "Reconnecting",
    tip: "Lost the link to the local server. Trying again. Your last view stays on screen.",
    filled: false,
  },
  offline: {
    word: "Offline",
    tip: "Cannot reach the local server. What you see is from {time}.",
    filled: false,
  },
};

const BUTTON =
  "rounded-button border border-hairline bg-white hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Product name, the server link (never a person), and the seat count. */
export function PanelHeader({
  link,
  lastUpdate,
  seatCount,
  onKeys,
  onShowOffice,
}: {
  link: LinkState;
  /** "9:30 AM", for the offline tooltip. */
  lastUpdate: string;
  seatCount: number | null;
  /** Opens the key list. Left out while loading. */
  onKeys?: () => void;
  /** Narrow screens only: hides the panel so the office shows. */
  onShowOffice?: () => void;
}) {
  const live = LIVE[link];
  const dotColor = link === "live" ? "statusWorking" : "statusOff";
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-hairline px-5">
      <h1 className="m-0" style={typeStyle("appTitle")}>
        SignalChain HQ
      </h1>
      <span
        className="flex items-center gap-1.5"
        title={live.tip.replace("{time}", lastUpdate)}
        data-testid="live-dot"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          {live.filled ? (
            <circle cx="5" cy="5" r="5" fill={cssColor(dotColor)} />
          ) : (
            <circle
              cx="5"
              cy="5"
              r="3.9"
              fill="none"
              stroke={cssColor(dotColor)}
              strokeWidth="1.8"
            />
          )}
        </svg>
        <span style={typeStyle("small", "ink")}>{live.word}</span>
      </span>
      <span
        className="ml-auto"
        style={typeStyle("small")}
        title={seatCount === null ? undefined : `${seatCount} seats, each with an AI helper.`}
      >
        {seatCount === null ? "" : `${seatCount} helpers`}
      </span>
      {onShowOffice && (
        <button
          type="button"
          onClick={onShowOffice}
          className={`${BUTTON} h-8 px-3`}
          style={{ ...typeStyle("small", "navy"), fontWeight: 700 }}
        >
          Show office
        </button>
      )}
      {onKeys ? (
        <button
          type="button"
          onClick={onKeys}
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts"
          className={`${BUTTON} grid size-8 place-items-center`}
          style={{ ...typeStyle("small", "navy"), fontWeight: 700 }}
        >
          ?
        </button>
      ) : (
        // Keeps the header the same while loading, so nothing moves when the panel arrives.
        <span aria-hidden="true" className="size-8" />
      )}
    </header>
  );
}
