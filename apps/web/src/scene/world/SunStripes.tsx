import { world } from "../../theme/tokens";
import { useMaterial } from "../materials";
import { WINDOW } from "./diorama";

/** Flat light stripes on the floor in front of the window. A cheap fake, no extra light. */
export function SunStripes() {
  const material = useMaterial(world.sunPatch, { opacity: 0.35, roughness: 1 });
  return (
    <group position={[WINDOW.x + 0.5, 0.004, 1.4]} rotation={[-Math.PI / 2, 0, -0.3]}>
      {[-0.5, 0, 0.5].map((x) => (
        <mesh key={x} material={material} position={[x, 0, 0]}>
          <planeGeometry args={[0.4, 2.4]} />
        </mesh>
      ))}
    </group>
  );
}
