import type { LayoutFile } from "@hq/shared";

// The placeholder floor, shown only when office/layout.json cannot be read. 1 unit = 1 meter.
export const FLOOR = { width: 24, depth: 16 } as const;

export const FLOOR_CENTER: [number, number, number] = [FLOOR.width / 2, 0, FLOOR.depth / 2];

/** An empty floor plan the size of the placeholder floor, so the camera can frame it. */
export const PLACEHOLDER_LAYOUT: LayoutFile = {
  version: 1,
  floor: FLOOR,
  zones: [],
  walls: [],
  doors: [],
  windows: [],
  deskSlots: [],
  landmarks: [],
  walkways: { nodes: {}, edges: [] },
};

/** True isometric: the camera sits along (1, 1, 1) from its target. */
export const ISO_POLAR = Math.acos(1 / Math.sqrt(3));
export const ISO_AZIMUTH = Math.PI / 4;
export const CAMERA_DISTANCE = 40;
