import type { Track } from "@hq/shared";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { type Appearance, appearanceFor } from "./appearance";
import type { Activity, Pose } from "./motion";
import {
  BASE_SIZE,
  type Bone,
  boneOrigins,
  type Finish,
  partsFor,
  type Shape,
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

const BONES: Bone[] = ["root", "upper", "head", "handL", "handR"];
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
const headTurn = new Matrix4();
const headEuler = new Euler();

/**
 * The world matrix of each bone of one helper for a pose, written into `out`
 * (root, upper, head, handL, handR).
 */
export function writeBones(
  seat: Matrix4,
  origins: BoneOrigins,
  pose: Pose,
  out: Record<Bone, Matrix4>,
): void {
  out.root.copy(seat);
  out.upper.copy(seat).multiply(offset.makeTranslation(0, pose.chestLift, 0));
  const [hx, hy, hz] = origins.head;
  headTurn.makeRotationFromEuler(headEuler.set(pose.headNod, 0, pose.headTilt));
  out.head
    .copy(out.upper)
    .multiply(offset.makeTranslation(hx, hy, hz))
    .multiply(headTurn);
  const [lx, ly, lz] = origins.handL;
  out.handL.copy(out.upper).multiply(offset.makeTranslation(lx, ly + pose.leftHandLift, lz));
  const [rx, ry, rz] = origins.handR;
  out.handR.copy(out.upper).multiply(offset.makeTranslation(rx, ry + pose.rightHandLift, rz));
}

/** One matrix per bone of one helper. */
export type BoneSet = Record<Bone, Matrix4>;

export function newBones(): BoneSet {
  return Object.fromEntries(BONES.map((b) => [b, new Matrix4()])) as BoneSet;
}

/** Draw calls for one crowd, before shadows. Each batch is one instanced mesh. */
export const drawCalls = (plan: CrowdPlan) => plan.batches.length;
