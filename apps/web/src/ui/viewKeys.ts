import type { ViewId } from "../state/store";

const KEY_TO_VIEW: Record<string, ViewId> = {
  "1": "overview",
  "2": "cm",
  "3": "ops",
  "4": "mgr",
  "5": "bridge",
};

/** True while the user types in a field, where no shortcut may fire (D-031). */
function isTyping(target: EventTarget | null): boolean {
  if (!target || !("tagName" in target)) return false;
  const el = target as HTMLElement;
  if (el.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

/**
 * The camera view for a key press, or null. Keys 1 to 4 pick a view (isometric-office skill),
 * and 5 the Endorsement Bridge (council decision, 27 Sep 2026).
 * They work while the panel has focus (D-039), but never while typing, with a modifier key, or
 * on a held key that repeats.
 */
export function viewForKey(
  event: Pick<
    KeyboardEvent,
    "key" | "target" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey" | "repeat"
  >,
): ViewId | null {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat) return null;
  if (isTyping(event.target)) return null;
  return KEY_TO_VIEW[event.key] ?? null;
}
