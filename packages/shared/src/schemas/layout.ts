import { z } from "zod";
import { Id } from "./common";

// The office floor plan, from vault/office/layout.json. 1 unit = 1 m.
// The floor starts at (0, 0) and grows along +x and +z. Back walls run along x = 0 and z = 0.

/** A point on the floor: [x, z]. */
export const Point = z.tuple([z.number(), z.number()]);
export type Point = z.infer<typeof Point>;

/** A rectangle on the floor: left x, back z, width along x, depth along z. */
export const Rect = z.tuple([z.number(), z.number(), z.number().positive(), z.number().positive()]);
export type Rect = z.infer<typeof Rect>;

/** full: a 2.8 m wall. low: a 1.0 m wall you can see over. glass: a see-through wall. */
export const WallKind = z.enum(["full", "low", "glass"]);
export type WallKind = z.infer<typeof WallKind>;

export const WALL_HEIGHT: Record<WallKind, number> = { full: 2.8, low: 1.0, glass: 2.4 };

export const LayoutZone = z.object({
  /** A zone id from office/zones.json. */
  id: Id,
  rect: Rect,
  /** Where helpers stand when they visit the zone. Defaults to the rect center. */
  anchor: Point.optional(),
  /** Where the zone name sits on the floor. Defaults to the rect center. */
  labelAt: Point.optional(),
});
export type LayoutZone = z.infer<typeof LayoutZone>;

export const Wall = z.object({
  id: Id,
  from: Point,
  to: Point,
  kind: WallKind,
  /** Overrides the height of the kind, in meters. */
  height: z.number().positive().optional(),
});
export type Wall = z.infer<typeof Wall>;

export const Door = z.object({
  id: Id,
  /** The wall the door cuts through. Leave it out for a door on an open edge. */
  wall: Id.optional(),
  /** Door center. */
  at: Point,
  width: z.number().positive().default(1),
  label: z.string().optional(),
});
export type Door = z.infer<typeof Door>;

export const WallWindow = z.object({
  id: Id,
  wall: Id,
  /** Window center on the wall. */
  at: Point,
  width: z.number().positive(),
  /** Sill height above the floor. */
  bottom: z.number().nonnegative(),
  height: z.number().positive(),
});
export type WallWindow = z.infer<typeof WallWindow>;

/** The way the sitter faces, in degrees: 0 = +z (toward the camera), 90 = +x, 180 = -z. */
export const Facing = z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]);
export type Facing = z.infer<typeof Facing>;

export const DeskSlot = z.object({
  id: Id,
  seat: Id,
  /** The pod from office/zones.json. Leave it out for single desks. */
  pod: Id.optional(),
  /** Desk center. */
  pos: Point,
  facing: Facing,
});
export type DeskSlot = z.infer<typeof DeskSlot>;

export const Landmark = z.object({
  id: Id,
  zone: Id,
  kind: Id,
  pos: Point,
  /** Turn around the vertical axis, in degrees. */
  rot: z.number().default(0),
  label: z.string().optional(),
});
export type Landmark = z.infer<typeof Landmark>;

/** Helpers walk from node to node along the edges (Phase 4). */
export const Walkways = z.object({
  nodes: z.record(Id, Point),
  edges: z.array(z.tuple([Id, Id])),
});
export type Walkways = z.infer<typeof Walkways>;

/** Desk size in meters, used for the footprint checks. */
export const DESK_SIZE = { width: 1.4, depth: 0.7 } as const;

const EPSILON = 1e-6;

export function insideRect([px, pz]: Point, [x, z, w, d]: Rect): boolean {
  return px >= x - EPSILON && px <= x + w + EPSILON && pz >= z - EPSILON && pz <= z + d + EPSILON;
}

/** True when the point lies on the segment from a to b, within 1 cm. */
export function onSegment(p: Point, a: Point, b: Point): boolean {
  const [ax, az] = a;
  const [bx, bz] = b;
  const [px, pz] = p;
  const lengthSq = (bx - ax) ** 2 + (bz - az) ** 2;
  if (lengthSq === 0) return false;
  const t = ((px - ax) * (bx - ax) + (pz - az) * (bz - az)) / lengthSq;
  if (t < 0 || t > 1) return false;
  const distance = Math.hypot(px - (ax + t * (bx - ax)), pz - (az + t * (bz - az)));
  return distance <= 0.01;
}

/** The four corners of a desk, turned by its facing. */
export function deskCorners(slot: Pick<DeskSlot, "pos" | "facing">): Point[] {
  const turned = slot.facing === 90 || slot.facing === 270;
  const halfX = (turned ? DESK_SIZE.depth : DESK_SIZE.width) / 2;
  const halfZ = (turned ? DESK_SIZE.width : DESK_SIZE.depth) / 2;
  const [x, z] = slot.pos;
  return [
    [x - halfX, z - halfZ],
    [x + halfX, z - halfZ],
    [x - halfX, z + halfZ],
    [x + halfX, z + halfZ],
  ];
}

export const LayoutFile = z
  .object({
    version: z.literal(1),
    note: z.string().optional(),
    floor: z.object({ width: z.number().positive(), depth: z.number().positive() }),
    zones: z.array(LayoutZone),
    walls: z.array(Wall),
    doors: z.array(Door),
    windows: z.array(WallWindow),
    deskSlots: z.array(DeskSlot),
    landmarks: z.array(Landmark),
    walkways: Walkways,
  })
  .superRefine((file, ctx) => {
    const floor: Rect = [0, 0, file.floor.width, file.floor.depth];
    const problem = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });

    const unique = (list: { id: string }[], key: string) => {
      const seen = new Set<string>();
      list.forEach((item, i) => {
        if (seen.has(item.id)) problem([key, i, "id"], `"${item.id}" is used twice`);
        seen.add(item.id);
      });
    };
    unique(file.zones, "zones");
    unique(file.walls, "walls");
    unique(file.doors, "doors");
    unique(file.windows, "windows");
    unique(file.deskSlots, "deskSlots");
    unique(file.landmarks, "landmarks");

    file.zones.forEach((zone, i) => {
      const [x, z, w, d] = zone.rect;
      if (!insideRect([x, z], floor) || !insideRect([x + w, z + d], floor))
        problem(["zones", i, "rect"], `Zone ${zone.id} is outside the floor`);
      if (zone.anchor && !insideRect(zone.anchor, zone.rect))
        problem(["zones", i, "anchor"], `The anchor of zone ${zone.id} is outside its rect`);
      if (zone.labelAt && !insideRect(zone.labelAt, zone.rect))
        problem(["zones", i, "labelAt"], `The label of zone ${zone.id} is outside its rect`);
    });

    const walls = new Map(file.walls.map((wall) => [wall.id, wall]));
    file.walls.forEach((wall, i) => {
      if (!insideRect(wall.from, floor) || !insideRect(wall.to, floor))
        problem(["walls", i], `Wall ${wall.id} is outside the floor`);
    });
    file.doors.forEach((door, i) => {
      if (!insideRect(door.at, floor)) problem(["doors", i, "at"], `Door ${door.id} is outside`);
      if (!door.wall) return;
      const wall = walls.get(door.wall);
      if (!wall) problem(["doors", i, "wall"], `Door ${door.id} points to an unknown wall`);
      else if (!onSegment(door.at, wall.from, wall.to))
        problem(["doors", i, "at"], `Door ${door.id} is not on wall ${wall.id}`);
    });
    file.windows.forEach((window, i) => {
      const wall = walls.get(window.wall);
      if (!wall) {
        problem(["windows", i, "wall"], `Window ${window.id} points to an unknown wall`);
        return;
      }
      if (!onSegment(window.at, wall.from, wall.to))
        problem(["windows", i, "at"], `Window ${window.id} is not on wall ${wall.id}`);
      const wallHeight = wall.height ?? WALL_HEIGHT[wall.kind];
      if (window.bottom + window.height > wallHeight)
        problem(["windows", i, "height"], `Window ${window.id} is taller than its wall`);
    });

    file.deskSlots.forEach((slot, i) => {
      if (!deskCorners(slot).every((corner) => insideRect(corner, floor)))
        problem(["deskSlots", i, "pos"], `Desk ${slot.id} is outside the floor`);
    });
    file.landmarks.forEach((landmark, i) => {
      if (!insideRect(landmark.pos, floor))
        problem(["landmarks", i, "pos"], `Landmark ${landmark.id} is outside the floor`);
    });

    const nodes = file.walkways.nodes;
    for (const [id, point] of Object.entries(nodes)) {
      if (!insideRect(point, floor))
        problem(["walkways", "nodes", id], `Walkway node ${id} is outside the floor`);
    }
    file.walkways.edges.forEach(([from, to], i) => {
      for (const end of [from, to]) {
        if (!(end in nodes))
          problem(["walkways", "edges", i], `Walkway edge points to unknown node ${end}`);
      }
    });
  });
export type LayoutFile = z.infer<typeof LayoutFile>;
