import type { QueueItem } from "@hq/shared";
import { create } from "zustand";
import type { Decision } from "../DecisionButton";
import type { TabId } from "./PanelTabs";
import { needsYou, type QueueFilter } from "./queue";

/** The numbers the stats HUD shows (D-042). Items only, never people. */
export type PanelCounts = { needsYou: number; drafts: number; waitingOnOthers: number };

/** The last decision or instruction, while its undo bar shows. `itemId` is null for an instruction. */
export type Undo = { itemId: string | null; message: string };

/** Where keyboard focus should go after the next render: a card, an item detail, or the panel. */
export type FocusRequest = { target: "card" | "detail" | "panel"; id?: string; quiet?: boolean };

/** The decisions made in this browser tab. Mocked for now: nothing is written or sent. */
export type Decided = Record<string, Decision>;

type PanelState = {
  tab: TabId;
  filter: QueueFilter;
  decided: Decided;
  focusedId: string | null;
  detailOpen: boolean;
  undo: Undo | null;
  helpOpen: boolean;
  audienceId: string;
  /** The item an instruction is about, like "PO-452114". */
  about: string | null;
  text: string;
  /** What an instruction would have sent. Shown instead of sending (no writes yet). */
  preview: string | null;
  /** The last message for the polite live region. */
  announce: string;
  focusRequest: FocusRequest | null;
  /** A helper to open in the Team tab (a click on them in the office, or E in Walk around). */
  helper: { seatId: string; request: number; focus: boolean } | null;
};

type PanelActions = {
  /** Fresh state for a page. Screenshots can open a tab, a filter or the first item directly. */
  start: (initial?: { tab?: TabId; openFirst?: boolean; filter?: QueueFilter }) => void;
  setTab: (tab: TabId) => void;
  /** Opens the Team tab with this helper's row open and in view. */
  showHelper: (seatId: string, options?: { focus?: boolean; talk?: boolean }) => void;
  /** The HUD button and the skip link: open Needs you and put focus on the card. */
  showNeedsYou: () => void;
  setFilter: (filter: QueueFilter) => void;
  focusCard: (id: string | null, request?: FocusRequest | null) => void;
  setDetailOpen: (open: boolean) => void;
  requestFocus: (request: FocusRequest | null) => void;
  /** Records a mocked decision and moves on to `nextId`. */
  decide: (itemId: string, decision: Decision, message: string, nextId: string | null) => void;
  undoLast: () => void;
  expireUndo: () => void;
  setHelpOpen: (open: boolean) => void;
  setAudience: (audienceId: string) => void;
  attach: (audienceId: string, about: string | null) => void;
  detach: () => void;
  setText: (text: string) => void;
  /** Shows what would have been sent, with undo. Nothing leaves the browser. */
  send: (preview: string, message: string) => void;
  say: (announce: string) => void;
};

export type PanelStore = PanelState & PanelActions;

const fresh = (): PanelState => ({
  tab: "needs",
  filter: "mine",
  decided: {},
  focusedId: null,
  detailOpen: false,
  undo: null,
  helpOpen: false,
  audienceId: "",
  about: null,
  text: "",
  preview: null,
  announce: "",
  focusRequest: null,
  helper: null,
});

export const usePanelStore = create<PanelStore>()((set, get) => ({
  ...fresh(),
  start: (initial) => {
    const tab = initial?.tab ?? "needs";
    set({
      ...fresh(),
      tab,
      filter: initial?.filter ?? "mine",
      detailOpen: Boolean(initial?.openFirst),
      // On load, focus goes to the first card without scrolling (D-048).
      focusRequest:
        tab === "needs" ? { target: initial?.openFirst ? "detail" : "card", quiet: true } : null,
    });
  },
  setTab: (tab) => set({ tab }),
  // An open item stays open, so "Back to decision" returns to it (council, 30 Sep 2026).
  // After a talk (E), the instruction box is addressed to that helper.
  showHelper: (seatId, options) =>
    set((s) => ({
      tab: "team",
      helper: {
        seatId,
        request: (s.helper?.request ?? 0) + 1,
        focus: Boolean(options?.focus),
      },
      ...(options?.talk ? { audienceId: `seat:${seatId}` } : {}),
    })),
  showNeedsYou: () => set({ tab: "needs", detailOpen: false, focusRequest: { target: "card" } }),
  setFilter: (filter) => set({ filter }),
  focusCard: (focusedId, request = null) => set({ focusedId, focusRequest: request }),
  setDetailOpen: (detailOpen) => set({ detailOpen }),
  requestFocus: (focusRequest) => set({ focusRequest }),
  decide: (itemId, decision, message, nextId) => {
    const { detailOpen } = get();
    set((s) => ({
      decided: { ...s.decided, [itemId]: decision },
      focusedId: nextId,
      undo: { itemId, message },
      announce: `${message} Undo for 5 seconds, press U.`,
      detailOpen: nextId ? detailOpen : false,
      // After a decision, focus moves to the next card, never out of the panel (D-048).
      focusRequest: nextId
        ? { target: detailOpen ? "detail" : "card", id: nextId }
        : { target: "panel" },
    }));
  },
  undoLast: () => {
    const { undo, detailOpen } = get();
    if (!undo) return;
    const { itemId } = undo;
    if (itemId) {
      set((s) => {
        const { [itemId]: _, ...rest } = s.decided;
        return {
          decided: rest,
          focusedId: itemId,
          undo: null,
          announce: "Undone. The item is back in Needs you.",
          focusRequest: { target: detailOpen ? "detail" : "card", id: itemId },
        };
      });
    } else {
      set({ preview: null, undo: null, announce: "Undone. The instruction was not sent." });
    }
  },
  expireUndo: () => set({ undo: null }),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  setAudience: (audienceId) => set({ audienceId }),
  attach: (audienceId, about) => set({ audienceId, about }),
  detach: () => set({ about: null }),
  setText: (text) => set({ text }),
  send: (preview, message) =>
    set({ preview, text: "", undo: { itemId: null, message }, announce: message }),
  say: (announce) => set({ announce }),
}));

/** The items still open in this tab: the queue minus the mocked decisions. */
export function openItems(queue: QueueItem[], decided: Decided): QueueItem[] {
  return queue.filter((q) => !decided[q.id]);
}

/** HUD and tab numbers. Always the default filter, never a head count (D-042, spec section 2). */
export function panelCounts(queue: QueueItem[], decided: Decided): PanelCounts {
  const open = openItems(queue, decided);
  const mine = needsYou(open, "mine").length;
  const team = needsYou(open, "team");
  return {
    needsYou: mine,
    drafts: team.filter((q) => q.kind === "email-draft").length,
    waitingOnOthers: team.length - mine,
  };
}

/** The undo bar line for a decision (copy deck, section 5). `as` is set for team items only. */
export function decisionMessage(
  decision: Exclude<Decision, "instruct">,
  helper: string,
  as: string | null,
  at: string,
): string {
  const demo = as ? ` as ${as} (demo)` : "";
  if (decision === "approve") return as ? `Approved${demo}, ${at}.` : `Approved by you, ${at}.`;
  if (decision === "hold") return as ? `Put on hold${demo}, ${at}.` : `On hold, ${at}.`;
  return `Sent back to ${helper}${demo}, ${at}.`;
}
