import { world } from "../../theme/tokens";
import { useMaterial } from "../materials";

/** A floor plant in a clay pot. Low-poly leaves, two leaf tones. */
export function Plant() {
  const pot = useMaterial(world.plantPot);
  const leaf = useMaterial(world.plantLeaf);
  const leafLight = useMaterial(world.plantLeafLight);

  return (
    <group>
      <mesh material={pot} position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.16, 0.4, 12]} />
      </mesh>
      <mesh material={leaf} position={[0, 0.62, 0]} castShadow>
        <icosahedronGeometry args={[0.3, 0]} />
      </mesh>
      <mesh material={leafLight} position={[0.12, 0.88, 0.06]} rotation={[0.4, 0.3, 0]}>
        <icosahedronGeometry args={[0.22, 0]} />
      </mesh>
      <mesh material={leaf} position={[-0.1, 1.02, -0.04]} rotation={[0.2, 0.8, 0.1]}>
        <icosahedronGeometry args={[0.16, 0]} />
      </mesh>
    </group>
  );
}
