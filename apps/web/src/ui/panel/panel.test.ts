import type { QueueItem, Seat } from "@hq/shared";
import { describe, expect, it } from "vitest";
import { decidesLine, decidingAs, helperName, needsYou, urgency } from "./queue";
import { ago, fullTime } from "./time";

const item = (id: string, approver: string, created: string, status = "needs-you") =>
  ({ id, approver, created, status }) as QueueItem;

const seats = [
  { id: "cm-02", displayName: "CM 02", track: "CM" },
  { id: "ops-07", displayName: "Ops 07", track: "OPS" },
] as Seat[];

describe("needs you list", () => {
  const queue = [
    item("q-2", "mgr-01", "2026-09-25T09:05:00+08:00"),
    item("q-1", "mgr-01", "2026-09-25T08:40:00+08:00"),
    item("q-3", "cm-02", "2026-09-25T09:20:00+08:00"),
    item("q-4", "mgr-01", "2026-09-25T07:00:00+08:00", "approved"),
  ];

  it("puts the most urgent first: escalation, rule, email draft, then the rest", () => {
    const at = "2026-09-25T09:00:00+08:00";
    const mixed = [
      { ...item("summary", "mgr-01", at), kind: "summary" },
      { ...item("email", "mgr-01", at), kind: "email-draft" },
      { ...item("old-summary", "mgr-01", "2026-09-25T08:00:00+08:00"), kind: "summary" },
      { ...item("rule", "mgr-01", at), kind: "approval", rule: "price-large" },
      { ...item("esc", "mgr-01", at), kind: "escalation" },
    ] as QueueItem[];
    expect(needsYou(mixed, "mine").map((q) => q.id)).toEqual([
      "esc",
      "rule",
      "email",
      "old-summary",
      "summary",
    ]);
    expect(urgency(mixed[0] as QueueItem)).toBe(3);
  });

  it("shows only what the Sr. Manager decides, oldest first", () => {
    expect(needsYou(queue, "mine").map((q) => q.id)).toEqual(["q-1", "q-2"]);
  });

  it("adds other seats' items with the team filter, and never decided items", () => {
    expect(needsYou(queue, "team").map((q) => q.id)).toEqual(["q-1", "q-2", "q-3"]);
  });

  it("labels team items with the kind of decider, never the seat (D-046)", () => {
    expect(decidingAs(seats, item("x", "cm-02", ""))).toBe("a CM");
    expect(decidesLine(seats, item("x", "cm-02", ""))).toBe(
      "A Category Manager (you, in this demo)",
    );
    expect(decidesLine(seats, item("x", "mgr-01", ""))).toBe("You");
    expect(decidingAs(seats, item("x", "mgr-01", ""))).toBeNull();
  });

  it("names helpers by seat (D-028)", () => {
    expect(helperName(seats, "ops-07")).toBe("Ops 07 helper");
    expect(helperName(seats, "zz-99")).toBe("zz-99 helper");
  });
});

describe("panel times (Manila)", () => {
  const now = new Date("2026-09-25T09:30:00+08:00");

  it("uses plain relative words on the same day", () => {
    expect(ago("2026-09-25T09:30:00+08:00", now)).toBe("Just now");
    expect(ago("2026-09-25T09:10:00+08:00", now)).toBe("20 min ago");
    expect(ago("2026-09-25T08:25:00+08:00", now)).toBe("1 hour ago");
    expect(ago("2026-09-25T07:05:00+08:00", now)).toBe("2 hours ago");
  });

  it("says yesterday with the time, and only the date when older", () => {
    expect(ago("2026-09-24T16:45:00+08:00", now)).toBe("Yesterday, 4:45 PM");
    expect(ago("2026-09-23T10:00:00+08:00", now)).toBe("23 Sep 2026");
  });

  it("writes full times the adi-theme way", () => {
    expect(fullTime("2026-09-25T09:20:00+08:00")).toBe("25 Sep 2026, 9:20 AM");
  });
});
