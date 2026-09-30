import type { Accessory, LayoutFile } from "@hq/shared";
import { DESK } from "../furniture/parts";
import { type Box, box, seatSpot, wallBoxes } from "../layout/boxes";
import { landmarkBoxes, propBoxes } from "../layout/recipes";

/** Grid cell size in meters (isometric-office skill). */
export const CELL = 0.5;
/** Half a helper's width: a cell is blocked when its center is this close to furniture. */
export const CLEARANCE = 0.15;
/** Anything lower than this is a floor deck or a rug, and you can walk over it. */
const STEP_OVER = 0.06;
/** Anything that starts higher than this (a pendant, a sign, a window) is above your head. */
const HEAD_ROOM = 1.2;

/** A point on the floor, [x, z] in meters. */
export type FloorPoint = [number, number];

/**
 * Where a helper can walk: the floor in 0.5 m cells. A cell is blocked when a desk, wall,
 * landmark or prop stands on it. Built from the same boxes the office draws, so the grid
 * always matches what you see. Doors are gaps in the walls, so they stay open.
 */
export class NavGrid {
  readonly cols: number;
  readonly rows: number;
  private readonly blocked: Uint8Array;

  constructor(width: number, depth: number, obstacles: Box[]) {
    this.cols = Math.max(1, Math.round(width / CELL));
    this.rows = Math.max(1, Math.round(depth / CELL));
    this.blocked = new Uint8Array(this.cols * this.rows);
    for (const b of obstacles) this.stamp(b);
  }

  /**
   * Marks every cell whose center sits inside the box footprint, grown by the clearance.
   * A thin wall counts as at least a quarter cell thick, so a wall on a cell edge still
   * blocks the cells on both sides of it. Door gaps keep their full width.
   */
  private stamp(b: Box) {
    const bottom = b.pos[1] - b.size[1] / 2;
    const top = b.pos[1] + b.size[1] / 2;
    if (top < STEP_OVER || bottom > HEAD_ROOM) return;
    // Only a long, thin box (a wall panel) gets the minimum. A door post stays thin.
    const hx = Math.max(b.size[0] / 2, b.size[2] >= CELL ? CELL / 4 : 0) + CLEARANCE;
    const hz = Math.max(b.size[2] / 2, b.size[0] >= CELL ? CELL / 4 : 0) + CLEARANCE;
    const c = Math.cos(b.rotY);
    const s = Math.sin(b.rotY);
    const reach = Math.hypot(hx, hz);
    const [x0, z0] = this.cellOf([b.pos[0] - reach, b.pos[2] - reach]);
    const [x1, z1] = this.cellOf([b.pos[0] + reach, b.pos[2] + reach]);
    for (let iz = z0; iz <= z1; iz++) {
      for (let ix = x0; ix <= x1; ix++) {
        const [px, pz] = this.center(ix, iz);
        const dx = px - b.pos[0];
        const dz = pz - b.pos[2];
        // Into the box's own space (a box turns by rotY around the vertical axis).
        const lx = dx * c - dz * s;
        const lz = dx * s + dz * c;
        if (Math.abs(lx) < hx && Math.abs(lz) < hz) this.blocked[iz * this.cols + ix] = 1;
      }
    }
  }

  /** The cell a point is in, clamped to the floor. */
  cellOf([x, z]: FloorPoint): [number, number] {
    const ix = Math.min(this.cols - 1, Math.max(0, Math.floor(x / CELL)));
    const iz = Math.min(this.rows - 1, Math.max(0, Math.floor(z / CELL)));
    return [ix, iz];
  }

  center(ix: number, iz: number): FloorPoint {
    return [(ix + 0.5) * CELL, (iz + 0.5) * CELL];
  }

  inside(ix: number, iz: number): boolean {
    return ix >= 0 && iz >= 0 && ix < this.cols && iz < this.rows;
  }

  isBlocked(ix: number, iz: number): boolean {
    return !this.inside(ix, iz) || this.blocked[iz * this.cols + ix] === 1;
  }

  /** True when a point on the floor is free to stand on. */
  isFree(p: FloorPoint): boolean {
    const [x, z] = p;
    if (x < 0 || z < 0 || x >= this.cols * CELL || z >= this.rows * CELL) return false;
    const [ix, iz] = this.cellOf(p);
    return !this.isBlocked(ix, iz);
  }

  /** The free cell nearest to a point, searched ring by ring. Null only on a fully blocked floor. */
  nearestFree(p: FloorPoint): [number, number] | null {
    const [cx, cz] = this.cellOf(p);
    if (!this.isBlocked(cx, cz)) return [cx, cz];
    const maxRing = Math.max(this.cols, this.rows);
    for (let r = 1; r < maxRing; r++) {
      let best: [number, number] | null = null;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let iz = cz - r; iz <= cz + r; iz++) {
        for (let ix = cx - r; ix <= cx + r; ix++) {
          if (Math.max(Math.abs(ix - cx), Math.abs(iz - cz)) !== r) continue;
          if (this.isBlocked(ix, iz)) continue;
          const [px, pz] = this.center(ix, iz);
          const d = Math.hypot(px - p[0], pz - p[1]);
          if (d < bestDist) {
            best = [ix, iz];
            bestDist = d;
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  /**
   * True when a straight walk from a to b crosses no blocked cell. Samples every quarter cell,
   * which is fine for the short hops path smoothing asks about.
   */
  lineIsClear(a: FloorPoint, b: FloorPoint): boolean {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.max(1, Math.ceil(length / (CELL / 4)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (!this.isFree([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])) return false;
    }
    return true;
  }

  /**
   * The shortest walk between two points (A* over the cells, 8 directions, no cutting past a
   * blocked corner), then smoothed. Starts and ends exactly at the two points, even when one
   * of them sits just inside a blocked cell, like a chair tucked under a desk. Null when there
   * is no way through.
   */
  findPath(from: FloorPoint, to: FloorPoint): FloorPoint[] | null {
    const start = this.nearestFree(from);
    const goal = this.nearestFree(to);
    if (!start || !goal) return null;
    const cells = this.search(start, goal);
    if (!cells) return null;
    const points = cells.map(([ix, iz]) => this.center(ix, iz));
    return this.smooth([from, ...points, to]);
  }

  private search(start: [number, number], goal: [number, number]): [number, number][] | null {
    const n = this.cols * this.rows;
    const g = new Float32Array(n).fill(Number.POSITIVE_INFINITY);
    const came = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const open = new MinHeap();
    const index = (ix: number, iz: number) => iz * this.cols + ix;
    const [gx, gz] = goal;
    // Octile distance: the true length on an 8-direction grid with no walls.
    const h = (ix: number, iz: number) => {
      const dx = Math.abs(ix - gx);
      const dz = Math.abs(iz - gz);
      return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
    };
    const s = index(start[0], start[1]);
    g[s] = 0;
    open.push(s, h(start[0], start[1]));
    while (open.size > 0) {
      const current = open.pop();
      if (closed[current]) continue;
      closed[current] = 1;
      const cx = current % this.cols;
      const cz = Math.floor(current / this.cols);
      if (cx === gx && cz === gz) return this.trace(came, current);
      for (const [dx, dz] of STEPS) {
        const nx = cx + dx;
        const nz = cz + dz;
        if (this.isBlocked(nx, nz)) continue;
        // A diagonal step may not squeeze between two blocked cells.
        if (dx !== 0 && dz !== 0 && (this.isBlocked(cx + dx, cz) || this.isBlocked(cx, cz + dz)))
          continue;
        const next = index(nx, nz);
        if (closed[next]) continue;
        const cost = (g[current] as number) + (dx !== 0 && dz !== 0 ? Math.SQRT2 : 1);
        if (cost < (g[next] as number)) {
          g[next] = cost;
          came[next] = current;
          open.push(next, cost + h(nx, nz));
        }
      }
    }
    return null;
  }

  private trace(came: Int32Array, end: number): [number, number][] {
    const out: [number, number][] = [];
    for (let at = end; at !== -1; at = came[at] as number) {
      out.push([at % this.cols, Math.floor(at / this.cols)]);
    }
    return out.reverse();
  }

  /**
   * Path smoothing: from each point, jump to the farthest later point that can be reached in a
   * straight line. The zig-zag of grid steps becomes a few straight legs.
   */
  smooth(points: FloorPoint[]): FloorPoint[] {
    if (points.length <= 2) return points;
    const out: FloorPoint[] = [points[0] as FloorPoint];
    let i = 0;
    while (i < points.length - 1) {
      let j = points.length - 1;
      // The first and last legs may start or end inside a blocked cell (a chair at a desk),
      // so the neighbor is always allowed.
      while (j > i + 1 && !this.lineIsClear(points[i] as FloorPoint, points[j] as FloorPoint)) j--;
      out.push(points[j] as FloorPoint);
      i = j;
    }
    return out;
  }
}

const STEPS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/** A small binary heap of cell indexes by score, for A*. */
class MinHeap {
  private items: number[] = [];
  private scores: number[] = [];

  get size() {
    return this.items.length;
  }

  push(item: number, score: number) {
    this.items.push(item);
    this.scores.push(score);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if ((this.scores[parent] as number) <= score) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): number {
    const top = this.items[0] as number;
    const lastItem = this.items.pop() as number;
    const lastScore = this.scores.pop() as number;
    if (this.items.length > 0) {
      this.items[0] = lastItem;
      this.scores[0] = lastScore;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.items.length && (this.scores[l] as number) < (this.scores[m] as number)) m = l;
        if (r < this.items.length && (this.scores[r] as number) < (this.scores[m] as number)) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }

  private swap(a: number, b: number) {
    [this.items[a], this.items[b]] = [this.items[b] as number, this.items[a] as number];
    [this.scores[a], this.scores[b]] = [this.scores[b] as number, this.scores[a] as number];
  }
}

/** The walk grid for an office: desks, walls, landmarks and the enabled props. */
export function navGridFor(layout: LayoutFile, accessories: Accessory[]): NavGrid {
  const walls = wallBoxes(layout);
  const landmarks = landmarkBoxes(layout.landmarks);
  const props = propBoxes(accessories);
  // One box per desk top. Chairs are left out: a helper walks up to their own chair, and
  // chairs roll aside.
  const desks = layout.deskSlots.map((slot) =>
    box(
      [slot.pos[0], DESK.height / 2, slot.pos[1]],
      [DESK.width, DESK.height, DESK.depth],
      "",
      seatSpot(slot).rotation + Math.PI,
    ),
  );
  const obstacles = [
    ...desks,
    ...walls.solid,
    ...walls.glass,
    ...Object.values(landmarks).flat(),
    ...Object.values(props).flat(),
  ];
  return new NavGrid(layout.floor.width, layout.floor.depth, obstacles);
}
