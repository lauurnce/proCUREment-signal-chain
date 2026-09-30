import type { QueueItem, Seat, Track } from "@hq/shared";

/** The player's seat. Needs you shows the items this seat decides (D-027). */
export const PLAYER_SEAT = "mgr-01";

export type QueueFilter = "mine" | "team";

/**
 * How urgent an item is, lower first. Items have no due date yet, so the kind decides:
 * an escalation, then an item the authority rule routed, then an email draft (a supplier
 * waits on it), then the rest.
 */
export function urgency(item: QueueItem): number {
  if (item.kind === "escalation") return 0;
  if (item.rule) return 1;
  if (item.kind === "email-draft") return 2;
  return 3;
}

/**
 * Open items for the Needs you list. "mine" is what the Sr. Manager decides. "team" adds
 * the items that belong to other seats (a demo, labeled "Deciding as CM 02 (demo)").
 * Most urgent first, then oldest first, so nothing waits forever at the bottom.
 */
export function needsYou(queue: QueueItem[], filter: QueueFilter): QueueItem[] {
  return queue
    .filter((q) => q.status === "needs-you")
    .filter((q) => filter === "team" || q.approver === PLAYER_SEAT)
    .sort((a, b) => urgency(a) - urgency(b) || a.created.localeCompare(b.created));
}

/** "CM 03 helper" (D-028). Falls back to the seat id if the seat is unknown. */
export function helperName(seats: Seat[], seatId: string): string {
  const seat = seats.find((s) => s.id === seatId);
  return `${seat?.displayName ?? seatId} helper`;
}

const DECIDER: Record<Track, { short: string; long: string }> = {
  MGR: { short: "the Sr. Manager", long: "The Sr. Manager" },
  LEAD: { short: "a Lead", long: "A Lead" },
  CM: { short: "a CM", long: "A Category Manager" },
  OPS: { short: "an Ops Buyer", long: "An Ops Buyer" },
};

/**
 * Who decides an item when it is not the player, as a kind of decider ("a CM"), never a seat:
 * a seat maps to a real person (D-046, council 29 Sep 2026). Null when the player decides.
 */
export function decidingAs(seats: Seat[], item: QueueItem): string | null {
  if (item.approver === PLAYER_SEAT) return null;
  const track = seats.find((s) => s.id === item.approver)?.track;
  return track ? DECIDER[track].short : "a team";
}

/** The Decides row: "You", or "A Category Manager (you, in this demo)". */
export function decidesLine(seats: Seat[], item: QueueItem): string {
  if (item.approver === PLAYER_SEAT) return "You";
  const track = seats.find((s) => s.id === item.approver)?.track;
  return `${track ? DECIDER[track].long : "The team"} (you, in this demo)`;
}
