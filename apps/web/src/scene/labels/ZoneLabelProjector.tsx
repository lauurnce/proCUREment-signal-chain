import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { Vector3 } from "three";
import { overlayRects } from "../../state/overlays";
import { labelOpacity, labelPlacement } from "./fade";

/** DOM elements of the zone labels, by zone id. Filled by ZoneLabelLayer, moved by the projector. */
export type LabelRegistry = Map<string, HTMLElement>;

export type ZoneLabel = {
  id: string;
  name: string;
  at: [number, number];
  /** Shown at every zoom, so the Overview names the places you navigate by. */
  always: boolean;
};

/** Labels sit just above the floor, so they stay under the zone they name. */
const LABEL_Y = 0.05;

/**
 * Moves each zone label to its spot on screen every frame, and fades it with the zoom.
 * A label that would be cut at a screen edge, or sit under the view card, the title or the
 * note, hides instead (council review, 27 Sep 2026). Writes to the DOM elements directly,
 * never to React state, so nothing re-renders.
 */
export function ZoneLabelProjector({
  labels,
  registry,
}: {
  labels: ZoneLabel[];
  registry: LabelRegistry;
}) {
  const point = useMemo(() => new Vector3(), []);

  useFrame(({ camera, size }) => {
    const fade = labelOpacity(camera.zoom, camera.userData.overviewZoom ?? 0);
    const overlays = overlayRects();
    for (const label of labels) {
      const el = registry.get(label.id);
      if (!el) continue;
      const opacity = label.always ? 1 : fade;
      point.set(label.at[0], LABEL_Y, label.at[1]).project(camera);
      const x = Math.round(((point.x + 1) / 2) * size.width);
      const y = Math.round(((1 - point.y) / 2) * size.height);
      const shown =
        opacity > 0 &&
        labelPlacement(
          { x, y, width: el.offsetWidth, height: el.offsetHeight },
          { width: size.width, height: size.height },
          overlays,
        );
      if (!shown) {
        if (el.style.visibility !== "hidden") el.style.visibility = "hidden";
        continue;
      }
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      el.style.opacity = opacity.toFixed(3);
      el.style.visibility = "visible";
    }
  });

  return null;
}
