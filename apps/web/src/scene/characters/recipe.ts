import type { Track } from "@hq/shared";
import { color, track as trackTokens, world, worldCharacter } from "../../theme/tokens";
import { DESK, SEAT_FROM_DESK, SEAT_HEIGHT } from "../furniture/parts";
import type { Appearance } from "./appearance";

/**
 * One helper as a list of parts. The office draws the same shape for every helper in one
 * draw call (instancing), so the cost of a helper does not grow with the number of seats.
 */

/** The geometry a part uses. Each one is shared by every helper (see geometry.ts). */
export type Shape = "box" | "torso" | "head" | "hairCap" | "star" | "triangle" | "bun" | "band";

/** The surface. Matte is most parts, eye is the dark eyes and shoes, lens is the glasses. */
export type Finish = "matte" | "eye" | "lens";

/**
 * What a part moves with. The upper body breathes, the head tilts and nods, the hands type or
 * wave, the thighs and shins walk. Seat parts stay at the desk when the helper walks away.
 * The bubble is the "!" over a helper that waits on you.
 */
export type Bone =
  | "root"
  | "seat"
  | "upper"
  | "head"
  | "handL"
  | "handR"
  | "thighL"
  | "thighR"
  | "shinL"
  | "shinR"
  | "bubble"
  | "bubbleHollow";

export const BONES: Bone[] = [
  "root",
  "seat",
  "upper",
  "head",
  "handL",
  "handR",
  "thighL",
  "thighR",
  "shinL",
  "shinR",
  "bubble",
  "bubbleHollow",
];

/** Thigh length, hip joint to knee. The seated thigh lies on the seat, reaching forward. */
export const THIGH = 0.44;
/** Where the hip joint sits, forward of the seat center (seated) or the feet (standing). */
export const HIP_Z = -0.04;
/** Hip joints sit this far to each side. */
export const HIP_X = 0.1;

export type Vec3 = [number, number, number];

export type CharacterPart = {
  shape: Shape;
  finish: Finish;
  bone: Bone;
  /** Center in the bone's own space. */
  pos: Vec3;
  /** Size in meters. For a rounded or special shape, the size its geometry was built at. */
  size: Vec3;
  rot: Vec3;
  color: string;
  castShadow: boolean;
};

/** The hip height: the thighs rest on the seat. */
export const HIP = SEAT_HEIGHT + 0.07;
/** Built sizes of the shared rounded shapes. A part with another size is scaled from these. */
export const BASE_SIZE: Record<Shape, Vec3> = {
  box: [1, 1, 1],
  torso: [0.44, 0.46, 0.28],
  head: [0.54, 0.5, 0.48],
  hairCap: [0.58, 0.14, 0.52],
  star: [1, 1, 1],
  triangle: [1, 1, 1],
  bun: [1, 1, 1],
  band: [1, 1, 1],
};

const NO_TURN: Vec3 = [0, 0, 0];
const SIDES = [1, -1] as const;

/** Where the bones sit, for a given build. The hands follow `side`: 1 is handL (+x). */
export function boneOrigins(look: Appearance) {
  const lift = look.build.height - 0.46;
  const shoulder = look.build.width / 2 + 0.05;
  return {
    /** The head pivots at the neck. */
    head: [0, HIP + 0.57 + lift, -0.02] as Vec3,
    handL: [shoulder, HIP + 0.3, 0] as Vec3,
    handR: [-shoulder, HIP + 0.3, 0] as Vec3,
  };
}

/**
 * Every part of one seated helper. The origin is the seat center on the floor and the helper
 * faces +z. Sizes match the approved Lab study (P2.3), plus the P4.1 variations.
 */
export function partsFor(look: Appearance, seatTrack: Track): CharacterPart[] {
  const parts: CharacterPart[] = [];
  const add = (
    bone: Bone,
    shape: Shape,
    pos: Vec3,
    size: Vec3,
    tint: string,
    extra: { rot?: Vec3; finish?: Finish; castShadow?: boolean } = {},
  ) =>
    parts.push({
      shape,
      bone,
      pos,
      size,
      color: tint,
      rot: extra.rot ?? NO_TURN,
      finish: extra.finish ?? "matte",
      castShadow: extra.castShadow ?? false,
    });

  const { width, height } = look.build;
  const lift = height - 0.46;
  const bones = boneOrigins(look);

  // Legs, in joint space: each thigh hangs from its hip joint along -y, each shin from its
  // knee. Seated, the thigh turns to lie on the seat and the shin drops to the floor
  // (crowdPlan.writeBones). Dark shoes, toes forward.
  for (const s of SIDES) {
    const thigh: Bone = s === 1 ? "thighL" : "thighR";
    const shin: Bone = s === 1 ? "shinL" : "shinR";
    add(thigh, "box", [0, -THIGH / 2, 0], [0.15, THIGH, 0.14], look.bottom);
    add(shin, "box", [0, -HIP / 2, 0], [0.14, HIP, 0.14], look.bottom);
    add(shin, "box", [0, -HIP + 0.03, 0.04], [0.15, 0.06, 0.22], worldCharacter.eye, {
      finish: "eye",
    });
  }

  // Torso, with the outfit on its front.
  const chestY = HIP + 0.28 + lift / 2;
  add("upper", "torso", [0, chestY, -0.02], [width, height, 0.28], look.top, { castShadow: true });
  const front = -0.02 + 0.14;
  if (look.outfit === "cardigan") {
    add("upper", "box", [0, chestY, front + 0.0035], [0.14, height - 0.02, 0.007], look.inner);
  }
  if (look.outfit === "collar") {
    for (const s of SIDES) {
      add("upper", "box", [s * 0.065, HIP + 0.5 + lift, 0.07], [0.1, 0.04, 0.07], world.paper, {
        rot: [0, 0, s * 0.35],
      });
    }
  }
  addBadge(add, seatTrack, [0, HIP + 0.32, 0.125]);

  // Arms reach forward to the keyboard. The upper arm moves with the chest, the rest with the hand.
  for (const s of SIDES) {
    const origin = s === 1 ? bones.handL : bones.handR;
    const hand: Bone = s === 1 ? "handL" : "handR";
    add("upper", "box", origin, [0.11, 0.26, 0.12], look.top);
    add(hand, "box", [-s * 0.02, -0.1, 0.25], [0.1, 0.09, 0.44], look.top);
    add(hand, "box", [-s * 0.03, -0.1, 0.5], [0.1, 0.07, 0.1], look.skin);
  }

  // Neck, then the head and everything on it (head space: face is +z, top at y 0.5).
  add("upper", "box", [0, HIP + 0.54 + lift, -0.02], [0.14, 0.08, 0.14], look.skin);
  add("head", "head", [0, 0.25, 0], BASE_SIZE.head, look.skin, { castShadow: true });
  for (const s of SIDES) {
    add("head", "box", [s * 0.11, 0.24, 0.241], [0.05, 0.07, 0.01], worldCharacter.eye, {
      finish: "eye",
    });
  }
  addHair(add, look);
  addAccessory(add, look);
  addBubble(add);
  return parts;
}

type Add = (
  bone: Bone,
  shape: Shape,
  pos: Vec3,
  size: Vec3,
  tint: string,
  extra?: { rot?: Vec3; finish?: Finish; castShadow?: boolean },
) => void;

/**
 * The ID card on a lanyard in the track color, with the track shape: star, outline triangle,
 * diamond or square. Shape plus color, so the track reads without color vision (and the Lead
 * triangle has only the white card behind it, for logo safety).
 */
function addBadge(add: Add, seatTrack: Track, at: Vec3) {
  const t = trackTokens[seatTrack];
  const tint = color[t.worldColorKey];
  const [x, y, z] = at;
  for (const s of SIDES) {
    add("upper", "box", [x + s * 0.05, y + 0.14, z - 0.004], [0.03, 0.16, 0.006], tint, {
      rot: [0, 0, s * 0.35],
    });
  }
  add("upper", "box", [x, y, z], [0.14, 0.16, 0.01], world.paper);
  const mark: Vec3 = [x, y - 0.01, z + 0.007];
  if (t.shape === "star")
    add("upper", "star", [mark[0], mark[1], mark[2] - 0.002], [1, 1, 1], tint);
  if (t.shape === "triangle-outline") {
    add("upper", "triangle", mark, [1, 1, 1], tint, { rot: [0, 0, Math.PI / 2] });
  }
  if (t.shape === "diamond") {
    add("upper", "box", mark, [0.05, 0.05, 0.008], tint, { rot: [0, 0, Math.PI / 4] });
  }
  if (t.shape === "square") add("upper", "box", mark, [0.065, 0.065, 0.008], tint);
}

function addHair(add: Add, look: Appearance) {
  const h = look.hair;
  const cap = (size: Vec3, y: number) =>
    add("head", "hairCap", [0, y, -0.01], size, h, { castShadow: true });
  if (look.hairStyle === "crop") {
    // Close cut: a thin cap and a short back.
    cap([0.57, 0.09, 0.51], 0.46);
    add("head", "box", [0, 0.42, -0.22], [0.57, 0.12, 0.08], h);
    return;
  }
  cap(BASE_SIZE.hairCap, 0.47);
  // A short back piece, so some neck shows from behind. Long hair falls to the shoulders.
  if (look.hairStyle === "long") {
    add("head", "box", [0, 0.24, -0.23], [0.58, 0.52, 0.1], h);
  } else {
    add("head", "box", [0, 0.38, -0.22], [0.58, 0.2, 0.1], h);
  }
  if (look.hairStyle === "bob" || look.hairStyle === "long") {
    const tall = look.hairStyle === "long" ? 0.46 : 0.34;
    for (const s of SIDES) {
      add("head", "box", [s * 0.285, 0.47 - tall / 2, -0.03], [0.06, tall, 0.46], h);
    }
  }
  if (look.hairStyle === "bun") add("head", "bun", [0, 0.56, -0.16], [1, 1, 1], h);
  if (look.hairStyle === "ponytail") {
    add("head", "box", [0, 0.22, -0.3], [0.12, 0.3, 0.1], h, { rot: [0.25, 0, 0] });
  }
  if (look.hairStyle === "tuft") {
    add("head", "box", [0.12, 0.55, 0.12], [0.26, 0.08, 0.2], h, { rot: [0, 0, -0.35] });
  }
}

function addAccessory(add: Add, look: Appearance) {
  const frame = world.lampCord;
  if (look.accessory === "glasses") {
    for (const s of SIDES) {
      add("head", "box", [s * 0.11, 0.25, 0.243], [0.13, 0.1, 0.006], world.glass, {
        finish: "lens",
      });
    }
    add("head", "box", [0, 0.305, 0.247], [0.38, 0.022, 0.01], frame);
  }
  if (look.accessory === "headset") {
    add("head", "band", [0, 0.28, 0], [1, 1, 1], frame);
    for (const s of SIDES) add("head", "box", [s * 0.29, 0.24, 0], [0.06, 0.14, 0.12], frame);
    add("head", "box", [0.27, 0.14, 0.14], [0.015, 0.015, 0.2], frame, { rot: [0, -0.5, 0] });
  }
  if (look.accessory === "mug") {
    // On the desk, right of the keyboard (the desk top is at DESK.height, its near edge at 0.5).
    const x = -0.42;
    const z = SEAT_FROM_DESK - DESK.depth / 2 + 0.16;
    add("seat", "box", [x, DESK.height + 0.055, z], [0.08, 0.1, 0.08], look.inner);
    add("seat", "box", [x - 0.05, DESK.height + 0.06, z], [0.02, 0.05, 0.02], look.inner);
  }
}

/**
 * The "!" bubble for "waiting on you": a white speech bubble with a tail and an amber "!",
 * in bubble space (it always faces the camera, crowdPlan.writeBones). Amber plus the "!" shape,
 * so it reads without color vision, like the status dot (D-045).
 */
function addBubble(add: Add) {
  // 0.28 m wide with a navy edge behind, so it reads on the pale floor (council, 29 Sep 2026).
  add("bubble", "box", [0, 0, -0.012], [0.32, 0.36, 0.03], color.navy);
  add("bubble", "box", [0, 0, 0], [0.28, 0.32, 0.05], world.paper);
  add("bubble", "box", [-0.08, -0.18, 0], [0.08, 0.08, 0.05], world.paper, {
    rot: [0, 0, Math.PI / 4],
  });
  add("bubble", "box", [0, 0.04, 0.03], [0.055, 0.15, 0.02], color.statusWaiting);
  add("bubble", "box", [0, -0.09, 0.03], [0.055, 0.055, 0.02], color.statusWaiting);
  // The hollow bubble for "waiting on someone else": the same shape with three calm dots,
  // no amber, so only work that waits on you calls for attention.
  add("bubbleHollow", "box", [0, 0, -0.012], [0.32, 0.36, 0.03], color.inkMuted);
  add("bubbleHollow", "box", [0, 0, 0], [0.28, 0.32, 0.05], world.paper);
  for (const x of [-0.08, 0, 0.08]) {
    add("bubbleHollow", "box", [x, 0, 0.03], [0.045, 0.045, 0.02], color.inkMuted);
  }
}
