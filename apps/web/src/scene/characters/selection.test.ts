import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { LayoutFile, RosterSeat, type Seat } from "@hq/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toScreen } from "../camera/presets";
import { onSeatSelected, selectSeat, setSeatSpots, useSelection } from "./selection";
import {
  compactAt,
  frameSeat,
  ROLE_HIDE_AT,
  ROLE_SHOW_AT,
  spreadTags,
  tagAnchors,
  tagsFor,
} from "./tags";
import { teamFor } from "./team";

const repoRoot = resolve(import.meta.dirname, "../../../../..");
const read = (path: string) => JSON.parse(readFileSync(join(repoRoot, path), "utf8"));
const layout = LayoutFile.parse(read("vault.sample/office/layout.json"));
const seats: Seat[] = read("data/roster.template.json").seats.map((s: unknown) => ({
  ...RosterSeat.parse(s),
  status: "working",
}));
const team = teamFor(seats, layout);

describe("selectSeat and onSeatSelected", () => {
  beforeEach(() => {
    useSelection.setState({ selected: null, focus: null, seats: new Map() });
    setSeatSpots(new Map(team.members.map((m) => [m.id, m.position])));
  });

  it("selecting a helper tells every listener once, and asks the camera to move", () => {
    const heard = vi.fn();
    const stop = onSeatSelected(heard);
    expect(selectSeat("cm-03", "click")).toBe(true);
    expect(heard).toHaveBeenCalledTimes(1);
    expect(heard).toHaveBeenCalledWith({ seatId: "cm-03", source: "click" });
    expect(useSelection.getState().focus?.seatId).toBe("cm-03");
    stop();
  });

  it("a listener that stopped hears nothing more", () => {
    const heard = vi.fn();
    onSeatSelected(heard)();
    selectSeat("ops-01");
    expect(heard).not.toHaveBeenCalled();
  });

  it("ignores a seat that is not in the office", () => {
    const heard = vi.fn();
    const stop = onSeatSelected(heard);
    expect(selectSeat("cm-99")).toBe(false);
    expect(useSelection.getState().selected).toBeNull();
    expect(heard).not.toHaveBeenCalled();
    stop();
  });

  it("selecting the same helper again moves the camera back to them", () => {
    selectSeat("lead-02");
    const first = useSelection.getState().focus?.request ?? 0;
    selectSeat("lead-02");
    expect(useSelection.getState().focus?.request).toBe(first + 1);
  });

  it("clearing tells the listeners, and clearing again stays quiet", () => {
    selectSeat("mgr-01");
    const heard = vi.fn();
    const stop = onSeatSelected(heard);
    selectSeat(null, "keyboard");
    selectSeat(null, "keyboard");
    expect(heard).toHaveBeenCalledTimes(1);
    expect(heard).toHaveBeenCalledWith({ seatId: null, source: "keyboard" });
    stop();
  });

  it("a selected helper that leaves the office is cleared", () => {
    selectSeat("ops-10");
    setSeatSpots(new Map());
    expect(useSelection.getState().selected).toBeNull();
  });
});

describe("office name tags", () => {
  it("names the helper and shows the track as the role", () => {
    const tag = tagsFor(seats, team.members).find((t) => t.id === "cm-03");
    expect(tag).toMatchObject({ name: "CM 03 helper", role: "Category Manager", track: "CM" });
  });

  it("off-duty helpers get no tag", () => {
    const off = seats.map((s) => (s.id === "ops-02" ? { ...s, status: "off-duty" as const } : s));
    const ids = tagsFor(off, team.members).map((t) => t.id);
    expect(ids).not.toContain("ops-02");
    expect(ids).toHaveLength(25);
  });

  it("status comes from the seat", () => {
    const waiting = seats.map((s) =>
      s.id === "lead-01" ? { ...s, status: "waiting-on-you" as const } : s,
    );
    expect(tagsFor(waiting, team.members).find((t) => t.id === "lead-01")?.status).toBe(
      "waiting-on-you",
    );
  });

  it("a pod of four tags spreads out with no overlap, and never below a helper", () => {
    const pod = [
      { id: "a", x: 100, y: 200, w: 130, h: 28 },
      { id: "b", x: 140, y: 190, w: 130, h: 28 },
      { id: "c", x: 120, y: 180, w: 130, h: 28 },
      { id: "d", x: 160, y: 170, w: 130, h: 28 },
    ];
    const spots = spreadTags(pod);
    const boxes = pod.map((t) => ({ ...t, ...spots.get(t.id) }));
    for (const [i, p] of boxes.entries()) {
      expect(p.y).toBeLessThanOrEqual((pod[i] as { y: number }).y);
      for (const q of boxes.slice(i + 1)) {
        const apart =
          Math.abs(p.x - q.x) >= (p.w + q.w) / 2 || Math.abs(p.y - q.y) >= (p.h + q.h) / 2;
        expect(apart).toBe(true);
      }
    }
    // The front tag keeps its place.
    expect(spots.get("a")).toEqual({ x: 100, y: 200 });
  });

  it("spreading uses less height than stacking", () => {
    const row = Array.from({ length: 6 }, (_, i) => ({
      id: `t${i}`,
      x: 400 + i * 30,
      y: 300 - i * 8,
      w: 130,
      h: 28,
    }));
    const tops = [...spreadTags(row).values()].map((s) => s.y);
    // Stacking six 28 px tags would need 5 rows above the lowest one (160 px).
    expect(300 - Math.min(...tops)).toBeLessThan(160);
  });

  it("tags float 2.4 m above each seat", () => {
    for (const a of tagAnchors(team.members)) expect(a.position[1]).toBe(2.4);
  });

  it("the role line shows when zoomed in, with a gap so it never flickers", () => {
    const overview = 30;
    expect(compactAt(overview, overview, true)).toBe(true);
    expect(compactAt(overview * ROLE_SHOW_AT, overview, true)).toBe(false);
    // Inside the gap, a tag keeps what it shows now.
    const between = overview * ((ROLE_SHOW_AT + ROLE_HIDE_AT) / 2);
    expect(compactAt(between, overview, true)).toBe(true);
    expect(compactAt(between, overview, false)).toBe(false);
    expect(compactAt(overview * ROLE_HIDE_AT, overview, false)).toBe(true);
  });

  it("the camera frames a selected helper in the middle, closer than the Overview", () => {
    const point: [number, number, number] = [10, 0, 5];
    const framing = frameSeat(point, { width: 1440, height: 900 }, []);
    // Compare on screen: the target is on the floor, the picture includes the tag height.
    const [right, up] = toScreen(...framing.target);
    const [helperRight, helperUp] = toScreen(10, 1.2, 5);
    expect(Math.abs(right - helperRight)).toBeLessThan(0.3);
    expect(Math.abs(up - helperUp)).toBeLessThan(0.3);
    expect(framing.zoom).toBeGreaterThan(60);
  });
});
