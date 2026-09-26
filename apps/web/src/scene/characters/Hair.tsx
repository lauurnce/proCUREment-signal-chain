import { RoundedBox } from "@react-three/drei";
import type { Material } from "three";
import type { HairStyle } from "./appearance";

/** Hair on top of the head group. The head is 0.54 wide, its top is at y 0.5, the face is +z. */
export function Hair({ style, material }: { style: HairStyle; material: Material }) {
  return (
    <group>
      <RoundedBox
        args={[0.58, 0.14, 0.52]}
        radius={0.05}
        position={[0, 0.47, -0.01]}
        material={material}
        castShadow
      />
      {/* A short back piece, so some neck shows from behind */}
      <mesh material={material} position={[0, 0.38, -0.22]}>
        <boxGeometry args={[0.58, 0.2, 0.1]} />
      </mesh>
      {style === "bob" && (
        <>
          <mesh material={material} position={[0.285, 0.3, -0.03]}>
            <boxGeometry args={[0.06, 0.34, 0.46]} />
          </mesh>
          <mesh material={material} position={[-0.285, 0.3, -0.03]}>
            <boxGeometry args={[0.06, 0.34, 0.46]} />
          </mesh>
        </>
      )}
      {style === "bun" && (
        <mesh material={material} position={[0, 0.56, -0.16]}>
          <sphereGeometry args={[0.12, 12, 8]} />
        </mesh>
      )}
      {style === "ponytail" && (
        <mesh material={material} position={[0, 0.22, -0.3]} rotation={[0.25, 0, 0]}>
          <boxGeometry args={[0.12, 0.3, 0.1]} />
        </mesh>
      )}
      {style === "tuft" && (
        <mesh material={material} position={[0.12, 0.55, 0.12]} rotation={[0, 0, -0.35]}>
          <boxGeometry args={[0.26, 0.08, 0.2]} />
        </mesh>
      )}
    </group>
  );
}
