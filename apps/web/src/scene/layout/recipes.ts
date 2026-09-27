import type { Accessory, Landmark } from "@hq/shared";
import { world } from "../../theme/tokens";
import { CHAIR_PARTS, DESK } from "../furniture/parts";
import { type Box, box, place } from "./boxes";

// Landmarks (layout.json) and props (accessories.json), built from boxes in the chunky diorama
// style. Original geometry, no reference art. Each part goes to a batch, and each batch is one
// draw call (scene/batch/InstancedBoxes.tsx).

/** cast: casts a shadow. plain: only receives. screen, capiz, dash: glow, stronger at night. */
export type Batch = "cast" | "plain" | "screen" | "capiz" | "dash";
export type Batches = Record<Batch, Box[]>;

/** One part in the item's own space: +z is the front, y is up from the floor. */
type Part = {
  pos: [number, number, number];
  size: [number, number, number];
  color: string;
  batch: Batch;
  /** Extra turn of this part, in radians. */
  rotY?: number;
};

const p = (
  batch: Batch,
  color: string,
  pos: [number, number, number],
  size: [number, number, number],
  rotY = 0,
): Part => ({ batch, color, pos, size, rotY });

const DEG = Math.PI / 180;
/** Height of the blue deck under the Endorsement Bridge (layout/boxes.ts). */
export const DECK = 0.04;

/** A chair from the shared recipe, at (x, z) in the item's space, the sitter turned by `rot`. */
function chair(x: number, z: number, rot: number): Part[] {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const turn = (part: (typeof CHAIR_PARTS.plain)[number], batch: Batch): Part => {
    const [lx, ly, lz] = part.pos;
    return p(batch, part.color, [x + lx * c + lz * s, ly, z - lx * s + lz * c], part.size, rot);
  };
  return [
    ...CHAIR_PARTS.cast.map((part) => turn(part, "cast")),
    ...CHAIR_PARTS.plain.map((part) => turn(part, "plain")),
  ];
}

/** A plain table with four legs. */
function table(x: number, z: number, w: number, d: number, h = DESK.height): Part[] {
  const legs = [-1, 1].flatMap((sx) =>
    [-1, 1].map((sz) =>
      p(
        "plain",
        world.deskLeg,
        [x + sx * (w / 2 - 0.06), (h - 0.04) / 2, z + sz * (d / 2 - 0.06)],
        [0.04, h - 0.04, 0.04],
      ),
    ),
  );
  return [p("cast", world.deskTop, [x, h - 0.02, z], [w, 0.04, d]), ...legs];
}

/** A round table, drawn as an octagon (two squares turned 45 degrees). Low enough to see over. */
function roundTable(x: number, z: number, size: number, h = 0.72): Part[] {
  return [
    p("cast", world.deskTop, [x, h, z], [size, 0.04, size]),
    p("cast", world.deskTop, [x, h, z], [size, 0.04, size], 45 * DEG),
    p("plain", world.deskLeg, [x, h / 2, z], [0.1, h - 0.02, 0.1]),
    p("plain", world.chairBase, [x, 0.02, z], [size * 0.55, 0.04, size * 0.55]),
  ];
}

/**
 * A capiz-style pendant (D-029): flat square shell tiles that widen like a cone. Original
 * geometry. The cord hangs from `top` (the ceiling line by default, or a beam).
 */
function capizLamp(x: number, z: number, low: number, top = 2.8): Part[] {
  return [
    p("plain", world.lampCord, [x, (top + low + 0.2) / 2, z], [0.02, top - low - 0.2, 0.02]),
    ...[0.18, 0.28, 0.38, 0.48].map((size, i) =>
      p(
        "capiz",
        world.capizGlow,
        [x, low + 0.2 - i * 0.05, z],
        [size, 0.04, size],
        (i % 2) * 45 * DEG,
      ),
    ),
  ];
}

/** A plant in a clay pot, with 2 or 3 rounded tiers of leaves that get smaller toward the top. */
function plant(tall: boolean): Part[] {
  const pot = tall ? 0.46 : 0.36;
  const potH = tall ? 0.5 : 0.4;
  const tiers: [y: number, width: number, height: number, color: string][] = tall
    ? [
        [potH + 0.3, pot * 1.5, 0.4, world.plantLeaf],
        [potH + 0.72, pot * 1.2, 0.36, world.plantLeafLight],
        [potH + 1.08, pot * 0.8, 0.3, world.plantLeaf],
      ]
    : [
        [potH + 0.2, pot * 1.5, 0.3, world.plantLeaf],
        [potH + 0.46, pot * 1.05, 0.24, world.plantLeafLight],
        [potH + 0.66, pot * 0.6, 0.18, world.plantLeaf],
      ];
  return [
    p("cast", world.plantPot, [0, potH / 2, 0], [pot, potH, pot]),
    ...tiers.flatMap(([y, w, h, color]) => [
      p("cast", color, [0, y, 0], [w, h, w]),
      p("cast", color, [0, y, 0], [w, h, w], 45 * DEG),
    ]),
  ];
}

// ---------------------------------------------------------------- Landmarks, one per zone

const LANDMARKS: Record<string, Part[]> = {
  // Endorsement Bridge: the hero (council review, 27 Sep 2026). A 3.0 m oak counter along the
  // CM to Ops line, on the blue deck (layout/boxes.ts), framed by two navy arches with beams at
  // 2.2 m, so it is the tallest, boldest thing in the room. A two-sided tray, a folder with a
  // gold diamond tab on the CM end and a teal tab on the Ops end, and a pendant from the beam.
  "bridge-counter": [
    p("cast", world.bridgeCounter, [0, DECK + 0.525, 0], [3.0, 1.05, 0.7]),
    p("plain", world.bridgeCounterTop, [0, DECK + 1.07, 0], [3.04, 0.04, 0.74]),
    p("plain", world.bridgeTray, [0, DECK + 1.12, 0], [0.9, 0.06, 0.36]),
    p("plain", world.bridgeTray, [0, DECK + 1.22, 0], [0.9, 0.16, 0.03]),
    p("plain", world.folderBody, [-0.9, DECK + 1.11, 0], [0.34, 0.04, 0.26]),
    p("plain", world.folderTabCm, [-1.09, DECK + 1.12, 0], [0.06, 0.02, 0.08], 45 * DEG),
    p("plain", world.folderBody, [0.9, DECK + 1.11, 0], [0.34, 0.04, 0.26]),
    p("plain", world.folderTabOps, [1.09, DECK + 1.12, 0], [0.06, 0.02, 0.08]),
    ...[-1.6, 1.6].flatMap((x) => [
      ...[-0.45, 0.45].map((z) =>
        p("plain", world.wallTrim, [x, DECK + 1.08, z], [0.08, 2.16, 0.08]),
      ),
      p("plain", world.wallTrim, [x, 2.2, 0], [0.08, 0.08, 0.98]),
    ]),
    ...[-0.45, 0.45].map((z) => p("plain", world.wallTrim, [0, 2.2, z], [3.28, 0.08, 0.08])),
    p("plain", world.wallTrim, [0, 2.2, 0], [0.08, 0.06, 0.9]),
    ...capizLamp(0, 0, 1.75, 2.17),
  ],
  // SAP Station: a big terminal on a cabinet against the back wall.
  terminal: [
    p("cast", world.shelf, [0, 0.45, 0], [1.6, 0.9, 0.5]),
    p("plain", world.deskTop, [0, 0.91, 0], [1.64, 0.03, 0.54]),
    p("plain", world.monitorBody, [0, 1.0, -0.14], [0.14, 0.18, 0.08]),
    p("plain", world.monitorBody, [0, 1.45, -0.12], [1.3, 0.8, 0.06]),
    p("screen", world.screenGlow, [0, 1.45, -0.085], [1.2, 0.7, 0.01]),
    p("plain", world.deskDivider, [0, 0.94, 0.1], [0.5, 0.02, 0.16]),
  ],
  // Mail Dock: an oak pigeonhole cabinet with navy cubbies and envelopes, and a sorting table.
  "mail-sorter": [
    p("cast", world.mailFrame, [0, 0.8, 0], [1.8, 1.6, 0.45]),
    p("plain", world.mailCubby, [0, 0.85, 0.2], [1.64, 1.4, 0.06]),
    ...[0.5, 0.85, 1.2].map((y) => p("plain", world.mailFrame, [0, y, 0.23], [1.64, 0.03, 0.08])),
    ...[-0.41, 0, 0.41].map((x) => p("plain", world.mailFrame, [x, 0.85, 0.23], [0.03, 1.4, 0.08])),
    ...(
      [
        [-0.615, 0.32],
        [0.205, 0.32],
        [-0.205, 0.67],
        [0.615, 0.67],
        [-0.615, 1.02],
        [0.205, 1.37],
      ] as const
    ).flatMap(([x, y], i) => [
      p("plain", world.envelope, [x, y, 0.245], [0.28, 0.18, 0.02]),
      ...(i % 2 === 0
        ? [p("plain", world.envelopeStripe, [x, y + 0.05, 0.256], [0.28, 0.02, 0.005])]
        : []),
    ]),
    ...table(0, 0.95, 1.4, 0.6),
    p("plain", world.envelope, [-0.3, 0.77, 0.95], [0.3, 0.04, 0.2]),
    p("plain", world.envelope, [0.25, 0.77, 1.0], [0.3, 0.04, 0.2], 10 * DEG),
  ],
  // The To Planner tray at the Ops end of the Mail Dock (review fix 5).
  tray: [
    p("cast", world.shelf, [0, 0.35, 0], [0.8, 0.7, 0.5]),
    p("plain", world.bridgeTray, [0, 0.73, 0], [0.6, 0.06, 0.4]),
    p("plain", world.paper, [0, 0.775, 0], [0.44, 0.03, 0.3]),
  ],
  // Contract Corner: a signing desk with a screen, and two visitor chairs.
  "signing-screen": [
    ...table(0, 0, 1.4, 0.7),
    p("plain", world.monitorBody, [0, 1.1, -0.2], [0.7, 0.45, 0.04]),
    p("plain", world.monitorBody, [0, 0.84, -0.22], [0.08, 0.16, 0.06]),
    p("screen", world.screenGlow, [0, 1.1, -0.178], [0.64, 0.39, 0.01]),
    p("plain", world.paper, [0.4, 0.765, 0.12], [0.3, 0.03, 0.22]),
    ...chair(-0.35, 0.95, Math.PI),
    ...chair(0.35, 0.95, Math.PI),
  ],
  // Negotiation Room: a round table for four, under 0.9 m so the bridge stays in view.
  "round-table": [
    ...roundTable(0, 0, 1.0),
    ...chair(0, -0.85, 0),
    ...chair(0, 0.85, Math.PI),
    ...chair(-0.85, 0, Math.PI / 2),
    ...chair(0.85, 0, -Math.PI / 2),
  ],
  // Huddle Room: a whiteboard on the back wall with a flow drawn on it, and a table for four.
  whiteboard: [
    p("plain", world.wallTrim, [0, 1.5, 0], [2.0, 1.1, 0.05]),
    p("plain", world.paper, [0, 1.5, 0.03], [1.9, 1.0, 0.01]),
    ...[-0.6, 0, 0.6].map((x, i) =>
      p("plain", i === 1 ? world.chairAccent : world.sofa, [x, 1.66, 0.04], [0.34, 0.2, 0.005]),
    ),
    ...[-0.3, 0.3].map((x) => p("plain", world.wallTrim, [x, 1.66, 0.04], [0.24, 0.02, 0.005])),
    p("plain", world.sofa, [-0.2, 1.3, 0.04], [0.8, 0.16, 0.005]),
    p("plain", world.wallTrim, [0, 0.93, 0.06], [1.6, 0.03, 0.08]),
    ...table(0, 2.0, 2.0, 0.9),
    ...chair(-0.5, 1.2, 0),
    ...chair(0.5, 1.2, 0),
    ...chair(-0.5, 2.8, Math.PI),
    ...chair(0.5, 2.8, Math.PI),
  ],
  // Merienda Corner: a coffee cart, and a bistro table under the capiz-style lamp.
  "coffee-cart": [
    p("cast", world.shelf, [0, 0.47, 0], [1.4, 0.86, 0.6]),
    p("plain", world.deskTop, [0, 0.92, 0], [1.44, 0.04, 0.64]),
    p("plain", world.monitorBody, [-0.35, 1.12, -0.1], [0.36, 0.36, 0.3]),
    p("plain", world.deskDivider, [-0.35, 1.04, 0.08], [0.1, 0.08, 0.06]),
    ...[0.1, 0.25, 0.4].map((x) => p("plain", world.paper, [x, 0.985, 0.1], [0.07, 0.09, 0.07])),
    ...[-1, 1].flatMap((sx) =>
      [-1, 1].map((sz) =>
        p("plain", world.chairBase, [sx * 0.6, 0.04, sz * 0.25], [0.08, 0.08, 0.08]),
      ),
    ),
    ...roundTable(-1.6, 0.2, 0.7),
    ...chair(-1.6, -0.45, 0),
    ...chair(-1.6, 0.85, Math.PI),
    ...capizLamp(-1.6, 0.2, 1.95),
  ],
  // Logistics Window: a service counter under a window frame on the floor edge, and a small
  // loading dock outside with a pallet of boxes. The item faces into the room (rot -90).
  "dock-window": [
    p("cast", world.shelf, [0, 0.5, -0.2], [2.6, 1.0, 0.5]),
    p("plain", world.deskTop, [0, 1.02, -0.2], [2.64, 0.04, 0.54]),
    ...[-1.3, 1.3].map((x) => p("plain", world.wallTrim, [x, 1.62, -0.42], [0.08, 1.16, 0.08])),
    p("plain", world.wallTrim, [0, 2.24, -0.42], [2.68, 0.08, 0.1]),
    p("plain", world.wall, [0, 2.32, -0.85], [2.8, 0.05, 0.9]),
    p("plain", world.wallTrim, [0, 2.32, -1.31], [2.84, 0.07, 0.04]),
    ...[-1.42, 1.42].map((x) => p("plain", world.wallTrim, [x, 2.32, -0.85], [0.04, 0.07, 0.9])),
    // The dock, outside the floor: same height as the floor, oak body, navy bumpers.
    p("plain", world.slabSide, [0, -0.185, -1.4], [2.8, 0.37, 1.6]),
    p("plain", world.floorWoodDeep, [0, 0.003, -1.4], [2.76, 0.006, 1.56]),
    ...[-0.9, 0.9].map((x) => p("plain", world.slabEdge, [x, -0.1, -2.22], [0.3, 0.2, 0.06])),
    // A parking apron beside the dock, where the delivery truck prop stands.
    p("plain", world.slabSide, [1.3, -0.185, -3.0], [5.4, 0.37, 1.6]),
    p("plain", world.floorWoodDeep, [1.3, 0.003, -3.0], [5.36, 0.006, 1.56]),
    p("plain", world.slabEdge, [1.3, -0.05, -3.82], [5.4, 0.06, 0.04]),
    p("cast", world.pallet, [0.6, 0.06, -1.3], [0.9, 0.1, 0.8]),
    p("cast", world.floorWoodAlt, [0.45, 0.31, -1.2], [0.4, 0.4, 0.4]),
    p("cast", world.pallet, [0.85, 0.26, -1.48], [0.34, 0.3, 0.34]),
    p("cast", world.floorWoodAlt, [-0.7, 0.2, -1.1], [0.36, 0.4, 0.36]),
  ],
  // Reception: a low counter, and in front of it a monument sign under 0.9 m (review fix 2).
  // The words "SignalChain HQ" come from the landmark label, drawn by SignText. No logo.
  "name-sign": [
    p("cast", world.shelf, [0, 0.42, -0.3], [2.2, 0.84, 0.6]),
    p("plain", world.deskTop, [0, 0.855, -0.3], [2.24, 0.03, 0.64]),
    p("plain", world.wallTrim, [0, 0.42, 0.005], [2.2, 0.08, 0.01]),
    p("plain", world.wallTrim, [0, 0.06, 0.9], [1.9, 0.12, 0.3]),
    p("cast", world.paper, [0, 0.48, 0.9], [1.8, 0.72, 0.12]),
  ],
  // Sr. Manager's Office: the Needs you tray on her desk, and the dashboard wall on the left
  // wall, which glows at night (DESIGN_DIRECTION, mood).
  "desk-tray": [
    p("plain", world.bridgeTray, [0, 0.77, 0], [0.36, 0.05, 0.28]),
    p("plain", world.paper, [0, 0.8, 0], [0.3, 0.02, 0.22]),
    p("plain", world.dashPanel, [-2.88, 1.6, 0], [0.06, 1.0, 1.8]),
    ...[-0.6, -0.4, -0.2].map((z, i) => {
      const h = [0.3, 0.5, 0.4][i] ?? 0.3;
      return p("dash", world.dashGlow, [-2.845, 1.2 + h / 2, z], [0.01, h, 0.12]);
    }),
    ...[1.9, 1.8, 1.7].map((y) => p("dash", world.dashGlow, [-2.845, y, 0.35], [0.01, 0.03, 0.7])),
  ],
  // Leads' Row: a review board on legs behind the Leads, with CM (gold) and Ops (teal) cards.
  "review-board": [
    ...[-0.7, 0.7].map((x) => p("plain", world.deskLeg, [x, 0.6, 0], [0.04, 1.2, 0.04])),
    p("plain", world.wallTrim, [0, 1.3, 0], [1.6, 0.9, 0.05]),
    p("plain", world.paper, [0, 1.3, 0.03], [1.5, 0.8, 0.01]),
    ...(
      [
        [-0.5, 1.5, world.folderTabCm],
        [-0.25, 1.5, world.folderTabCm],
        [-0.5, 1.25, world.folderTabCm],
        [0.25, 1.5, world.folderTabOps],
        [0.5, 1.5, world.folderTabOps],
        [0.5, 1.25, world.folderTabOps],
      ] as const
    ).map(([x, y, color]) => p("plain", color, [x, y, 0.04], [0.18, 0.14, 0.005])),
  ],
  // The wing pennants face each other across the bridge. Flags stay under 0.2 m (gold and teal rule).
  "pennant-cm": [
    p("plain", world.wallTrim, [0, 0.02, 0], [0.3, 0.04, 0.3]),
    p("plain", world.wallTrim, [0, 0.8, 0], [0.035, 1.6, 0.035]),
    p("plain", world.folderTabCm, [0.1, 1.5, 0], [0.18, 0.14, 0.015]),
  ],
  "pennant-ops": [
    p("plain", world.wallTrim, [0, 0.02, 0], [0.3, 0.04, 0.3]),
    p("plain", world.wallTrim, [0, 0.8, 0], [0.035, 1.6, 0.035]),
    p("plain", world.folderTabOps, [0.1, 1.5, 0], [0.18, 0.14, 0.015]),
  ],
};

// ---------------------------------------------------------------- Props from accessories.json

const PROPS: Record<string, Part[]> = {
  plant: plant(false),
  "plant-tall": plant(true),
  sofa: [
    p("cast", world.sofa, [0, 0.22, 0], [1.8, 0.44, 0.8]),
    p("cast", world.sofa, [0, 0.62, -0.3], [1.8, 0.4, 0.2]),
    ...[-0.84, 0.84].map((x) => p("plain", world.sofa, [x, 0.52, 0], [0.14, 0.2, 0.8])),
  ],
  poster: [
    p("plain", world.wallTrim, [0, 1.5, 0], [0.76, 1.01, 0.02]),
    p("plain", world.paper, [0, 1.5, 0.015], [0.7, 0.95, 0.01]),
    ...[0, 1, 2, 3].map((i) =>
      p(
        "plain",
        i % 2 === 0 ? world.chairAccent : world.sofa,
        [0, 1.8 - i * 0.2, 0.022],
        [0.5, 0.1, 0.005],
      ),
    ),
  ],
  "snack-shelf": [
    p("cast", world.shelf, [0, 0.6, 0], [1.0, 1.2, 0.35]),
    ...[0.35, 0.75].map((y) => p("plain", world.deskTop, [0, y, 0.02], [0.94, 0.03, 0.32])),
    ...(
      [
        [-0.3, 0.45, world.floorWoodAlt],
        [0, 0.45, world.paper],
        [0.3, 0.45, world.pallet],
        [-0.2, 0.85, world.sofa],
        [0.2, 0.85, world.floorWoodAlt],
      ] as const
    ).map(([x, y, color]) => p("plain", color, [x, y, 0.05], [0.18, 0.18, 0.18])),
  ],
  printer: [
    p("cast", world.deskDivider, [0, 0.45, 0], [0.6, 0.9, 0.5]),
    p("plain", world.monitorBody, [0, 0.91, -0.1], [0.5, 0.04, 0.2]),
    p("plain", world.paper, [0, 0.92, 0.1], [0.3, 0.02, 0.2]),
  ],
  // A small delivery van, no words and no logos (WORLD_PALETTE: truck).
  "delivery-truck": [
    p("cast", world.truck, [0, 0.75, 0], [1.2, 1.2, 2.4]),
    p("cast", world.truck, [0, 0.55, 1.55], [1.2, 0.8, 0.7]),
    p("plain", world.windowDay, [0, 0.72, 1.91], [1.0, 0.34, 0.02]),
    ...[-0.605, 0.605].map((x) =>
      p("plain", world.envelopeStripe, [x, 0.8, 0.3], [0.01, 0.12, 3.0]),
    ),
    ...[-0.6, 0.6].flatMap((x) =>
      [-0.8, 1.4].map((z) => p("plain", world.chairBase, [x, 0.18, z], [0.12, 0.36, 0.36])),
    ),
  ],
};

/** An unknown kind still shows up, as a plain crate, so a typo is easy to spot. */
const UNKNOWN: Part[] = [p("cast", world.pallet, [0, 0.25, 0], [0.5, 0.5, 0.5])];

export const LANDMARK_KINDS = Object.keys(LANDMARKS);
export const PROP_KINDS = Object.keys(PROPS);

const empty = (): Batches => ({ cast: [], plain: [], screen: [], capiz: [], dash: [] });

function build(
  items: { kind: string; pos: [number, number]; rot: number }[],
  recipes: Record<string, Part[]>,
): Batches {
  const out = empty();
  for (const item of items) {
    const rot = item.rot * DEG;
    const [x, z] = item.pos;
    for (const part of recipes[item.kind] ?? UNKNOWN) {
      out[part.batch].push(
        box(place(x, z, rot, part.pos), part.size, part.color, rot + (part.rotY ?? 0)),
      );
    }
  }
  return out;
}

export function landmarkBoxes(landmarks: Landmark[]): Batches {
  return build(landmarks, LANDMARKS);
}

/** Enabled props with a position. A prop without one gets a warning from the server. */
export function propBoxes(accessories: Accessory[]): Batches {
  const placed = accessories.flatMap((a) =>
    a.enabled && a.pos ? [{ kind: a.kind, pos: a.pos, rot: a.rot ?? 0 }] : [],
  );
  return build(placed, PROPS);
}

/** Where the Reception sign's words sit: on the front of the sign panel. */
export function signFace(landmark: Landmark): {
  position: [number, number, number];
  rotation: number;
} {
  const rot = landmark.rot * DEG;
  return { position: place(landmark.pos[0], landmark.pos[1], rot, [0, 0.5, 0.962]), rotation: rot };
}
