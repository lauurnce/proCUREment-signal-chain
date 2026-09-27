import { world } from "../../theme/tokens";

// One recipe for the desk and the chair, used by the Lab diorama (Desk.tsx, Chair.tsx)
// and by the office, which draws all 26 desks as instanced boxes (scene/layout/boxes.ts).

export const DESK = { width: 1.4, depth: 0.7, height: 0.74 } as const;
export const SEAT_HEIGHT = 0.475;
/** From the desk center to the seat center, in meters. */
export const SEAT_FROM_DESK = 0.85;

/** One box: center, size and color, in the furniture's own space. */
export type Part = {
  pos: [number, number, number];
  size: [number, number, number];
  color: string;
};

const part = (pos: Part["pos"], size: Part["size"], color: string): Part => ({ pos, size, color });
const h = DESK.height;

/** Desk parts. The origin is the desk center on the floor, the seat side is +z, the monitor at -z. */
export const DESK_PARTS = {
  /** The oak edge band: the only desk part that casts a shadow. */
  cast: [part([0, h - 0.0175, 0], [DESK.width, 0.035, DESK.depth], world.deskEdge)],
  plain: [
    part([0, h + 0.005, 0], [DESK.width - 0.04, 0.01, DESK.depth - 0.04], world.deskTop),
    ...[-1, 1].flatMap((sx) =>
      [-1, 1].map((sz) =>
        part(
          [sx * (DESK.width / 2 - 0.05), (h - 0.035) / 2, sz * (DESK.depth / 2 - 0.05)],
          [0.04, h - 0.035, 0.04],
          world.deskLeg,
        ),
      ),
    ),
    // Keyboard
    part([0, h + 0.02, 0.16], [0.42, 0.02, 0.14], world.deskDivider),
    // Monitor: foot, stand and body
    part([0, h + 0.02, -0.2], [0.22, 0.02, 0.14], world.monitorBody),
    part([0, h + 0.12, -0.22], [0.05, 0.2, 0.04], world.monitorBody),
    part([0, h + 0.34, -0.2], [0.56, 0.34, 0.035], world.monitorBody),
  ],
  /** The screen glows a little by day and more at night. */
  screen: [part([0, h + 0.34, -0.18], [0.52, 0.3, 0.004], world.screenGlow)],
} as const;

/** Chair parts. The origin is the seat center on the floor, the sitter faces +z. */
export const CHAIR_PARTS = {
  /** The seat: the only chair part that casts a shadow. */
  cast: [part([0, SEAT_HEIGHT - 0.035, 0], [0.46, 0.07, 0.46], world.chairSeat)],
  plain: [
    // Star base and gas lift
    part([0, 0.04, 0], [0.5, 0.03, 0.06], world.chairBase),
    part([0, 0.04, 0], [0.06, 0.03, 0.5], world.chairBase),
    part([0, 0.23, 0], [0.05, 0.34, 0.05], world.chairBase),
    // A low back, so the helper's body stays visible, with a thin accent stripe seen from behind
    part([0, 0.66, -0.22], [0.44, 0.3, 0.06], world.chairSeat),
    part([0, 0.76, -0.252], [0.3, 0.04, 0.005], world.chairAccent),
  ],
} as const;
