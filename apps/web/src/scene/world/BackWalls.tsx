import { useContext } from "react";
import { world } from "../../theme/tokens";
import { SurfaceContext, useMaterial } from "../materials";
import { SLAB, WALL, WINDOW } from "./diorama";

/** Two back walls, open at the front like a dollhouse. One window: pale sky by day, warm glow at night. */
export function BackWalls() {
  const { night } = useContext(SurfaceContext);
  const wall = useMaterial(world.wall, { roughness: 0.9 });
  const trim = useMaterial(world.wallTrim);
  const pane = useMaterial(night ? world.windowGlow : world.windowDay, {
    glow: { day: 0, night: 1.2 },
  });
  const { width: w, depth: d } = SLAB;
  const wy = WALL.height / 2;
  const left = WINDOW.x - WINDOW.width / 2;
  const right = w - (WINDOW.x + WINDOW.width / 2);
  const above = WALL.height - WINDOW.bottom - WINDOW.height;
  const paneY = WINDOW.bottom + WINDOW.height / 2;

  return (
    <group>
      {/* Wall along x, with the window */}
      <group position={[0, 0, -WALL.thick / 2]}>
        <mesh material={wall} position={[left / 2, wy, 0]} receiveShadow>
          <boxGeometry args={[left, WALL.height, WALL.thick]} />
        </mesh>
        <mesh material={wall} position={[w - right / 2, wy, 0]} receiveShadow>
          <boxGeometry args={[right, WALL.height, WALL.thick]} />
        </mesh>
        <mesh material={wall} position={[WINDOW.x, WINDOW.bottom / 2, 0]} receiveShadow>
          <boxGeometry args={[WINDOW.width, WINDOW.bottom, WALL.thick]} />
        </mesh>
        <mesh material={wall} position={[WINDOW.x, WALL.height - above / 2, 0]}>
          <boxGeometry args={[WINDOW.width, above, WALL.thick]} />
        </mesh>
        <mesh material={pane} position={[WINDOW.x, paneY, 0]}>
          <boxGeometry args={[WINDOW.width, WINDOW.height, 0.02]} />
        </mesh>
        <mesh material={trim} position={[WINDOW.x, paneY, 0.02]}>
          <boxGeometry args={[0.05, WINDOW.height, 0.06]} />
        </mesh>
        {/* Frame on all four sides, and a deeper sill at the bottom */}
        <mesh material={trim} position={[WINDOW.x, WINDOW.bottom, 0.03]}>
          <boxGeometry args={[WINDOW.width + 0.08, 0.06, 0.1]} />
        </mesh>
        <mesh material={trim} position={[WINDOW.x, WINDOW.bottom + WINDOW.height, 0.02]}>
          <boxGeometry args={[WINDOW.width + 0.08, 0.04, 0.06]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={trim} position={[WINDOW.x + (s * WINDOW.width) / 2, paneY, 0.02]}>
            <boxGeometry args={[0.04, WINDOW.height, 0.06]} />
          </mesh>
        ))}
        <mesh material={trim} position={[w / 2, WALL.height + 0.02, 0]}>
          <boxGeometry args={[w, 0.04, WALL.thick + 0.01]} />
        </mesh>
        <mesh material={trim} position={[w / 2, 0.05, WALL.thick / 2 + 0.005]}>
          <boxGeometry args={[w, 0.1, 0.01]} />
        </mesh>
      </group>

      {/* Wall along z */}
      <group position={[-WALL.thick / 2, 0, 0]}>
        <mesh material={wall} position={[0, wy, d / 2 - WALL.thick / 2]} receiveShadow>
          <boxGeometry args={[WALL.thick, WALL.height, d + WALL.thick]} />
        </mesh>
        <mesh material={trim} position={[0, WALL.height + 0.02, d / 2 - WALL.thick / 2]}>
          <boxGeometry args={[WALL.thick + 0.01, 0.04, d + WALL.thick]} />
        </mesh>
        <mesh material={trim} position={[WALL.thick / 2 + 0.005, 0.05, d / 2]}>
          <boxGeometry args={[0.01, 0.1, d]} />
        </mesh>
      </group>
    </group>
  );
}
