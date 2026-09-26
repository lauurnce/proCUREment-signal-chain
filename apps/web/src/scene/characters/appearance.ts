import { worldCharacter } from "../../theme/tokens";

export type HairStyle = "short" | "bob" | "bun" | "ponytail" | "tuft";
export type Accessory = "none" | "glasses" | "headset";

export type Appearance = {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  top: string;
  bottom: string;
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

/** The look of one helper. The same seed (the seat id) always gives the same look. */
export function appearanceFor(seed: string): Appearance {
  const rand = seededRandom(seed);
  return {
    skin: weighted(
      worldCharacter.skinTones.map((s) => ({ value: s.hex, weight: s.weight })),
      rand(),
    ),
    hair: weighted(
      worldCharacter.hairColors.map((s) => ({ value: s.hex, weight: s.weight })),
      rand(),
    ),
    hairStyle: pick(["short", "bob", "bun", "ponytail", "tuft"] as const, rand()),
    top: pick(worldCharacter.topColors, rand()),
    bottom: pick(worldCharacter.bottomColors, rand()),
    accessory: weighted(
      [
        { value: "none" as const, weight: 3 },
        { value: "glasses" as const, weight: 2 },
        { value: "headset" as const, weight: 1 },
      ],
      rand(),
    ),
    phase: rand(),
  };
}
