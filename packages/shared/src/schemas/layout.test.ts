import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { findReferenceProblems } from "../vault/references";
import { deskCorners, LayoutFile, onSegment } from "./layout";
import { ZonesFile } from "./zone";

const repoRoot = resolve(import.meta.dirname, "../../../..");
const json = (path: string): unknown => JSON.parse(readFileSync(join(repoRoot, path), "utf8"));
const sample = () => LayoutFile.parse(json("vault.sample/office/layout.json"));
const zones = () => ZonesFile.parse(json("vault.sample/office/zones.json")).zones;

/** Only the layout checks: no seats, queue or workflows, so nothing else can fail. */
const layoutProblems = (layout: LayoutFile) =>
  findReferenceProblems({
    seats: [],
    profiles: [],
    queue: [],
    tasks: [],
    office: { zones: zones(), accessories: [], layout },
    workflows: [],
    authorityRules: [],
    broken: { roster: true, zones: false, workflows: true, rules: true },
  });

/** The first item that matches, or a clear failure. */
function must<T>(item: T | undefined): T {
  if (item === undefined) throw new Error("Test data is missing an expected item");
  return item;
}

const messages = (input: unknown) => {
  const result = LayoutFile.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe("LayoutFile", () => {
  it("accepts the committed layout: 13 zones and 26 desks", () => {
    const layout = sample();
    expect(layout.zones).toHaveLength(13);
    expect(layout.deskSlots).toHaveLength(26);
  });

  it("the committed layout matches office/zones.json", () => {
    expect(layoutProblems(sample())).toEqual([]);
  });

  it("rejects a zone outside the floor", () => {
    const layout = sample();
    const zone = {
      ...must(layout.zones[0]),
      rect: [26, 0, 5, 4] as [number, number, number, number],
    };
    layout.zones[0] = zone;
    expect(messages(layout)).toContain(`Zone ${zone.id} is outside the floor`);
  });

  it("rejects an id used twice", () => {
    const layout = sample();
    const wall = must(layout.walls[0]);
    layout.walls.push({ ...wall });
    expect(messages(layout)).toContain(`"${wall.id}" is used twice`);
  });

  it("rejects a facing that is not 0, 90, 180 or 270", () => {
    const layout = json("vault.sample/office/layout.json") as { deskSlots: { facing: number }[] };
    must(layout.deskSlots[0]).facing = 45;
    expect(LayoutFile.safeParse(layout).success).toBe(false);
  });

  it("rejects a walkway edge to a node that does not exist", () => {
    const layout = sample();
    layout.walkways.edges.push(["bridge", "nowhere"]);
    expect(messages(layout)).toContain("Walkway edge points to unknown node nowhere");
  });

  it("rejects a door that is not on its wall", () => {
    const layout = sample();
    const door = must(layout.doors.find((d) => d.wall));
    door.at = [door.at[0] + 0.5, door.at[1] + 0.5];
    expect(messages(layout)).toContain(`Door ${door.id} is not on wall ${door.wall}`);
  });
});

describe("layout against office/zones.json", () => {
  it("finds a seat without a desk", () => {
    const layout = sample();
    layout.deskSlots = layout.deskSlots.filter((slot) => slot.seat !== "cm-03");
    expect(layoutProblems(layout)).toContain(
      "office/layout.json: seat cm-03 has 0 desks, it needs exactly 1",
    );
  });

  it("finds a seat with two desks", () => {
    const layout = sample();
    const slot = must(layout.deskSlots.find((s) => s.seat === "cm-03"));
    layout.deskSlots.push({ ...slot, id: "desk-extra" });
    expect(layoutProblems(layout)).toContain(
      "office/layout.json: seat cm-03 has 2 desks, it needs exactly 1",
    );
  });

  it("finds a desk in the wrong pod", () => {
    const layout = sample();
    const slot = must(layout.deskSlots.find((s) => s.seat === "cm-03"));
    slot.pod = "cm-b";
    expect(layoutProblems(layout)).toContain(
      'office/layout.json: desk desk-cm-03 says pod "cm-b", but office/zones.json says "cm-a"',
    );
  });

  it("finds a desk outside its zone", () => {
    const layout = sample();
    const slot = must(layout.deskSlots.find((s) => s.seat === "ops-01"));
    slot.pos = [3, 15];
    expect(layoutProblems(layout)).toContain(
      "office/layout.json: desk desk-ops-01 is not inside zone ops-wing",
    );
  });

  it("finds a zone that has no place, and a place for an unknown zone", () => {
    const layout = sample();
    layout.zones = layout.zones.map((z) => (z.id === "reception" ? { ...z, id: "lobby" } : z));
    expect(layoutProblems(layout)).toEqual(
      expect.arrayContaining([
        'office/layout.json places zone "lobby", which is not in office/zones.json',
        'office/layout.json has no place for zone "reception"',
      ]),
    );
  });
});

describe("layout geometry helpers", () => {
  it("a turned desk swaps its width and depth", () => {
    const [first, , , last] = deskCorners({ pos: [5, 5], facing: 90 });
    expect(first).toEqual([4.65, 4.3]);
    expect(last).toEqual([5.35, 5.7]);
  });

  it("a point is on a segment only within 1 cm", () => {
    expect(onSegment([2, 0], [0, 0], [4, 0])).toBe(true);
    expect(onSegment([2, 0.05], [0, 0], [4, 0])).toBe(false);
    expect(onSegment([5, 0], [0, 0], [4, 0])).toBe(false);
  });
});
