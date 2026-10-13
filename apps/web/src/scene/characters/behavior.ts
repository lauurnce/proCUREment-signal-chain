import type { LayoutFile, QueueItem, Seat, Workflow } from "@hq/shared";
import { PLAYER_SEAT, waitingItem, waitingLine } from "../../state/waiting";
import { seededRandom } from "./appearance";
import type { Activity, PoseInput } from "./motion";
import { ease, WALK } from "./motion";

/** The enter easing (a quick start and a soft stop), for the glance. */
const easeEnter = (t: number) => 1 - (1 - t) ** 3;

import type { FloorPoint, NavGrid } from "./navGrid";

/**
 * Where a helper should be, from its live status and current workflow step (/api/state).
 * - desk: sits at its desk (typing, idle, or a raised hand when it waits on you).
 * - stay: stands at a spot until the status changes (a break or a meeting).
 * - visit: walks to the zone of its current step, works there a moment, walks back, and
 *   sits for a while before the next trip.
 * - hidden: off duty, the chair is empty.
 */
export type Goal =
  | { kind: "desk"; activity: "typing" | "idle" | "hand" | "wait" }
  | { kind: "stay"; zone: string; spot: FloorPoint; face: number; activity: "idle" | "typing" }
  | { kind: "visit"; zone: string; spot: FloorPoint; face: number }
  | { kind: "hidden" };

/** Seconds at the zone on a visit, and at the desk between visits. */
export const VISIT_WORK: [number, number] = [6, 10];
export const VISIT_DESK: [number, number] = [45, 90];
/** At most this many helpers visit one zone at a time. The rest wait at their desks. */
export const MAX_AT_ZONE = 3;
/** A helper that finds its zone full tries again after this many seconds. */
const ZONE_FULL_RETRY: [number, number] = [4, 8];

/** How many helpers are away on a visit, by zone. One map is shared by the whole team. */
export type ZoneCrowd = Map<string, number>;
/** The first trip leaves within this many seconds of the page opening, so the office wakes up. */
export const FIRST_TRIP: [number, number] = [2, 20];

const MERIENDA = "merienda-corner";
const HUDDLE = "huddle-room";
/** "own-desk" in data/workflows.json means the step happens at the seat's own desk. */
const OWN_DESK = "own-desk";

const between = (r: () => number, [lo, hi]: [number, number]) => lo + r() * (hi - lo);

/**
 * The zone of a seat's current workflow step, or null when it is done at the desk. A visit
 * outside a workflow (an [HQ] email at the Mail Dock) comes first.
 */
export function stepZone(seat: Seat, workflows: Workflow[]): string | null {
  if (seat.visiting && seat.visiting !== OWN_DESK) return seat.visiting;
  if (!seat.currentWorkflow || !seat.currentStep) return null;
  const step = workflows
    .find((w) => w.id === seat.currentWorkflow)
    ?.steps.find((s) => s.id === seat.currentStep);
  if (!step || step.zone === OWN_DESK) return null;
  return step.zone;
}

/** Heading (radians, 0 faces +z) that looks from `a` toward `b`. */
export const headingTo = (a: FloorPoint, b: FloorPoint) => Math.atan2(b[0] - a[0], b[1] - a[1]);

/**
 * A free spot in a zone for one helper: near the zone's landmark (the SAP terminal, the coffee
 * cart), spread around it by the seat's seed so helpers do not stand on each other, and facing
 * the landmark.
 */
export function spotIn(
  zoneId: string,
  seatId: string,
  layout: LayoutFile,
  grid: NavGrid,
): { spot: FloorPoint; face: number } | null {
  const zone = layout.zones.find((z) => z.id === zoneId);
  if (!zone) return null;
  const [x, z, w, d] = zone.rect;
  const center: FloorPoint = zone.anchor ?? [x + w / 2, z + d / 2];
  const landmark = layout.landmarks.find((l) => l.zone === zoneId);
  const focus: FloorPoint = landmark ? landmark.pos : center;
  const r = seededRandom(`${seatId}:${zoneId}`);
  const angle = r() * Math.PI * 2;
  const reach = 1 + r() * 0.6;
  const wanted: FloorPoint = [
    focus[0] + Math.sin(angle) * reach,
    focus[1] + Math.cos(angle) * reach,
  ];
  // Stay inside the zone when we can.
  const clamped: FloorPoint = [
    Math.min(x + w - 0.3, Math.max(x + 0.3, wanted[0])),
    Math.min(z + d - 0.3, Math.max(z + 0.3, wanted[1])),
  ];
  const cell = grid.nearestFree(clamped);
  if (!cell) return null;
  const spot = grid.center(cell[0], cell[1]);
  return { spot, face: headingTo(spot, focus) };
}

/** The goal for a seat's live status. */
export { PLAYER_SEAT } from "../../state/waiting";

/** What a waiting helper waits on, from the open Needs you items. */
export type Wait = {
  /** True when the Sr. Manager decides (or no item says otherwise). */
  onYou: boolean;
  /** What it waits on when someone else decides, like "Waiting for a CM decision" (D-046). */
  line: string | null;
  /** When the item came in, to find the helper that has waited longest. */
  since: string | null;
};

/**
 * Who each waiting helper waits on. The same rule as the panel's Team tab: the open item the
 * helper sent, or else one that waits on this seat's own decision.
 */
export function waitsFor(seats: Seat[], queue: QueueItem[]): Map<string, Wait> {
  const out = new Map<string, Wait>();
  for (const seat of seats) {
    if (seat.status !== "waiting-on-you") continue;
    const item = waitingItem(seat.id, queue);
    const onYou = !item || item.approver === PLAYER_SEAT;
    out.set(seat.id, {
      onYou,
      line: onYou ? null : waitingLine(seats, seat.id, item),
      since: item?.created ?? null,
    });
  }
  return out;
}

/** The one helper that waves: the one waiting on you the longest. Null when none. */
export function waverOf(waits: Map<string, Wait>): string | null {
  let best: [string, string] | null = null;
  for (const [id, w] of waits) {
    if (!w.onYou) continue;
    const since = w.since ?? "9999";
    if (!best || since < best[1]) best = [id, since];
  }
  return best?.[0] ?? null;
}

export function goalFor(
  seat: Seat,
  workflows: Workflow[],
  layout: LayoutFile,
  grid: NavGrid,
  /** Who it waits on, when it waits. Unknown means it waits on you. */
  wait?: Wait,
): Goal {
  // A paused helper stays in its chair, still: an empty chair would read as a person away
  // (privacy guardrail, council 29 Sep 2026).
  if (seat.status === "off-duty") return { kind: "desk", activity: "idle" };
  // Only work that waits on you raises a hand with the amber "!". Work that waits on a CM
  // shows a calm hollow bubble (council, 29 Sep 2026, Lawrence's choice).
  if (seat.status === "waiting-on-you") {
    return { kind: "desk", activity: wait && !wait.onYou ? "wait" : "hand" };
  }
  const zone = stepZone(seat, workflows);
  if (seat.status === "on-break") {
    const at = spotIn(MERIENDA, seat.id, layout, grid);
    return at ? { kind: "stay", zone: MERIENDA, ...at, activity: "idle" } : desk("idle");
  }
  if (seat.status === "in-meeting") {
    const room = zone && zone !== seat.zone ? zone : HUDDLE;
    const at = spotIn(room, seat.id, layout, grid);
    return at ? { kind: "stay", zone: room, ...at, activity: "idle" } : desk("idle");
  }
  // Working. A step in another zone means a trip there and back.
  if (zone && zone !== seat.zone) {
    const at = spotIn(zone, seat.id, layout, grid);
    if (at) return { kind: "visit", zone, ...at };
  }
  return desk("typing");
}

const desk = (activity: "typing" | "idle" | "hand" | "wait"): Goal => ({ kind: "desk", activity });

type Place = { kind: "desk" } | { kind: "spot"; spot: FloorPoint; face: number };

/** What the helper's legs are doing right now. */
export type Motion = "seated" | "rising" | "walking" | "turning" | "sitting" | "standing";

const TURN_FIRST = 0.35;

/**
 * When you talk to a helper (E), it glances toward you: at most this far (radians, so a seated
 * helper's legs stay under the desk), in 220 ms with the enter easing, held a few seconds, then
 * back at the normal turn rate (the council's signature moment, 30 Sep 2026).
 */
const GREET = { maxTurn: 1, seconds: 0.22, hold: 4 } as const;

/** The shortest signed turn from heading a to heading b, in radians. */
export function turnBetween(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * One helper's behavior: a small state machine. The goal comes from the server. The agent
 * stands up, turns, walks the path (A* on the grid), turns to face, and sits down again.
 * Pure logic with no drawing, so the tests can run it second by second.
 */
export class Agent {
  x: number;
  z: number;
  heading: number;
  /** 0 seated, 1 standing. */
  stand = 0;
  motion: Motion = "seated";
  visible = true;
  /** Meters walked, for the stride. */
  walked = 0;
  /** 0 to 1, how much of the walk cycle shows. */
  walkBlend = 0;
  goal: Goal = { kind: "desk", activity: "idle" };
  /** Only the helper that has waited on you longest waves its raised hand. */
  waves = true;

  private path: FloorPoint[] = [];
  private leg = 1;
  private headed: Place = { kind: "desk" };
  /** Where it is now, or last stood still. */
  private at: Place = { kind: "desk" };
  /** Counts down the time at the desk or at the zone on a visit. */
  private timer = 0;
  private readonly random: () => number;
  readonly id: string;
  /** The chair: where it sits, and the way it faces there. */
  readonly seat: { x: number; z: number; heading: number };
  readonly phase: number;
  private readonly grid: NavGrid;
  /** Reduced motion: every trip is one cut, with no walk in between. */
  private readonly still: boolean;
  /** Visits in progress across the team, so a zone never gets crowded (council). */
  private readonly crowd: ZoneCrowd;
  /** The zone this helper counts itself in, while away on a visit. */
  private holding: string | null = null;
  /** A glance toward you after a talk: where from, where to, and the time since it began. */
  private greet: { from: number; to: number; t: number } | null = null;

  constructor(
    id: string,
    seat: { x: number; z: number; heading: number },
    grid: NavGrid,
    phase: number,
    still = false,
    crowd: ZoneCrowd = new Map(),
  ) {
    this.id = id;
    this.crowd = crowd;
    this.seat = seat;
    this.grid = grid;
    this.phase = phase;
    this.still = still;
    this.x = seat.x;
    this.z = seat.z;
    this.heading = seat.heading;
    this.random = seededRandom(`${id}:trips`);
  }

  /**
   * A new goal from the server. The first one places the helper where it belongs at once
   * (a page load never shows everyone walking to their spot). Later ones walk there.
   */
  setGoal(goal: Goal, first = false): void {
    const before = this.goal;
    this.goal = goal;
    if (goal.kind !== "visit" || goal.zone !== this.holding) this.release();
    this.visible = goal.kind !== "hidden";
    if (goal.kind === "hidden") {
      this.placeAt({ kind: "desk" });
      return;
    }
    const target: Place =
      goal.kind === "stay" ? { kind: "spot", spot: goal.spot, face: goal.face } : { kind: "desk" };
    if (goal.kind === "visit") {
      // A new visit (or the first one) waits at the desk a moment before the trip.
      const range = first ? FIRST_TRIP : VISIT_DESK;
      if (first || before.kind !== "visit" || before.zone !== goal.zone) {
        this.timer = between(this.random, range);
      }
    }
    if (first) {
      this.placeAt(target);
      return;
    }
    if (!samePlace(target, this.headed)) this.travel(target);
  }

  /** Glances toward `point` (you), when it is sitting or standing still. */
  greetToward(point: FloorPoint): void {
    if (this.motion !== "seated" && this.motion !== "standing") return;
    const rest = this.restHeading();
    const turn = turnBetween(rest, headingTo([this.x, this.z], point));
    const to = rest + Math.max(-GREET.maxTurn, Math.min(GREET.maxTurn, turn));
    // Reduced motion: the glance is one cut.
    if (this.still) this.heading = to;
    this.greet = { from: this.heading, to, t: 0 };
  }

  /** The way it faces when it is not glancing: its desk, or the spot it stands at. */
  private restHeading(): number {
    return this.headed.kind === "desk" ? this.seat.heading : this.headed.face;
  }

  private stepGreet(dt: number) {
    const g = this.greet;
    if (!g) return;
    // Any move ends the glance, and the walk takes over the heading.
    if (this.motion !== "seated" && this.motion !== "standing") {
      this.greet = null;
      return;
    }
    g.t += dt;
    if (g.t < GREET.seconds + GREET.hold) {
      const k = this.still ? 1 : easeEnter(Math.min(1, g.t / GREET.seconds));
      this.heading = g.from + turnBetween(g.from, g.to) * k;
      return;
    }
    if (this.turnToward(this.restHeading(), dt)) this.greet = null;
  }

  /** Moves the helper by `dt` seconds. */
  step(dt: number): void {
    if (!this.visible) return;
    this.stepGreet(dt);
    switch (this.motion) {
      case "rising":
        this.stand = Math.min(1, this.stand + dt / WALK.standSeconds);
        if (this.stand >= 1) this.motion = "walking";
        break;
      case "sitting":
        this.stand = Math.max(0, this.stand - dt / WALK.standSeconds);
        if (this.stand <= 0) {
          this.motion = "seated";
          this.release();
        }
        break;
      case "walking":
        this.walk(dt);
        break;
      case "turning": {
        const face = this.headed.kind === "desk" ? this.seat.heading : this.headed.face;
        if (this.turnToward(face, dt)) {
          this.motion = this.headed.kind === "desk" ? "sitting" : "standing";
        }
        break;
      }
      default:
        break;
    }
    const moving = this.motion === "walking";
    // On arrival, finish the step so the feet come together (half a stride each step).
    if (!moving && this.walkBlend > 0.05) {
      const half = WALK.strideMeters / 2;
      const target = Math.ceil(this.walked / half - 1e-6) * half;
      this.walked = Math.min(target, this.walked + WALK.speed * dt);
    }
    const k = Math.min(1, dt * 6);
    this.walkBlend += ((moving ? 1 : 0) - this.walkBlend) * k;
    this.tickVisit(dt);
  }

  /** The body input for motion.poseInto. */
  poseInput(): PoseInput {
    const walking = this.motion === "walking" || this.walkBlend > 0.05;
    let activity: Activity = "idle";
    if (walking) activity = "walk";
    else if (this.motion === "seated" && this.goal.kind === "desk") activity = this.goal.activity;
    else if (this.motion === "standing") {
      activity = this.goal.kind === "stay" ? this.goal.activity : "typing";
    }
    return {
      activity,
      phase: this.phase,
      // Standing up and sitting down start and stop softly (move easing, council 29 Sep).
      stand: ease(this.stand),
      stride: this.walked / WALK.strideMeters,
      walk: this.walkBlend,
      wave: this.waves,
    };
  }

  /** Where it is going, for tests and the debug overlay. */
  get destination(): "desk" | FloorPoint {
    return this.headed.kind === "desk" ? "desk" : this.headed.spot;
  }

  private tickVisit(dt: number) {
    if (this.goal.kind !== "visit") return;
    const idle = this.motion === "seated" || this.motion === "standing";
    if (!idle) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    if (this.at.kind === "desk") {
      const zone = this.goal.zone;
      if ((this.crowd.get(zone) ?? 0) >= MAX_AT_ZONE) {
        this.timer = between(this.random, ZONE_FULL_RETRY);
        return;
      }
      this.crowd.set(zone, (this.crowd.get(zone) ?? 0) + 1);
      this.holding = zone;
      this.timer = between(this.random, VISIT_WORK);
      this.travel({ kind: "spot", spot: this.goal.spot, face: this.goal.face });
      // No way there: it stays at the desk, so it does not count at the zone.
      if (this.headed.kind === "desk") this.release();
    } else {
      this.timer = between(this.random, VISIT_DESK);
      this.travel({ kind: "desk" });
      // Counted until it sits down again, so the zone is not over-full while it walks back.
    }
  }

  /** Stops counting this helper at a zone. */
  private release() {
    if (!this.holding) return;
    const n = (this.crowd.get(this.holding) ?? 1) - 1;
    if (n > 0) this.crowd.set(this.holding, n);
    else this.crowd.delete(this.holding);
    this.holding = null;
  }

  private travel(target: Place) {
    this.headed = target;
    const to = this.pointOf(target);
    if (this.still) {
      this.placeAt(target);
      return;
    }
    const path = this.grid.findPath([this.x, this.z], to);
    if (!path) {
      // No way there (a broken layout). Stay put rather than walk through a wall.
      this.headed = this.at;
      return;
    }
    this.path = path;
    this.leg = 1;
    this.motion = this.stand >= 1 ? "walking" : "rising";
  }

  private placeAt(target: Place) {
    this.headed = target;
    this.at = target;
    const [x, z] = this.pointOf(target);
    this.x = x;
    this.z = z;
    this.path = [];
    this.walkBlend = 0;
    if (target.kind === "desk") {
      this.release();
      this.heading = this.seat.heading;
      this.stand = 0;
      this.motion = "seated";
    } else {
      this.heading = target.face;
      this.stand = 1;
      this.motion = "standing";
    }
  }

  private pointOf(place: Place): FloorPoint {
    return place.kind === "desk" ? [this.seat.x, this.seat.z] : place.spot;
  }

  /** Turns toward `face` at the turn rate. True once it faces there. */
  private turnToward(face: number, dt: number): boolean {
    const d = turnBetween(this.heading, face);
    const max = WALK.turnRate * dt;
    if (Math.abs(d) <= max) {
      this.heading = face;
      return true;
    }
    this.heading += Math.sign(d) * max;
    return false;
  }

  private walk(dt: number) {
    const next = this.path[this.leg];
    if (!next) {
      this.at = this.headed;
      this.motion = "turning";
      return;
    }
    const dx = next[0] - this.x;
    const dz = next[1] - this.z;
    const left = Math.hypot(dx, dz);
    const turned = this.turnToward(Math.atan2(dx, dz), dt);
    // Turn before walking off, so nobody slides sideways.
    const aligned = turned || Math.abs(turnBetween(this.heading, Math.atan2(dx, dz))) < TURN_FIRST;
    if (!aligned) return;
    const move = Math.min(left, WALK.speed * dt);
    if (left > 1e-6) {
      this.x += (dx / left) * move;
      this.z += (dz / left) * move;
    }
    this.walked += move;
    if (move >= left - 1e-6) this.leg++;
  }
}

function samePlace(a: Place, b: Place): boolean {
  if (a.kind === "desk" || b.kind === "desk") return a.kind === b.kind;
  return a.spot[0] === b.spot[0] && a.spot[1] === b.spot[1];
}
