import { world, worldLight } from "../../theme/tokens";
import { useMaterial } from "../materials";

/** A small desk lamp. At night the shade glows and one warm point light turns on. */
export function DeskLamp({ on }: { on: boolean }) {
  const metal = useMaterial(world.lampCord);
  const shade = useMaterial(world.capizGlow, { glow: { day: 0, night: 0.9 } });
  const { intensity, distance, decay } = worldLight.lamp;

  return (
    <group>
      <mesh material={metal} position={[0, 0.01, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.02, 12]} />
      </mesh>
      <mesh material={metal} position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.32, 6]} />
      </mesh>
      <mesh material={shade} position={[0, 0.34, 0]}>
        <coneGeometry args={[0.1, 0.12, 12]} />
      </mesh>
      {on && (
        <pointLight
          color={world.lampLight}
          intensity={intensity}
          distance={distance}
          decay={decay}
          position={[0, 0.3, 0.05]}
        />
      )}
    </group>
  );
}
