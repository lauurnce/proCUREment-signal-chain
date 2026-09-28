import { typeStyle } from "../../theme/style";
import type { LinkState } from "./linkState";
import { PanelHeader } from "./PanelHeader";
import { TABS } from "./PanelTabs";

const CARD_HEIGHTS = [236, 96, 96];

/**
 * The panel before the first data: the same header, tabs and instruction box, with gray card
 * shapes. No spinner, and no layout shift when the data lands (panel spec, section 6).
 */
export function PanelSkeleton({
  link,
  onRetry,
  onShowOffice,
}: {
  link: LinkState;
  onRetry: () => void;
  onShowOffice?: () => void;
}) {
  const away = link === "reconnecting" || link === "offline";
  return (
    <div
      aria-busy="true"
      data-testid="hq-panel-loading"
      className="flex h-full flex-col overflow-hidden rounded-card border border-hairline bg-white"
    >
      <PanelHeader link={link} lastUpdate="" seatCount={null} onShowOffice={onShowOffice} />
      <div
        aria-hidden="true"
        className="flex h-12 shrink-0 items-end gap-5 border-b border-hairline px-5"
      >
        {TABS.map((t) => (
          <span key={t.id} className="pb-3" style={typeStyle("label", "inkMuted")}>
            {t.label}
          </span>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 py-4">
        {away ? (
          <div className="flex flex-col items-start gap-3 py-6">
            <p className="m-0" style={typeStyle("body", "ink")}>
              Cannot reach the local server. Check that <code>pnpm dev</code> is still running.
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-button border border-hairline bg-white px-3 py-1.5 hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              style={{ ...typeStyle("small", "navy"), fontWeight: 700 }}
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <span className="h-10 rounded-button bg-panel" />
            {CARD_HEIGHTS.map((h, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed shapes that never reorder
              <span key={i} className="rounded-card bg-panel" style={{ height: h }} />
            ))}
            <span className="sr-only">Loading items</span>
          </>
        )}
      </div>
      <div aria-hidden="true" className="h-[104px] shrink-0 border-t border-hairline" />
    </div>
  );
}
