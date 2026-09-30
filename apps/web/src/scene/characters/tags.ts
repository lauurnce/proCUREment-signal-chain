import type { Seat } from "@hq/shared";
import type { ScreenRect } from "../../state/overlays";
import { track } from "../../theme/tokens";
import { type Framing, fitRects, MAX_ZOOM, type Viewport } from "../camera/presets";
import type { TagData } from "../tags/TagLayer";
import type { TagAnchor } from "../tags/TagProjector";
import type { Wait } from "./behavior";
import type { CrowdMember } from "./crowdPlan";

/** An office tag: the Lab tag plus whether the helper waits on you (its tag always shows). */
export type OfficeTagData = TagData & { waitsOnYou: boolean };

/** A seated helper's tag sits 2.4 m above the floor, 0.35 m over the hair (D-045). */
export const SEATED_TAG_HEIGHT = 2.4;

/** The role line shows from this multiple of the Overview zoom... */
export const ROLE_SHOW_AT = 1.55;
/** ...and hides again below this one. The gap keeps tags from flickering at the edge. */
export const ROLE_HIDE_AT = 1.45;

/**
 * One tag per helper in the office. Off-duty helpers get no tag (isometric-office skill).
 * The name points at the helper, never the person (D-028, D-046). The role is the track name,
 * until helpers get job nicknames.
 */
export function tagsFor(
  seats: Seat[],
  members: CrowdMember[],
  /** Who waiting helpers wait on (behavior.waitsFor). */
  waits: Map<string, Wait> = new Map(),
): OfficeTagData[] {
  const drawn = new Set(members.map((m) => m.id));
  return seats
    .filter((s) => drawn.has(s.id))
    .map((s) => {
      const wait = waits.get(s.id);
      return {
        id: s.id,
        track: s.track,
        name: s.helper.name ?? `${s.displayName} helper`,
        // A helper waiting on someone else says so, as a kind of decision (D-046).
        role: wait?.line ?? track[s.track].label,
        status: s.status,
        waitsOnYou: s.status === "waiting-on-you" && (wait?.onYou ?? true),
      };
    });
}

export function tagAnchors(members: CrowdMember[]): TagAnchor[] {
  return members.map((m) => ({
    id: m.id,
    position: [m.position[0], SEATED_TAG_HEIGHT, m.position[2]],
  }));
}

/** True when tags should be compact (dot and name only) at this zoom. */
export function compactAt(zoom: number, overviewZoom: number, wasCompact: boolean): boolean {
  if (!(overviewZoom > 0)) return true;
  const ratio = zoom / overviewZoom;
  return wasCompact ? ratio < ROLE_SHOW_AT : ratio <= ROLE_HIDE_AT;
}

/** A tag on screen: its center and size, in px. */
export type TagBox = { id: string; x: number; y: number; w: number; h: number };

const GAP = 4;
/** How far a tag may step: rows up, and half-widths to each side. */
const MAX_ROWS = 6;
const MAX_SIDE = 2;

const overlaps = (a: TagBox, b: TagBox) =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 + GAP && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + GAP;

/**
 * Spreads tags so none overlap, with the smallest move. Tags nearer the camera (lower on
 * screen) are placed first and keep their spot. A tag behind tries spots up and to the sides,
 * and takes the nearest free one. It never moves below its helper. Side steps cost a little
 * more than steps up, so a tag stays over its own helper when it can.
 * Returns the new center of each tag.
 */
export function spreadTags(
  tags: TagBox[],
  /** Boxes that stay where they are, like the zone labels the Overview always shows. */
  keepClear: TagBox[] = [],
): Map<string, { x: number; y: number }> {
  const placed: TagBox[] = [...keepClear];
  for (const tag of [...tags].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = tag.h + GAP;
    const side = tag.w / 2 + GAP;
    let best: TagBox | null = null;
    let bestCost = Number.POSITIVE_INFINITY;
    for (let r = 0; r <= MAX_ROWS; r++) {
      for (let s = -MAX_SIDE; s <= MAX_SIDE; s++) {
        const cost = r * row + Math.abs(s) * side * 1.25;
        if (cost >= bestCost) continue;
        const spot = { ...tag, x: tag.x + s * side, y: tag.y - r * row };
        if (placed.some((p) => overlaps(spot, p))) continue;
        best = spot;
        bestCost = cost;
      }
    }
    // Nowhere free nearby: stack above the highest tag it touches, like the Lab nudge.
    if (!best) {
      best = { ...tag };
      for (let guard = 0; guard < placed.length; guard++) {
        const hit = placed.find((p) => overlaps(best as TagBox, p));
        if (!hit) break;
        best.y = hit.y - (hit.h + best.h) / 2 - GAP;
      }
    }
    placed.push(best);
  }
  return new Map(placed.slice(keepClear.length).map((t) => [t.id, { x: t.x, y: t.y }]));
}

/** Half the width of the floor square the camera frames around a selected helper, in meters. */
const FOCUS_REACH = 2.2;

/** The camera framing for a selected helper: their desk and neighbors, clear of the overlays. */
export function frameSeat(
  point: [number, number, number],
  viewport: Viewport,
  /** The page overlays to keep clear of, and the docked panel as a right inset. */
  around: { obstacles?: ScreenRect[]; rightInset?: number },
): Framing {
  const [x, , z] = point;
  const r = FOCUS_REACH;
  return fitRects([[x - r, z - r, r * 2, r * 2]], SEATED_TAG_HEIGHT, viewport, {
    ...around,
    maxZoom: MAX_ZOOM,
  });
}
