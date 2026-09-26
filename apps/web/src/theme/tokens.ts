// The single source of design tokens for the UI and the 3D world. See the adi-theme skill.
// theme.css repeats the UI colors as CSS variables for Tailwind, and a test keeps them in sync.
// No hex values or font names outside this folder.

import type { SeatStatus, Track } from "@hq/shared";

export const color = {
  // Base palette from the program decks (final)
  navy: "#12284C", // titles, dark panels, emphasis text
  accent: "#0067B9", // accent bars, primary buttons, links, selected tab
  blueMid: "#8FB8DD", // fills and connectors only, never text
  blueLight: "#A8C0DE", // text on navy only, never on white
  panel: "#F2F4F7", // the only card fill on white
  ink: "#1A1A1A", // body text on white
  footer: "#98A2B3", // tiny decorative meta only, fails text contrast
  hairline: "#D9E3F0", // 1 px borders and dividers
  white: "#FFFFFF",

  // Screen-only additions (D-011, approved 26 Sep 2026)
  inkMuted: "#4B5565", // secondary text, 7.54:1 on white
  statusWorking: "#1A7F50", // also the Approve button fill (D-026)
  statusWaiting: "#B45309", // "Waiting on you"
  statusMeeting: "#0067B9", // same hex as accent, pair of dots
  statusBreak: "#0067B9", // same hex as accent, hollow ring
  statusOff: "#98A2B3", // same hex as footer, always with a text label
  trackMgr: "#12284C", // Sr. Manager, star badge
  trackLead: "#0067B9", // Leads, outline triangle badge
  trackCm: "#A8841A", // Category Managers in the UI, badges and bars only
  trackCmWorld: "#C9A227", // Category Managers in the 3D world only
  trackOps: "#1F8A8A", // Ops Buyers, badges and bars only
} as const;

export type ColorKey = keyof typeof color;

/** 3D world palette for Direction A, Warm Diorama. Full notes in docs/design/WORLD_PALETTE.md. */
export const world = {
  // Floor and slab
  floorWood: "#E6D3B3",
  floorWoodAlt: "#D8C29C",
  floorWoodDeep: "#CFB68D", // rare darker plank
  slabSide: "#CBAE84",
  slabEdge: color.navy, // navy rim on the slab (D-029)
  gridLine: "#D8C29C", // dev grid only

  // Zone rugs
  zoneCm: "#F4EBD3",
  zoneOps: "#E3F0EE",
  zoneLeads: "#E6EEF8",
  zoneShared: "#EFE6D6",
  zoneMerienda: "#EADCC8",
  bridgeSeam: color.blueMid,

  // Walls, trim, glass, windows
  wall: "#F5F2EC",
  wallCap: color.navy,
  wallTrim: color.navy,
  door: "#D8C29C",
  glass: "#CFE0F1", // opacity 0.35 by day, 0.2 at night
  windowDay: "#D6E4F2", // a little deeper, so the window reads by day (P2.3)
  windowGlow: "#FFE2A8",
  sunPatch: "#FFF1D6", // opacity 0.22

  // Furniture
  deskTop: "#F7F4EE",
  deskEdge: "#D8C29C",
  deskLeg: color.footer,
  deskDivider: color.hairline,
  chairSeat: color.navy,
  chairAccent: color.accent,
  chairBase: color.inkMuted,
  monitorBody: color.navy,
  screenGlow: color.blueMid,
  shelf: "#CBAE84",
  sofa: color.blueMid,
  plantLeaf: "#5E8C6A",
  plantLeafLight: "#7FA88A",
  plantPot: "#E8DFD0",
  paper: "#FBF8F2",

  // Landmarks
  bridgeCounter: "#CBAE84",
  bridgeCounterTop: "#F7F4EE",
  bridgeTray: color.navy,
  folderBody: "#FBF8F2",
  folderTabCm: color.trackCmWorld, // gold diamond tab
  folderTabOps: color.trackOps, // teal square tab
  mailCubby: color.navy,
  mailFrame: "#CBAE84",
  envelope: "#FBF8F2",
  envelopeStripe: color.accent,
  capizShell: "#F3EBDD", // capiz-style lamp, original geometry (D-029)
  capizGlow: "#FFD9A0",
  lampCord: color.navy,
  dashPanel: color.navy,
  dashGlow: color.blueMid,
  truck: "#F5F2EC", // no logos or text
  pallet: "#CBAE84",

  // Backdrop and light (intensities live in worldLight)
  backdropDay: "#E9EEF5",
  backdropDusk: "#EFE7DC",
  backdropNight: "#0E1F3B",
  skyLight: "#F5F8FF",
  groundLight: "#E6D3B3",
  keyLight: "#FFF4E0",
  skyLightDusk: "#F3ECE2",
  groundLightDusk: "#E2C9A4",
  keyLightDusk: "#FFD6A3",
  skyLightNight: "#3A5A8C",
  groundLightNight: color.navy,
  keyLightNight: color.blueLight,
  lampLight: "#FFD9A0",
  contactShadow: color.navy,
  noGlow: "#000000", // emissive color for materials that do not glow
} as const;

/** Light intensities in three.js physical units, tuned in the P2.3 diorama. */
export const worldLight = {
  skyDay: 2.4,
  keyDay: 2.4,
  skyDusk: 1.8,
  keyDusk: 3.4,
  skyNight: 0.9,
  keyNight: 0.5,
  lamp: { intensity: 3, distance: 5, decay: 2, max: 4 },
  contactShadowOpacity: { day: 0.35, night: 0.5 },
} as const;

/** Character colors, picked by seed. Weight = how often a value is picked. */
export const worldCharacter = {
  skinTones: [
    { hex: "#F6DCC7", weight: 1 },
    { hex: "#EBC6A4", weight: 2 },
    { hex: "#DDAE86", weight: 3 },
    { hex: "#C9956B", weight: 3 },
    { hex: "#B27A52", weight: 2 },
    { hex: "#95613D", weight: 2 },
    { hex: "#74472B", weight: 1 },
    { hex: "#563320", weight: 1 },
  ],
  hairColors: [
    { hex: "#1B1613", weight: 3 },
    { hex: "#2C211B", weight: 2 },
    { hex: "#3F2C21", weight: 3 },
    { hex: "#5C3F2C", weight: 3 },
    { hex: "#85603F", weight: 2 },
    { hex: "#6A3B2E", weight: 2 },
    { hex: "#B9B3AB", weight: 1 },
  ],
  // No navy (same as the chairs) and no oak (same as the floor), so helpers stand out.
  topColors: [
    color.blueLight,
    color.accent,
    color.blueMid,
    "#F5F2EC",
    "#D8C29C",
    "#7FA88A",
    color.inkMuted,
    "#CBAE84",
  ],
  bottomColors: ["#2E3A4E", color.inkMuted, "#CBAE84"],
  eye: color.ink,
} as const;

/** Font stacks. Mono is only for small UPPERCASE labels, tabs, IDs and numbers. */
export const font = {
  sans: '"Quattrocento Sans", system-ui, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, monospace',
} as const;

export type StatusShape = "dot" | "ring" | "dot-bang" | "dot-pair";
export type TrackShape = "star" | "triangle-outline" | "diamond" | "square";

// Status is never shown by color alone. Always pair the shape with the label text.
// Every status has its own shape. "on-break" and "off-duty" are both rings, so an
// off-duty name tag also shows the words "Off duty".
export const status = {
  working: { label: "Working", colorKey: "statusWorking", shape: "dot" },
  "waiting-on-you": { label: "Waiting on you", colorKey: "statusWaiting", shape: "dot-bang" },
  "in-meeting": { label: "In a meeting", colorKey: "statusMeeting", shape: "dot-pair" },
  "on-break": { label: "On break", colorKey: "statusBreak", shape: "ring" },
  "off-duty": { label: "Off duty", colorKey: "statusOff", shape: "ring" },
} as const satisfies Record<SeatStatus, { label: string; colorKey: ColorKey; shape: StatusShape }>;

// Track badges. The Leads triangle is an outline that points up, with no square behind it.
// Never draw a triangle inside a filled square (too close to a logo mark).
export const track = {
  MGR: { label: "Sr. Manager", colorKey: "trackMgr", worldColorKey: "trackMgr", shape: "star" },
  LEAD: {
    label: "Lead",
    colorKey: "trackLead",
    worldColorKey: "trackLead",
    shape: "triangle-outline",
  },
  CM: {
    label: "Category Manager",
    colorKey: "trackCm",
    worldColorKey: "trackCmWorld",
    shape: "diamond",
  },
  OPS: { label: "Ops Buyer", colorKey: "trackOps", worldColorKey: "trackOps", shape: "square" },
} as const satisfies Record<
  Track,
  { label: string; colorKey: ColorKey; worldColorKey: ColorKey; shape: TrackShape }
>;

// Type scale in px. Never shrink text to fit, cut words instead.
export const type = {
  appTitle: {
    size: 20,
    lineHeight: 28,
    weight: 700,
    font: "sans",
    letterSpacing: "0",
    uppercase: false,
    colorKey: "navy",
  },
  // Panel titles get a short accent bar below, an echo of the deck title bar.
  panelTitle: {
    size: 22,
    lineHeight: 28,
    weight: 700,
    font: "sans",
    letterSpacing: "0",
    uppercase: false,
    colorKey: "navy",
    accentBar: { width: 28, height: 3, colorKey: "accent" },
  },
  sectionTitle: {
    size: 17,
    lineHeight: 24,
    weight: 700,
    font: "sans",
    letterSpacing: "0",
    uppercase: false,
    colorKey: "navy",
  },
  body: {
    size: 15,
    lineHeight: 22,
    weight: 400,
    font: "sans",
    letterSpacing: "0",
    uppercase: false,
    colorKey: "ink",
  },
  small: {
    size: 13,
    lineHeight: 18,
    weight: 400,
    font: "sans",
    letterSpacing: "0",
    uppercase: false,
    colorKey: "inkMuted",
  },
  // Label may also use inkMuted when it is less important.
  label: {
    size: 11,
    lineHeight: 14,
    weight: 500,
    font: "mono",
    letterSpacing: "0.08em",
    uppercase: true,
    colorKey: "navy",
    altColorKey: "inkMuted",
  },
  bigNumber: {
    size: 28,
    lineHeight: 32,
    weight: 700,
    font: "sans",
    letterSpacing: "0",
    uppercase: false,
    colorKey: "navy",
  },
  tagName: {
    size: 13,
    lineHeight: 16,
    weight: 700,
    font: "sans",
    letterSpacing: "0",
    uppercase: false,
    colorKey: "navy",
  },
  tagRole: {
    size: 10,
    lineHeight: 12,
    weight: 500,
    font: "mono",
    letterSpacing: "0.08em",
    uppercase: true,
    colorKey: "inkMuted",
  },
} as const;

/** Spacing on a 4 px grid. The key is the step, the value is px. */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  12: 48,
} as const;

/** Corner radius in px. */
export const radius = {
  chip: 6,
  button: 10, // buttons and inputs
  card: 14,
  float: 20, // panels that float over the 3D scene
  pill: 999, // pills and name tags
} as const;

/** The only shadow. Use it only for things that float over the 3D scene. */
export const shadow = {
  float: "0 8px 24px rgba(18, 40, 76, 0.12)",
} as const;

/** Motion. Durations in ms. Always provide a reduced-motion version. */
export const motion = {
  duration: {
    instant: 80,
    fast: 140,
    base: 220,
    slow: 360,
    camera: 800,
  },
  easing: {
    enter: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    exit: "cubic-bezier(0.4, 0, 1, 1)",
    move: "cubic-bezier(0.65, 0, 0.35, 1)",
  },
  spring: {
    panel: { stiffness: 260, damping: 26 },
    pop: { stiffness: 420, damping: 18 },
  },
  // Approved 26 Sep 2026 (D-030)
  maxWalkers: 6, // at most 6 helpers walk at the same time
  undoMs: 5000, // undo bar after a normal decision. Email sends never get undo
  contentFadeDelayMs: 60, // card content fades in after the card opens
  folderSlideMs: 600, // a folder crosses the Endorsement Bridge
  pressScale: 0.97, // buttons scale down when pressed
  pressMs: 80,
  // Seated helper loops (proposed in P2.3). Amounts in meters or radians.
  character: {
    breathSeconds: 4, // one slow breath
    breathLift: 0.012, // chest rises about 1 cm
    headSway: 0.035, // gentle side to side tilt while idle
    typingTapsPerSecond: 7,
    typingLift: 0.018, // each hand lifts about 2 cm
    typingNod: 0.03, // tiny head nod while typing
    typingBurstSeconds: [2.4, 1.2], // type, then pause to read
  },
} as const;

// Every screen-only addition to the deck palette (D-011).
// Approved by Lawrence on 26 Sep 2026. The Lab marks them "Screen only".
// "world" means the whole 3D world palette.
export const screenOnly = [
  "color.inkMuted",
  "color.statusWorking",
  "color.statusWaiting",
  "color.statusMeeting",
  "color.statusBreak",
  "color.statusOff",
  "color.trackMgr",
  "color.trackLead",
  "color.trackCm",
  "color.trackCmWorld",
  "color.trackOps",
  "font.mono",
  "shadow.float",
  "world",
] as const;

export type ScreenOnlyKey = (typeof screenOnly)[number];
