import type { DeskSlot, FloorPlan } from "./types";

// Two floor plan options for P2.4. 1 unit = 1 m, floor 28 x 18.
// Back walls are x = 0 and z = 0. Open edges are x = 28 and z = 18.
// Rule of thumb for the camera: screen right grows with (x - z), screen down grows with (x + z).

const r = (n: number) => Math.round(n * 100) / 100;

// Desk offsets inside a pod. Back row faces the camera (0), front row faces the back wall (180).
type Offset = [dx: number, dz: number, facing: 0 | 180];
const POD4: Offset[] = [
  [-0.7, -0.35, 0],
  [0.7, -0.35, 0],
  [-0.7, 0.35, 180],
  [0.7, 0.35, 180],
];
// Two seats sit as one facing pair, 1.4 m wide.
const POD2: Offset[] = [
  [0, -0.35, 0],
  [0, 0.35, 180],
];

/** Desks for one pod centered at (cx, cz). Three seats fill the back row and the front left desk. */
function pod(id: string, seats: string[], cx: number, cz: number): DeskSlot[] {
  const layout = seats.length <= 2 ? POD2 : POD4;
  return seats.map((seat, i): DeskSlot => {
    const [dx, dz, facing] = layout[i] as Offset;
    return { seat, pod: id, pos: [r(cx + dx), r(cz + dz)], facing };
  });
}

/** Single desks in a straight row along x, all facing the same way. */
function row(id: string, seats: string[], xs: number[], z: number, facing: 0 | 180): DeskSlot[] {
  return seats.map((seat, i): DeskSlot => {
    const x = xs[i] as number;
    return { seat, pod: id, pos: [x, z], facing };
  });
}

// Seat ids and pods, exactly as in vault.sample/office/zones.json.
const CM_A = ["cm-01", "cm-02", "cm-03", "cm-04"];
const CM_B = ["cm-05", "cm-06", "cm-07", "cm-08"];
const CM_C = ["cm-09", "cm-10", "cm-11"];
const OPS_A = ["ops-01", "ops-02", "ops-03", "ops-04"];
const OPS_B = ["ops-05", "ops-06", "ops-07", "ops-08"];
const OPS_C = ["ops-09", "ops-10"];
const LEADS = ["lead-01", "lead-02", "lead-03", "lead-04"];

// Option 1: the bridge sits at the true floor center on a ring walkway.
// CM Wing runs along the front left, Ops Wing along the back right, so the
// CM pennant, the bridge and the Ops pennant sit on one flat line on screen.
const option1: FloorPlan = {
  id: "1",
  name: "Central Bridge",
  idea: "The Endorsement Bridge sits at the center of the floor inside a ring walkway, with the CM Wing on the screen left and the Ops Wing on the screen right, so every handoff crosses the middle of the picture in one flat line.",
  size: { width: 28, depth: 18 },
  zones: [
    // Back wall z = 0, from the back corner toward the right corner.
    { id: "mgr-office", rect: [0, 0, 5, 4.5], anchor: [2.4, 3.3], landmark: "Needs You tray" },
    { id: "huddle-room", rect: [5, 0, 5, 4.5], anchor: [7.5, 3.9], landmark: "Whiteboard wall" },
    { id: "sap-station", rect: [10, 0, 5, 4.5], anchor: [12.6, 3.9], landmark: "SAP terminal" },
    { id: "ops-wing", rect: [15, 0, 13, 7], anchor: [17.5, 6.4], landmark: "Teal pennant" },
    // Back wall x = 0 and the Leads' Row, one step back from the bridge.
    { id: "contract-corner", rect: [0, 6, 4, 5], anchor: [3.1, 8.6], landmark: "Signing screen" },
    { id: "leads-row", rect: [5, 6, 6.2, 4.5], anchor: [8.05, 9], landmark: "Review board" },
    // The hero. Nothing but the ring walkway within 3 m of its center.
    {
      id: "endorsement-bridge",
      rect: [12, 7, 4, 4],
      anchor: [14, 9],
      landmark: "Handoff bridge",
    },
    // Front left and front center.
    { id: "cm-wing", rect: [0, 11, 12.5, 7], anchor: [10.6, 12], landmark: "Gold pennant" },
    {
      id: "negotiation-room",
      rect: [12.5, 13, 4, 5],
      anchor: [14.5, 15.6],
      landmark: "Round table",
    },
    { id: "reception", rect: [16.5, 13, 5.5, 5], anchor: [19.2, 15.8], landmark: "Name sign" },
    // Open edge x = 28, the Ops side.
    { id: "mail-dock", rect: [22, 7, 6, 4], anchor: [22.9, 9], landmark: "Mail sorter" },
    {
      id: "logistics-window",
      rect: [22, 11, 6, 3.5],
      anchor: [25.6, 12.75],
      landmark: "Dock window",
    },
    {
      id: "merienda-corner",
      rect: [22, 14.5, 6, 3.5],
      anchor: [24.5, 16.2],
      landmark: "Coffee cart",
    },
  ],
  desks: [
    { seat: "mgr-01", pod: "mgr", pos: [2.4, 2.2], facing: 0 },
    // CM leads at the west end, Ops leads at the east end, a small gap for the board.
    ...row("leads", LEADS, [5.7, 7.1, 9, 10.4], 7.4, 0),
    ...pod("cm-a", CM_A, 1.55, 14.8),
    ...pod("cm-b", CM_B, 6.05, 14.8),
    ...pod("cm-c", CM_C, 10.55, 14.8),
    ...pod("ops-c", OPS_C, 16.3, 3.75),
    ...pod("ops-a", OPS_A, 20.8, 3.75),
    ...pod("ops-b", OPS_B, 25.3, 3.75),
  ],
  walkways: {
    nodes: {
      // Back street, z = 5.25. Also the north side of the ring.
      "mgr-in": [2.4, 3.6],
      "st-mgr": [2.4, 5.25],
      "wl-n": [4.5, 5.25],
      "st-huddle": [7.5, 5.25],
      "ring-nw": [11.6, 5.25],
      "st-sap": [12.6, 5.25],
      "ring-n": [14, 5.25],
      "ops-c-front": [16.3, 5.25],
      "ring-ne": [17.5, 5.25],
      "ops-g-front": [18.2, 5.25],
      "ops-a-front": [20.8, 5.25],
      "el-a": [21.5, 5.25],
      "ops-b-front": [25.3, 5.25],
      // Ops back aisle along the wall.
      "ops-c-back": [16.3, 2.25],
      "ops-g-back": [18.2, 2.25],
      "ops-a-back": [20.8, 2.25],
      "ops-b-back": [25.3, 2.25],
      // Ring around the bridge, plus the crossing itself.
      "ring-w": [11.6, 9],
      "ring-sw": [11.6, 12.2],
      "ring-s": [14, 12.2],
      "ring-se": [17.5, 12.2],
      "ring-e": [17.5, 9],
      bridge: [14, 9],
      // West lane between Contract Corner and Leads' Row.
      contract: [4.5, 8.6],
      "wl-s": [4.5, 12],
      "leads-w": [6.4, 8.6],
      "leads-mid": [8.05, 8.6],
      "leads-e": [9.7, 8.6],
      // CM aisles behind and in front of the pods.
      "cm-a-back": [1.55, 13.3],
      "cm-g1-back": [3.8, 13.3],
      "cm-b-back": [6.05, 13.3],
      "cm-g2-back": [8.3, 13.3],
      "cm-c-back": [10.55, 13.3],
      "cm-a-front": [1.55, 16.3],
      "cm-g1-front": [3.8, 16.3],
      "cm-b-front": [6.05, 16.3],
      "cm-g2-front": [8.3, 16.3],
      "cm-c-front": [10.55, 16.3],
      // Front: visitors go from Reception straight into the Negotiation Room.
      nego: [14.5, 14.2],
      recep: [19.2, 14.5],
      entry: [19.2, 17.2],
      // East lane along the Ops side stations.
      "el-b": [21.5, 9],
      "el-c": [21.5, 12.5],
      "el-d": [21.5, 15.9],
      logi: [24.5, 12.75],
      mer: [23.2, 15.9],
    },
    edges: [
      ["mgr-in", "st-mgr"],
      ["st-mgr", "wl-n"],
      ["wl-n", "st-huddle"],
      ["st-huddle", "ring-nw"],
      ["ring-nw", "st-sap"],
      ["st-sap", "ring-n"],
      ["ring-n", "ops-c-front"],
      ["ops-c-front", "ring-ne"],
      ["ring-ne", "ops-g-front"],
      ["ops-g-front", "ops-a-front"],
      ["ops-a-front", "el-a"],
      ["el-a", "ops-b-front"],
      ["ops-c-back", "ops-g-back"],
      ["ops-g-back", "ops-a-back"],
      ["ops-a-back", "ops-b-back"],
      ["ops-g-back", "ops-g-front"],
      ["ring-nw", "ring-w"],
      ["ring-w", "ring-sw"],
      ["ring-sw", "ring-s"],
      ["ring-s", "ring-se"],
      ["ring-se", "ring-e"],
      ["ring-e", "ring-ne"],
      ["ring-w", "bridge"],
      ["bridge", "ring-e"],
      ["wl-n", "contract"],
      ["contract", "wl-s"],
      ["wl-s", "cm-g1-back"],
      ["contract", "leads-w"],
      ["leads-w", "leads-mid"],
      ["leads-mid", "leads-e"],
      ["leads-e", "ring-w"],
      ["cm-a-back", "cm-g1-back"],
      ["cm-g1-back", "cm-b-back"],
      ["cm-b-back", "cm-g2-back"],
      ["cm-g2-back", "cm-c-back"],
      ["cm-c-back", "ring-sw"],
      ["cm-g1-back", "cm-g1-front"],
      ["cm-g2-back", "cm-g2-front"],
      ["cm-a-front", "cm-g1-front"],
      ["cm-g1-front", "cm-b-front"],
      ["cm-b-front", "cm-g2-front"],
      ["cm-g2-front", "cm-c-front"],
      ["ring-s", "nego"],
      ["nego", "recep"],
      ["recep", "ring-se"],
      ["recep", "entry"],
      ["recep", "el-d"],
      ["ring-e", "el-b"],
      ["el-a", "el-b"],
      ["el-b", "el-c"],
      ["ring-se", "el-c"],
      ["el-c", "logi"],
      ["el-c", "el-d"],
      ["el-d", "mer"],
    ],
  },
  doors: [
    { id: "entrance", at: [19.2, 18], label: "Entrance" },
    { id: "loading-dock", at: [28, 12.75], label: "Loading dock" },
  ],
};

// Option 2: one straight Main Street from the front door to the Sr. Manager's desk.
// CM Wing on the west side, Ops Wing on the east side, the bridge is the town square
// where the street meets the cross lane between the wings.
const option2: FloorPlan = {
  id: "2",
  name: "Main Street",
  idea: "A straight street runs from the front door to the Sr. Manager's desk, the CM Wing and the Ops Wing face each other across it, and the Endorsement Bridge is the town square where the street meets the lane between the wings.",
  size: { width: 28, depth: 18 },
  zones: [
    // Back wall z = 0. The Sr. Manager sits at the head of the street.
    { id: "huddle-room", rect: [0, 0, 5, 4.5], anchor: [2.5, 3.5], landmark: "Whiteboard wall" },
    {
      id: "merienda-corner",
      rect: [5, 0, 4.5, 4.5],
      anchor: [7.25, 3.5],
      landmark: "Coffee cart",
    },
    { id: "mgr-office", rect: [11, 0, 6, 3], anchor: [14, 2.4], landmark: "Needs You tray" },
    { id: "sap-station", rect: [18.5, 0, 5, 4.5], anchor: [21, 3.5], landmark: "SAP terminal" },
    // Two leads on each side of the street, facing down it toward the bridge.
    { id: "leads-row", rect: [9.5, 3, 9, 3], anchor: [14, 5], landmark: "Review rail" },
    // The wings face each other across the square.
    { id: "cm-wing", rect: [0, 6, 11.5, 7.5], anchor: [8.2, 11.4], landmark: "Gold pennant" },
    {
      id: "endorsement-bridge",
      rect: [11.5, 7, 5, 4],
      anchor: [14, 9],
      landmark: "Handoff bridge",
    },
    {
      id: "ops-wing",
      rect: [16.5, 6, 11.5, 7.5],
      anchor: [19.8, 11.4],
      landmark: "Teal pennant",
    },
    // Front edge z = 18, from the left corner toward the front corner.
    {
      id: "contract-corner",
      rect: [0, 14, 6.5, 4],
      anchor: [3.2, 16.2],
      landmark: "Signing screen",
    },
    { id: "negotiation-room", rect: [6.5, 14, 5, 4], anchor: [9, 16.2], landmark: "Round table" },
    { id: "reception", rect: [11.5, 14, 5, 4], anchor: [14, 16], landmark: "Name sign" },
    { id: "mail-dock", rect: [16.5, 14, 5.5, 4], anchor: [19.25, 16.2], landmark: "Mail sorter" },
    {
      id: "logistics-window",
      rect: [22, 14, 6, 4],
      anchor: [25, 16.4],
      landmark: "Dock window",
    },
  ],
  desks: [
    { seat: "mgr-01", pod: "mgr", pos: [14, 1.4], facing: 0 },
    // lead-01 and lead-02 on the CM side of the street, lead-03 and lead-04 on the Ops side.
    ...row("leads", LEADS, [10.6, 12, 16, 17.4], 4.3, 0),
    ...pod("cm-a", CM_A, 2.4, 7.8),
    ...pod("cm-b", CM_B, 7.4, 7.8),
    ...pod("cm-c", CM_C, 2.4, 12.3),
    ...pod("ops-a", OPS_A, 20.6, 7.8),
    ...pod("ops-b", OPS_B, 25.6, 7.8),
    ...pod("ops-c", OPS_C, 25.6, 12.3),
  ],
  walkways: {
    nodes: {
      // Main Street, x = 14.
      "mgr-in": [14, 2.6],
      "ms-head": [14, 4.75],
      "ms-north": [14, 6.3],
      bridge: [14, 9.3],
      "ms-south": [14, 13.8],
      entry: [14, 16.3],
      "leads-w": [11.3, 5.6],
      "leads-e": [16.7, 5.6],
      // Back wall stations.
      "huddle-in": [2.5, 4.9],
      "mer-in": [7.25, 4.9],
      "sap-in": [21, 4.9],
      // North lane, z = 6.3 (north side of the main loop).
      "cm-a-back": [2.4, 6.3],
      "cm-g-n": [4.9, 6.3],
      "cm-b-back": [7.4, 6.3],
      "ops-a-back": [20.6, 6.3],
      "ops-g-n": [23.1, 6.3],
      "ops-b-back": [25.6, 6.3],
      // Cross lane, z = 9.3. The handoff path through the square.
      "cm-a-front": [2.4, 9.3],
      "cm-g-x": [4.9, 9.3],
      "cm-b-front": [7.4, 9.3],
      "ops-a-front": [20.6, 9.3],
      "ops-g-x": [23.1, 9.3],
      "ops-b-front": [25.6, 9.3],
      // Second pod row aisle, z = 10.8.
      "cm-c-back": [2.4, 10.8],
      "cm-g-b": [4.9, 10.8],
      "cm-commons": [7.4, 10.8],
      "ops-commons": [20.6, 10.8],
      "ops-g-b": [23.1, 10.8],
      "ops-c-back": [25.6, 10.8],
      // South lane, z = 13.8 (south side of the main loop).
      "cm-c-front": [2.4, 13.8],
      "cm-g-s": [4.9, 13.8],
      "sl-nego": [9, 13.8],
      "sl-mail": [19.25, 13.8],
      "ops-g-s": [23.1, 13.8],
      "ops-c-front": [25.6, 13.8],
      // Front stations.
      "con-in": [3.2, 14.8],
      "nego-in": [9, 14.8],
      "mail-in": [19.25, 14.8],
      "logi-in": [25, 15],
    },
    edges: [
      ["mgr-in", "ms-head"],
      ["ms-head", "leads-w"],
      ["ms-head", "leads-e"],
      ["ms-head", "ms-north"],
      ["ms-north", "bridge"],
      ["bridge", "ms-south"],
      ["ms-south", "entry"],
      ["cm-a-back", "cm-g-n"],
      ["cm-g-n", "cm-b-back"],
      ["cm-b-back", "ms-north"],
      ["ms-north", "ops-a-back"],
      ["ops-a-back", "ops-g-n"],
      ["ops-g-n", "ops-b-back"],
      ["huddle-in", "cm-a-back"],
      ["mer-in", "cm-b-back"],
      ["sap-in", "ops-a-back"],
      ["cm-a-front", "cm-g-x"],
      ["cm-g-x", "cm-b-front"],
      ["cm-b-front", "bridge"],
      ["bridge", "ops-a-front"],
      ["ops-a-front", "ops-g-x"],
      ["ops-g-x", "ops-b-front"],
      ["cm-c-back", "cm-g-b"],
      ["cm-g-b", "cm-commons"],
      ["cm-commons", "cm-b-front"],
      ["ops-commons", "ops-a-front"],
      ["ops-commons", "ops-g-b"],
      ["ops-g-b", "ops-c-back"],
      ["cm-g-n", "cm-g-x"],
      ["cm-g-x", "cm-g-b"],
      ["cm-g-b", "cm-g-s"],
      ["ops-g-n", "ops-g-x"],
      ["ops-g-x", "ops-g-b"],
      ["ops-g-b", "ops-g-s"],
      ["cm-c-front", "cm-g-s"],
      ["cm-g-s", "sl-nego"],
      ["sl-nego", "ms-south"],
      ["ms-south", "sl-mail"],
      ["sl-mail", "ops-g-s"],
      ["ops-g-s", "ops-c-front"],
      ["con-in", "cm-c-front"],
      ["nego-in", "sl-nego"],
      ["nego-in", "entry"],
      ["mail-in", "sl-mail"],
      ["logi-in", "ops-c-front"],
      ["logi-in", "mail-in"],
    ],
  },
  doors: [
    { id: "entrance", at: [14, 18], label: "Entrance" },
    { id: "loading-dock", at: [25, 18], label: "Loading dock" },
  ],
};

export const PLANS: FloorPlan[] = [option1, option2];
