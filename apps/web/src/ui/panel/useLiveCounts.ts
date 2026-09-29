import { useMemo } from "react";
import { useStore } from "../../state/store";
import { type PanelCounts, panelCounts, usePanelStore } from "./panelStore";

/**
 * The HUD, tab and page title numbers from the live queue minus the mocked decisions.
 * Null until the first data arrives, so nothing shows a fake 0.
 */
export function useLiveCounts(): PanelCounts | null {
  const queue = useStore((s) => s.data?.queue ?? null);
  const decided = usePanelStore((s) => s.decided);
  return useMemo(() => (queue ? panelCounts(queue, decided) : null), [queue, decided]);
}
