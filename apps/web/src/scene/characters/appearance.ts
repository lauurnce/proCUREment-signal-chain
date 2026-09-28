import { worldCharacter } from "../../theme/tokens";

export type HairStyle = "short" | "bob" | "bun" | "ponytail" | "tuft" | "long" | "crop";
export type Accessory = "none" | "glasses" | "headset" | "mug";
/** tee: plain top. collar: a white shirt collar. cardigan: an open top over a second color. */
export type Outfit = "tee" | "collar" | "cardigan";

export type Appearance = {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  top: string;
  bottom: string;
  outfit: Outfit;
  /** The color under an open cardigan. Never the same as the top. */
  inner: string;
  /** Torso width and height in meters. The approved Lab helper is 0.44 by 0.46. */
  build: { width: number; height: number };
  accessory: Accessory;
  /** 0 to 1, shifts the animation timing so helpers never move in sync. */
  phase: number;
};

/** Small, fast, repeatable random numbers from a text seed (FNV-1a hash plus mulberry32). */
export function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weighted<T>(items: readonly { value: T; weight: number }[], r: number): T {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let x = r * total;
  for (const item of items) {
    x -= item.weight;
    if (x < 0) return item.value;
  }
  // r is below 1, so this is only reached through rounding. Return the last item.
  return (items.at(-1) as { value: T }).value;
}

function pick<T>(list: readonly T[], r: number): T {
  return list[Math.floor(r * list.length)] as T;
}

/**
 * The look of one helper. The same seed always gives the same look. New choices draw their
 * random numbers after the first ones, so the looks approved in the Lab keep their skin, hair,
 * top, bottom and accessory.
 */
export function appearanceFor(seed: string): Appearance {
  const rand = seededRandom(seed);
  const skin = weighted(
    worldCharacter.skinTones.map((s) => ({ value: s.hex, weight: s.weight })),
    rand(),
  );
  const hair = weighted(
    worldCharacter.hairColors.map((s) => ({ value: s.hex, weight: s.weight })),
    rand(),
  );
  let hairStyle: HairStyle = pick(["short", "bob", "bun", "ponytail", "tuft"] as const, rand());
  const top = pick(worldCharacter.topColors, rand());
  const bottom = pick(worldCharacter.bottomColors, rand());
  let accessory: Accessory = weighted(
    [
      { value: "none" as const, weight: 3 },
      { value: "glasses" as const, weight: 2 },
      { value: "headset" as const, weight: 1 },
    ],
    rand(),
  );
  const phase = rand();

  // Added in P4.1: body, outfit, two more hair styles and the mug.
  const build = {
    width: pick([0.4, 0.44, 0.48] as const, rand()),
    height: pick([0.44, 0.46, 0.48] as const, rand()),
  };
  const outfit = weighted<Outfit>(
    [
      { value: "tee", weight: 3 },
      { value: "collar", weight: 2 },
      { value: "cardigan", weight: 2 },
    ],
    rand(),
  );
  const inner = pick(
    worldCharacter.topColors.filter((c) => c !== top),
    rand(),
  );
  const restyle = rand();
  if (restyle < 0.15) hairStyle = "long";
  else if (restyle < 0.3) hairStyle = "crop";
  if (accessory === "none" && rand() < 0.4) accessory = "mug";

  return { skin, hair, hairStyle, top, bottom, outfit, inner, build, accessory, phase };
}
