import type { QueueItem, Seat } from "@hq/shared";

/** The player's seat. Needs you shows the items this seat decides (D-027). */
export const PLAYER_SEAT = "mgr-01";

export type QueueFilter = "mine" | "team";

/**
 * Open items for the Needs you list. "mine" is what the Sr. Manager decides. "team" adds
 * the items that belong to other seats (a demo, labeled "Deciding as CM 02 (demo)").
 * Oldest first, so nothing waits forever at the bottom.
 */
export function needsYou(queue: QueueItem[], filter: QueueFilter): QueueItem[] {
  return queue
    .filter((q) => q.status === "needs-you")
    .filter((q) => filter === "team" || q.approver === PLAYER_SEAT)
    .sort((a, b) => a.created.localeCompare(b.created));
}

/** "CM 03 helper" (D-028). Falls back to the seat id if the seat is unknown. */
export function helperName(seats: Seat[], seatId: string): string {
  const seat = seats.find((s) => s.id === seatId);
  return `${seat?.displayName ?? seatId} helper`;
}

/** Who decides an item when it is not the player, for the "Deciding as" label. */
export function decidingAs(seats: Seat[], item: QueueItem): string | null {
  if (item.approver === PLAYER_SEAT) return null;
  return seats.find((s) => s.id === item.approver)?.displayName ?? item.approver;
}
