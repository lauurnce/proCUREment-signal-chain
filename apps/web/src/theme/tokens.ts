// The single source of colors for the UI and the 3D world. See the adi-theme skill.
// theme.css repeats the UI colors as CSS variables for Tailwind, and a test keeps them in sync.

export const color = {
  // Base palette from the program decks (final)
  navy: "#12284C",
  accent: "#0067B9",
  blueMid: "#8FB8DD",
  blueLight: "#A8C0DE",
  panel: "#F2F4F7",
  ink: "#1A1A1A",
  footer: "#98A2B3",
  hairline: "#D9E3F0",
  white: "#FFFFFF",
  // Screen-only additions (proposed until Phase 2)
  inkMuted: "#4B5565",
  statusWorking: "#1E8E5A",
  statusWaiting: "#B45309",
} as const;

/** 3D world palette (proposed, refined by the world-artist in Phase 2). */
export const world = {
  floorWood: "#E6D3B3",
  floorWoodAlt: "#D8C29C",
  backdropDay: "#E9EEF5",
  backdropNight: "#0E1F3B",
  skyLight: "#F5F8FF",
  keyLight: "#FFF4E0",
  gridLine: "#D8C29C",
} as const;
