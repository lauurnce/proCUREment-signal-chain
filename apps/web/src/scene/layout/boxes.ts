import type { DeskSlot, LayoutFile, Point, Wall } from "@hq/shared";
import { WALL_HEIGHT } from "@hq/shared";
import { color, world } from "../../theme/tokens";
import { CHAIR_PARTS, DESK, DESK_PARTS, type Part, SEAT_FROM_DESK } from "../furniture/parts";

// Pure functions that turn layout.json into lists of boxes. Each list is drawn as one
// instanced mesh (scene/batch/InstancedBoxes.tsx), so the whole office costs a few draw calls.

/** One box: center, size, turn around the vertical axis (radians), and color. */
export type Box = {
  pos: [number, number, number];
  size: [number, number, number];
  rotY: number;
  color: string;
};

export const box = (
  pos: [number, number, number],
  size: [number, number, number],
  color: string,
  rotY = 0,
): Box => ({ pos, size, rotY, color });

/** Moves a point from a parent's local space (at px, pz, turned by rot) into the floor space. */
export function place(
  px: number,
  pz: number,
  rot: number,
  [lx, ly, lz]: [number, number, number],
): [number, number, number] {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return [px + lx * c + lz * s, ly, pz - lx * s + lz * c];
}

// ---------------------------------------------------------------- Floor

export const SLAB_THICKNESS = 0.35;
const RIM = { height: 0.06, proud: 0.04 };

/** The oak slab body. */
export function slabBoxes({ width: w, depth: d }: LayoutFile["floor"]): Box[] {
  const t = SLAB_THICKNESS;
  return [box([w / 2, -t / 2 - 0.02, d / 2], [w, t, d], world.slabSide)];
}

/**
 * The navy rim on the two open sides (D-029). Its own batch, so it can gain a faint mid-blue
 * glow at night and stay visible on the navy backdrop (council review, 27 Sep 2026).
 */
export function rimBoxes({ width: w, depth: d }: LayoutFile["floor"]): Box[] {
  const rimY = -RIM.height / 2 - 0.02;
  return [
    box(
      [w / 2 + RIM.proud / 2, rimY, d + RIM.proud / 2],
      [w + RIM.proud, RIM.height, RIM.proud],
      world.slabEdge,
    ),
    box([w + RIM.proud / 2, rimY, d / 2], [RIM.proud, RIM.height, d], world.slabEdge),
  ];
}

/** Rug color per zone (WORLD_PALETTE.md). Zones not listed stay plain oak. */
export const ZONE_TINT: Record<string, string> = {
  "cm-wing": world.zoneCm,
  "ops-wing": world.zoneOps,
  "leads-row": world.zoneLeads,
  "mgr-office": world.zoneLeads,
  "huddle-room": world.zoneShared,
  "negotiation-room": world.zoneShared,
  "contract-corner": world.zoneShared,
  "merienda-corner": world.zoneMerienda,
};

const RUG_INSET = 0.15;
const RUG_HEIGHT = 0.006;

/** The blue deck under the Endorsement Bridge: 1.4 m wide, along the CM to Ops line. */
export const BRIDGE_DECK = { width: 1.4, length: 3.4, height: 0.04, edge: 0.1 } as const;

/**
 * Thin, opaque rugs that tint each zone, plus the blue deck under the Endorsement Bridge:
 * an accent plinth with mid-blue edges (the edges glow a little at night).
 */
export function tintBoxes(layout: LayoutFile): Box[] {
  const boxes: Box[] = [];
  for (const zone of layout.zones) {
    const tint = ZONE_TINT[zone.id];
    const [x, z, w, d] = zone.rect;
    if (tint) {
      boxes.push(
        box(
          [x + w / 2, RUG_HEIGHT / 2, z + d / 2],
          [w - RUG_INSET * 2, RUG_HEIGHT, d - RUG_INSET * 2],
          tint,
        ),
      );
    }
    if (zone.id === "endorsement-bridge") {
      const [ax, az] = zone.anchor ?? [x + w / 2, z + d / 2];
      const { width, length, height, edge } = BRIDGE_DECK;
      const turn = Math.PI / 4;
      boxes.push(box([ax, height / 2, az], [length, height, width - edge * 2], color.accent, turn));
      // The two long edges, along the line: local z = +-(width - edge) / 2, turned 45 degrees.
      for (const side of [-1, 1]) {
        const offset = (side * (width - edge)) / 2;
        const [ex, , ez] = place(ax, az, turn, [0, 0, offset]);
        boxes.push(
          box([ex, height / 2 + 0.002, ez], [length, height + 0.004, edge], world.bridgeSeam, turn),
        );
      }
    }
  }
  return boxes;
}

// ---------------------------------------------------------------- Walls

export const WALL_THICK = 0.12;
const GLASS_THICK = 0.03;
const POST = 0.05;
const DOOR_HEIGHT = 2.1;
const CAP = 0.04;
const SKIRT = 0.1;
/** Glass walls get a navy post at least this often, so they read as glass. */
const MULLION_STEP = 1.6;

export type WallBoxes = {
  /** Wall bodies, caps, trim and frames. Opaque, receive shadows, cast none. */
  solid: Box[];
  /** See-through glass panes. */
  glass: Box[];
  /** Window panes on the back walls: pale sky by day, warm glow at night. */
  panes: Box[];
};

type Span = {
  from: number;
  to: number;
  kind: "solid" | "door" | "window";
  bottom?: number;
  top?: number;
};

/** Splits a wall along its length into solid pieces, door gaps and window openings. */
export function wallSpans(wall: Wall, layout: LayoutFile): Span[] {
  const [ax, az] = wall.from;
  const [bx, bz] = wall.to;
  const length = Math.hypot(bx - ax, bz - az);
  const along = ([px, pz]: Point) => ((px - ax) * (bx - ax) + (pz - az) * (bz - az)) / length;

  const openings: Span[] = [
    ...layout.doors
      .filter((door) => door.wall === wall.id)
      .map((door): Span => {
        const t = along(door.at);
        return { from: t - door.width / 2, to: t + door.width / 2, kind: "door" };
      }),
    ...layout.windows
      .filter((window) => window.wall === wall.id)
      .map((window): Span => {
        const t = along(window.at);
        return {
          from: t - window.width / 2,
          to: t + window.width / 2,
          kind: "window",
          bottom: window.bottom,
          top: window.bottom + window.height,
        };
      }),
  ].sort((a, b) => a.from - b.from);

  const spans: Span[] = [];
  let cursor = 0;
  for (const opening of openings) {
    const from = Math.max(opening.from, cursor);
    const to = Math.min(opening.to, length);
    if (from > cursor) spans.push({ from: cursor, to: from, kind: "solid" });
    if (to > from) spans.push({ ...opening, from, to });
    cursor = Math.max(cursor, to);
  }
  if (cursor < length) spans.push({ from: cursor, to: length, kind: "solid" });
  return spans;
}

/** True for a wall on the floor edge. It moves outward, so its inner face is the floor edge. */
function outerWall(
  wall: Wall,
  { width, depth }: LayoutFile["floor"],
): { nx: number; nz: number } | null {
  const [ax, az] = wall.from;
  const [bx, bz] = wall.to;
  if (az === 0 && bz === 0) return { nx: 0, nz: -1 };
  if (ax === 0 && bx === 0) return { nx: -1, nz: 0 };
  if (az === depth && bz === depth) return { nx: 0, nz: 1 };
  if (ax === width && bx === width) return { nx: 1, nz: 0 };
  return null;
}

export function wallBoxes(layout: LayoutFile): WallBoxes {
  const out: WallBoxes = { solid: [], glass: [], panes: [] };

  for (const wall of layout.walls) {
    const [ax, az] = wall.from;
    const [bx, bz] = wall.to;
    const length = Math.hypot(bx - ax, bz - az);
    if (length === 0) continue;
    const ux = (bx - ax) / length;
    const uz = (bz - az) / length;
    // A box's own x axis runs along the wall.
    const rotY = -Math.atan2(uz, ux);
    const height = wall.height ?? WALL_HEIGHT[wall.kind];
    const edge = outerWall(wall, layout.floor);
    const thick = wall.kind === "glass" ? GLASS_THICK : WALL_THICK;
    const shift = edge ? thick / 2 : 0;
    // Center line of the wall, and the side that faces into the room (for skirting).
    const cx0 = ax + (edge ? edge.nx * shift : 0);
    const cz0 = az + (edge ? edge.nz * shift : 0);
    const at = (t: number, y: number, offset = 0): [number, number, number] => [
      cx0 + ux * t - (edge ? edge.nx : 0) * offset,
      y,
      cz0 + uz * t - (edge ? edge.nz : 0) * offset,
    ];
    const piece = (
      from: number,
      to: number,
      y0: number,
      y1: number,
      color: string,
      depth = thick,
    ) => box(at((from + to) / 2, (y0 + y1) / 2), [to - from, y1 - y0, depth], color, rotY);

    for (const span of wallSpans(wall, layout)) {
      const { from, to } = span;
      const len = to - from;
      if (wall.kind === "glass") {
        if (span.kind === "door") {
          out.solid.push(piece(from - POST / 2, from + POST / 2, 0, height, world.wallTrim, POST));
          out.solid.push(piece(to - POST / 2, to + POST / 2, 0, height, world.wallTrim, POST));
          continue;
        }
        out.glass.push(piece(from, to, 0.08, height - POST, world.glass));
        out.solid.push(piece(from, to, 0, 0.08, world.wallTrim, POST));
        out.solid.push(piece(from, to, height - POST, height, world.wallTrim, POST));
        const posts = Math.max(1, Math.ceil(len / MULLION_STEP));
        for (let i = 0; i <= posts; i++) {
          const t = from + (len * i) / posts;
          out.solid.push(piece(t - POST / 2, t + POST / 2, 0, height, world.wallTrim, POST));
        }
        continue;
      }

      if (span.kind === "solid") {
        out.solid.push(piece(from, to, 0, height, world.wall));
        out.solid.push(piece(from, to, height, height + CAP, world.wallCap, thick + 0.01));
        if (edge)
          out.solid.push(
            box(
              at((from + to) / 2, SKIRT / 2, thick / 2 + 0.005),
              [len, SKIRT, 0.01],
              world.wallTrim,
              rotY,
            ),
          );
      } else if (span.kind === "door") {
        if (height > DOOR_HEIGHT) {
          out.solid.push(piece(from, to, DOOR_HEIGHT, height, world.wall));
          out.solid.push(piece(from, to, height, height + CAP, world.wallCap, thick + 0.01));
        }
      } else {
        const bottom = span.bottom ?? 0;
        const top = span.top ?? height;
        const mid = (from + to) / 2;
        out.solid.push(piece(from, to, 0, bottom, world.wall));
        out.solid.push(piece(from, to, top, height, world.wall));
        out.solid.push(piece(from, to, height, height + CAP, world.wallCap, thick + 0.01));
        if (edge)
          out.solid.push(
            box(at(mid, SKIRT / 2, thick / 2 + 0.005), [len, SKIRT, 0.01], world.wallTrim, rotY),
          );
        out.panes.push(piece(from, to, bottom, top, world.windowDay, 0.02));
        // Frame: a deeper sill, a head, two jambs and a center mullion, on the room side.
        const frame = (t0: number, t1: number, y0: number, y1: number, depth: number) =>
          box(
            at((t0 + t1) / 2, (y0 + y1) / 2, depth / 2 - 0.01),
            [t1 - t0, y1 - y0, depth],
            world.wallTrim,
            rotY,
          );
        out.solid.push(frame(from - 0.04, to + 0.04, bottom - 0.03, bottom + 0.03, 0.1));
        out.solid.push(frame(from - 0.04, to + 0.04, top - 0.02, top + 0.02, 0.06));
        out.solid.push(frame(from - 0.02, from + 0.02, bottom, top, 0.06));
        out.solid.push(frame(to - 0.02, to + 0.02, bottom, top, 0.06));
        out.solid.push(frame(mid - 0.025, mid + 0.025, bottom, top, 0.06));
      }
    }
  }
  return out;
}

/** How far the night window light reaches into the room, in meters. */
const SPILL_DEPTH = 1.4;

/**
 * Flat patches of warm light on the floor in front of each back-wall window. They show only
 * at night (the material fades them in), so the wings are not black (council review).
 */
export function windowSpillBoxes(layout: LayoutFile): Box[] {
  const walls = new Map(layout.walls.map((wall) => [wall.id, wall]));
  const out: Box[] = [];
  for (const window of layout.windows) {
    const wall = walls.get(window.wall);
    if (!wall) continue;
    const edge = outerWall(wall, layout.floor);
    if (!edge) continue;
    const [wx, wz] = window.at;
    // Into the room is the opposite of the wall's outward direction.
    const cx = wx - edge.nx * (SPILL_DEPTH / 2 + 0.05);
    const cz = wz - edge.nz * (SPILL_DEPTH / 2 + 0.05);
    const along = edge.nx === 0;
    out.push(
      box(
        [cx, 0.012, cz],
        along ? [window.width + 0.4, 0.002, SPILL_DEPTH] : [SPILL_DEPTH, 0.002, window.width + 0.4],
        world.windowGlow,
      ),
    );
  }
  return out;
}

// ---------------------------------------------------------------- Desks

/** Where a helper sits for a desk slot: the seat center on the floor, and the turn (radians). */
export function seatSpot(slot: Pick<DeskSlot, "pos" | "facing">): {
  position: [number, number, number];
  rotation: number;
} {
  const rotation = (slot.facing * Math.PI) / 180;
  const [x, z] = slot.pos;
  // The sitter faces (sin, cos) and sits behind the desk, away from where they face.
  return {
    position: [x - Math.sin(rotation) * SEAT_FROM_DESK, 0, z - Math.cos(rotation) * SEAT_FROM_DESK],
    rotation,
  };
}

export type DeskBoxes = {
  /** Desk edges and chair seats: the only furniture that casts shadows (isometric-office skill). */
  cast: Box[];
  /** Everything else: tops, legs, keyboards, monitors, chair bases and backs, dividers. */
  plain: Box[];
  /** Monitor screens, which glow a little. */
  screens: Box[];
};

const DIVIDER = { height: 0.3, thick: 0.03 };

export function deskBoxes(layout: LayoutFile): DeskBoxes {
  const out: DeskBoxes = { cast: [], plain: [], screens: [] };
  const add = (list: Box[], parts: readonly Part[], px: number, pz: number, rot: number) => {
    for (const { pos, size, color } of parts)
      list.push(box(place(px, pz, rot, pos), size, color, rot));
  };

  for (const slot of layout.deskSlots) {
    const [x, z] = slot.pos;
    const seat = seatSpot(slot);
    // The desk's seat side faces the sitter, so the desk turns half a circle from the sitter.
    const deskRot = seat.rotation + Math.PI;
    add(out.cast, DESK_PARTS.cast, x, z, deskRot);
    add(out.plain, DESK_PARTS.plain, x, z, deskRot);
    add(out.screens, DESK_PARTS.screen, x, z, deskRot);
    const [sx, , sz] = seat.position;
    add(out.cast, CHAIR_PARTS.cast, sx, sz, seat.rotation);
    add(out.plain, CHAIR_PARTS.plain, sx, sz, seat.rotation);
  }

  // A low divider (1.04 m tall, under the 1.1 m max) down the middle of each pod with facing rows.
  const pods = new Map<string, DeskSlot[]>();
  for (const slot of layout.deskSlots) {
    if (slot.pod) pods.set(slot.pod, [...(pods.get(slot.pod) ?? []), slot]);
  }
  for (const slots of pods.values()) {
    const rows = new Set(slots.map((slot) => slot.facing));
    if (!(rows.has(0) && rows.has(180))) continue;
    const xs = slots.map((slot) => slot.pos[0]);
    const zs = slots.map((slot) => slot.pos[1]);
    const minX = Math.min(...xs) - DESK.width / 2;
    const maxX = Math.max(...xs) + DESK.width / 2;
    const midZ = (Math.min(...zs) + Math.max(...zs)) / 2;
    out.plain.push(
      box(
        [(minX + maxX) / 2, DESK.height + DIVIDER.height / 2, midZ],
        [maxX - minX, DIVIDER.height, DIVIDER.thick],
        world.deskDivider,
      ),
    );
  }
  return out;
}

/** Where a zone's name sits on the floor. */
export function labelPoint(zone: LayoutFile["zones"][number]): Point {
  if (zone.labelAt) return zone.labelAt;
  const [x, z, w, d] = zone.rect;
  return [x + w / 2, z + d / 2];
}
