import type { Track } from "@hq/shared";
import { useMemo } from "react";
import { ExtrudeGeometry, Shape } from "three";
import { color, track, world } from "../../theme/tokens";
import { useMaterial } from "../materials";

function starGeometry(outer: number, inner: number) {
  const shape = new Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: false });
}

/**
 * The ID card on a helper's chest, on a lanyard in the track color: a white card with the
 * track shape. The Lead triangle is an outline with only the white card behind it (logo safety).
 * Gold and teal pieces stay small (under 0.2 m, WORLD_PALETTE.md).
 */
export function TrackBadge3D({ id }: { id: Track }) {
  const t = track[id];
  const trackMaterial = useMaterial(color[t.worldColorKey]);
  const card = useMaterial(world.paper, { roughness: 0.8 });
  const star = useMemo(() => (t.shape === "star" ? starGeometry(0.042, 0.018) : null), [t.shape]);

  return (
    <group>
      {/* Lanyard straps from the card up to the neck */}
      {[1, -1].map((s) => (
        <mesh
          key={s}
          material={trackMaterial}
          position={[s * 0.05, 0.14, -0.004]}
          rotation={[0, 0, s * 0.35]}
        >
          <boxGeometry args={[0.03, 0.16, 0.006]} />
        </mesh>
      ))}
      <mesh material={card}>
        <boxGeometry args={[0.14, 0.16, 0.01]} />
      </mesh>
      <group position={[0, -0.01, 0.007]}>
        {star && <mesh material={trackMaterial} geometry={star} position={[0, 0, -0.002]} />}
        {t.shape === "triangle-outline" && (
          <mesh material={trackMaterial} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.04, 0.009, 4, 3]} />
          </mesh>
        )}
        {t.shape === "diamond" && (
          <mesh material={trackMaterial} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.05, 0.05, 0.008]} />
          </mesh>
        )}
        {t.shape === "square" && (
          <mesh material={trackMaterial}>
            <boxGeometry args={[0.065, 0.065, 0.008]} />
          </mesh>
        )}
      </group>
    </group>
  );
}
