import { create } from "zustand";
import { headingTo, turnBetween } from "./behavior";
import type { PoseInput } from "./motion";
import { WALK } from "./motion";
import type { FloorPoint, NavGrid } from "./navGrid";

/**
 * Walk around mode: you steer the Sr. Manager avatar with WASD, the arrow keys, or a click on
 * the floor. The camera follows. Near a helper, a "Talk" hint shows, and E talks to them.
 * Esc goes back to the Overview.
 *
 * The mode lives in its own small store next to the characters (like selection.ts), so the
 * panel's Walk around pill can call `enterWalkMode` after the P4 and P5 merge.
 */
type WalkState = { active: boolean };

export const useWalk = create<WalkState>()(() => ({ active: false }));

export const isWalking = () => useWalk.getState().active;
export const enterWalkMode = () => useWalk.setState({ active: true });
export const exitWalkMode = () => useWalk.setState({ active: false });
export const toggleWalkMode = () => useWalk.setState((s) => ({ active: !s.active }));

/** A helper is close enough to talk to within this many meters (isometric-office skill). */
export const TALK_REACH = 1.5;

/** Who E would talk to right now. Written by the office every frame, never React state. */
export const talk = { near: null as string | null };

/** Where the avatar is, for the follow camera. Written by the office every frame. */
export const walker = { x: 0, z: 0 };

const talkListeners = new Set<(seatId: string) => void>();

/**
 * Calls `listener` when you talk to a helper (E, or a click on the Talk hint). The panel opens
 * their card from here after the merge. Returns a function that stops it.
 */
export function onTalk(listener: (seatId: string) => void): () => void {
  talkListeners.add(listener);
  return () => {
    talkListeners.delete(listener);
  };
}

/** Talks to the helper in reach, if any. True when someone was in reach. */
export function talkNow(): boolean {
  const seatId = talk.near;
  if (!seatId) return false;
  for (const listener of talkListeners) listener(seatId);
  return true;
}

/** The keys held down right now, by their `event.code`. */
export const held = new Set<string>();

const UP = ["KeyW", "ArrowUp"];
const DOWN = ["KeyS", "ArrowDown"];
const LEFT = ["KeyA", "ArrowLeft"];
const RIGHT = ["KeyD", "ArrowRight"];
export const STEER_KEYS = [...UP, ...DOWN, ...LEFT, ...RIGHT];

/**
 * The floor direction for the held keys, as a unit [x, z], or null when none are held.
 * The camera looks along (-1, -1, -1), so "up" on screen is (-1, -1) on the floor and
 * "right" is (1, -1).
 */
export function steerDirection(keys: ReadonlySet<string>): FloorPoint | null {
  const on = (list: string[]) => list.some((k) => keys.has(k));
  const up = (on(UP) ? 1 : 0) - (on(DOWN) ? 1 : 0);
  const right = (on(RIGHT) ? 1 : 0) - (on(LEFT) ? 1 : 0);
  if (up === 0 && right === 0) return null;
  const x = -up + right;
  const z = -up - right;
  const length = Math.hypot(x, z);
  return [x / length, z / length];
}

/** The nearest visible helper within reach, or null. */
export function nearestInReach(
  from: FloorPoint,
  helpers: Iterable<{ id: string; x: number; z: number; visible: boolean }>,
  reach = TALK_REACH,
): string | null {
  let best: string | null = null;
  let bestDistance = reach;
  for (const h of helpers) {
    if (!h.visible) continue;
    const d = Math.hypot(h.x - from[0], h.z - from[1]);
    if (d <= bestDistance) {
      best = h.id;
      bestDistance = d;
    }
  }
  return best;
}

/** Keys only steer when nothing else has focus: never while typing, never inside the panel. */
export function canSteer(target: EventTarget | null): boolean {
  if (typeof document === "undefined") return false;
  return (
    target === null ||
    target === document.body ||
    target === document.documentElement ||
    target instanceof HTMLCanvasElement
  );
}

/** Turns faster than a helper: you are in control. */
const AVATAR_TURN = 12;

/**
 * The Sr. Manager avatar: always standing, moved by the keys or a click. It slides along
 * furniture instead of stopping dead, so steering feels smooth.
 */
export class Avatar {
  x: number;
  z: number;
  heading: number;
  walked = 0;
  walkBlend = 0;
  readonly phase = 0.42;
  private path: FloorPoint[] = [];
  private leg = 1;
  private moving = false;
  private readonly grid: NavGrid;
  readonly home: FloorPoint;

  constructor(grid: NavGrid, home: FloorPoint, homeHeading: number) {
    this.grid = grid;
    this.home = home;
    [this.x, this.z] = home;
    this.heading = homeHeading;
  }

  /** Back to the start, facing the way it started. */
  reset(heading: number) {
    [this.x, this.z] = this.home;
    this.heading = heading;
    this.path = [];
    this.walkBlend = 0;
  }

  /** Puts the avatar on a point at once (tests and screenshots). */
  place(at: FloorPoint, heading: number) {
    [this.x, this.z] = at;
    this.heading = heading;
    this.path = [];
  }

  /** Walks up to a helper and stops about a meter short, on free floor, facing them. */
  approach(target: FloorPoint, stopShort = 1): boolean {
    const dx = this.x - target[0];
    const dz = this.z - target[1];
    const d = Math.hypot(dx, dz) || 1;
    const cell = this.grid.nearestFree([
      target[0] + (dx / d) * stopShort,
      target[1] + (dz / d) * stopShort,
    ]);
    return cell ? this.goTo(this.grid.center(cell[0], cell[1])) : false;
  }

  /** Click to move: walks the path to the nearest free point. False when there is no way. */
  goTo(to: FloorPoint): boolean {
    const path = this.grid.findPath([this.x, this.z], to);
    if (!path) return false;
    this.path = path;
    this.leg = 1;
    return true;
  }

  step(dt: number, keys: ReadonlySet<string>) {
    const dir = steerDirection(keys);
    this.moving = false;
    if (dir) {
      // The keys take over from a click.
      this.path = [];
      this.turn(Math.atan2(dir[0], dir[1]), dt);
      this.slide(dir, WALK.speed * dt);
    } else if (this.path.length > 0) {
      this.follow(dt);
    }
    const k = Math.min(1, dt * 8);
    this.walkBlend += ((this.moving ? 1 : 0) - this.walkBlend) * k;
  }

  poseInput(): PoseInput {
    return {
      activity: this.walkBlend > 0.05 ? "walk" : "idle",
      phase: this.phase,
      stand: 1,
      stride: this.walked / WALK.strideMeters,
      walk: this.walkBlend,
    };
  }

  private turn(face: number, dt: number) {
    const d = turnBetween(this.heading, face);
    const max = AVATAR_TURN * dt;
    this.heading += Math.abs(d) <= max ? d : Math.sign(d) * max;
  }

  /** Moves along `dir`, or along one axis of it when furniture is in the way. */
  private slide([dx, dz]: FloorPoint, distance: number) {
    const tries: FloorPoint[] = [
      [dx, dz],
      [Math.sign(dx), 0],
      [0, Math.sign(dz)],
    ];
    for (const [tx, tz] of tries) {
      if (tx === 0 && tz === 0) continue;
      const nx = this.x + tx * distance;
      const nz = this.z + tz * distance;
      if (this.grid.isFree([nx, nz])) {
        this.x = nx;
        this.z = nz;
        this.walked += distance;
        this.moving = true;
        return;
      }
    }
  }

  private follow(dt: number) {
    const next = this.path[this.leg];
    if (!next) {
      this.path = [];
      return;
    }
    const dx = next[0] - this.x;
    const dz = next[1] - this.z;
    const left = Math.hypot(dx, dz);
    this.turn(headingTo([this.x, this.z], next), dt);
    const move = Math.min(left, WALK.speed * dt);
    if (left > 1e-6) {
      this.x += (dx / left) * move;
      this.z += (dz / left) * move;
    }
    this.walked += move;
    this.moving = move > 0;
    if (move >= left - 1e-6) this.leg++;
  }
}
