import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PLANS } from "./plans";
import { contains, distance, overlaps, routeFor, shortestPath, zoneAnchor } from "./routes";
import { REAL_WORKFLOWS } from "./style";
import type { FloorPlan, Point } from "./types";

const repo = new URL("../../../../../", import.meta.url);
const zonesFile = JSON.parse(readFileSync(new URL("vault.sample/office/zones.json", repo), "utf8"));
const workflowsFile = JSON.parse(readFileSync(new URL("data/workflows.json", repo), "utf8"));

type ZoneDef = { id: string; seats?: string[]; pods?: Record<string, string[]> };
const zoneDefs: ZoneDef[] = zonesFile.zones;
const allSeats = zoneDefs.flatMap((z) => [
  ...(z.seats ?? []),
  ...Object.values(z.pods ?? {}).flat(),
]);
const workflows: { id: string; track: string; steps: { zone: string }[] }[] =
  workflowsFile.workflows;

// A tiny plan for the path math: a square loop with one shortcut.
const tiny: FloorPlan = {
  id: "1",
  name: "test",
  idea: "",
  size: { width: 10, depth: 10 },
  zones: [
    { id: "cm-wing", rect: [0, 0, 4, 4] },
    { id: "ops-wing", rect: [6, 6, 4, 4] },
  ],
  desks: [],
  walkways: {
    nodes: { a: [2, 2], b: [8, 2], c: [8, 8], d: [2, 8] },
    edges: [
      ["a", "b"],
      ["b", "c"],
      ["c", "d"],
      ["d", "a"],
    ],
  },
  doors: [],
};

describe("route math", () => {
  it("finds the shortest way around a loop", () => {
    expect(shortestPath(tiny, "a", "c")).toHaveLength(3);
    expect(shortestPath(tiny, "a", "a")).toEqual(["a"]);
  });

  it("measures a route along the walkways, not through walls", () => {
    const r = routeFor(tiny, ["own-desk", "ops-wing"], "CM");
    // From (2,2) to (8,8) along the loop is 12 m, not the 8.5 m straight line.
    expect(r.meters).toBe(12);
  });

  it("counts a repeated stop once", () => {
    expect(routeFor(tiny, ["own-desk", "own-desk"], "CM").meters).toBe(0);
  });
});

describe.each(PLANS)("floor plan option $id ($name)", (plan) => {
  const rectOf = (id: string) => plan.zones.find((z) => z.id === id)?.rect;

  it("has every zone from zones.json exactly once", () => {
    expect(plan.zones.map((z) => z.id).sort()).toEqual(zoneDefs.map((z) => z.id).sort());
  });

  it("keeps zones inside the floor and apart from each other", () => {
    const floor: [number, number, number, number] = [0, 0, plan.size.width, plan.size.depth];
    for (const z of plan.zones) {
      const [x, zz, w, d] = z.rect;
      expect(contains(floor, [x, zz]) && contains(floor, [x + w, zz + d]), z.id).toBe(true);
    }
    for (let i = 0; i < plan.zones.length; i++) {
      for (let j = i + 1; j < plan.zones.length; j++) {
        const a = plan.zones[i];
        const b = plan.zones[j];
        if (a && b) expect(overlaps(a.rect, b.rect), `${a.id} and ${b.id}`).toBe(false);
      }
    }
  });

  it("puts every anchor inside its zone", () => {
    for (const z of plan.zones) {
      if (z.anchor) expect(contains(z.rect, z.anchor), z.id).toBe(true);
    }
  });

  it("gives all 26 seats a desk, once each, inside the right zone", () => {
    expect(plan.desks.map((d) => d.seat).sort()).toEqual([...allSeats].sort());
    for (const def of zoneDefs) {
      const seats = [...(def.seats ?? []), ...Object.values(def.pods ?? {}).flat()];
      const rect = rectOf(def.id);
      for (const seat of seats) {
        const desk = plan.desks.find((d) => d.seat === seat);
        expect(desk && rect && contains(rect, desk.pos), `${seat} in ${def.id}`).toBe(true);
      }
    }
  });

  it("keeps the pods from zones.json together", () => {
    for (const def of zoneDefs) {
      for (const [pod, seats] of Object.entries(def.pods ?? {})) {
        for (const seat of seats) {
          expect(plan.desks.find((d) => d.seat === seat)?.pod, seat).toBe(pod);
        }
      }
    }
  });

  it("places the Endorsement Bridge between the CM Wing and the Ops Wing", () => {
    const bridge = zoneAnchor(plan, "endorsement-bridge", "CM");
    const cm = zoneAnchor(plan, "cm-wing", "CM");
    const ops = zoneAnchor(plan, "ops-wing", "OPS");
    // Walking from CM to Ops past the bridge adds little over the straight way.
    expect(distance(cm, bridge) + distance(bridge, ops)).toBeLessThan(distance(cm, ops) * 1.35);
  });

  it("has a walkway within 1.6 m of every zone anchor and every desk", () => {
    const nodes = Object.values(plan.walkways.nodes);
    const near = (p: Point) => Math.min(...nodes.map((n) => distance(n, p)));
    for (const z of plan.zones) {
      expect(near(zoneAnchor(plan, z.id, "CM")), z.id).toBeLessThanOrEqual(1.6);
    }
    for (const d of plan.desks) expect(near(d.pos), d.seat).toBeLessThanOrEqual(1.6);
  });

  it("can walk all six real workflows", () => {
    for (const w of workflows.filter((x) => REAL_WORKFLOWS.includes(x.id))) {
      const track = w.track === "CM" ? "CM" : "OPS";
      expect(
        routeFor(
          plan,
          w.steps.map((s) => s.zone),
          track,
        ).meters,
        w.id,
      ).toBeGreaterThan(0);
    }
  });
});
