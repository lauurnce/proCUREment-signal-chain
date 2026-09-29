import type { Track } from "@hq/shared";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { type Appearance, appearanceFor } from "./appearance";
import { type Activity, type Pose, STAND_CHEST, STAND_JOINT } from "./motion";
import {
  BASE_SIZE,
  BONES,
  type Bone,
  boneOrigins,
  type Finish,
  HIP,
  HIP_X,
  HIP_Z,
  partsFor,
  type Shape,
  THIGH,
  type Vec3,
} from "./recipe";

/** One helper in a crowd: who they are, and where their seat is. */
export type CrowdMember = {
  id: string;
  /** The look comes from this seed. The office uses the roster's avatarSeed. */
  seed: string;
  track: Track;
  activity: Activity;
  /** The seat center on the floor. */
  position: Vec3;
  /** Turn around Y, in radians. 0 faces +z. */
  rotation: number;
};

type Entry = { member: number; bone: Bone; local: Matrix4; color: string };

/** Every copy of one shape and finish across the crowd: one instanced mesh, one draw call. */
export type Batch = {
  key: string;
  shape: Shape;
  finish: Finish;
  castShadow: boolean;
  entries: Entry[];
};

export type BoneOrigins = ReturnType<typeof boneOrigins>;

export type CrowdPlan = {
  looks: Appearance[];
  origins: BoneOrigins[];
  activities: Activity[];
  /** Seat matrix per member. */
  seats: Matrix4[];
  batches: Batch[];
};

const Y_AXIS = new Vector3(0, 1, 0);

/** Sorts every part of every helper into batches. Runs once per new crowd, never per frame. */
export function planCrowd(members: CrowdMember[]): CrowdPlan {
  const byKey = new Map<string, Batch>();
  const looks: Appearance[] = [];
  const origins: BoneOrigins[] = [];
  const seats: Matrix4[] = [];
  const turn = new Quaternion();
  const scale = new Vector3();
  members.forEach((m, index) => {
    const look = appearanceFor(m.seed);
    looks.push(look);
    origins.push(boneOrigins(look));
    seats.push(
      new Matrix4().compose(
        new Vector3(...m.position),
        new Quaternion().setFromAxisAngle(Y_AXIS, m.rotation),
        new Vector3(1, 1, 1),
      ),
    );
    for (const part of partsFor(look, m.track)) {
      const key = `${part.shape}|${part.finish}`;
      let batch = byKey.get(key);
      if (!batch) {
        batch = { key, shape: part.shape, finish: part.finish, castShadow: false, entries: [] };
        byKey.set(key, batch);
      }
      batch.castShadow ||= part.castShadow;
      const base = BASE_SIZE[part.shape];
      const local = new Matrix4().compose(
        new Vector3(...part.pos),
        turn.setFromEuler(new Euler(...part.rot)),
        scale.set(part.size[0] / base[0], part.size[1] / base[1], part.size[2] / base[2]),
      );
      batch.entries.push({ member: index, bone: part.bone, local, color: part.color });
    }
  });
  const activities = members.map((m) => m.activity);
  return { looks, origins, activities, seats, batches: [...byKey.values()] };
}

/** Scratch objects for the per-frame math, so a frame never allocates. */
const offset = new Matrix4();
const turn = new Matrix4();
const roll = new Matrix4();
const headEuler = new Euler();
const where = new Vector3();
const bubbleTurn = new Quaternion().setFromAxisAngle(Y_AXIS, Math.PI / 4);
const bubbleSize = new Vector3();

/**
 * The bubble faces the camera, which looks along (-1, -1, -1) (true isometric), and sits to
 * the right of the head on screen: screen right on the floor is (1, 0, -1) / sqrt 2.
 */
const BUBBLE_SIDE = 0.34 / Math.SQRT2;
const BUBBLE_ABOVE_HEAD = 0.22;

/**
 * The world matrix of each bone of one helper for a pose, written into `out`.
 * `root` is where the helper stands (feet on the floor, turned the way it faces). `seat` is its
 * desk chair, which never moves, for the things it leaves on the desk.
 */
export function writeBones(
  root: Matrix4,
  seat: Matrix4,
  origins: BoneOrigins,
  pose: Pose,
  out: Record<Bone, Matrix4>,
): void {
  out.root.copy(root);
  out.seat.copy(seat);
  const chest = pose.chestLift + pose.stand * STAND_CHEST + pose.bob;
  out.upper.copy(root).multiply(offset.makeTranslation(0, chest, 0));
  const [hx, hy, hz] = origins.head;
  turn.makeRotationFromEuler(headEuler.set(pose.headNod, 0, pose.headTilt));
  out.head
    .copy(out.upper)
    .multiply(offset.makeTranslation(hx, hy, hz))
    .multiply(turn);
  // A forearm turns at the elbow. Hanging, it moves back under the shoulder.
  const [lx, ly, lz] = origins.handL;
  out.handL
    .copy(out.upper)
    .multiply(offset.makeTranslation(lx, ly + pose.leftHandLift, lz + 0.1 * Math.sin(pose.armL)))
    .multiply(turn.makeRotationX(pose.armL));
  const [rx, ry, rz] = origins.handR;
  // The right forearm can also tilt out to the side (+x is the helper's left, so a positive
  // roll tips a raised right hand away from the head).
  out.handR
    .copy(out.upper)
    .multiply(offset.makeTranslation(rx, ry + pose.rightHandLift, rz + 0.1 * Math.sin(pose.armR)))
    .multiply(turn.makeRotationZ(pose.rollR))
    .multiply(roll.makeRotationX(pose.armR));
  // Legs hang from the hip joints. The hip rises as the helper stands, so the feet stay down.
  const hip = HIP + pose.stand * STAND_JOINT + pose.bob;
  out.thighL
    .copy(root)
    .multiply(offset.makeTranslation(HIP_X, hip, HIP_Z))
    .multiply(turn.makeRotationX(pose.thighL));
  out.thighR
    .copy(root)
    .multiply(offset.makeTranslation(-HIP_X, hip, HIP_Z))
    .multiply(turn.makeRotationX(pose.thighR));
  out.shinL
    .copy(out.thighL)
    .multiply(offset.makeTranslation(0, -THIGH, 0))
    .multiply(turn.makeRotationX(pose.kneeL));
  out.shinR
    .copy(out.thighR)
    .multiply(offset.makeTranslation(0, -THIGH, 0))
    .multiply(turn.makeRotationX(pose.kneeR));
  // The bubble: over the head, to its right on screen, always facing the camera.
  where.setFromMatrixPosition(root);
  const top = hy + 0.5 + chest + BUBBLE_ABOVE_HEAD;
  const size = pose.bubble > 0 ? pose.bubble : 0;
  out.bubble.compose(
    where.set(where.x + BUBBLE_SIDE, top, where.z - BUBBLE_SIDE),
    bubbleTurn,
    bubbleSize.set(size, size, size),
  );
}

/** One matrix per bone of one helper. */
export type BoneSet = Record<Bone, Matrix4>;

export function newBones(): BoneSet {
  return Object.fromEntries(BONES.map((b) => [b, new Matrix4()])) as BoneSet;
}

/** Draw calls for one crowd, before shadows. Each batch is one instanced mesh. */
export const drawCalls = (plan: CrowdPlan) => plan.batches.length;
