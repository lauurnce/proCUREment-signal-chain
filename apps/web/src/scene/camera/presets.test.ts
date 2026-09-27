import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { LayoutFile, type Rect } from "@hq/shared";
import { describe, expect, it } from "vitest";
import { labelOpacity, labelPlacement } from "../labels/fade";
import {
  fitRects,
  framePreset,
  fromScreen,
  MAX_ZOOM,
  PRESETS,
  polygonHitsRect,
  presetById,
  presetRects,
  toScreen,
  zoomLimits,
} from "./presets";

const repoRoot = resolve(import.meta.dirname, "../../../../..");
const layout = LayoutFile.parse(
  JSON.parse(readFileSync(join(repoRoot, "vault.sample/office/layout.json"), "utf8")),
);
const MAC = { width: 1440, height: 900 };
const floor: Rect = [0, 0, 28, 18];

/** Where a floor point lands in pixels, for a framing and viewport. */
function pixel(
  [x, y, z]: [number, number, number],
  framing: ReturnType<typeof fitRects>,
  viewport: typeof MAC,
) {
  const [r, u] = toScreen(x, y, z);
  const [tr, tu] = toScreen(...framing.target);
  return [
    viewport.width / 2 + (r - tr) * framing.zoom,
    viewport.height / 2 - (u - tu) * framing.zoom,
  ];
}

describe("camera presets", () => {
  it("has the four skill views on keys 1 to 4, and the Endorsement Bridge on key 5", () => {
    expect(PRESETS.map((p) => [p.key, p.name])).toEqual([
      ["1", "Overview"],
      ["2", "CM Wing"],
      ["3", "Ops Wing"],
      ["4", "Sr. Manager's Office"],
      ["5", "Endorsement Bridge"],
    ]);
    expect(presetById("nope").id).toBe("overview");
  });

  it("screen math goes there and back", () => {
    const [r, u] = toScreen(7, 0, 3);
    const [x, y, z] = fromScreen(r, u);
    expect([x, y, z].map((n) => Math.round(n * 1e6) / 1e6)).toEqual([7, 0, 3]);
  });

  it("the overview shows every floor corner and the top of the back walls", () => {
    const framing = fitRects([floor], 2.8, MAC);
    for (const corner of [
      [0, 2.8, 0],
      [28, 0, 0],
      [0, 0, 18],
      [28, 0, 18],
    ] as [number, number, number][]) {
      const [px, py] = pixel(corner, framing, MAC);
      expect(px).toBeGreaterThanOrEqual(0);
      expect(px).toBeLessThanOrEqual(MAC.width);
      expect(py).toBeGreaterThanOrEqual(0);
      expect(py).toBeLessThanOrEqual(MAC.height);
    }
  });

  it("a docked panel shifts the picture into the free space", () => {
    const inset = 500;
    const framing = fitRects([floor], 2.8, MAC, { rightInset: inset });
    const [left] = pixel([0, 0, 18], framing, MAC);
    const [right] = pixel([28, 0, 0], framing, MAC);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThanOrEqual(MAC.width - inset);
  });

  it("each wing preset zooms in closer than the overview, within the limit", () => {
    const overview = framePreset(PRESETS[0] as (typeof PRESETS)[0], layout, MAC);
    for (const preset of PRESETS.slice(1)) {
      const framing = framePreset(preset, layout, MAC);
      expect(framing.zoom, preset.name).toBeGreaterThan(overview.zoom);
      expect(framing.zoom, preset.name).toBeLessThanOrEqual(MAX_ZOOM);
    }
  });

  it("zoom limits allow a little wider than the overview and never below it by much", () => {
    expect(zoomLimits(37)).toEqual({ min: 33, max: 90 });
  });
});

describe("framing around page overlays", () => {
  // The bottom right view card at 1440 x 900.
  const card = { left: 1066, top: 610, right: 1424, bottom: 884 };

  it("keeps the whole floor clear of the view card", () => {
    const framing = fitRects([floor], 2.8, MAC, { obstacles: [card] });
    for (const corner of [
      [0, 2.8, 0],
      [28, 0, 0],
      [0, 0, 18],
      [28, 0, 18],
    ] as [number, number, number][]) {
      const [px = 0, py = 0] = pixel(corner, framing, MAC);
      const inside = px > card.left && px < card.right && py > card.top && py < card.bottom;
      expect(inside, `corner ${corner}`).toBe(false);
    }
  });

  it("the outline never touches the card, and the zoom stays close to the best fit", () => {
    const free = fitRects([floor], 2.8, MAC);
    const framing = fitRects([floor], 2.8, MAC, { obstacles: [card] });
    const outline = (
      [
        [0, 2.8, 0],
        [28, 2.8, 0],
        [28, 0, 18],
        [0, 0, 18],
      ] as [number, number, number][]
    ).map((c) => pixel(c, framing, MAC) as [number, number]);
    expect(polygonHitsRect(outline, card)).toBe(false);
    expect(framing.zoom).toBeGreaterThan(free.zoom * 0.6);
  });

  it("the overview also shows the loading dock outside the floor", () => {
    const rects = presetRects(PRESETS[0] as (typeof PRESETS)[0], layout);
    const maxX = Math.max(...rects.map(([x, , w]) => x + w));
    expect(maxX).toBeGreaterThan(30);
  });
});

describe("zone label placement", () => {
  const screen = { width: 1440, height: 900 };
  const label = (x: number, y: number) => ({ x, y, width: 120, height: 22 });

  it("shows a label with room to spare, and hides one cut by an edge", () => {
    expect(labelPlacement(label(700, 400), screen, [])).toBe(true);
    expect(labelPlacement(label(60, 400), screen, [])).toBe(false);
    expect(labelPlacement(label(700, 890), screen, [])).toBe(false);
  });

  it("hides a label under a page overlay", () => {
    const card = { left: 1066, top: 610, right: 1424, bottom: 884 };
    expect(labelPlacement(label(1100, 700), screen, [card])).toBe(false);
    expect(labelPlacement(label(900, 700), screen, [card])).toBe(true);
  });
});

describe("zone label fade", () => {
  it("labels are hidden at the overview and fully shown when zoomed in", () => {
    expect(labelOpacity(37, 37)).toBe(0);
    expect(labelOpacity(37 * 1.5, 37)).toBeGreaterThan(0);
    expect(labelOpacity(37 * 1.5, 37)).toBeLessThan(1);
    expect(labelOpacity(37 * 2, 37)).toBe(1);
    expect(labelOpacity(50, 0)).toBe(0);
  });
});
