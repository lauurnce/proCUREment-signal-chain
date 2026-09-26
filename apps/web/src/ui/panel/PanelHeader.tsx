import type { ConnectionStatus } from "../../state/store";
import { cssColor, typeStyle } from "../../theme/style";

const LIVE: Record<ConnectionStatus, { word: string; tip: string; filled: boolean }> = {
  live: { word: "Live", tip: "Updates arrive as the helpers work.", filled: true },
  connecting: { word: "Connecting", tip: "Connecting to the local server.", filled: false },
  offline: { word: "Offline", tip: "Cannot reach the local server.", filled: false },
};

/** Product name, the server link (never a person), and the seat count. */
export function PanelHeader({
  connection,
  seatCount,
  onKeys,
}: {
  connection: ConnectionStatus;
  seatCount: number;
  onKeys: () => void;
}) {
  const live = LIVE[connection];
  const dotColor = connection === "live" ? "statusWorking" : "statusOff";
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-hairline px-5">
      <h1 className="m-0" style={typeStyle("appTitle")}>
        SignalChain HQ
      </h1>
      <span className="flex items-center gap-1.5" title={live.tip} data-testid="live-dot">
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
        title={`${seatCount} seats, each with an AI helper.`}
      >
        {seatCount} on the team
      </span>
      <button
        type="button"
        onClick={onKeys}
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts"
        className="grid size-8 place-items-center rounded-button border border-hairline bg-white hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        style={{ ...typeStyle("small", "navy"), fontWeight: 700 }}
      >
        ?
      </button>
    </header>
  );
}
