import type { Track } from "@hq/shared";
import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { worldCharacter } from "../../theme/tokens";
import { SEAT_HEIGHT } from "../furniture/Chair";
import { useMaterial } from "../materials";
import { Accessory } from "./Accessory";
import { appearanceFor } from "./appearance";
import { Hair } from "./Hair";
import { type Activity, poseAt, STILL } from "./motion";
import { TrackBadge3D } from "./TrackBadge3D";

type Props = {
  seed: string;
  track: Track;
  activity: Activity;
  /** A fixed time for screenshots. Null means real time. */
  frozenAt: number | null;
  /** Reduced motion: hold still. */
  still: boolean;
};

const ARM_SIDES = [1, -1] as const;

/**
 * A seated AI helper, built from rounded boxes. About 1.5 m tall standing, with a big head.
 * The origin is the seat center on the floor, and the helper faces +z.
 */
export function Character({ seed, track, activity, frozenAt, still }: Props) {
  const look = useMemo(() => appearanceFor(seed), [seed]);
  const skin = useMaterial(look.skin);
  const hair = useMaterial(look.hair);
  const top = useMaterial(look.top);
  const bottom = useMaterial(look.bottom);
  const eye = useMaterial(worldCharacter.eye, { roughness: 0.6 });

  const upper = useRef<Group>(null);
  const head = useRef<Group>(null);
  const hands = useRef<(Group | null)[]>([]);

  useFrame((state) => {
    const t = frozenAt ?? state.clock.elapsedTime;
    const pose = still ? STILL : poseAt(t, activity, look.phase);
    if (upper.current) upper.current.position.y = pose.chestLift;
    if (head.current) {
      head.current.rotation.z = pose.headTilt;
      head.current.rotation.x = pose.headNod;
    }
    const [left, right] = hands.current;
    if (left) left.position.y = pose.leftHandLift;
    if (right) right.position.y = pose.rightHandLift;
  });

  const hip = SEAT_HEIGHT + 0.07;

  return (
    <group>
      {/* Legs: thighs on the seat, shins down to the floor */}
      {ARM_SIDES.map((s) => (
        <group key={`leg${s}`} position={[s * 0.1, 0, 0]}>
          <mesh material={bottom} position={[0, hip, 0.18]}>
            <boxGeometry args={[0.15, 0.14, 0.44]} />
          </mesh>
          <mesh material={bottom} position={[0, hip / 2, 0.36]}>
            <boxGeometry args={[0.14, hip, 0.14]} />
          </mesh>
          <mesh material={eye} position={[0, 0.03, 0.4]}>
            <boxGeometry args={[0.15, 0.06, 0.22]} />
          </mesh>
        </group>
      ))}

      <group ref={upper}>
        <RoundedBox
          args={[0.44, 0.46, 0.28]}
          radius={0.07}
          position={[0, hip + 0.28, -0.02]}
          material={top}
          castShadow
        />
        <group position={[0, hip + 0.32, 0.125]}>
          <TrackBadge3D id={track} />
        </group>

        {/* Arms reach forward to the keyboard. Each hand group lifts while typing. */}
        {ARM_SIDES.map((s, i) => (
          <group key={`arm${s}`} position={[s * 0.27, hip + 0.3, 0]}>
            <mesh material={top} position={[0, 0, 0]}>
              <boxGeometry args={[0.11, 0.26, 0.12]} />
            </mesh>
            <group
              ref={(g) => {
                hands.current[i] = g;
              }}
            >
              <mesh material={top} position={[-s * 0.02, -0.1, 0.25]}>
                <boxGeometry args={[0.1, 0.09, 0.44]} />
              </mesh>
              <mesh material={skin} position={[-s * 0.03, -0.1, 0.5]}>
                <boxGeometry args={[0.1, 0.07, 0.1]} />
              </mesh>
            </group>
          </group>
        ))}

        <mesh material={skin} position={[0, hip + 0.54, -0.02]}>
          <boxGeometry args={[0.14, 0.08, 0.14]} />
        </mesh>

        {/* Head pivots at the neck */}
        <group ref={head} position={[0, hip + 0.57, -0.02]}>
          <RoundedBox
            args={[0.54, 0.5, 0.48]}
            radius={0.11}
            position={[0, 0.25, 0]}
            material={skin}
            castShadow
          />
          {ARM_SIDES.map((s) => (
            <mesh key={`eye${s}`} material={eye} position={[s * 0.11, 0.24, 0.241]}>
              <boxGeometry args={[0.05, 0.07, 0.01]} />
            </mesh>
          ))}
          <Hair style={look.hairStyle} material={hair} />
          <Accessory kind={look.accessory} />
        </group>
      </group>
    </group>
  );
}
