import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseFrontmatter } from "../vault/frontmatter";
import { AccessoriesFile, Accessory } from "./accessory";
import { AuthorityRulesFile } from "./authority-rule";
import { Id, IsoDateTime } from "./common";
import { ServerEvent } from "./events";
import { QueueItem } from "./queue-item";
import { RosterFile, RosterLocalFile, SeatProfile } from "./seat";
import { Task } from "./task";
import { WorkflowsFile } from "./workflow";
import { ZonesFile } from "./zone";

const repoRoot = resolve(import.meta.dirname, "../../../..");
const json = (path: string): unknown => JSON.parse(readFileSync(join(repoRoot, path), "utf8"));
const record = (path: string) => {
  const { data, body } = parseFrontmatter(readFileSync(join(repoRoot, path), "utf8"));
  return { ...data, body };
};

const sampleQueue = () => record("vault.sample/queue/q-0001-ops-03-luzon-po-451208.md");
const sampleTask = () => record("vault.sample/board/t-0001.md");

describe("common", () => {
  it("ids must be lowercase kebab case", () => {
    expect(Id.safeParse("cm-03").success).toBe(true);
    expect(Id.safeParse("CM-03").success).toBe(false);
    expect(Id.safeParse("cm_03").success).toBe(false);
  });

  it("date and time needs a time zone offset", () => {
    expect(IsoDateTime.safeParse("2026-09-25T08:40:00+08:00").success).toBe(true);
    expect(IsoDateTime.safeParse("25 Sep 2026").success).toBe(false);
  });
});

describe("Seat", () => {
  it("accepts the committed roster with 26 seats", () => {
    expect(RosterFile.parse(json("data/roster.template.json")).seats).toHaveLength(26);
  });

  it("rejects a seat with an unknown track", () => {
    const roster = RosterFile.parse(json("data/roster.template.json"));
    const bad = { ...roster, seats: [{ ...roster.seats[0], track: "BOSS" }] };
    expect(RosterFile.safeParse(bad).success).toBe(false);
  });

  it("accepts the local roster example", () => {
    expect(RosterLocalFile.safeParse(json("data/roster.local.example.json")).success).toBe(true);
  });

  it("a live profile rejects a status that is not in the list", () => {
    const profile = record("vault.sample/team/cm-03/profile.md");
    expect(SeatProfile.safeParse(profile).success).toBe(true);
    expect(SeatProfile.safeParse({ ...profile, status: "busy" }).success).toBe(false);
  });
});

describe("QueueItem", () => {
  it("accepts a sample email draft with its body", () => {
    const item = QueueItem.parse(sampleQueue());
    expect(item.email?.to).toEqual(["orders@luzonprecision.example"]);
    expect(item.body).toContain("## Summary");
  });

  it("rejects an email draft with a bad address", () => {
    const item = sampleQueue() as Record<string, unknown>;
    const bad = { ...item, email: { to: ["not an email"], cc: [], subject: "Hi" } };
    expect(QueueItem.safeParse(bad).success).toBe(false);
  });

  it("rejects a decision action that is not one of the four", () => {
    const bad = {
      ...sampleQueue(),
      decision: { action: "delete", by: "mgr-01", at: "2026-09-25T10:00:00+08:00" },
    };
    expect(QueueItem.safeParse(bad).success).toBe(false);
  });
});

describe("Task", () => {
  it("accepts a sample board task", () => {
    expect(Task.parse(sampleTask()).status).toBe("doing");
  });

  it("rejects a due date with a time in it", () => {
    expect(Task.safeParse({ ...sampleTask(), due: "2026-09-25T17:00:00+08:00" }).success).toBe(
      false,
    );
  });
});

describe("Zone", () => {
  it("accepts the committed zones", () => {
    expect(ZonesFile.parse(json("vault.sample/office/zones.json")).zones.length).toBeGreaterThan(
      10,
    );
  });

  it("rejects an unknown zone kind", () => {
    const zones = ZonesFile.parse(json("vault.sample/office/zones.json"));
    const bad = { ...zones, zones: [{ ...zones.zones[0], kind: "rooftop-pool" }] };
    expect(ZonesFile.safeParse(bad).success).toBe(false);
  });
});

describe("Accessory", () => {
  it("accepts the committed props", () => {
    expect(AccessoriesFile.safeParse(json("vault.sample/office/accessories.json")).success).toBe(
      true,
    );
  });

  it("position must be two numbers, x and z", () => {
    const base = { id: "plant-01", kind: "plant-tall", zone: "reception", enabled: true };
    expect(Accessory.safeParse({ ...base, pos: [2, 3] }).success).toBe(true);
    expect(Accessory.safeParse({ ...base, pos: [2, 3, 4] }).success).toBe(false);
  });
});

describe("Workflow", () => {
  it("accepts the committed workflows", () => {
    expect(WorkflowsFile.parse(json("data/workflows.json")).workflows).toHaveLength(8);
  });

  it("rejects a workflow with no steps", () => {
    const file = WorkflowsFile.parse(json("data/workflows.json"));
    const bad = { ...file, workflows: [{ ...file.workflows[0], steps: [] }] };
    expect(WorkflowsFile.safeParse(bad).success).toBe(false);
  });
});

describe("AuthorityRule", () => {
  it("accepts the committed rules, still marked as not confirmed", () => {
    const rules = AuthorityRulesFile.parse(json("data/authority-rules.template.json"));
    expect(rules.confirmed).toBe(false);
    expect(rules.rules.map((rule) => rule.id)).toContain("price-large");
  });

  it("rejects a rule decided by an unknown role", () => {
    const rules = AuthorityRulesFile.parse(json("data/authority-rules.template.json"));
    const bad = { ...rules, rules: [{ ...rules.rules[0], decidedBy: "ANYONE" }] };
    expect(AuthorityRulesFile.safeParse(bad).success).toBe(false);
  });
});

describe("ServerEvent", () => {
  it("accepts a known event type", () => {
    expect(ServerEvent.safeParse({ type: "warning", message: "A file was skipped" }).success).toBe(
      true,
    );
  });

  it("rejects an unknown event type", () => {
    expect(ServerEvent.safeParse({ type: "user.online", user: "cm-03" }).success).toBe(false);
  });
});
