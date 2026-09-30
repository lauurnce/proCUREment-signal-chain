import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Vector3 } from "three";
import { overlayRects } from "../../state/overlays";
import { labelPlacement } from "../labels/fade";
import { OFF_SCREEN } from "../labels/ZoneLabelProjector";
import type { TagAnchor, TagRegistry } from "../tags/TagProjector";
import { hover } from "./selection";
import { hint } from "./TalkHintLayer";
import { compactAt, spreadTags, type TagBox } from "./tags";

/** Zone labels sit just above the floor (the same height as ZoneLabelProjector uses). */
const ZONE_LABEL_Y = 0.05;

type Form = "chip" | "compact" | "full";
const FORMS: Form[] = ["chip", "compact", "full"];

/** Shows one form of a tag: its children are the chip, the compact pill and the full pill. */
function setForm(el: HTMLElement, form: Form) {
  if (el.dataset.mode === form) return;
  el.dataset.mode = form;
  FORMS.forEach((name, i) => {
    const child = el.children[i] as HTMLElement | undefined;
    if (child) child.style.display = name === form ? (name === "chip" ? "flex" : "block") : "none";
  });
  refreshInherited(el);
}

/**
 * Zoomed in, every tag is full. At the Overview, most tags are chips, and a key tag (waiting on
 * you, or selected) or the hovered one shows its name (council, 29 Sep 2026).
 */
function formFor(el: HTMLElement, id: string, zoomedOut: boolean): Form {
  if (!zoomedOut) return "full";
  return el.dataset.key === "1" || hover.seatId === id ? "compact" : "chip";
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
 * - Chips near the Overview zoom (key and hovered tags show a name), full when zoomed in.
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
    // In Walk around mode, "You" and the Talk hint stay readable too.
    clear.push(...hint.boxes);
    const boxes: (TagBox & { el: HTMLElement })[] = [];
    for (const anchor of anchors) {
      const el = registry.get(anchor.id);
      if (!el) continue;
      setForm(el, formFor(el, anchor.id, compact.current));
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
      b.el.style.transform = fits ? `translate(${x}px, ${y}px) translate(-50%, -50%)` : OFF_SCREEN;
      setShown(b.el, fits);
    }
  });

  return null;
}
