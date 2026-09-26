import { useLayoutEffect, useRef } from "react";
import { Color, type InstancedMesh, Object3D } from "three";
import { world } from "../../theme/tokens";
import { seededRandom } from "../characters/appearance";
import { useMaterial } from "../materials";
import { PLANK, SLAB } from "./diorama";

/** Oak floor planks in one instanced mesh, with a seeded mix of three oak tones. */
export function Planks() {
  const ref = useRef<InstancedMesh>(null);
  const count = Math.round(SLAB.width / PLANK);
  const material = useMaterial("#FFFFFF", { roughness: 0.9 });

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const rand = seededRandom("planks");
    const dummy = new Object3D();
    const color = new Color();
    for (let i = 0; i < count; i++) {
      dummy.position.set(PLANK * (i + 0.5), -0.01, SLAB.depth / 2);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      // About 70 percent main oak, 25 percent alt, 5 percent deep (WORLD_PALETTE.md).
      const r = rand();
      color.set(r < 0.7 ? world.floorWood : r < 0.95 ? world.floorWoodAlt : world.floorWoodDeep);
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} material={material} receiveShadow>
      <boxGeometry args={[PLANK - 0.006, 0.02, SLAB.depth]} />
    </instancedMesh>
  );
}
