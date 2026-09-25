import { world } from "../../theme/tokens";
import { FLOOR, FLOOR_CENTER } from "../constants";

/** Starting recipe from the isometric-office skill: soft sky light plus one warm key light. */
export function DayLights() {
  const [x, , z] = FLOOR_CENTER;
  const half = Math.max(FLOOR.width, FLOOR.depth) / 2 + 2;
  return (
    <>
      <hemisphereLight args={[world.skyLight, world.floorWood, 0.9]} />
      <directionalLight
        color={world.keyLight}
        intensity={1.4}
        position={[x - 10, 18, z + 8]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-half}
        shadow-camera-right={half}
        shadow-camera-top={half}
        shadow-camera-bottom={-half}
      >
        <object3D attach="target" position={[x, 0, z]} />
      </directionalLight>
    </>
  );
}
