// Placeholder floor until the real floor plan arrives in Phase 3. 1 unit = 1 meter.
export const FLOOR = { width: 24, depth: 16 } as const;

export const FLOOR_CENTER: [number, number, number] = [FLOOR.width / 2, 0, FLOOR.depth / 2];

/** True isometric: the camera sits along (1, 1, 1) from its target. */
export const ISO_POLAR = Math.acos(1 / Math.sqrt(3));
export const ISO_AZIMUTH = Math.PI / 4;
export const CAMERA_DISTANCE = 40;

export const ZOOM = { min: 20, max: 90 } as const;
