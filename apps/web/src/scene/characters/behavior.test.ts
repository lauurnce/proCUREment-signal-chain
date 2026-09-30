import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AccessoriesFile, LayoutFile, type QueueItem, type Seat, WorkflowsFile } from "@hq/shared";
import { describe, expect, it } from "vitest";
import { seatSpot } from "../layout/boxes";
import {
  Agent,
  FIRST_TRIP,
  goalFor,
  MAX_AT_ZONE,
  spotIn,
  stepZone,
  turnBetween,
  VISIT_DESK,
  waitsFor,
  waverOf,
} from "./behavior";
import { blendPose, bubblePop, poseAt, WALK } from "./motion";
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

function agentFor(id: string, still = false, crowd?: Map<string, number>) {
  const slot = layout.deskSlots.find((s) => s.seat === id);
  if (!slot) throw new Error(`no desk for ${id}`);
  const spot = seatSpot(slot);
  return new Agent(
    id,
    { x: spot.position[0], z: spot.position[2], heading: spot.rotation },
    grid,
    0.3,
    still,
    crowd,
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
    // A paused helper stays in its chair, never an empty chair (privacy, council 29 Sep).
    expect(goalFor(seat("ops-01", { status: "off-duty" }), workflows, layout, grid)).toEqual({
      kind: "desk",
      activity: "idle",
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
    expect(VISIT_DESK).toEqual([45, 90]);
  });

  it("sends at most 3 helpers to one zone at a time", () => {
    const crowd = new Map<string, number>();
    const ids = ["cm-01", "cm-02", "cm-03", "cm-04", "cm-05"];
    const team = ids.map((id) => {
      const a = agentFor(id, false, crowd);
      a.setGoal(
        goalFor(
          seat(id, { currentWorkflow: "cm-pr-stock-item-approval", currentStep: "extract" }),
          workflows,
          layout,
          grid,
        ),
        true,
      );
      return a;
    });
    let most = 0;
    for (let t = 0; t < 120; t += 1 / 30) {
      for (const a of team) a.step(1 / 30);
      const away = team.filter((a) => a.motion !== "seated").length;
      most = Math.max(most, away);
      expect(crowd.get("sap-station") ?? 0).toBeLessThanOrEqual(MAX_AT_ZONE);
    }
    expect(most).toBe(MAX_AT_ZONE);
    // Back at their desks, nobody is counted at the zone.
    for (const a of team) a.setGoal({ kind: "desk", activity: "typing" });
    for (let t = 0; t < 40; t += 1 / 30) for (const a of team) a.step(1 / 30);
    expect(crowd.size).toBe(0);
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

describe("who a waiting helper waits on", () => {
  const seats = [
    seat("cm-02", { status: "waiting-on-you", track: "CM" }),
    seat("cm-05", { status: "waiting-on-you", track: "CM" }),
    seat("ops-03", { status: "waiting-on-you", track: "OPS" }),
    seat("ops-07", { track: "OPS" }),
    { ...seat("mgr-01"), track: "MGR" } as Seat,
  ];
  const item = (id: string, from: string, approver: string, created: string) =>
    ({ id, from, approver, created, status: "needs-you" }) as QueueItem;
  const queue = [
    item("q-1", "ops-03", "mgr-01", "2026-09-25T08:40:00+08:00"),
    item("q-2", "cm-05", "mgr-01", "2026-09-25T09:05:00+08:00"),
    item("q-3", "ops-07", "cm-02", "2026-09-25T09:20:00+08:00"),
  ];
  const waits = waitsFor(seats, queue);

  it("waits on you when the Sr. Manager decides, else names the kind of decider", () => {
    expect(waits.get("ops-03")).toMatchObject({ onYou: true, decider: null });
    expect(waits.get("cm-02")).toMatchObject({ onYou: false, decider: "a CM" });
  });

  it("only the helper that has waited longest waves", () => {
    expect(waverOf(waits)).toBe("ops-03");
  });

  it("raises a hand only for you; other waits get the hollow bubble", () => {
    expect(goalFor(seats[0] as Seat, workflows, layout, grid, waits.get("cm-02"))).toEqual({
      kind: "desk",
      activity: "wait",
    });
    expect(goalFor(seats[2] as Seat, workflows, layout, grid, waits.get("ops-03"))).toEqual({
      kind: "desk",
      activity: "hand",
    });
  });
});

describe("pose polish", () => {
  it("the bubble pops once, then settles", () => {
    expect(bubblePop(0)).toBe(0);
    expect(bubblePop(0.16)).toBeCloseTo(1.15, 5);
    expect(bubblePop(0.5)).toBe(1);
  });

  it("blends one pose into the next instead of snapping", () => {
    const from = poseAt(1, "typing", 0.2);
    const to = poseAt(1, "hand", 0.2);
    const half = blendPose({ ...to }, from, 0.5);
    expect(half.armR).toBeCloseTo((from.armR + to.armR) / 2, 5);
  });

  it("the hollow bubble shows only while waiting on someone else", () => {
    expect(poseAt(1, "wait", 0.3).bubbleHollow).toBe(1);
    expect(poseAt(1, "wait", 0.3).bubble).toBe(0);
    expect(poseAt(1, "hand", 0.3).bubbleHollow).toBe(0);
  });
});
