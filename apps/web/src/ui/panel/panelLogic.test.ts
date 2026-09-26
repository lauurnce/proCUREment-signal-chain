import type { QueueItem, Seat, Workflow } from "@hq/shared";
import { describe, expect, it } from "vitest";
import { stepInfo, toDecisionItem, whyText } from "./itemView";
import { type KeyInput, panelAction } from "./keys";
import { firstLine, sections } from "./markdown";

const key = (k: string, more: Partial<KeyInput> = {}): KeyInput => ({
  key: k,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  inField: false,
  ...more,
});

describe("panel keys (D-031)", () => {
  it("maps the decision and list keys", () => {
    expect(panelAction(key("a"))).toBe("approve");
    expect(panelAction(key("H"))).toBe("hold");
    expect(panelAction(key("s"))).toBe("sendBack");
    expect(panelAction(key("i"))).toBe("instruct");
    expect(panelAction(key("j"))).toBe("next");
    expect(panelAction(key("k"))).toBe("prev");
    expect(panelAction(key("Enter"))).toBe("open");
    expect(panelAction(key("?"))).toBe("help");
    expect(panelAction(key("]"))).toBe("tabNext");
  });

  it("never fires a shortcut while typing, except Esc to leave the box", () => {
    expect(panelAction(key("a", { inField: true }))).toBeNull();
    expect(panelAction(key("Enter", { inField: true }))).toBeNull();
    expect(panelAction(key("Escape", { inField: true }))).toBe("back");
  });

  it("leaves browser shortcuts alone, but Cmd+Z is undo", () => {
    expect(panelAction(key("a", { metaKey: true }))).toBeNull();
    expect(panelAction(key("s", { ctrlKey: true }))).toBeNull();
    expect(panelAction(key("z", { metaKey: true }))).toBe("undo");
  });
});

describe("item body sections", () => {
  const body = [
    "## Summary",
    "The invoice is 6.5 percent above",
    "the PO price.",
    "",
    "## What the helper checked",
    "- PO price vs invoice price.",
    "- Freight is the same.",
    "",
    "## Options",
    "1. Approve the new price.",
    "2. Send back to Ops.",
    "",
    "| Supplier | Price |",
    "|---|---|",
    "| A | 1 |",
  ].join("\n");

  it("reads headings, paragraphs, lists and tables in order", () => {
    const s = sections(body);
    expect(s.map((x) => x.heading)).toEqual(["Summary", "What the helper checked", "Options"]);
    expect(s[0]?.blocks[0]).toEqual({
      kind: "paragraph",
      text: "The invoice is 6.5 percent above the PO price.",
    });
    expect(s[1]?.blocks[0]).toMatchObject({ kind: "list", ordered: false });
    expect(s[2]?.blocks[0]).toMatchObject({ kind: "list", ordered: true });
    expect(s[2]?.blocks[1]).toEqual({
      kind: "table",
      header: ["Supplier", "Price"],
      rows: [["A", "1"]],
    });
  });

  it("gives a one-line preview", () => {
    expect(firstLine(sections(body)[2])).toBe("Approve the new price.");
  });
});

describe("focused card from a queue item", () => {
  const seats = [
    { id: "ops-07", displayName: "Ops 07", track: "OPS" },
    { id: "cm-02", displayName: "CM 02", track: "CM" },
  ] as Seat[];
  const workflows = [
    {
      id: "ops-po-amendments",
      name: "PO amendments",
      steps: [
        { id: "inbox" },
        { id: "identify" },
        { id: "decide", label: "Apply the rule" },
        { id: "amend" },
      ],
    },
  ] as Workflow[];
  const item = {
    id: "q-0003",
    title: "Price change of 6.5 percent on PO-452114",
    kind: "approval",
    from: "ops-07",
    approver: "cm-02",
    track: "OPS",
    workflow: "ops-po-amendments",
    step: "decide",
    rule: "price-large",
    supplier: "Batangas Metalcraft Industries (fictional)",
    body: "## Options\n1. Approve the new price.\n",
  } as QueueItem;

  it("names the workflow step", () => {
    expect(stepInfo(workflows, item)).toMatchObject({
      workflow: "PO amendments",
      step: "Step 3 of 4",
    });
  });

  it("explains the authority rule in plain words", () => {
    expect(whyText(seats, item)).toBe(
      "Price is up 6.5 percent. Changes of 5 percent or more need a Category Manager.",
    );
  });

  it("labels team items and sends back to the helper, not the person", () => {
    const card = toDecisionItem(seats, workflows, item);
    expect(card.decidingAs).toBe("CM 02");
    expect(card.sendBackTo).toBe("Ops 07 helper");
    expect(card.ruleConfirmed).toBe(false);
    expect(card.suggestion).toBe("Approve the new price.");
  });
});
