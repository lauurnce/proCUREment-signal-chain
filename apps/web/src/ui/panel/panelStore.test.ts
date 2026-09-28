import type { QueueItem } from "@hq/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { linkState, RECONNECT_GRACE_MS } from "./linkState";
import { decisionMessage, panelCounts, usePanelStore } from "./panelStore";

const item = (id: string, approver: string, kind = "approval", status = "needs-you") =>
  ({ id, approver, kind, status, created: `2026-09-25T0${id.slice(-1)}:00:00+08:00` }) as QueueItem;

const queue = [
  item("q-1", "mgr-01"),
  item("q-2", "mgr-01", "email-draft"),
  item("q-3", "cm-02", "email-draft"),
  item("q-4", "ops-07"),
  item("q-5", "mgr-01", "approval", "approved"),
];

const store = () => usePanelStore.getState();

describe("panel counts (D-042)", () => {
  it("counts items only: yours, drafts to review, and waiting on others", () => {
    expect(panelCounts(queue, {})).toEqual({ needsYou: 2, drafts: 2, waitingOnOthers: 2 });
  });

  it("drops the items decided in this tab", () => {
    expect(panelCounts(queue, { "q-1": "approve", "q-3": "hold" })).toEqual({
      needsYou: 1,
      drafts: 1,
      waitingOnOthers: 1,
    });
  });
});

describe("decision messages (copy deck, undo.*)", () => {
  it("says who decided, and marks team items as a demo", () => {
    expect(decisionMessage("approve", "Ops 07 helper", null, "9:35 AM")).toBe(
      "Approved by you, 9:35 AM.",
    );
    expect(decisionMessage("hold", "CM 02 helper", "CM 02", "9:35 AM")).toBe(
      "Put on hold as CM 02 (demo), 9:35 AM.",
    );
    expect(decisionMessage("send-back", "CM 02 helper", null, "9:35 AM")).toBe(
      "Sent back to CM 02 helper, 9:35 AM.",
    );
  });
});

describe("panel store, mocked decisions", () => {
  beforeEach(() => store().start());

  it("starts on Needs you with focus on the first card, without scrolling", () => {
    expect(store().tab).toBe("needs");
    expect(store().focusRequest).toEqual({ target: "card", quiet: true });
  });

  it("can open a tab or the first item for screenshots", () => {
    store().start({ tab: "team" });
    expect(store().tab).toBe("team");
    expect(store().focusRequest).toBeNull();
    store().start({ openFirst: true });
    expect(store().detailOpen).toBe(true);
    expect(store().focusRequest?.target).toBe("detail");
  });

  it("records a decision, moves focus to the next card, and offers undo", () => {
    store().decide("q-1", "approve", "Approved by you, 9:35 AM.", "q-2");
    expect(store().decided).toEqual({ "q-1": "approve" });
    expect(store().focusedId).toBe("q-2");
    expect(store().focusRequest).toEqual({ target: "card", id: "q-2" });
    expect(store().announce).toBe("Approved by you, 9:35 AM. Undo for 5 seconds, press U.");
    expect(store().undo).toEqual({ itemId: "q-1", message: "Approved by you, 9:35 AM." });
  });

  it("after the last item, closes the detail and keeps focus in the panel", () => {
    store().setDetailOpen(true);
    store().decide("q-1", "hold", "On hold, 9:35 AM.", null);
    expect(store().detailOpen).toBe(false);
    expect(store().focusRequest).toEqual({ target: "panel" });
  });

  it("undo puts the item back and returns focus to it", () => {
    store().decide("q-1", "approve", "Approved by you, 9:35 AM.", "q-2");
    store().undoLast();
    expect(store().decided).toEqual({});
    expect(store().focusedId).toBe("q-1");
    expect(store().undo).toBeNull();
    expect(store().announce).toBe("Undone. The item is back in Needs you.");
  });

  it("an instruction is only a preview, and undo clears it", () => {
    store().setText("Ask for a firm date.");
    store().send('This would go to CM 02 helper: "Ask for a firm date."', "Instruction sent.");
    expect(store().text).toBe("");
    expect(store().preview).toContain("This would go to");
    store().undoLast();
    expect(store().preview).toBeNull();
  });

  it("the HUD button opens Needs you and asks for focus on the card", () => {
    store().setTab("board");
    store().setDetailOpen(true);
    store().showNeedsYou();
    expect(store().tab).toBe("needs");
    expect(store().detailOpen).toBe(false);
    expect(store().focusRequest).toEqual({ target: "card" });
  });
});

describe("link state (panel spec, section 6)", () => {
  it("says Reconnecting for 10 s after a drop, then Offline", () => {
    expect(linkState("live", 0)).toBe("live");
    expect(linkState("connecting", 0)).toBe("connecting");
    expect(linkState("offline", 0)).toBe("reconnecting");
    expect(linkState("offline", RECONNECT_GRACE_MS)).toBe("offline");
  });
});
