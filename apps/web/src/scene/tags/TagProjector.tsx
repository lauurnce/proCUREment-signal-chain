import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { Vector3 } from "three";
import { nudgeTags, type TagBox } from "./layout";

/** DOM elements of the name tags, by id. Filled by TagLayer, moved by TagProjector. */
export type TagRegistry = Map<string, HTMLElement>;

export type TagAnchor = { id: string; position: [number, number, number] };

/**
 * Moves each name tag to its 3D anchor on screen, every frame, through the DOM element
 * directly. No React state, so there is no re-render and no jank. Tags that would overlap
 * step up above the tag in front of them (council review, Must 4).
 */
export function TagProjector({
  anchors,
  registry,
}: {
  anchors: TagAnchor[];
  registry: TagRegistry;
}) {
  const point = useMemo(() => new Vector3(), []);

  useFrame(({ camera, size }) => {
    const boxes: (TagBox & { el: HTMLElement })[] = [];
    for (const anchor of anchors) {
      const el = registry.get(anchor.id);
      if (!el) continue;
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
    const nudged = nudgeTags(boxes);
    for (const b of boxes) {
      const x = Math.round(b.x);
      const y = Math.round(nudged.get(b.id) ?? b.y);
      b.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      b.el.style.visibility = "visible";
    }
  });

  return null;
}
