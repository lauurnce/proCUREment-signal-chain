/** A name tag on screen: its center and size, in px. */
export type TagBox = { id: string; x: number; y: number; w: number; h: number };

const GAP = 4;

const overlaps = (a: TagBox, b: TagBox) =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + GAP;

/**
 * Moves tags up until none overlap. Tags nearer the camera (lower on screen) keep their place,
 * and tags behind them step up, so a tag always stays above its own helper.
 * Returns the new center y for each tag.
 */
export function nudgeTags(tags: TagBox[]): Map<string, number> {
  const placed: TagBox[] = [];
  for (const tag of [...tags].sort((a, b) => b.y - a.y)) {
    const box = { ...tag };
    for (let guard = 0; guard < tags.length; guard++) {
      const hit = placed.find((p) => overlaps(box, p));
      if (!hit) break;
      box.y = hit.y - (hit.h + box.h) / 2 - GAP;
    }
    placed.push(box);
  }
  return new Map(placed.map((t) => [t.id, t.y]));
}
