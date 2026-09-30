import type { LayoutFile, Rect } from "@hq/shared";
import type { ScreenRect } from "../../state/overlays";
import type { ViewId } from "../../state/store";
import { landmarkBoxes } from "../layout/recipes";

// Camera framing for the isometric office. Pure math, so it is easy to test.
// The camera looks along (-1, -1, -1). On screen, "right" is (1, 0, -1) / √2 and
// "up" is (-1, 2, -1) / √6. An orthographic zoom is pixels per meter.

export type PresetId = ViewId;

export type Preset = {
  id: PresetId;
  /** Shortcut key, from the isometric-office skill. */
  key: "1" | "2" | "3" | "4" | "5";
  name: string;
  /** Button and announcement text, from the copy deck (office.preset.*). */
  label: string;
  /** Zones to fit. Empty means the whole floor. */
  zones: string[];
  /** How tall the things inside are, so walls and people stay in the picture. */
  height: number;
};

export const PRESETS: Preset[] = [
  // Lower than the wings: at the Overview only the walls reach up, and a tall box left empty
  // bands above and below the office (council, 30 Sep 2026).
  { id: "overview", key: "1", name: "Overview", label: "Whole office", zones: [], height: 2.2 },
  { id: "cm", key: "2", name: "CM Wing", label: "CM Wing", zones: ["cm-wing"], height: 2.4 },
  { id: "ops", key: "3", name: "Ops Wing", label: "Ops Wing", zones: ["ops-wing"], height: 2.8 },
  // Her office together with the bridge, so her view to the bridge reads.
  {
    id: "mgr",
    key: "4",
    name: "Sr. Manager's Office",
    label: "Sr. Manager's Office",
    zones: ["mgr-office", "endorsement-bridge"],
    height: 2.8,
  },
  // The hero gets its own view (council decision, 27 Sep 2026). Key 5, after the skill's 1 to 4.
  {
    id: "bridge",
    key: "5",
    name: "Endorsement Bridge",
    label: "Endorsement Bridge",
    zones: ["endorsement-bridge"],
    height: 2.4,
  },
];

export function presetById(id: string | null): Preset {
  return PRESETS.find((preset) => preset.id === id) ?? (PRESETS[0] as Preset);
}

const INV_SQRT2 = Math.SQRT1_2;
const INV_SQRT6 = 1 / Math.sqrt(6);

/** Screen position in meters of a point in the floor space. */
export function toScreen(x: number, y: number, z: number): [right: number, up: number] {
  return [(x - z) * INV_SQRT2, (-x + 2 * y - z) * INV_SQRT6];
}

/** The floor point (y = 0) that shows at a given screen position in meters. */
export function fromScreen(right: number, up: number): [number, number, number] {
  // Solve toScreen(x, 0, z) = (right, up): x - z = right √2, x + z = -up √6.
  const diff = right * Math.SQRT2;
  const sum = -up * Math.sqrt(6);
  return [(sum + diff) / 2, 0, (sum - diff) / 2];
}

export type Viewport = { width: number; height: number };
export type Framing = { target: [number, number, number]; zoom: number };

/** Fraction of the free space kept empty on each side. */
const MARGIN = 0.07;
/** Space kept between the picture and a page overlay, in pixels. */
const OVERLAY_GAP = 8;

export type FitOptions = {
  /** Width in pixels covered by a docked panel on the right. */
  rightInset?: number;
  /** Page elements over the canvas (view card, title, note). The picture avoids them. */
  obstacles?: ScreenRect[];
  /** The closest zoom allowed. */
  maxZoom?: number;
};

type P = [number, number];

/** Convex hull of 2D points (monotone chain), counter-clockwise. */
function hull(points: P[]): P[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: P, a: P, b: P) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const build = (list: P[]) => {
    const out: P[] = [];
    for (const point of list) {
      while (
        out.length >= 2 &&
        cross(out[out.length - 2] as P, out[out.length - 1] as P, point) <= 0
      )
        out.pop();
      out.push(point);
    }
    out.pop();
    return out;
  };
  return [...build(sorted), ...build([...sorted].reverse())];
}

/** True when a convex polygon and a box overlap (separating axis test). */
export function polygonHitsRect(polygon: P[], rect: ScreenRect): boolean {
  const corners: P[] = [
    [rect.left, rect.top],
    [rect.right, rect.top],
    [rect.right, rect.bottom],
    [rect.left, rect.bottom],
  ];
  const axes: P[] = [
    [1, 0],
    [0, 1],
  ];
  polygon.forEach((a, i) => {
    const b = polygon[(i + 1) % polygon.length] as P;
    axes.push([b[1] - a[1], a[0] - b[0]]);
  });
  for (const [ax, ay] of axes) {
    const range = (points: P[]) => {
      let min = Infinity;
      let max = -Infinity;
      for (const [x, y] of points) {
        const d = x * ax + y * ay;
        min = Math.min(min, d);
        max = Math.max(max, d);
      }
      return [min, max] as const;
    };
    const [a0, a1] = range(polygon);
    const [b0, b1] = range(corners);
    if (a1 <= b0 || b1 <= a0) return false;
  }
  return true;
}

/**
 * The target and zoom that fit the rects (floor corners plus their height) into the viewport.
 * The picture fills the free space (left of a docked panel), with a margin. When page
 * overlays sit on top of the canvas, it first slides the picture inside the free space, then
 * shrinks it a little at a time, until its outline no longer touches any overlay.
 */
export function fitRects(
  rects: Rect[],
  height: number,
  viewport: Viewport,
  options: FitOptions = {},
): Framing {
  const { rightInset = 0, obstacles = [], maxZoom = Infinity } = options;
  const points: P[] = [];
  for (const [x, z, w, d] of rects) {
    for (const [px, pz] of [
      [x, z],
      [x + w, z],
      [x, z + d],
      [x + w, z + d],
    ] as const) {
      for (const y of [0, height]) points.push(toScreen(px, y, pz));
    }
  }
  const rs = points.map((point) => point[0]);
  const us = points.map((point) => point[1]);
  const minR = Math.min(...rs);
  const maxR = Math.max(...rs);
  const minU = Math.min(...us);
  const maxU = Math.max(...us);
  const spanR = Math.max(maxR - minR, 1e-6);
  const spanU = Math.max(maxU - minU, 1e-6);
  const freeWidth = Math.max(1, viewport.width - rightInset);
  const scale = 1 + MARGIN * 2;
  const best = Math.min(freeWidth / (spanR * scale), viewport.height / (spanU * scale), maxZoom);
  const outline = hull(points);
  const blocked = obstacles.map((o) => ({
    left: o.left - OVERLAY_GAP,
    top: o.top - OVERLAY_GAP,
    right: o.right + OVERLAY_GAP,
    bottom: o.bottom + OVERLAY_GAP,
  }));

  /** The framing that puts the picture's top left corner at (x0, y0) in pixels. */
  const place = (zoom: number, x0: number, y0: number): Framing => ({
    target: fromScreen(
      minR + (viewport.width / 2 - x0) / zoom,
      maxU - (viewport.height / 2 - y0) / zoom,
    ),
    zoom,
  });
  const centered = (zoom: number) =>
    place(zoom, (freeWidth - spanR * zoom) / 2, (viewport.height - spanU * zoom) / 2);
  if (blocked.length === 0) return centered(best);

  const STEPS = 7;
  for (let shrink = 0; shrink <= 12; shrink++) {
    const zoom = best * (1 - shrink * 0.03);
    const w = spanR * zoom;
    const h = spanU * zoom;
    const mx = (w * MARGIN) / 2;
    const my = (h * MARGIN) / 2;
    const xs = Array.from(
      { length: STEPS },
      (_, i) => mx + ((freeWidth - w - 2 * mx) * i) / (STEPS - 1),
    );
    const ys = Array.from(
      { length: STEPS },
      (_, i) => my + ((viewport.height - h - 2 * my) * i) / (STEPS - 1),
    );
    const cx = (freeWidth - w) / 2;
    const cy = (viewport.height - h) / 2;
    // Try the most centered spots first.
    const spots = xs
      .flatMap((x0) => ys.map((y0) => [x0, y0] as P))
      .sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy));
    for (const [x0, y0] of spots) {
      const onScreen = outline.map(([r, u]): P => [x0 + (r - minR) * zoom, y0 + (maxU - u) * zoom]);
      if (!blocked.some((rect) => polygonHitsRect(onScreen, rect))) return place(zoom, x0, y0);
    }
  }
  return centered(best);
}

/**
 * The landmark pieces that reach past the floor (the loading dock), each as its own rect.
 * One rect around all of them had empty corners far outside the office, which framed the
 * Overview too small (council, 30 Sep 2026).
 */
function beyondFloor(layout: LayoutFile): Rect[] {
  const { width, depth } = layout.floor;
  return Object.values(landmarkBoxes(layout.landmarks))
    .flat()
    .map((b): Rect => {
      // Half the longer side: landmarks turn in 90 degree steps, so this covers any turn.
      const r = Math.max(b.size[0], b.size[2]) / 2;
      return [b.pos[0] - r, b.pos[2] - r, r * 2, r * 2];
    })
    .filter(([x, z, w, d]) => x < 0 || z < 0 || x + w > width || z + d > depth);
}

/** The rects a preset fits: its zones, or the whole floor plus anything built past its edge. */
export function presetRects(preset: Preset, layout: LayoutFile): Rect[] {
  const floor: Rect = [0, 0, layout.floor.width, layout.floor.depth];
  if (preset.zones.length === 0) return [floor, ...beyondFloor(layout)];
  const rects = layout.zones.filter((zone) => preset.zones.includes(zone.id)).map((z) => z.rect);
  return rects.length > 0 ? rects : [floor];
}

export const MAX_ZOOM = 90;

/** Zoom limits: a little wider than the overview, and one desk at the closest. */
export function zoomLimits(overviewZoom: number): { min: number; max: number } {
  const min = Math.floor(overviewZoom * 0.9);
  return { min, max: Math.max(MAX_ZOOM, min + 1) };
}

export function framePreset(
  preset: Preset,
  layout: LayoutFile,
  viewport: Viewport,
  options: Omit<FitOptions, "maxZoom"> = {},
): Framing {
  return fitRects(presetRects(preset, layout), preset.height, viewport, {
    ...options,
    maxZoom: MAX_ZOOM,
  });
}
