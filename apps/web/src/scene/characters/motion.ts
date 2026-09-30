import { motion } from "../../theme/tokens";

const c = motion.character;
const TAU = Math.PI * 2;

/**
 * What a helper does with its body.
 * - idle: breathes. Seated, the hands rest on the desk. Standing, the arms hang.
 * - typing: types in bursts. Standing, it works at a counter or a terminal.
 * - hand: waiting on you. Raises a hand with an amber "!" bubble.
 * - wait: waiting on someone else (a CM decision). Sits still with a hollow "..." bubble.
 * - walk: walks (the stride comes from the distance walked).
 */
export type Activity = "idle" | "typing" | "hand" | "wait" | "walk";

/** Walking and standing values, next to the seated ones (theme/tokens.ts, motion.walk). */
export const WALK = motion.walk;

/** A raised hand: the forearm tilts this far out from the head (radians) and lifts (meters). */
const RAISE_ROLL = 0.5;
const RAISE_LIFT = 0.16;

/**
 * Standing height, about 1.65 m (council, 29 Sep 2026, Lawrence's choice; it was 1.9 m and
 * looked like stilts). The thigh is this long when standing (0.44 m seated, along the seat).
 */
export const STAND_THIGH = 0.14;
/** The standing hip rises by the standing thigh, so the feet stay on the floor. */
export const STAND_JOINT = STAND_THIGH;
/** The chest rises a little less than the hip: the hip joint tucks just inside the torso. */
export const STAND_CHEST = 0.035;

/** Offsets and joint turns for one helper. Pure math, so it is easy to test. */
export type Pose = {
  chestLift: number;
  headTilt: number;
  headNod: number;
  leftHandLift: number;
  rightHandLift: number;
  /** 0 seated, 1 standing. */
  stand: number;
  /** Extra lift of the whole body while walking, meters. */
  bob: number;
  /** Thigh turns, radians. -PI/2 is seated (the thigh points forward), 0 is standing. */
  thighL: number;
  thighR: number;
  /** Knee bends, radians. PI/2 is seated, 0 is a straight leg. */
  kneeL: number;
  kneeR: number;
  /** Forearm turns, radians. 0 reaches for the keyboard, PI/2 hangs down, negative is raised. */
  armL: number;
  armR: number;
  /** Tilts a forearm out to the side, radians, so a raised hand clears the head. */
  rollR: number;
  /** The amber "!" bubble (waiting on you), 0 hidden to 1 shown. */
  bubble: number;
  /** The hollow "..." bubble (waiting on someone else), 0 hidden to 1 shown. */
  bubbleHollow: number;
};

export const STILL: Pose = {
  chestLift: 0,
  headTilt: 0,
  headNod: 0,
  leftHandLift: 0,
  rightHandLift: 0,
  stand: 0,
  bob: 0,
  thighL: -Math.PI / 2,
  thighR: -Math.PI / 2,
  kneeL: Math.PI / 2,
  kneeR: Math.PI / 2,
  armL: 0,
  armR: 0,
  rollR: 0,
  bubble: 0,
  bubbleHollow: 0,
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

export type PoseInput = {
  activity: Activity;
  /** 0 to 1 from the seed, so no two helpers breathe or type in sync. */
  phase: number;
  /** 0 seated, 1 standing. Blends while a helper stands up or sits down. */
  stand?: number;
  /** Distance walked, in strides (meters / WALK.strideMeters). */
  stride?: number;
  /** 0 to 1: how much of the walk cycle shows, so a walk starts and stops softly. */
  walk?: number;
  /** A raised hand waves unless this is false. */
  wave?: boolean;
};

/** Writes the pose for time t (seconds) into `out`. Never allocates, so it is safe per frame. */
export function poseInto(out: Pose, t: number, input: PoseInput): Pose {
  const { activity, phase } = input;
  const stand = input.stand ?? 0;
  const walk = activity === "walk" ? (input.walk ?? 1) : 0;
  const time = t + phase * 10;
  const breath = Math.sin((time / c.breathSeconds) * TAU);
  out.chestLift = ((breath + 1) / 2) * c.breathLift;
  out.headTilt = Math.sin((time / (c.breathSeconds * 2.3)) * TAU) * c.headSway;
  out.headNod = 0;
  out.leftHandLift = 0;
  out.rightHandLift = 0;
  out.stand = stand;
  out.bob = 0;
  out.bubble = 0;
  out.bubbleHollow = 0;
  out.rollR = 0;
  // Seated legs fold at hip and knee. Standing legs are straight.
  out.thighL = out.thighR = (-Math.PI / 2) * (1 - stand);
  out.kneeL = out.kneeR = (Math.PI / 2) * (1 - stand);
  // Seated hands rest at the keyboard. Standing arms hang.
  out.armL = out.armR = (Math.PI / 2) * stand;

  if (activity === "typing") {
    const amount = typingAmount(time);
    const tap = time * c.typingTapsPerSecond * TAU;
    // Hands alternate, and a hand never goes below the desk.
    out.leftHandLift = Math.max(0, Math.sin(tap)) * c.typingLift * amount;
    out.rightHandLift = Math.max(0, Math.sin(tap + Math.PI)) * c.typingLift * amount;
    out.headNod = Math.sin(tap / 3.5) * c.typingNod * amount;
    out.headTilt *= 1 - amount * 0.7;
    // Standing at a counter, the forearms angle down to the keys.
    out.armL = out.armR = 1.0 * stand;
  }

  if (activity === "hand") {
    // The right forearm points up, tilted out so the hand clears the head, and waves a little.
    // Only one helper waves at a time (the one that has waited longest), so there is one
    // attention cue. The others hold their hand still (council, 29 Sep 2026).
    const wave = input.wave === false ? 0 : Math.sin(time * WALK.waveHz * TAU) * WALK.wave;
    out.armR = -Math.PI / 2;
    out.rollR = RAISE_ROLL + wave;
    out.rightHandLift = RAISE_LIFT;
    out.headTilt *= 0.5;
    out.bubble = 1;
  }

  if (activity === "wait") out.bubbleHollow = 1;

  if (walk > 0) {
    const s = Math.sin((input.stride ?? 0) * TAU);
    out.thighL += s * WALK.thighSwing * walk;
    out.thighR -= s * WALK.thighSwing * walk;
    // A knee bends while its foot lifts behind.
    out.kneeL += Math.max(0, s) * WALK.kneeBend * walk;
    out.kneeR += Math.max(0, -s) * WALK.kneeBend * walk;
    // Arms swing against the legs.
    out.armL -= s * WALK.armSwing * walk;
    out.armR += s * WALK.armSwing * walk;
    // Highest at mid step, when both legs are under the body.
    out.bob = (1 - Math.abs(s)) * WALK.bob * walk;
    out.headTilt *= 1 - walk * 0.6;
  }
  return out;
}

/** How long one activity blends into the next (typing to a raised hand), seconds. */
export const POSE_BLEND = 0.14;

/** A soft start and stop for 0 to 1 (smoothstep), for standing up, sitting down and blends. */
export const ease = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

const POSE_KEYS = Object.keys(STILL) as (keyof Pose)[];

/**
 * The "!" bubble's size when it appears: it grows to 115 percent in 160 ms, then settles to 100
 * percent by 450 ms. One small bounce, then calm (council, 29 Sep 2026).
 */
export function bubblePop(elapsed: number): number {
  if (elapsed >= 0.45) return 1;
  if (elapsed < 0.16) return 1.15 * ease(elapsed / 0.16);
  return 1.15 - 0.15 * ease((elapsed - 0.16) / 0.29);
}

/** Mixes `from` into `out` so joints glide instead of snapping: t 0 is `from`, 1 is `out`. */
export function blendPose(out: Pose, from: Pose, t: number): Pose {
  for (const key of POSE_KEYS) out[key] = from[key] + (out[key] - from[key]) * t;
  return out;
}

/** The pose at time t for a seated helper, as a new object. For tests and the Lab. */
export function poseAt(t: number, activity: Activity, phase: number, stand = 0): Pose {
  return poseInto({ ...STILL }, t, { activity, phase, stand });
}
