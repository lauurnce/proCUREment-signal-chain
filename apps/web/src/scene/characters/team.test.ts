import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { LayoutFile, RosterSeat, type Seat, type Track } from "@hq/shared";
import { describe, expect, it } from "vitest";
import { color, track as trackTokens } from "../../theme/tokens";
import { appearanceFor } from "./appearance";
import { planCrowd } from "./crowdPlan";
import { partsFor } from "./recipe";
import { teamFor } from "./team";

const repoRoot = resolve(import.meta.dirname, "../../../../..");
const read = (path: string) => JSON.parse(readFileSync(join(repoRoot, path), "utf8"));
const layout = LayoutFile.parse(read("vault.sample/office/layout.json"));
const seats: Seat[] = read("data/roster.template.json").seats.map((s: unknown) => ({
  ...RosterSeat.parse(s),
  status: "working",
}));

describe("office team", () => {
  it("puts all 26 roster seats at a desk", () => {
    const team = teamFor(seats, layout);
    expect(team.missing).toEqual([]);
    expect(team.members).toHaveLength(26);
  });

  it("never puts two helpers on the same chair", () => {
    const spots = teamFor(seats, layout).members.map((m) => m.position.join(","));
    expect(new Set(spots).size).toBe(spots.length);
  });

  it("skips a seat with no desk, and says which one", () => {
    const extra = { ...(seats[0] as Seat), id: "cm-99" };
    expect(teamFor([...seats, extra], layout).missing).toEqual(["cm-99"]);
  });

  it("only working helpers type", () => {
    const resting = seats.map((s) => ({ ...s, status: "on-break" as const }));
    expect(teamFor(resting, layout).members.every((m) => m.activity === "idle")).toBe(true);
  });

  it("gives the 26 helpers 26 different looks", () => {
    const looks = seats.map((s) =>
      JSON.stringify({ ...appearanceFor(String(s.avatarSeed)), phase: 0 }),
    );
    expect(new Set(looks).size).toBe(26);
  });
});

describe("character recipe", () => {
  const tracks: Track[] = ["MGR", "LEAD", "CM", "OPS"];
  const shapeFor: Record<Track, (s: string) => boolean> = {
    MGR: (s) => s === "star",
    LEAD: (s) => s === "triangle",
    // Diamond and square are both boxes: a diamond is turned 45 degrees.
    CM: (s) => s === "box",
    OPS: (s) => s === "box",
  };

  it("every track wears its own badge shape in its own color", () => {
    for (const t of tracks) {
      const tint = color[trackTokens[t].worldColorKey];
      // The mark sits on the card face, in front of everything else on the chest.
      const marks = partsFor(appearanceFor("x"), t).filter(
        (p) => p.bone === "upper" && p.pos[2] > 0.128,
      );
      expect(marks).toHaveLength(1);
      expect(marks[0]?.color).toBe(tint);
      const mark = marks[0];
      expect(mark && shapeFor[t](mark.shape)).toBe(true);
      if (t === "CM") expect(mark?.rot[2]).toBeCloseTo(Math.PI / 4);
      if (t === "OPS") expect(mark?.rot[2]).toBe(0);
    }
  });

  it("the Lead triangle has only the white card behind it", () => {
    const parts = partsFor(appearanceFor("x"), "LEAD");
    expect(parts.filter((p) => p.shape === "triangle")).toHaveLength(1);
  });

  it("the draw calls do not grow with the number of helpers", () => {
    const member = (i: number) => ({
      id: `s${i}`,
      seed: String(i),
      track: tracks[i % 4] as Track,
      activity: "idle" as const,
      position: [i, 0, 0] as [number, number, number],
      rotation: 0,
    });
    const one = planCrowd([member(0)]).batches.length;
    const all = planCrowd(Array.from({ length: 200 }, (_, i) => member(i))).batches.length;
    // At most one batch per shape and finish, whatever the crowd size.
    expect(all).toBeLessThanOrEqual(10);
    expect(all).toBeGreaterThanOrEqual(one);
  });

  it("only torsos, heads and hair caps cast shadows", () => {
    for (let i = 0; i < 50; i++) {
      for (const p of partsFor(appearanceFor(`seat-${i}`), "CM")) {
        expect(p.castShadow).toBe(["torso", "head", "hairCap"].includes(p.shape));
      }
    }
  });
});
