import type { ScreenRect } from "../../state/overlays";

/** Labels start to show at this multiple of the overview zoom... */
export const LABEL_FADE_START = 1.3;
/** ...and are fully shown here. The Overview shows only the labels marked "always". */
export const LABEL_FADE_END = 1.7;

/** Zones whose names show at every zoom: the places the camera views take you. */
export const ALWAYS_LABELED = ["cm-wing", "ops-wing", "endorsement-bridge", "mgr-office"];

/** Labels keep this far inside the screen edges, in pixels. */
export const LABEL_EDGE = 16;

/** Label opacity for a zoom, from 0 (hidden) to 1, with a smooth start and end. */
export function labelOpacity(zoom: number, overviewZoom: number): number {
  if (!(overviewZoom > 0)) return 0;
  const t = (zoom / overviewZoom - LABEL_FADE_START) / (LABEL_FADE_END - LABEL_FADE_START);
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped * (3 - 2 * clamped);
}

/**
 * True when a label centered at (x, y) fits: fully inside the screen with a 16 px edge, and
 * clear of every page overlay. A label that does not fit hides, rather than show cut off.
 */
export function labelPlacement(
  label: { x: number; y: number; width: number; height: number },
  screen: { width: number; height: number },
  overlays: ScreenRect[],
): boolean {
  const left = label.x - label.width / 2;
  const right = label.x + label.width / 2;
  const top = label.y - label.height / 2;
  const bottom = label.y + label.height / 2;
  if (left < LABEL_EDGE || top < LABEL_EDGE) return false;
  if (right > screen.width - LABEL_EDGE || bottom > screen.height - LABEL_EDGE) return false;
  return !overlays.some(
    (o) => left < o.right && right > o.left && top < o.bottom && bottom > o.top,
  );
}
