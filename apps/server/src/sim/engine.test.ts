import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AuthorityRulesFile, type QueueStatus, WorkflowsFile } from "@hq/shared";
import { describe, expect, it } from "vitest";
import { ruleFor } from "./authority";
import { DemoDayEngine, type Effect, PLAYER_SEAT, type SimSeat } from "./engine";

const root = resolve(import.meta.dirname, "../../../..");
const json = (p: string) => JSON.parse(readFileSync(resolve(root, p), "utf8"));
const workflows = WorkflowsFile.parse(json("data/workflows.json")).workflows;
const rules = AuthorityRulesFile.parse(json("data/authority-rules.template.json")).rules;
const roster = json("data/roster.template.json").seats as {
  id: string;
  track: SimSeat["track"];
  workflows: string[];
  displayName: string;
}[];
const seats: SimSeat[] = roster.map((s) => ({
  id: s.id,
  track: s.track,
  workflows: s.workflows,
  label: s.displayName,
}));

/** Plays a whole day, deciding nothing: items for you stay open. */
function playDay(seed: number, until = 18 * 60): Effect[] {
  const engine = new DemoDayEngine({ seed, date: "2026-10-13", seats, workflows, rules });
  return [...engine.start(), ...engine.advance(until, new Map<string, QueueStatus>())];
}
const items = (effects: Effect[]) => effects.flatMap((e) => (e.type === "item" ? [e.item] : []));
const logs = (effects: Effect[]) => effects.flatMap((e) => (e.type === "log" ? [e.text] : []));

describe("Demo Day engine", () => {
  it("replays the same day from the same seed, and a new seed gives a new day", () => {
    expect(JSON.stringify(playDay(7))).toBe(JSON.stringify(playDay(7)));
    expect(JSON.stringify(playDay(7))).not.toBe(JSON.stringify(playDay(8)));
  });

  it("raises Needs you items only at steps where a person decides", () => {
    const steps = new Map(workflows.map((w) => [w.id, new Map(w.steps.map((s) => [s.id, s]))]));
    const all = items(playDay(42));
    expect(all.length).toBeGreaterThan(20);
    for (const item of all) {
      if (item.workflow === "mgr-decisions") continue;
      expect(steps.get(item.workflow)?.get(item.step)?.needsHuman, item.title).toBe(true);
    }
    // Some wait for you, most go to the CM, Ops Buyer or Lead who owns the step.
    const forYou = all.filter((i) => i.approver === PLAYER_SEAT);
    expect(forYou.length).toBeGreaterThan(0);
    expect(forYou.length).toBeLessThan(all.length / 2);
  });

  it("uses fictional suppliers and reserved .example mail only", () => {
    for (const item of items(playDay(42))) {
      if (item.supplier) expect(item.supplier).toMatch(/\(fictional\)$/);
      for (const to of item.email?.to ?? []) expect(to).toMatch(/\.example$/);
    }
  });

  it("endorses PRs from a CM to an Ops Buyer at the Endorsement Bridge, which starts Ops work", () => {
    const effects = playDay(42);
    const handoffs = logs(effects).filter((l) => l.includes("at the Endorsement Bridge"));
    expect(handoffs.length).toBeGreaterThan(0);
    expect(handoffs[0]).toMatch(/^cm-\d+ endorsed \d+ PRs to ops-\d+ at the Endorsement Bridge$/);
    const convert = effects.filter(
      (e) => e.type === "task" && e.task.workflow === "ops-pr-to-po-stock-item",
    );
    expect(convert.length).toBeGreaterThan(0);
  });

  it("applies the authority rule to PO amendments", () => {
    expect(ruleFor(rules, { type: "price-change", percent: 3, amount: 900 })?.decidedBy).toBe(
      "OPS",
    );
    expect(ruleFor(rules, { type: "price-change", percent: 3, amount: 2500 })?.decidedBy).toBe(
      "CM",
    );
    expect(ruleFor(rules, { type: "price-change", percent: 5, amount: 100 })?.decidedBy).toBe("CM");
    expect(ruleFor(rules, { type: "quantity-change" })?.decidedBy).toBe("PLANNER");
    const text = logs(playDay(42)).join("\n");
    expect(text).toMatch(/changed PO-45\d+ in SAP, .* \(rule: price-small\)|routed .* \(rule: /);
    for (const item of items(playDay(42)).filter(
      (i) => i.workflow === "ops-po-amendments" && i.step === "decide",
    )) {
      expect(item.approver).toMatch(/^cm-/);
      expect(item.rule).toBeTruthy();
    }
  });

  it("never turns your hold into an approval: the helper reminds you after an hour", () => {
    const engine = new DemoDayEngine({ seed: 42, date: "2026-10-13", seats, workflows, rules });
    const early = [...engine.start(), ...engine.advance(17 * 60, new Map())];
    const mine = items(early).find((i) => i.approver === PLAYER_SEAT);
    if (!mine) throw new Error("seed 42 should raise an item for you");
    const held = new Map<string, QueueStatus>([[mine.id, "held"]]);
    const later = engine.advance(17 * 60 + 59, held);
    expect(later.some((e) => e.type === "remind")).toBe(false);
    const after = engine.advance(18 * 60 + 5, held);
    expect(after).toContainEqual({ type: "remind", id: mine.id });
    expect(logs(after).join("\n")).toContain(`reminded you about ${mine.id}`);
  });

  it("sends helpers to the zone of each step, and waits on items for you", () => {
    const effects = playDay(42, 11 * 60);
    const atSap = effects.filter((e) => e.type === "seat" && e.currentStep === "extract");
    expect(atSap.length).toBeGreaterThan(0);
    const waiting = effects.filter((e) => e.type === "seat" && e.status === "waiting-on-you");
    expect(waiting.length).toBeGreaterThan(0);
  });
});
