import type { FloorPlan, Point, Rect } from "./types";

export const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export const rectCenter = ([x, z, w, d]: Rect): Point => [x + w / 2, z + d / 2];

export function contains([x, z, w, d]: Rect, [px, pz]: Point): boolean {
  return px >= x && px <= x + w && pz >= z && pz <= z + d;
}

/** True when two rectangles share area (touching edges is fine). */
export function overlaps(a: Rect, b: Rect): boolean {
  return a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
}

/** Where a helper stands for a zone. "own-desk" means the center of that track's wing. */
export function zoneAnchor(plan: FloorPlan, zoneId: string, track: "CM" | "OPS"): Point {
  const id = zoneId === "own-desk" ? (track === "CM" ? "cm-wing" : "ops-wing") : zoneId;
  const zone = plan.zones.find((z) => z.id === id);
  if (!zone) throw new Error(`Plan ${plan.id} has no zone "${id}"`);
  return zone.anchor ?? rectCenter(zone.rect);
}

function nearestNode(plan: FloorPlan, p: Point): string {
  let best = "";
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const [id, node] of Object.entries(plan.walkways.nodes)) {
    const d = distance(p, node);
    if (d < bestDistance) {
      best = id;
      bestDistance = d;
    }
  }
  if (!best) throw new Error(`Plan ${plan.id} has no walkway nodes`);
  return best;
}

/** Shortest path between two walkway nodes (Dijkstra). Returns node ids, start and end included. */
export function shortestPath(plan: FloorPlan, from: string, to: string): string[] {
  const { nodes, edges } = plan.walkways;
  const next = new Map<string, string[]>();
  for (const [a, b] of edges) {
    next.set(a, [...(next.get(a) ?? []), b]);
    next.set(b, [...(next.get(b) ?? []), a]);
  }
  const cost = new Map<string, number>([[from, 0]]);
  const previous = new Map<string, string>();
  const open = new Set([from]);
  while (open.size > 0) {
    let current = "";
    for (const id of open) {
      if (!current || (cost.get(id) ?? Infinity) < (cost.get(current) ?? Infinity)) current = id;
    }
    open.delete(current);
    if (current === to) break;
    for (const n of next.get(current) ?? []) {
      const a = nodes[current];
      const b = nodes[n];
      if (!a || !b) continue;
      const c = (cost.get(current) ?? Infinity) + distance(a, b);
      if (c < (cost.get(n) ?? Infinity)) {
        cost.set(n, c);
        previous.set(n, current);
        open.add(n);
      }
    }
  }
  if (!cost.has(to)) throw new Error(`Plan ${plan.id}: no walkway from ${from} to ${to}`);
  const path = [to];
  while (path[0] !== from) path.unshift(previous.get(path[0] as string) as string);
  return path;
}

/** The points a helper walks from one spot to another: off to the walkway, along it, and back off. */
export function walk(plan: FloorPlan, a: Point, b: Point): Point[] {
  const path = shortestPath(plan, nearestNode(plan, a), nearestNode(plan, b));
  return [a, ...path.map((id) => plan.walkways.nodes[id] as Point), b];
}

export const pathLength = (points: Point[]) =>
  points.slice(1).reduce((sum, p, i) => sum + distance(points[i] as Point, p), 0);

export type RouteResult = { points: Point[]; meters: number };

/** The full route for a workflow: zone to zone in step order. Repeated zones in a row are one stop. */
export function routeFor(plan: FloorPlan, zones: string[], track: "CM" | "OPS"): RouteResult {
  const stops = zones.filter((z, i) => z !== zones[i - 1]).map((z) => zoneAnchor(plan, z, track));
  const points: Point[] = stops.slice(0, 1);
  for (let i = 1; i < stops.length; i++) {
    points.push(...walk(plan, stops[i - 1] as Point, stops[i] as Point).slice(1));
  }
  return { points, meters: Math.round(pathLength(points) * 10) / 10 };
}
