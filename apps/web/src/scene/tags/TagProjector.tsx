import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { Vector3 } from "three";

/** DOM elements of the name tags, by id. Filled by TagLayer, moved by TagProjector. */
export type TagRegistry = Map<string, HTMLElement>;

export type TagAnchor = { id: string; position: [number, number, number] };

/**
 * Moves each name tag to its 3D anchor on screen, every frame, through the DOM element
 * directly. No React state, so there is no re-render and no jank.
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
    for (const anchor of anchors) {
      const el = registry.get(anchor.id);
      if (!el) continue;
      point.set(...anchor.position).project(camera);
      const x = Math.round(((point.x + 1) / 2) * size.width);
      const y = Math.round(((1 - point.y) / 2) * size.height);
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      el.style.visibility = "visible";
    }
  });

  return null;
}
