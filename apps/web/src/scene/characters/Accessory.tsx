import { world } from "../../theme/tokens";
import { useMaterial } from "../materials";
import type { Accessory as AccessoryKind } from "./appearance";

/** Glasses or a headset, placed on the head group (face is +z, eyes at y 0.24). */
export function Accessory({ kind }: { kind: AccessoryKind }) {
  const frame = useMaterial(world.lampCord);
  const lens = useMaterial(world.glass, { roughness: 0.4 });

  if (kind === "glasses") {
    return (
      <group position={[0, 0.25, 0.243]}>
        <mesh material={lens} position={[0.11, 0, 0]}>
          <boxGeometry args={[0.13, 0.1, 0.006]} />
        </mesh>
        <mesh material={lens} position={[-0.11, 0, 0]}>
          <boxGeometry args={[0.13, 0.1, 0.006]} />
        </mesh>
        <mesh material={frame} position={[0, 0.055, 0.004]}>
          <boxGeometry args={[0.38, 0.022, 0.01]} />
        </mesh>
      </group>
    );
  }
  if (kind === "headset") {
    return (
      <group>
        <mesh material={frame} position={[0, 0.28, 0]}>
          <torusGeometry args={[0.3, 0.018, 6, 16, Math.PI]} />
        </mesh>
        <mesh material={frame} position={[0.29, 0.24, 0]}>
          <boxGeometry args={[0.06, 0.14, 0.12]} />
        </mesh>
        <mesh material={frame} position={[-0.29, 0.24, 0]}>
          <boxGeometry args={[0.06, 0.14, 0.12]} />
        </mesh>
        <mesh material={frame} position={[0.27, 0.14, 0.14]} rotation={[0, -0.5, 0]}>
          <boxGeometry args={[0.015, 0.015, 0.2]} />
        </mesh>
      </group>
    );
  }
  return null;
}
