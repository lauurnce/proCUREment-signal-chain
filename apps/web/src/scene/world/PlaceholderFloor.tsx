import { Grid } from "@react-three/drei";
import { world } from "../../theme/tokens";
import { FLOOR, FLOOR_CENTER } from "../constants";

const SLAB = 0.2;

/** A plain wood floor with a 1 meter grid. Replaced by the real floor in Phase 3. */
export function PlaceholderFloor() {
  const [x, , z] = FLOOR_CENTER;
  return (
    <group>
      <mesh position={[x, -SLAB / 2, z]} receiveShadow>
        <boxGeometry args={[FLOOR.width, SLAB, FLOOR.depth]} />
        <meshStandardMaterial color={world.floorWood} roughness={0.85} metalness={0} />
      </mesh>
      <Grid
        position={[x, 0.002, z]}
        args={[FLOOR.width, FLOOR.depth]}
        cellSize={1}
        cellThickness={0.6}
        cellColor={world.gridLine}
        sectionSize={4}
        sectionThickness={1}
        sectionColor={world.floorWoodAlt}
        fadeDistance={1000}
      />
    </group>
  );
}
