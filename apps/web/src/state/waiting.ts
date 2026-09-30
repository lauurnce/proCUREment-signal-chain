import type { QueueItem, Seat, Track } from "@hq/shared";

/** The player's seat: "waiting on you" means waiting on this seat's decision. */
export const PLAYER_SEAT = "mgr-01";

/** A kind of decision, never a seat: a seat maps to a real person (D-046). */
const DECISION: Record<Track, string> = {
  MGR: "your decision",
  LEAD: "a Lead decision",
  CM: "a CM decision",
  OPS: "an Ops Buyer decision",
};

/** The role a helper hands work to, for "Ready for its CM". */
const ROLE: Record<Track, string> = {
  MGR: "Sr. Manager",
  LEAD: "Lead",
  CM: "CM",
  OPS: "Ops Buyer",
};

/** The open item a waiting helper waits on: one it sent, or else one it decides. */
export function waitingItem(seatId: string, queue: QueueItem[]): QueueItem | undefined {
  const open = queue.filter((q) => q.status === "needs-you");
  return open.find((q) => q.from === seatId) ?? open.find((q) => q.approver === seatId);
}

/**
 * What a waiting helper waits on, in one wording for the name tags and the Team tab
 * (council, 30 Sep 2026): "Waiting on you", "Ready for its CM" (its own seat decides), or
 * "Waiting for a CM decision".
 */
export function waitingLine(seats: Seat[], seatId: string, item: QueueItem | undefined): string {
  if (!item || item.approver === PLAYER_SEAT) return "Waiting on you";
  const track = (id: string) => seats.find((s) => s.id === id)?.track;
  if (item.approver === seatId) {
    const own = track(seatId);
    return own ? `Ready for its ${ROLE[own]}` : "Ready for a team decision";
  }
  const decider = track(item.approver);
  return `Waiting for ${decider ? DECISION[decider] : "a team decision"}`;
}
