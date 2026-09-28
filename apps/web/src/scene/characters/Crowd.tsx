import { useFrame } from "@react-three/fiber";
import { useContext, useLayoutEffect, useMemo, useRef } from "react";
import { Color, type InstancedMesh, Matrix4 } from "three";
import { color } from "../../theme/tokens";
import { SurfaceContext, sharedMaterial } from "../materials";
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
import { poseAt, STILL } from "./motion";
import type { Finish } from "./recipe";

type Props = {
  /** Keep this list stable (useMemo). A new list rebuilds the crowd. */
  members: CrowdMember[];
  /** A fixed time for screenshots. Null means real time. */
  frozenAt: number | null;
  /** Reduced motion: hold still. */
  still: boolean;
};

const ROUGHNESS: Record<Finish, number> = { matte: 0.85, eye: 0.6, lens: 0.4 };
const scratch = new Matrix4();

/** Poses every helper at `time`: first their bones, then every part once, hung on its bone. */
function writePoses(
  plan: CrowdPlan,
  bones: BoneSet[],
  meshes: Map<string, InstancedMesh>,
  time: number,
  still: boolean,
) {
  plan.seats.forEach((seat, m) => {
    const look = plan.looks[m] as Appearance;
    const pose = still ? STILL : poseAt(time, plan.activities[m] ?? "idle", look.phase);
    writeBones(seat, plan.origins[m] as BoneOrigins, pose, bones[m] as BoneSet);
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
 * Many seated helpers, drawn together: one instanced mesh per shape and finish, so 26 helpers
 * cost about as many draw calls as one. The poses are written straight into the instance
 * matrices every frame (no React state), or once when the crowd holds still.
 */
export function Crowd({ members, frozenAt, still }: Props) {
  const surface = useContext(SurfaceContext);
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
    writePoses(plan, bones, meshes.current, frozenAt ?? 0, still);
  }, [plan, bones, frozenAt, still]);

  useFrame((state) => {
    if (still || frozenAt !== null) return;
    writePoses(plan, bones, meshes.current, state.clock.elapsedTime, still);
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
          args={[
            characterGeometry(batch.shape),
            // Instance colors multiply the material color, so the batch materials are white.
            sharedMaterial(color.white, surface, { roughness: ROUGHNESS[batch.finish] }),
            batch.entries.length,
          ]}
          castShadow={batch.castShadow}
          receiveShadow
          // The helpers barely move and spread over the whole floor, so culling saves nothing.
          frustumCulled={false}
        />
      ))}
    </group>
  );
}
