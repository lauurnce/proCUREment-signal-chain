// Panel keyboard map (docs/design/panel/spec.md section 5, D-031).
// The panel listens on its own root element, so keys only work while the panel has focus.
// That is how the letter keys meet WCAG 2.1.4 (active only on focus), with no off switch.

export type PanelAction =
  | "next"
  | "prev"
  | "open"
  | "back"
  | "approve"
  | "hold"
  | "sendBack"
  | "instruct"
  | "undo"
  | "help"
  | "tabPrev"
  | "tabNext";

export type KeyInput = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  /** Focus is in a text field, a select, or anything editable. */
  inField: boolean;
};

const SINGLE: Record<string, PanelAction> = {
  j: "next",
  k: "prev",
  a: "approve",
  h: "hold",
  s: "sendBack",
  i: "instruct",
  u: "undo",
  "?": "help",
  "[": "tabPrev",
  "]": "tabNext",
};

/** What a key press means in the panel, or null when the panel should ignore it. */
export function panelAction(e: KeyInput): PanelAction | null {
  // Esc always goes back one step, even from a text field (the text is kept).
  if (e.key === "Escape") return "back";
  // Never steal keys while typing, or from browser and system shortcuts.
  if (e.inField) return null;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") return "undo";
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  if (e.key === "Enter") return "open";
  if (e.key === "ArrowDown") return "next";
  if (e.key === "ArrowUp") return "prev";
  return SINGLE[e.key.toLowerCase()] ?? SINGLE[e.key] ?? null;
}

export function isField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}
