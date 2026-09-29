import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AccessoriesFile, LayoutFile, type Seat, WorkflowsFile } from "@hq/shared";
import { describe, expect, it } from "vitest";
import { seatSpot } from "../layout/boxes";
import { Agent, FIRST_TRIP, goalFor, spotIn, stepZone, turnBetween, VISIT_DESK } from "./behavior";
import { WALK } from "./motion";
import { navGridFor } from "./navGrid";

const root = resolve(__dirname, "../../../../..");
const json = (path: string) => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const layout = LayoutFile.parse(json("vault.sample/office/layout.json"));
const accessories = AccessoriesFile.parse(json("vault.sample/office/accessories.json")).accessories;
const workflows = WorkflowsFile.parse(json("data/workflows.json")).workflows;
const grid = navGridFor(layout, accessories);

const seat = (id: string, more: Partial<Seat> = {}): Seat =>
  ({
    id,
    zone: id.startsWith("cm") ? "cm-wing" : "ops-wing",
    status: "working",
    currentWorkflow: null,
    currentStep: null,
    ...more,
  }) as Seat;

function agentFor(id: string, still = false) {
  const slot = layout.deskSlots.find((s) => s.seat === id);
  if (!slot) throw new Error(`no desk for ${id}`);
  const spot = seatSpot(slot);
  return new Agent(
    id,
    { x: spot.position[0], z: spot.position[2], heading: spot.rotation },
    grid,
    0.3,
    still,
  );
}

/** Runs an agent for `seconds` in 1/30 s steps. */
function run(agent: Agent, seconds: number, each?: (a: Agent) => void) {
  for (let t = 0; t < seconds; t += 1 / 30) {
    agent.step(1 / 30);
    each?.(agent);
  }
}

describe("goals from the live status", () => {
  it("reads the zone of the current workflow step", () => {
    const extract = seat("cm-10", {
      currentWorkflow: "cm-pr-stock-item-approval",
      currentStep: "extract",
    });
    expect(stepZone(extract, workflows)).toBe("sap-station");
    const review = { ...extract, currentStep: "review" };
    expect(stepZone(review, workflows)).toBeNull();
  });

  it("maps each status to a goal", () => {
    expect(goalFor(seat("cm-01"), workflows, layout, grid)).toEqual({
      kind: "desk",
      activity: "typing",
    });
    expect(goalFor(seat("cm-02", { status: "waiting-on-you" }), workflows, layout, grid)).toEqual({
      kind: "desk",
      activity: "hand",
    });
    expect(goalFor(seat("cm-09", { status: "on-break" }), workflows, layout, grid)).toMatchObject({
      kind: "stay",
      zone: "merienda-corner",
    });
    expect(
      goalFor(seat("lead-02", { status: "in-meeting" }), workflows, layout, grid),
    ).toMatchObject({ kind: "stay", zone: "huddle-room" });
    expect(goalFor(seat("ops-01", { status: "off-duty" }), workflows, layout, grid)).toEqual({
      kind: "hidden",
    });
  });

  it("sends a working helper on a trip when its step is in another zone", () => {
    const goal = goalFor(
      seat("cm-10", { currentWorkflow: "cm-pr-stock-item-approval", currentStep: "extract" }),
      workflows,
      layout,
      grid,
    );
    expect(goal).toMatchObject({ kind: "visit", zone: "sap-station" });
  });

  it("a meeting in a named room goes to that room", () => {
    const goal = goalFor(
      seat("cm-06", {
        status: "in-meeting",
        currentWorkflow: "cm-rfq-process",
        currentStep: "negotiate",
      }),
      workflows,
      layout,
      grid,
    );
    expect(goal).toMatchObject({ kind: "stay", zone: "negotiation-room" });
  });

  it("spreads helpers over free spots in a zone, the same spot every time", () => {
    const a = spotIn("merienda-corner", "cm-09", layout, grid);
    const b = spotIn("merienda-corner", "ops-08", layout, grid);
    expect(a).toEqual(spotIn("merienda-corner", "cm-09", layout, grid));
    expect(a?.spot).not.toEqual(b?.spot);
    expect(grid.isFree(a?.spot ?? [0, 0])).toBe(true);
  });
});

describe("a helper's day", () => {
  it("starts where it belongs, with no walk on page load", () => {
    const a = agentFor("cm-09");
    a.setGoal(goalFor(seat("cm-09", { status: "on-break" }), workflows, layout, grid), true);
    expect(a.motion).toBe("standing");
    expect(a.stand).toBe(1);
    expect(a.destination).not.toBe("desk");
  });

  it("stands up, walks to Merienda Corner, and later walks back and sits down", () => {
    const a = agentFor("cm-09");
    a.setGoal({ kind: "desk", activity: "typing" }, true);
    const start: [number, number] = [a.x, a.z];
    a.setGoal(goalFor(seat("cm-09", { status: "on-break" }), workflows, layout, grid));
    expect(a.motion).toBe("rising");
    const seen = new Set<string>();
    run(a, 40, (x) => seen.add(x.motion));
    expect(seen).toEqual(new Set(["rising", "walking", "turning", "standing"]));
    expect(a.motion).toBe("standing");
    expect(a.poseInput().activity).toBe("idle");

    a.setGoal({ kind: "desk", activity: "typing" });
    run(a, 40);
    expect(a.motion).toBe("seated");
    expect(a.x).toBeCloseTo(start[0], 5);
    expect(a.z).toBeCloseTo(start[1], 5);
    expect(a.poseInput().activity).toBe("typing");
  });

  it("walks at about 1.2 m/s and never through a wall", () => {
    const a = agentFor("ops-03");
    a.setGoal({ kind: "desk", activity: "typing" }, true);
    a.setGoal(goalFor(seat("ops-03", { status: "on-break" }), workflows, layout, grid));
    let last: [number, number] = [a.x, a.z];
    run(a, 30, (x) => {
      const step = Math.hypot(x.x - last[0], x.z - last[1]);
      expect(step).toBeLessThanOrEqual((WALK.speed / 30) * 1.001);
      last = [x.x, x.z];
      if (x.motion === "walking") {
        // Mid walk it is always on free floor (the first and last steps leave and reach a chair).
        const nearChair = Math.hypot(x.x - x.seat.x, x.z - x.seat.z) < 0.8;
        if (!nearChair) expect(grid.isFree([x.x, x.z])).toBe(true);
      }
    });
  });

  it("goes to the zone of its step, works there a moment, and comes back", () => {
    const a = agentFor("cm-10");
    const goal = goalFor(
      seat("cm-10", { currentWorkflow: "cm-pr-stock-item-approval", currentStep: "extract" }),
      workflows,
      layout,
      grid,
    );
    a.setGoal(goal, true);
    expect(a.motion).toBe("seated");
    // Leaves within the first trip window.
    run(a, FIRST_TRIP[1] + 1);
    expect(a.motion).not.toBe("seated");
    // Walks there and types at the terminal.
    let worked = false;
    run(a, 30, (x) => {
      if (x.motion === "standing" && x.poseInput().activity === "typing") worked = true;
    });
    expect(worked).toBe(true);
    // Back at the desk before the next trip.
    let back = false;
    run(a, 30, (x) => {
      if (x.motion === "seated") back = true;
    });
    expect(back).toBe(true);
    expect(VISIT_DESK[0]).toBeGreaterThan(10);
  });

  it("raises a hand at the desk while it waits on you", () => {
    const a = agentFor("cm-02");
    a.setGoal({ kind: "desk", activity: "hand" }, true);
    expect(a.poseInput().activity).toBe("hand");
  });

  it("hides an off-duty helper", () => {
    const a = agentFor("ops-01");
    a.setGoal({ kind: "hidden" }, true);
    expect(a.visible).toBe(false);
  });

  it("with reduced motion, a trip is one cut", () => {
    const a = agentFor("cm-09", true);
    a.setGoal({ kind: "desk", activity: "typing" }, true);
    a.setGoal(goalFor(seat("cm-09", { status: "on-break" }), workflows, layout, grid));
    expect(a.motion).toBe("standing");
    expect(a.walkBlend).toBe(0);
  });

  it("turns the short way round", () => {
    expect(turnBetween(3, -3)).toBeCloseTo(2 * Math.PI - 6, 5);
    expect(turnBetween(0.5, 1)).toBeCloseTo(0.5, 5);
  });
});
