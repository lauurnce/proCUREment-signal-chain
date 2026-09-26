import { world } from "../../theme/tokens";
import { useMaterial } from "../materials";
import { Chair } from "./Chair";
import { DESK, Desk } from "./Desk";
import { DeskLamp } from "./DeskLamp";

/** Where a helper sits: the seat center on the floor, and the way it faces. */
export type SeatSpot = { position: [number, number, number]; rotation: number };

const SEAT_FROM_DESK = 0.85;

/**
 * The 4 seats of a pod, in order: back left, back right, front left, front right.
 * Back seats face +z (toward the camera), front seats face -z.
 */
export function podSeats(center: [number, number]): SeatSpot[] {
  const [cx, cz] = center;
  const back = cz - DESK.depth / 2 - SEAT_FROM_DESK;
  const front = cz + DESK.depth / 2 + SEAT_FROM_DESK;
  const xs = [cx - DESK.width / 2, cx + DESK.width / 2];
  return [
    ...xs.map((x): SeatSpot => ({ position: [x, 0, back], rotation: 0 })),
    ...xs.map((x): SeatSpot => ({ position: [x, 0, front], rotation: Math.PI })),
  ];
}

/** A pod of 4 desks facing each other in pairs, with a low divider (1.1 m max) and chairs. */
export function DeskPod({ center, lampsOn }: { center: [number, number]; lampsOn: boolean }) {
  const divider = useMaterial(world.deskDivider);
  const [cx, cz] = center;
  const seats = podSeats(center);

  return (
    <group>
      {seats.map((seat, i) => {
        const [x, , z] = seat.position;
        // The desk sits between the seat and the divider, with its seat side toward the sitter.
        const deskZ = seat.rotation === 0 ? cz - DESK.depth / 2 : cz + DESK.depth / 2;
        const deskRotation = seat.rotation === 0 ? Math.PI : 0;
        return (
          <group key={`${x}-${z}`}>
            <group position={[x, 0, deskZ]} rotation={[0, deskRotation, 0]}>
              <Desk />
              {(i === 0 || i === 3) && (
                <group position={[0.5, DESK.height, -0.12]}>
                  <DeskLamp on={lampsOn} />
                </group>
              )}
            </group>
            <group position={seat.position} rotation={[0, seat.rotation, 0]}>
              <Chair />
            </group>
          </group>
        );
      })}
      <mesh material={divider} position={[cx, DESK.height + 0.15, cz]}>
        <boxGeometry args={[DESK.width * 2, 0.3, 0.03]} />
      </mesh>
    </group>
  );
}
