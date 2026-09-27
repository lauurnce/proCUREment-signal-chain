import { useLayoutEffect, useRef } from "react";
import {
  BoxGeometry,
  Color,
  type InstancedMesh,
  type Material,
  Matrix4,
  Quaternion,
  Vector3,
} from "three";
import type { Box } from "../layout/boxes";

/** One unit box shared by every batch. Each instance scales it to its own size. */
const UNIT_BOX = new BoxGeometry(1, 1, 1);
const Y_AXIS = new Vector3(0, 1, 0);

type Props = {
  boxes: Box[];
  material: Material;
  /** Use each box's own color. Leave off when the material color already is the right one. */
  instanceColors?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  name?: string;
};

/**
 * Draws a list of boxes in one draw call (one instanced mesh). The instances are written once
 * per new list, never per frame. For instance colors, the material color must be white.
 */
export function InstancedBoxes({
  boxes,
  material,
  instanceColors = true,
  castShadow = false,
  receiveShadow = true,
  name,
}: Props) {
  const ref = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new Matrix4();
    const turn = new Quaternion();
    const position = new Vector3();
    const scale = new Vector3();
    const tone = new Color();
    boxes.forEach((b, i) => {
      position.set(...b.pos);
      scale.set(...b.size);
      turn.setFromAxisAngle(Y_AXIS, b.rotY);
      mesh.setMatrixAt(i, matrix.compose(position, turn, scale));
      if (instanceColors) mesh.setColorAt(i, tone.set(b.color));
    });
    mesh.count = boxes.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [boxes, instanceColors]);

  if (boxes.length === 0) return null;
  return (
    <instancedMesh
      // A new list size needs a new mesh, because the instance buffers have a fixed length.
      key={boxes.length}
      ref={ref}
      name={name}
      args={[UNIT_BOX, material, boxes.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  );
}
