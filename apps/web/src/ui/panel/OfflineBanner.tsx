import type { Ref } from "react";
import { typeStyle } from "../../theme/style";

/**
 * Under the tabs while the server is away. The last view stays, and decisions pause
 * (copy deck, offline.*). It takes focus when someone presses A, H, S or I while offline.
 */
export function OfflineBanner({
  lastUpdate,
  onRetry,
  ref,
}: {
  lastUpdate: string;
  onRetry: () => void;
  ref?: Ref<HTMLElement>;
}) {
  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-label="Server status"
      data-testid="offline-banner"
      className="flex shrink-0 items-start gap-3 border-b border-hairline bg-panel px-5 py-3 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="m-0" style={typeStyle("small", "ink")}>
          Cannot reach the local server. You are seeing the last update from {lastUpdate}.
        </p>
        <p className="m-0" style={typeStyle("small")}>
          Decisions are paused until the server is back. Check that <code>pnpm dev</code> is still
          running.
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 rounded-button border border-hairline bg-white px-3 py-1.5 hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        style={{ ...typeStyle("small", "navy"), fontWeight: 700 }}
      >
        Try again
      </button>
    </section>
  );
}
