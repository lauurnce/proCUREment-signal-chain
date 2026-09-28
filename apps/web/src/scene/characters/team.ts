import type { LayoutFile, Seat } from "@hq/shared";
import { seatSpot } from "../layout/boxes";
import type { CrowdMember } from "./crowdPlan";

export type Team = {
  members: CrowdMember[];
  /** Seats with no desk slot in layout.json. They are not drawn. */
  missing: string[];
};

/**
 * Puts every roster seat at its desk slot in layout.json. The look comes from the roster's
 * avatarSeed, so a seat can get a new look without a new id. Working helpers type, the others
 * sit idle for now (behaviors come in P4.3).
 */
export function teamFor(seats: Seat[], layout: LayoutFile): Team {
  const slots = new Map(layout.deskSlots.map((slot) => [slot.seat, slot]));
  const members: CrowdMember[] = [];
  const missing: string[] = [];
  for (const seat of seats) {
    const slot = slots.get(seat.id);
    if (!slot) {
      missing.push(seat.id);
      continue;
    }
    const spot = seatSpot(slot);
    members.push({
      id: seat.id,
      seed: String(seat.avatarSeed),
      track: seat.track,
      activity: seat.status === "working" ? "typing" : "idle",
      position: spot.position,
      rotation: spot.rotation,
    });
  }
  return { members, missing };
}
