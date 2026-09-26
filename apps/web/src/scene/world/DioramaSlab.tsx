import { world } from "../../theme/tokens";
import { useMaterial } from "../materials";
import { BackWalls } from "./BackWalls";
import { SLAB } from "./diorama";
import { Planks } from "./Planks";

/** The floating oak slab with its navy rim (D-029), planks and two back walls. */
export function DioramaSlab() {
  const side = useMaterial(world.slabSide, { roughness: 0.9 });
  const navy = useMaterial(world.slabEdge);
  const { width: w, depth: d, thickness: t } = SLAB;
  const rim = { h: 0.06, proud: 0.04 };
  const rimY = -rim.h / 2 - 0.02;

  return (
    <group>
      <mesh material={side} position={[w / 2, -t / 2 - 0.02, d / 2]} receiveShadow>
        <boxGeometry args={[w, t, d]} />
      </mesh>
      <Planks />
      {/* Navy rim on the two open sides */}
      <mesh material={navy} position={[w / 2 + rim.proud / 2, rimY, d + rim.proud / 2]}>
        <boxGeometry args={[w + rim.proud, rim.h, rim.proud]} />
      </mesh>
      <mesh material={navy} position={[w + rim.proud / 2, rimY, d / 2]}>
        <boxGeometry args={[rim.proud, rim.h, d]} />
      </mesh>
      <BackWalls />
    </group>
  );
}
