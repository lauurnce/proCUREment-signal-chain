import { world } from "../../theme/tokens";
import { useMaterial } from "../materials";

export const SEAT_HEIGHT = 0.475;

/** Office chair. The origin is the seat center on the floor, the sitter faces +z. */
export function Chair() {
  const seat = useMaterial(world.chairSeat);
  const accent = useMaterial(world.chairAccent);
  const base = useMaterial(world.chairBase);

  return (
    <group>
      <mesh material={base} position={[0, 0.04, 0]}>
        <boxGeometry args={[0.5, 0.03, 0.06]} />
      </mesh>
      <mesh material={base} position={[0, 0.04, 0]}>
        <boxGeometry args={[0.06, 0.03, 0.5]} />
      </mesh>
      <mesh material={base} position={[0, 0.23, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.34, 8]} />
      </mesh>
      <mesh material={seat} position={[0, SEAT_HEIGHT - 0.035, 0]} castShadow>
        <boxGeometry args={[0.46, 0.07, 0.46]} />
      </mesh>
      {/* A low back, so the helper's body stays visible */}
      <mesh material={seat} position={[0, 0.66, -0.22]}>
        <boxGeometry args={[0.44, 0.3, 0.06]} />
      </mesh>
      {/* Thin accent stripe on the back, seen from behind */}
      <mesh material={accent} position={[0, 0.76, -0.252]}>
        <boxGeometry args={[0.3, 0.04, 0.005]} />
      </mesh>
    </group>
  );
}
