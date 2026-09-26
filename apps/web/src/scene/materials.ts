import { createContext, useContext } from "react";
import { MeshStandardMaterial } from "three";

/** Surface settings that a look or the time of day can change. */
export type Surface = {
  /** Added to every roughness, so a look can be a little more matte. */
  roughnessBoost: number;
  night: boolean;
};

export const SurfaceContext = createContext<Surface>({ roughnessBoost: 0, night: false });

type Options = {
  roughness?: number;
  /** Glow strength by day and at night. Glow uses the material's own color. */
  glow?: { day: number; night: number };
  opacity?: number;
};

// One shared material per color and setting (WORLD_PALETTE.md, section 2).
const cache = new Map<string, MeshStandardMaterial>();

export function sharedMaterial(color: string, surface: Surface, options: Options = {}) {
  const roughness = Math.min(1, (options.roughness ?? 0.85) + surface.roughnessBoost);
  const glow = options.glow ? (surface.night ? options.glow.night : options.glow.day) : 0;
  const opacity = options.opacity ?? 1;
  const key = `${color}|${roughness}|${glow}|${opacity}`;
  let material = cache.get(key);
  if (!material) {
    material = new MeshStandardMaterial({
      color,
      roughness,
      metalness: 0,
      emissive: glow > 0 ? color : "#000000",
      emissiveIntensity: glow,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 1,
    });
    cache.set(key, material);
  }
  return material;
}

/** The shared material for a color, following the current look and time of day. */
export function useMaterial(color: string, options?: Options) {
  return sharedMaterial(color, useContext(SurfaceContext), options);
}
