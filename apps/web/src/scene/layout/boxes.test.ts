import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { LayoutFile } from "@hq/shared";
import { describe, expect, it } from "vitest";
import { world } from "../../theme/tokens";
import { podSeats } from "../furniture/DeskPod";
import {
  deskBoxes,
  seatSpot,
  tintBoxes,
  wallBoxes,
  wallSpans,
  windowSpillBoxes,
  ZONE_TINT,
} from "./boxes";

const repoRoot = resolve(import.meta.dirname, "../../../../..");
const layout = LayoutFile.parse(
  JSON.parse(readFileSync(join(repoRoot, "vault.sample/office/layout.json"), "utf8")),
);
const wall = (id: string) => {
  const found = layout.walls.find((w) => w.id === id);
  if (!found) throw new Error(`No wall ${id}`);
  return found;
};

describe("desk boxes", () => {
  it("draws all 26 desk slots, each with a desk edge and a chair seat that cast shadows", () => {
    const desks = deskBoxes(layout);
    expect(layout.deskSlots).toHaveLength(26);
    expect(desks.cast).toHaveLength(26 * 2);
    expect(desks.screens).toHaveLength(26);
  });

  it("puts one low divider in each pod with two facing rows", () => {
    const dividers = deskBoxes(layout).plain.filter((b) => b.size[2] === 0.03);
    // cm-a, cm-b, cm-c, ops-a, ops-b, ops-c.
    expect(dividers).toHaveLength(6);
    for (const divider of dividers) expect(divider.pos[1] + divider.size[1] / 2).toBeLessThan(1.1);
  });

  it("seats a helper where the Phase 2 desk pod seated them", () => {
    // The diorama pod at (3.2, 2.6): back left seat, facing the camera.
    const expected = podSeats([3.2, 2.6])[0];
    const spot = seatSpot({ pos: [3.2 - 0.7, 2.6 - 0.35], facing: 0 });
    expect(spot.position[0]).toBeCloseTo(expected?.position[0] ?? Number.NaN);
    expect(spot.position[2]).toBeCloseTo(expected?.position[2] ?? Number.NaN);
    expect(spot.rotation).toBe(expected?.rotation);
  });

  it("a desk facing +x seats its helper on the -x side", () => {
    const spot = seatSpot({ pos: [5, 5], facing: 90 });
    expect(spot.position[0]).toBeCloseTo(4.15);
    expect(spot.position[2]).toBeCloseTo(5);
  });
});

describe("wall boxes", () => {
  it("splits a wall around its door", () => {
    const spans = wallSpans(wall("mgr-front"), layout);
    expect(spans.map((s) => s.kind)).toEqual(["solid", "door", "solid"]);
    expect(spans[1]?.from).toBeCloseTo(1.9);
    expect(spans[1]?.to).toBeCloseTo(2.9);
  });

  it("cuts one window opening per window on the back wall", () => {
    const spans = wallSpans(wall("back-x"), layout);
    expect(spans.filter((s) => s.kind === "window")).toHaveLength(5);
    // The pieces cover the whole wall with no gaps.
    expect(spans[0]?.from).toBe(0);
    expect(spans.at(-1)?.to).toBeCloseTo(28);
    spans.slice(1).forEach((span, i) => {
      expect(span.from).toBeCloseTo(spans[i]?.to ?? Number.NaN);
    });
  });

  it("makes a pane for every window, and glass for the glass walls", () => {
    const walls = wallBoxes(layout);
    expect(walls.panes).toHaveLength(layout.windows.length);
    expect(walls.glass.length).toBeGreaterThan(0);
    expect(walls.glass.every((b) => b.color === world.glass)).toBe(true);
  });

  it("moves the back walls outside the floor, so the floor stays clear", () => {
    const body = wallBoxes(layout).solid.find(
      (b) => b.color === world.wall && b.size[1] === 2.8 && Math.abs(b.pos[2]) < 0.1,
    );
    expect(body?.pos[2]).toBeCloseTo(-0.06);
  });
});

describe("zone tints", () => {
  it("gives a thin rug to every tinted zone", () => {
    const tints = tintBoxes(layout);
    const tinted = layout.zones.filter((zone) => ZONE_TINT[zone.id]);
    const rugs = tints.filter((b) => Object.values(ZONE_TINT).includes(b.color));
    expect(rugs).toHaveLength(tinted.length);
    expect(rugs.every((b) => b.size[1] < 0.01)).toBe(true);
  });

  it("puts a 1.4 m blue deck with mid-blue edges under the Endorsement Bridge", () => {
    const deck = tintBoxes(layout).filter((b) => !Object.values(ZONE_TINT).includes(b.color));
    expect(deck).toHaveLength(3);
    const width = deck.reduce((sum, b) => sum + b.size[2], 0);
    expect(width).toBeCloseTo(1.4);
    expect(deck.filter((b) => b.color === world.bridgeSeam)).toHaveLength(2);
  });

  it("puts a patch of night window light in front of every back-wall window", () => {
    expect(windowSpillBoxes(layout)).toHaveLength(layout.windows.length);
  });
});
