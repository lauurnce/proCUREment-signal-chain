import type { Color } from "three";

/** How far the office is into the night: 0 is day, 1 is night. Written by OfficeLights each frame. */
export type NightMix = { value: number };

/** A day and night blend takes this long (WORLD_PALETTE.md, section 2). */
export const BLEND_MS = 1200;

/** Smooth start and end for a 0 to 1 progress. */
export function smooth(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/** Moves a linear progress toward its goal (0 or 1) for one frame. */
export function stepToward(progress: number, goal: number, deltaMs: number): number {
  const step = deltaMs / BLEND_MS;
  return goal > progress ? Math.min(goal, progress + step) : Math.max(goal, progress - step);
}

/** The part of the blend that belongs to the night half, 0 until dusk, then 0 to 1. */
export function nightHalf(mix: number): number {
  return smooth(mix * 2 - 1);
}

/**
 * A value on the way from day to night that passes through dusk at the middle, so the change
 * reads as a short late afternoon (look B) before night (isometric-office skill).
 */
export function throughDusk(day: number, dusk: number, night: number, mix: number): number {
  return mix < 0.5 ? day + (dusk - day) * mix * 2 : dusk + (night - dusk) * (mix * 2 - 1);
}

/** The same, for colors. Writes into `out` and returns it, so nothing is made per frame. */
export function colorThroughDusk(
  out: Color,
  day: Color,
  dusk: Color,
  night: Color,
  mix: number,
): Color {
  return mix < 0.5 ? out.lerpColors(day, dusk, mix * 2) : out.lerpColors(dusk, night, mix * 2 - 1);
}
