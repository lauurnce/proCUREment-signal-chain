import { world } from "../../theme/tokens";
import { useMaterial } from "../materials";

export const DESK = { width: 1.4, depth: 0.7, height: 0.74 } as const;

/**
 * One desk with a keyboard and a monitor. The origin is the desk center on the floor.
 * The seat side is +z, the monitor sits at the back (-z) and faces the seat.
 */
export function Desk() {
  const edge = useMaterial(world.deskEdge);
  const top = useMaterial(world.deskTop, { roughness: 0.8 });
  const leg = useMaterial(world.deskLeg);
  const keys = useMaterial(world.deskDivider);
  const body = useMaterial(world.monitorBody);
  const screen = useMaterial(world.screenGlow, {
    roughness: 0.8,
    glow: { day: 0.15, night: 0.45 },
  });
  const { width: w, depth: d, height: h } = DESK;
  const legs: [number, number][] = [
    [-w / 2 + 0.05, -d / 2 + 0.05],
    [w / 2 - 0.05, -d / 2 + 0.05],
    [-w / 2 + 0.05, d / 2 - 0.05],
    [w / 2 - 0.05, d / 2 - 0.05],
  ];

  return (
    <group>
      <mesh material={edge} position={[0, h - 0.0175, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.035, d]} />
      </mesh>
      <mesh material={top} position={[0, h + 0.005, 0]} receiveShadow>
        <boxGeometry args={[w - 0.04, 0.01, d - 0.04]} />
      </mesh>
      {legs.map(([x, z]) => (
        <mesh key={`${x}-${z}`} material={leg} position={[x, (h - 0.035) / 2, z]}>
          <boxGeometry args={[0.04, h - 0.035, 0.04]} />
        </mesh>
      ))}
      {/* Keyboard */}
      <mesh material={keys} position={[0, h + 0.02, 0.16]}>
        <boxGeometry args={[0.42, 0.02, 0.14]} />
      </mesh>
      {/* Monitor: stand, body, and a screen that glows a little by day and more at night */}
      <group position={[0, h, -0.2]}>
        <mesh material={body} position={[0, 0.02, 0]}>
          <boxGeometry args={[0.22, 0.02, 0.14]} />
        </mesh>
        <mesh material={body} position={[0, 0.12, -0.02]}>
          <boxGeometry args={[0.05, 0.2, 0.04]} />
        </mesh>
        <mesh material={body} position={[0, 0.34, 0]}>
          <boxGeometry args={[0.56, 0.34, 0.035]} />
        </mesh>
        <mesh material={screen} position={[0, 0.34, 0.019]}>
          <planeGeometry args={[0.52, 0.3]} />
        </mesh>
      </group>
    </group>
  );
}
