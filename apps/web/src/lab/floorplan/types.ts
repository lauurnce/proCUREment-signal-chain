// Floor plan options for P2.4. 1 unit = 1 m. The floor starts at (0, 0) and grows along +x and +z.
// The back walls are x = 0 and z = 0. The camera looks from the +x +z corner.
// Shaped like the future vault/office/layout.json (Phase 3), so the chosen option carries over.

export type Point = [x: number, z: number];
/** A rectangle: left x, back z, width along x, depth along z. */
export type Rect = [x: number, z: number, width: number, depth: number];

export type ZonePlacement = {
  /** A zone id from vault.sample/office/zones.json. */
  id: string;
  rect: Rect;
  /** Where helpers stand when they visit the zone (the landmark). Defaults to the rect center. */
  anchor?: Point;
  /** Short landmark name drawn on the plan, for example "Tray counter". */
  landmark?: string;
};

export type DeskSlot = {
  seat: string;
  pod: string;
  /** Desk center. */
  pos: Point;
  /** Direction the sitter faces, in degrees: 0 = +z (toward the camera), 180 = -z. */
  facing: 0 | 90 | 180 | 270;
};

/** Walkway graph: helpers walk from node to node along the edges. */
export type Walkways = {
  nodes: Record<string, Point>;
  edges: [from: string, to: string][];
};

export type FloorPlan = {
  id: "1" | "2";
  name: string;
  idea: string;
  size: { width: number; depth: number };
  zones: ZonePlacement[];
  desks: DeskSlot[];
  walkways: Walkways;
  doors: { id: string; at: Point; label: string }[];
};
