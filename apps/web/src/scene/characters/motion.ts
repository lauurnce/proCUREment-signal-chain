import { motion } from "../../theme/tokens";

const c = motion.character;
const TAU = Math.PI * 2;

export type Activity = "idle" | "typing";

/** Offsets for one seated helper at time t (seconds). Pure math, so it is easy to test. */
export type Pose = {
  chestLift: number;
  headTilt: number;
  headNod: number;
  leftHandLift: number;
  rightHandLift: number;
};

export const STILL: Pose = {
  chestLift: 0,
  headTilt: 0,
  headNod: 0,
  leftHandLift: 0,
  rightHandLift: 0,
};

/** 1 while typing, 0 while pausing to read, with a short soft blend between them. */
export function typingAmount(t: number): number {
  const [on, off] = c.typingBurstSeconds;
  const cycle = on + off;
  const x = ((t % cycle) + cycle) % cycle;
  const blend = 0.2;
  if (x < blend) return x / blend;
  if (x < on - blend) return 1;
  if (x < on) return (on - x) / blend;
  return 0;
}

/**
 * The pose for a helper. `phase` (0 to 1) comes from its seed, so no two helpers
 * breathe or type in sync.
 */
export function poseAt(t: number, activity: Activity, phase: number): Pose {
  const time = t + phase * 10;
  const breath = Math.sin((time / c.breathSeconds) * TAU);
  const pose: Pose = {
    ...STILL,
    chestLift: ((breath + 1) / 2) * c.breathLift,
    headTilt: Math.sin((time / (c.breathSeconds * 2.3)) * TAU) * c.headSway,
  };
  if (activity === "typing") {
    const amount = typingAmount(time);
    const tap = time * c.typingTapsPerSecond * TAU;
    // Hands alternate, and a hand never goes below the desk.
    pose.leftHandLift = Math.max(0, Math.sin(tap)) * c.typingLift * amount;
    pose.rightHandLift = Math.max(0, Math.sin(tap + Math.PI)) * c.typingLift * amount;
    pose.headNod = Math.sin(tap / 3.5) * c.typingNod * amount;
    pose.headTilt *= 1 - amount * 0.7;
  }
  return pose;
}
