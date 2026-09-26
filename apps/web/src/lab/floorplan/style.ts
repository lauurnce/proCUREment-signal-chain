import { color, world } from "../../theme/tokens";

/** Floor tint per zone, from the approved world palette. */
export function zoneFill(id: string): string {
  switch (id) {
    case "cm-wing":
      return world.zoneCm;
    case "ops-wing":
      return world.zoneOps;
    case "leads-row":
    case "mgr-office":
      return world.zoneLeads;
    case "endorsement-bridge":
      return world.bridgeSeam;
    case "merienda-corner":
      return world.zoneMerienda;
    case "reception":
      return world.wall;
    default:
      return world.zoneShared;
  }
}

/** Line style per workflow route: track color, plus a dash and a number, never color alone. */
export const ROUTE_STYLE: Record<string, { color: string; dash: string; number: number }> = {
  "cm-pr-stock-item-approval": { color: color.trackCm, dash: "", number: 1 },
  "cm-contract-generation-conga": { color: color.trackCm, dash: "0.9 0.5", number: 2 },
  "cm-rfq-process": { color: color.trackCm, dash: "0.2 0.4", number: 3 },
  "ops-pr-to-po-stock-item": { color: color.trackOps, dash: "", number: 4 },
  "ops-erfq-to-po": { color: color.trackOps, dash: "0.9 0.5", number: 5 },
  "ops-po-amendments": { color: color.trackOps, dash: "0.2 0.4", number: 6 },
};

export const REAL_WORKFLOWS = Object.keys(ROUTE_STYLE);
