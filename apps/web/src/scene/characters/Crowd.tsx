import { useFrame } from "@react-three/fiber";
import { useContext, useLayoutEffect, useMemo, useRef } from "react";
import { Color, type InstancedMesh, Matrix4, MeshStandardMaterial } from "three";
import { useStore } from "../../state/store";
import { color, world } from "../../theme/tokens";
import { type Surface, SurfaceContext } from "../materials";
import type { Appearance } from "./appearance";
import {
  type BoneOrigins,
  type BoneSet,
  type CrowdMember,
  type CrowdPlan,
  newBones,
  planCrowd,
  writeBones,
} from "./crowdPlan";
import { characterGeometry } from "./geometry";
import { type Pose, poseInto, STILL } from "./motion";
import type { Finish } from "./recipe";

/**
 * Moves the helpers of a crowd: where each one stands and how it moves. Without a driver,
 * every helper sits at its seat with its own activity (the Lab diorama).
 */
export type CrowdDrive = {
  /** Called once per frame, before the poses are written. `delta` is in seconds. */
  step: (delta: number) => void;
  /** Where member `m` stands, turned the way it faces. */
  root: (m: number) => Matrix4;
  /** The pose of member `m` at `time`, written into `out`. */
  pose: (m: number, time: number, out: Pose) => Pose;
};

type Props = {
  /** Keep this list stable (useMemo). A new list rebuilds the crowd. */
  members: CrowdMember[];
  /** A fixed time for screenshots. Null means real time. */
  frozenAt: number | null;
  /** Reduced motion: hold still. */
  still: boolean;
  drive?: CrowdDrive;
};

const ROUGHNESS: Record<Finish, number> = { matte: 0.85, eye: 0.6, lens: 0.4 };
/** At night the helpers get a faint moonlight glow, so dark hair and navy tops still read. */
const NIGHT_LIFT = 0.12;

const crowdMaterials = new Map<string, MeshStandardMaterial>();

/**
 * The helpers' own materials (white, so instance colors show). Not shared with the world,
 * because only the helpers get the night lift (council, 29 Sep 2026).
 */
function crowdMaterial(finish: Finish, surface: Surface, night: boolean) {
  const roughness = Math.min(1, ROUGHNESS[finish] + surface.roughnessBoost);
  const key = `${finish}|${roughness}|${night}`;
  let material = crowdMaterials.get(key);
  if (!material) {
    material = new MeshStandardMaterial({
      color: color.white,
      roughness,
      metalness: 0,
      emissive: night ? color.blueLight : world.noGlow,
      emissiveIntensity: night ? NIGHT_LIFT : 0,
    });
    crowdMaterials.set(key, material);
  }
  return material;
}
const scratch = new Matrix4();
const pose: Pose = { ...STILL };

/** Poses every helper at `time`: first their bones, then every part once, hung on its bone. */
function writePoses(
  plan: CrowdPlan,
  bones: BoneSet[],
  meshes: Map<string, InstancedMesh>,
  time: number,
  still: boolean,
  drive: CrowdDrive | undefined,
) {
  plan.seats.forEach((seat, m) => {
    const look = plan.looks[m] as Appearance;
    const root = drive ? drive.root(m) : seat;
    if (drive) drive.pose(m, time, pose);
    else poseInto(pose, time, { activity: plan.activities[m] ?? "idle", phase: look.phase });
    // Reduced motion keeps where a helper is and whether it stands, and drops the rest.
    const shown = still ? { ...STILL, stand: pose.stand, bubble: pose.bubble } : pose;
    if (still && pose.stand > 0) {
      shown.thighL = shown.thighR = 0;
      shown.kneeL = shown.kneeR = 0;
      shown.armL = shown.armR = Math.PI / 2;
    }
    if (still && pose.bubble > 0) {
      shown.armR = pose.armR;
      shown.rightHandLift = pose.rightHandLift;
    }
    writeBones(root, seat, plan.origins[m] as BoneOrigins, shown, bones[m] as BoneSet);
  });
  for (const batch of plan.batches) {
    const mesh = meshes.get(batch.key);
    if (!mesh) continue;
    batch.entries.forEach((entry, i) => {
      const own = bones[entry.member] as BoneSet;
      mesh.setMatrixAt(i, scratch.multiplyMatrices(own[entry.bone], entry.local));
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
}

/**
 * Many helpers, drawn together: one instanced mesh per shape and finish, so 26 helpers
 * cost about as many draw calls as one. The poses are written straight into the instance
 * matrices every frame (no React state), or once when the crowd holds still. With a driver,
 * the helpers stand up, walk and sit down. A frozen crowd (screenshots) never steps.
 */
export function Crowd({ members, frozenAt, still, drive }: Props) {
  const surface = useContext(SurfaceContext);
  const night = useStore((state) => state.light === "night") || surface.night;
  const plan = useMemo(() => planCrowd(members), [members]);
  const meshes = useRef(new Map<string, InstancedMesh>());
  const bones = useMemo(() => plan.seats.map(newBones), [plan]);

  useLayoutEffect(() => {
    const tone = new Color();
    for (const batch of plan.batches) {
      const mesh = meshes.current.get(batch.key);
      if (!mesh) continue;
      batch.entries.forEach((entry, i) => {
        mesh.setColorAt(i, tone.set(entry.color));
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    writePoses(plan, bones, meshes.current, frozenAt ?? 0, still, drive);
  }, [plan, bones, frozenAt, still, drive]);

  useFrame((state, delta) => {
    if (!drive) {
      if (still || frozenAt !== null) return;
      writePoses(plan, bones, meshes.current, state.clock.elapsedTime, still, drive);
      return;
    }
    // The driver decides what moves: a frozen crowd (screenshots) keeps its helpers still but
    // lets a test walk the avatar. Reduced motion still moves a helper to where it goes, in
    // one cut (behavior.ts). Cap one frame at 1/20 s, so a stall (like a tab switch) does not
    // teleport anyone.
    drive.step(Math.min(delta, 0.05));
    writePoses(plan, bones, meshes.current, frozenAt ?? state.clock.elapsedTime, still, drive);
  });

  return (
    <group>
      {plan.batches.map((batch) => (
        <instancedMesh
          // The instance buffers have a fixed length, so a new count needs a new mesh.
          key={`${batch.key}|${batch.entries.length}`}
          ref={(mesh) => {
            if (mesh) meshes.current.set(batch.key, mesh);
            else meshes.current.delete(batch.key);
          }}
          args={[characterGeometry(batch.shape), undefined, batch.entries.length]}
          // Instance colors multiply the material color, so the batch materials are white.
          // A prop, not an arg, so day and night swap it without rebuilding the mesh.
          material={crowdMaterial(batch.finish, surface, night)}
          castShadow={batch.castShadow}
          receiveShadow
          // The helpers barely move and spread over the whole floor, so culling saves nothing.
          frustumCulled={false}
        />
      ))}
    </group>
  );
}
