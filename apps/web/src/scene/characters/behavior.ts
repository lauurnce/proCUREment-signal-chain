import type { LayoutFile, Seat, Workflow } from "@hq/shared";
import { seededRandom } from "./appearance";
import type { Activity, PoseInput } from "./motion";
import { WALK } from "./motion";
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
  | { kind: "desk"; activity: "typing" | "idle" | "hand" }
  | { kind: "stay"; zone: string; spot: FloorPoint; face: number; activity: "idle" | "typing" }
  | { kind: "visit"; zone: string; spot: FloorPoint; face: number }
  | { kind: "hidden" };

/** Seconds at the zone on a visit, and at the desk between visits. */
export const VISIT_WORK: [number, number] = [6, 10];
export const VISIT_DESK: [number, number] = [20, 40];
/** The first trip leaves within this many seconds of the page opening, so the office wakes up. */
export const FIRST_TRIP: [number, number] = [2, 20];

const MERIENDA = "merienda-corner";
const HUDDLE = "huddle-room";
/** "own-desk" in data/workflows.json means the step happens at the seat's own desk. */
const OWN_DESK = "own-desk";

const between = (r: () => number, [lo, hi]: [number, number]) => lo + r() * (hi - lo);

/** The zone of a seat's current workflow step, or null when it is done at the desk. */
export function stepZone(seat: Seat, workflows: Workflow[]): string | null {
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
export function goalFor(
  seat: Seat,
  workflows: Workflow[],
  layout: LayoutFile,
  grid: NavGrid,
): Goal {
  if (seat.status === "off-duty") return { kind: "hidden" };
  if (seat.status === "waiting-on-you") return { kind: "desk", activity: "hand" };
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

const desk = (activity: "typing" | "idle" | "hand"): Goal => ({ kind: "desk", activity });

type Place = { kind: "desk" } | { kind: "spot"; spot: FloorPoint; face: number };

/** What the helper's legs are doing right now. */
export type Motion = "seated" | "rising" | "walking" | "turning" | "sitting" | "standing";

const TURN_FIRST = 0.35;

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

  constructor(
    id: string,
    seat: { x: number; z: number; heading: number },
    grid: NavGrid,
    phase: number,
    still = false,
  ) {
    this.id = id;
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

  /** Moves the helper by `dt` seconds. */
  step(dt: number): void {
    if (!this.visible) return;
    switch (this.motion) {
      case "rising":
        this.stand = Math.min(1, this.stand + dt / WALK.standSeconds);
        if (this.stand >= 1) this.motion = "walking";
        break;
      case "sitting":
        this.stand = Math.max(0, this.stand - dt / WALK.standSeconds);
        if (this.stand <= 0) this.motion = "seated";
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
      stand: this.stand,
      stride: this.walked / WALK.strideMeters,
      walk: this.walkBlend,
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
      this.timer = between(this.random, VISIT_WORK);
      this.travel({ kind: "spot", spot: this.goal.spot, face: this.goal.face });
    } else {
      this.timer = between(this.random, VISIT_DESK);
      this.travel({ kind: "desk" });
    }
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
