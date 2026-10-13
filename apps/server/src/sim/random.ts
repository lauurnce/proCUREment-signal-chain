/** A small seeded random generator (mulberry32): the same seed gives the same day. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

/** A whole number from lo to hi, both included. */
export const int = (r: Rng, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

/** One item of a list. */
export const pick = <T>(r: Rng, list: readonly T[]): T => list[Math.floor(r() * list.length)] as T;
