import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef } from "react";
import {
  BoxGeometry,
  type InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  RingGeometry,
  Vector3,
} from "three";
import { useStore } from "../../state/store";
import { color } from "../../theme/tokens";
import { useMaterial } from "../materials";
import type { CrowdMember } from "./crowdPlan";
import { selectSeat, useSelectedSeat, useSelection } from "./selection";

/** The click area around a seated helper: bigger than the body, so a helper is easy to hit. */
const HIT = { width: 0.8, height: 1.6, depth: 0.8 };
const HIT_BOX = new BoxGeometry(1, 1, 1);
/** Never drawn (the mesh is invisible), only hit by the pointer. */
const HIT_MATERIAL = new MeshBasicMaterial();
const RING = new RingGeometry(0.52, 0.62, 40);
/** A press that moves more than this many pixels is a drag, not a click. */
const DRAG_PX = 5;
const Y_AXIS = new Vector3(0, 1, 0);

/**
 * Click a helper to select them: the camera eases to them and a soft ring shows on the floor.
 * Esc clears the selection. The click areas are one invisible instanced mesh, so they cost no
 * draw call.
 */
export function SeatPicker({ members }: { members: CrowdMember[] }) {
  const hits = useRef<InstancedMesh>(null);
  const selected = useSelectedSeat();
  const spot = useSelection((state) => (selected ? state.seats.get(selected) : undefined));
  // The ring follows the tag outline: accent by day, light blue on the navy night scene.
  const night = useStore((state) => state.light === "night");
  const ringMaterial = useMaterial(night ? color.blueLight : color.accent, { opacity: 0.7 });

  useLayoutEffect(() => {
    const mesh = hits.current;
    if (!mesh) return;
    const matrix = new Matrix4();
    const turn = new Quaternion();
    members.forEach((m, i) => {
      const [x, , z] = m.position;
      turn.setFromAxisAngle(Y_AXIS, m.rotation);
      matrix.compose(
        new Vector3(x, HIT.height / 2, z),
        turn,
        new Vector3(HIT.width, HIT.height, HIT.depth),
      );
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [members]);

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
    if (!member) return;
    event.stopPropagation();
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
      {spot && (
        <mesh
          geometry={RING}
          material={ringMaterial}
          position={[spot[0], 0.012, spot[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      )}
    </>
  );
}
