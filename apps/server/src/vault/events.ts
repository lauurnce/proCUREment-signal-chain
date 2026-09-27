import { sep } from "node:path";
import type { AppState, ServerEvent } from "@hq/shared";

/** True when every changed path is inside office/ (layout.json, accessories.json, zones.json). */
function onlyOffice(changed: string[]): boolean {
  return changed.length > 0 && changed.every((path) => path.split(sep)[0] === "office");
}

const sameList = (a: string[], b: string[]) =>
  a.length === b.length && a.every((item, i) => item === b[i]);

/**
 * The event to send after the vault reloads. An edit inside office/ sends only office.updated,
 * so the office changes live without a page reload. When the warnings changed too, or other
 * files changed, it sends a full snapshot, so the health badge and the rest stay true.
 */
export function eventForChange(changed: string[], previous: AppState, next: AppState): ServerEvent {
  if (onlyOffice(changed) && sameList(previous.warnings, next.warnings)) {
    return { type: "office.updated", office: next.office };
  }
  return { type: "state.snapshot", state: next };
}
