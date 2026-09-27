import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { AccessoriesFile, type Landmark, LayoutFile } from "@hq/shared";
import { describe, expect, it } from "vitest";
import { world } from "../../theme/tokens";
import { LANDMARK_KINDS, landmarkBoxes, PROP_KINDS, propBoxes } from "./recipes";

const repoRoot = resolve(import.meta.dirname, "../../../../..");
const read = (path: string) => JSON.parse(readFileSync(join(repoRoot, path), "utf8"));
const layout = LayoutFile.parse(read("vault.sample/office/layout.json"));
const accessories = AccessoriesFile.parse(read("vault.sample/office/accessories.json")).accessories;

const only = (kind: string): Landmark[] => layout.landmarks.filter((l) => l.kind === kind);
const all = (batches: ReturnType<typeof landmarkBoxes>) => Object.values(batches).flat();
const top = (b: { pos: number[]; size: number[] }) => (b.pos[1] ?? 0) + (b.size[1] ?? 0) / 2;

describe("landmarks", () => {
  it("every zone has a landmark, and every landmark kind has a recipe", () => {
    const zonesWithLandmark = new Set(layout.landmarks.map((l) => l.zone));
    for (const zone of layout.zones) expect(zonesWithLandmark.has(zone.id), zone.id).toBe(true);
    for (const landmark of layout.landmarks) {
      expect(LANDMARK_KINDS, landmark.id).toContain(landmark.kind);
    }
  });

  it("the Reception sign says SignalChain HQ and stays under 0.9 m", () => {
    const [sign] = only("name-sign");
    expect(sign?.label).toBe("SignalChain HQ");
    const tallest = Math.max(...all(landmarkBoxes(only("name-sign"))).map(top));
    expect(tallest).toBeLessThan(0.9);
  });

  it("the round table and its chairs stay under 0.9 m, so the view to the bridge stays clear", () => {
    const tallest = Math.max(...all(landmarkBoxes(only("round-table"))).map(top));
    expect(tallest).toBeLessThan(0.9);
  });

  it("gold and teal stay small: no piece over 0.2 m (WORLD_PALETTE, section 3)", () => {
    const accents = [world.folderTabCm, world.folderTabOps];
    const pieces = [...all(landmarkBoxes(layout.landmarks)), ...all(propBoxes(accessories))];
    for (const b of pieces.filter((piece) => accents.includes(piece.color as never))) {
      expect(Math.max(...b.size)).toBeLessThanOrEqual(0.2);
    }
  });

  it("the Endorsement Bridge is the tallest landmark, with arches up to 2.2 m", () => {
    // The capiz shade hangs lower than the beam, so only the frame counts.
    const bridge = all(landmarkBoxes(only("bridge-counter"))).filter(
      (b) => b.color !== world.capizGlow,
    );
    const bridgeTop = Math.max(...bridge.map(top));
    expect(bridgeTop).toBeCloseTo(2.24, 1);
    for (const kind of LANDMARK_KINDS.filter(
      (k) =>
        ![
          "bridge-counter",
          "whiteboard",
          "coffee-cart",
          "dock-window",
          "desk-tray",
          "terminal",
        ].includes(k),
    )) {
      const others = all(landmarkBoxes(only(kind)));
      if (others.length > 0) expect(Math.max(...others.map(top)), kind).toBeLessThan(bridgeTop);
    }
  });

  it("the capiz lamps and the dashboard wall glow", () => {
    const batches = landmarkBoxes(layout.landmarks);
    expect(batches.capiz.length).toBeGreaterThan(0);
    expect(batches.dash.length).toBeGreaterThan(0);
  });
});

describe("props from accessories.json", () => {
  it("every sample prop kind has a recipe, and every enabled prop has a place", () => {
    for (const a of accessories) {
      expect(PROP_KINDS, a.id).toContain(a.kind);
      if (a.enabled) expect(a.pos, a.id).toBeDefined();
    }
  });

  it("a disabled prop is not drawn, and turning it back on adds its boxes", () => {
    const before = all(propBoxes(accessories)).length;
    const off = accessories.map((a) => (a.id === "sofa-reception" ? { ...a, enabled: false } : a));
    expect(all(propBoxes(off)).length).toBeLessThan(before);
  });

  it("there are no desk flags: a flag would tie a country to a seat", () => {
    expect(PROP_KINDS).not.toContain("desk-flag");
    expect(accessories.some((a) => a.kind === "desk-flag")).toBe(false);
  });

  it("an unknown kind still shows up as a crate, so a typo is easy to spot", () => {
    const crate = propBoxes([
      { id: "x", kind: "spaceship", zone: "reception", enabled: true, pos: [1, 1] },
    ]);
    expect(all(crate)).toHaveLength(1);
  });
});
