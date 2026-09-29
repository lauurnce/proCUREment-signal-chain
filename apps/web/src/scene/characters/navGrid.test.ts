import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AccessoriesFile, LayoutFile } from "@hq/shared";
import { describe, expect, it } from "vitest";
import { seatSpot } from "../layout/boxes";
import { CELL, type FloorPoint, NavGrid, navGridFor } from "./navGrid";

const root = resolve(__dirname, "../../../../..");
const json = (path: string) => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const layout = LayoutFile.parse(json("vault.sample/office/layout.json"));
const accessories = AccessoriesFile.parse(json("vault.sample/office/accessories.json")).accessories;
const grid = navGridFor(layout, accessories);

const length = (path: FloorPoint[]) =>
  path.slice(1).reduce((sum, p, i) => {
    const q = path[i] as FloorPoint;
    return sum + Math.hypot(p[0] - q[0], p[1] - q[1]);
  }, 0);

const seat = (id: string): FloorPoint => {
  const slot = layout.deskSlots.find((s) => s.seat === id);
  if (!slot) throw new Error(`no desk for ${id}`);
  const [x, , z] = seatSpot(slot).position;
  return [x, z];
};

const zone = (id: string): FloorPoint => {
  const z = layout.zones.find((x) => x.id === id);
  if (!z) throw new Error(`no zone ${id}`);
  return z.anchor ?? [z.rect[0] + z.rect[2] / 2, z.rect[1] + z.rect[3] / 2];
};

describe("walk grid", () => {
  it("covers the floor in half meter cells", () => {
    expect(grid.cols).toBe(layout.floor.width / CELL);
    expect(grid.rows).toBe(layout.floor.depth / CELL);
  });

  it("blocks desks and walls, and leaves the walkways and doors open", () => {
    const desk = layout.deskSlots[5];
    if (!desk) throw new Error("no desk");
    expect(grid.isFree(desk.pos)).toBe(false);
    // The back wall runs along z = 0.
    expect(grid.isFree([14, 0.1])).toBe(false);
    // The ring walkway around the bridge.
    const ring = layout.walkways.nodes["ring-w"] as FloorPoint;
    expect(grid.isFree(ring)).toBe(true);
    // The Sr. Manager's door, in the glass front wall at z = 4.5.
    expect(grid.isFree([2.4, 4.25])).toBe(true);
    expect(grid.isFree([2.4, 4.75])).toBe(true);
    expect(grid.isFree([0.9, 4.5])).toBe(false);
  });

  it("finds a walk from every desk to Merienda Corner and back", () => {
    const merienda = zone("merienda-corner");
    for (const slot of layout.deskSlots) {
      const from = seat(slot.seat);
      const there = grid.findPath(from, merienda);
      expect(there, `${slot.seat} to Merienda Corner`).not.toBeNull();
      expect(grid.findPath(merienda, from), `${slot.seat} back`).not.toBeNull();
    }
  });

  it("reaches every zone a workflow step names", () => {
    const zones = [
      "sap-station",
      "endorsement-bridge",
      "contract-corner",
      "negotiation-room",
      "mail-dock",
      "mgr-office",
      "leads-row",
      "huddle-room",
    ];
    for (const id of zones) {
      expect(grid.findPath(seat("cm-03"), zone(id)), id).not.toBeNull();
      expect(grid.findPath(seat("ops-03"), zone(id)), id).not.toBeNull();
    }
  });

  it("starts and ends exactly at the chair, and never crosses a blocked cell in between", () => {
    const from = seat("cm-03");
    const to = zone("sap-station");
    const path = grid.findPath(from, to) as FloorPoint[];
    expect(path[0]).toEqual(from);
    expect(path.at(-1)).toEqual(to);
    // The legs in the middle stay on free floor. The first and last may start at a chair.
    for (let i = 1; i < path.length - 2; i++) {
      expect(grid.lineIsClear(path[i] as FloorPoint, path[i + 1] as FloorPoint)).toBe(true);
    }
  });

  it("smooths the grid zig-zag into a few straight legs", () => {
    const path = grid.findPath(seat("cm-03"), zone("merienda-corner")) as FloorPoint[];
    const straight = Math.hypot(
      (path.at(-1) as FloorPoint)[0] - (path[0] as FloorPoint)[0],
      (path.at(-1) as FloorPoint)[1] - (path[0] as FloorPoint)[1],
    );
    expect(path.length).toBeLessThan(10);
    // Never more than a bit longer than the straight line on this open floor.
    expect(length(path)).toBeLessThan(straight * 1.6);
  });

  it("goes around a wall instead of through it", () => {
    // A 6 m wall across the middle of an empty 8 x 8 m floor, with a gap at the right end.
    const wall = {
      pos: [3, 1, 4] as [number, number, number],
      size: [6, 2, 0.2] as [number, number, number],
      rotY: 0,
      color: "",
    };
    const small = new NavGrid(8, 8, [wall]);
    const path = small.findPath([1, 1], [1, 7]) as FloorPoint[];
    expect(path).not.toBeNull();
    expect(path.some(([x]) => x > 6)).toBe(true);
    expect(length(path)).toBeGreaterThan(10);
  });

  it("returns null when there is no way through", () => {
    const wall = {
      pos: [4, 1, 4] as [number, number, number],
      size: [8, 2, 0.2] as [number, number, number],
      rotY: 0,
      color: "",
    };
    const closed = new NavGrid(8, 8, [wall]);
    expect(closed.findPath([1, 1], [1, 7])).toBeNull();
  });

  it("finds the nearest free cell for a point inside furniture", () => {
    const desk = layout.deskSlots[0];
    if (!desk) throw new Error("no desk");
    const cell = grid.nearestFree(desk.pos);
    expect(cell).not.toBeNull();
    const [ix, iz] = cell as [number, number];
    expect(grid.isBlocked(ix, iz)).toBe(false);
  });
});

/** Prints the grid, # for blocked. Run with DEBUG_GRID=1 to look at it. */
if (process.env.DEBUG_GRID) {
  const lines: string[] = [];
  for (let iz = 0; iz < grid.rows; iz++) {
    let line = "";
    for (let ix = 0; ix < grid.cols; ix++) line += grid.isBlocked(ix, iz) ? "#" : ".";
    lines.push(line);
  }
  console.log(lines.join("\n"));
}
