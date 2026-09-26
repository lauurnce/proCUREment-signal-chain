import { world, worldLight } from "../../theme/tokens";

export type LookId = "a" | "b" | "c";
export type TimeOfDay = "day" | "night";

type Vec3 = [number, number, number];

export type Lighting = {
  backdrop: string;
  sky: { color: string; ground: string; intensity: number };
  key: { color: string; intensity: number; offset: Vec3; shadows: boolean; shadowRadius: number };
  /** Soft navy contact shadows under things, used when the key light casts none. */
  contactShadow?: { opacity: number; blur: number };
  /** Flat light stripes on the floor in front of the window. */
  sunStripes: boolean;
  roughnessBoost: number;
  lamps: boolean;
};

export type Look = { id: LookId; name: string; idea: string; day: Lighting };

export const LOOKS: Record<LookId, Look> = {
  a: {
    id: "a",
    name: "Soft daylight",
    idea: "The recipe from the office guide. Even, friendly, clear shadows.",
    day: {
      backdrop: world.backdropDay,
      sky: { color: world.skyLight, ground: world.groundLight, intensity: worldLight.skyDay },
      key: {
        color: world.keyLight,
        intensity: worldLight.keyDay,
        offset: [2, 10, 7],
        shadows: true,
        shadowRadius: 4,
      },
      sunStripes: false,
      roughnessBoost: 0,
      lamps: false,
    },
  },
  b: {
    id: "b",
    name: "Late afternoon",
    idea: "Low, warm sun through the window. Long soft shadows and light stripes.",
    day: {
      backdrop: world.backdropDusk,
      sky: {
        color: world.skyLightDusk,
        ground: world.groundLightDusk,
        intensity: worldLight.skyDusk,
      },
      key: {
        color: world.keyLightDusk,
        intensity: worldLight.keyDusk,
        offset: [2, 3.4, -7],
        shadows: true,
        shadowRadius: 8,
      },
      sunStripes: true,
      roughnessBoost: 0,
      lamps: false,
    },
  },
  c: {
    id: "c",
    name: "Clay studio",
    idea: "Bright and even, like a clean clay model. Soft navy contact shadows only.",
    day: {
      backdrop: world.backdropDay,
      sky: { color: world.skyLight, ground: world.groundLight, intensity: 2.6 },
      key: {
        color: world.keyLight,
        intensity: 1.3,
        offset: [-3, 12, 5],
        shadows: false,
        shadowRadius: 0,
      },
      contactShadow: { opacity: worldLight.contactShadowOpacity.day, blur: 2.5 },
      sunStripes: false,
      roughnessBoost: 0.08,
      lamps: false,
    },
  },
};

/** Night keeps the look's shadow style but swaps the light for moon, lamps and glowing windows. */
export function lightingFor(look: Look, time: TimeOfDay): Lighting {
  if (time === "day") return look.day;
  return {
    ...look.day,
    backdrop: world.backdropNight,
    sky: {
      color: world.skyLightNight,
      ground: world.groundLightNight,
      intensity: worldLight.skyNight,
    },
    key: { ...look.day.key, color: world.keyLightNight, intensity: worldLight.keyNight },
    contactShadow: look.day.contactShadow && {
      ...look.day.contactShadow,
      opacity: worldLight.contactShadowOpacity.night,
    },
    sunStripes: false,
    lamps: true,
  };
}

/** The world-artist's pick, see docs/design/reviews/2026-09-26-diorama-study.md. */
export const FAVORITE: LookId | null = "a";

export function readParams(search: string): { look: LookId; time: TimeOfDay } {
  const params = new URLSearchParams(search);
  const look = params.get("look");
  const time = params.get("time");
  return {
    look: look === "b" || look === "c" ? look : "a",
    time: time === "night" ? "night" : "day",
  };
}
