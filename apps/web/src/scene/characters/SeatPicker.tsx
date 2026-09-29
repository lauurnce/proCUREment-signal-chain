import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import {
  BoxGeometry,
  type InstancedMesh,
  Matrix4,
  type Mesh,
  MeshBasicMaterial,
  Quaternion,
  RingGeometry,
  Vector3,
} from "three";
import { useStore } from "../../state/store";
import { color } from "../../theme/tokens";
import { useMaterial } from "../materials";
import type { CrowdMember } from "./crowdPlan";
import { STAND_CHEST } from "./motion";
import { selectSeat, useSelectedSeat } from "./selection";
import type { TeamDrive } from "./teamDrive";
import { isWalking } from "./walk";

/** The click area around a seated helper: bigger than the body, so a helper is easy to hit. */
const HIT = { width: 0.8, height: 1.6, depth: 0.8 };
const HIT_BOX = new BoxGeometry(1, 1, 1);
/** Never drawn (the mesh is invisible), only hit by the pointer. */
const HIT_MATERIAL = new MeshBasicMaterial();
const RING = new RingGeometry(0.52, 0.62, 40);
/** A press that moves more than this many pixels is a drag, not a click. */
const DRAG_PX = 5;
const Y_AXIS = new Vector3(0, 1, 0);
const matrix = new Matrix4();
const turn = new Quaternion();
const at = new Vector3();
const size = new Vector3();

/**
 * Click a helper to select them: the camera eases to them and a soft ring shows on the floor.
 * Esc clears the selection. In Walk around mode, a click walks you over to them instead.
 * The click areas are one invisible instanced mesh that follows the helpers as they walk,
 * so they cost no draw call.
 */
export function SeatPicker({ members, drive }: { members: CrowdMember[]; drive: TeamDrive }) {
  const hits = useRef<InstancedMesh>(null);
  const ring = useRef<Mesh>(null);
  const selected = useSelectedSeat();
  const selectedIndex = members.findIndex((m) => m.id === selected);
  // The ring follows the tag outline: accent by day, light blue on the navy night scene.
  const night = useStore((state) => state.light === "night");
  const ringMaterial = useMaterial(night ? color.blueLight : color.accent, { opacity: 0.7 });

  useFrame(() => {
    const mesh = hits.current;
    if (mesh) {
      members.forEach((_, i) => {
        const agent = drive.helper(i);
        if (!agent) return;
        const tall = HIT.height + agent.stand * STAND_CHEST;
        matrix.compose(
          at.set(agent.x, tall / 2, agent.z),
          turn.setFromAxisAngle(Y_AXIS, agent.heading),
          agent.visible ? size.set(HIT.width, tall, HIT.depth) : size.set(0, 0, 0),
        );
        mesh.setMatrixAt(i, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    const agent = selectedIndex >= 0 ? drive.helper(selectedIndex) : undefined;
    if (ring.current && agent) ring.current.position.set(agent.x, 0.012, agent.z);
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") selectSeat(null, "keyboard");
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.cursor = "";
    };
  }, []);

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > DRAG_PX || event.instanceId === undefined) return;
    const member = members[event.instanceId];
    const agent = drive.helper(event.instanceId);
    if (!member || !agent) return;
    event.stopPropagation();
    if (isWalking()) {
      drive.avatar.approach([agent.x, agent.z]);
      return;
    }
    selectSeat(member.id, "click");
  };

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a 3D mesh, not a page element. Keyboard users select helpers through selectSeat (the panel). */}
      <instancedMesh
        key={members.length}
        ref={hits}
        name="seat-picker"
        args={[HIT_BOX, HIT_MATERIAL, members.length]}
        visible={false}
        onClick={onClick}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      />
      {selectedIndex >= 0 && (
        <mesh
          ref={ring}
          geometry={RING}
          material={ringMaterial}
          position={[
            drive.helper(selectedIndex)?.x ?? 0,
            0.012,
            drive.helper(selectedIndex)?.z ?? 0,
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      )}
    </>
  );
}
