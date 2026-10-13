import { useRef } from "react";
import { retryNow } from "../../state/connection";
import { PANEL_OVERLAY, useOverlayRect } from "../../state/overlays";
import { useStore } from "../../state/store";
import { saveToVault } from "../../state/vaultWrites";
import { useLinkState } from "./linkState";
import { Panel } from "./Panel";
import { PanelSkeleton } from "./PanelSkeleton";
import { TABS } from "./PanelTabs";

const params = new URLSearchParams(window.location.search);
/** Screenshots use a fixed clock, the morning of the sample data (same as the Lab). */
const NOW = params.has("shots") ? new Date("2026-09-25T09:35:00+08:00") : null;
const TAB = TABS.find((t) => t.id === params.get("tab"))?.id;
const OPEN_FIRST = params.get("open") === "1";
const FILTER = params.get("filter") === "team" ? "team" : undefined;

/** Decisions and instructions save to the vault when the undo bar closes (P6.1). */
export const OFFICE_NOTE = "Saves to the vault when this bar closes.";

/**
 * The HQ panel in the office, fed by GET /api/state and the live stream. Docked, it registers
 * as an overlay, so the camera frames the office in the free area to its left.
 * Remount it (with a key) when `docked` changes.
 */
export function OfficePanel({
  docked,
  onShowOffice,
}: {
  docked: boolean;
  /** Narrow screens only. */
  onShowOffice?: () => void;
}) {
  const data = useStore((s) => s.data);
  const connection = useStore((s) => s.connection);
  const link = useLinkState(connection);
  const ref = useRef<HTMLDivElement>(null);
  useOverlayRect(PANEL_OVERLAY, ref);

  return (
    <div ref={docked ? ref : undefined} className="h-full" data-testid="office-panel">
      {data ? (
        <Panel
          data={data}
          connection={connection}
          now={NOW ?? new Date()}
          note={OFFICE_NOTE}
          onRetry={retryNow}
          onSave={saveToVault}
          onShowOffice={onShowOffice}
          initial={{ tab: TAB, openFirst: OPEN_FIRST, filter: FILTER }}
        />
      ) : (
        <PanelSkeleton link={link} onRetry={retryNow} onShowOffice={onShowOffice} />
      )}
    </div>
  );
}
