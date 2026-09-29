import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Vector3 } from "three";
import { overlayRects } from "../../state/overlays";
import { labelPlacement } from "../labels/fade";
import type { TagAnchor, TagRegistry } from "../tags/TagProjector";
import { compactAt, spreadTags, type TagBox } from "./tags";

/** Zone labels sit just above the floor (the same height as ZoneLabelProjector uses). */
const ZONE_LABEL_Y = 0.05;

/** Shows the compact pill (first child) or the full pill (second child) of a tag. */
function setCompact(el: HTMLElement, compact: boolean) {
  const mode = compact ? "compact" : "full";
  if (el.dataset.mode === mode) return;
  el.dataset.mode = mode;
  const [small, full] = el.children as unknown as [HTMLElement?, HTMLElement?];
  if (small) small.style.display = compact ? "block" : "none";
  if (full) full.style.display = compact ? "none" : "block";
  refreshInherited(el);
}

/** Shows or hides a tag. */
function setShown(el: HTMLElement, shown: boolean) {
  const visibility = shown ? "visible" : "hidden";
  if (el.style.visibility === visibility) return;
  el.style.visibility = visibility;
  refreshInherited(el);
}

/**
 * Chrome passes `visibility` down to children through a shortcut. When a pill turns from
 * display none to block while its tag also turns visible, some parts inside kept "hidden", so
 * the tag drew as a blank white pill (seen in Walk around mode at night, P4.3). Changing a
 * custom property on the tag makes Chrome recompute everything inside it the normal way.
 */
function refreshInherited(el: HTMLElement) {
  el.style.setProperty("--tag-state", `${el.dataset.mode ?? ""}-${el.style.visibility}`);
}

/**
 * Moves each office name tag to its helper every frame, through the DOM (no React state).
 * - Compact (dot and name) near the Overview zoom, full (plus the role) when zoomed in.
 * - Tags never overlap: a tag behind takes the nearest free spot up or to the side (spreadTags).
 * - A tag that would be cut at a screen edge or sit under a page overlay hides, like the
 *   zone labels (D-061).
 */
export function OfficeTagProjector({
  anchors,
  registry,
  keepClear,
}: {
  anchors: TagAnchor[];
  registry: TagRegistry;
  /** Zone labels that always show (D-061). Tags flow around them. */
  keepClear: { id: string; at: [number, number] }[];
}) {
  const point = useMemo(() => new Vector3(), []);
  const compact = useRef(true);
  const labels = useRef(new Map<string, HTMLElement | null>());

  useFrame(({ camera, size }) => {
    compact.current = compactAt(camera.zoom, camera.userData.overviewZoom ?? 0, compact.current);
    const clear: TagBox[] = [];
    for (const label of keepClear) {
      let el = labels.current.get(label.id);
      if (!el?.isConnected) {
        el = document.querySelector<HTMLElement>(`[data-testid="zone-label-${label.id}"]`);
        labels.current.set(label.id, el);
      }
      if (!el || el.style.visibility === "hidden") continue;
      point.set(label.at[0], ZONE_LABEL_Y, label.at[1]).project(camera);
      clear.push({
        id: label.id,
        x: ((point.x + 1) / 2) * size.width,
        y: ((1 - point.y) / 2) * size.height,
        w: el.offsetWidth,
        h: el.offsetHeight,
      });
    }
    const boxes: (TagBox & { el: HTMLElement })[] = [];
    for (const anchor of anchors) {
      const el = registry.get(anchor.id);
      if (!el) continue;
      setCompact(el, compact.current);
      point.set(...anchor.position).project(camera);
      boxes.push({
        id: anchor.id,
        el,
        x: ((point.x + 1) / 2) * size.width,
        y: ((1 - point.y) / 2) * size.height,
        w: el.offsetWidth,
        h: el.offsetHeight,
      });
    }
    const spread = spreadTags(boxes, clear);
    const overlays = overlayRects();
    for (const b of boxes) {
      const spot = spread.get(b.id) ?? b;
      const x = Math.round(spot.x);
      const y = Math.round(spot.y);
      const fits = labelPlacement({ x, y, width: b.w, height: b.h }, size, overlays);
      b.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      setShown(b.el, fits);
    }
  });

  return null;
}
