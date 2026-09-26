import { describe, expect, it } from "vitest";
import { contrast, passesAA } from "../theme/contrast";
import { color, screenOnly } from "../theme/tokens";
import { swatchGroups } from "./swatches";

const all = swatchGroups.flatMap((g) => g.swatches);

describe("Lab swatches", () => {
  it("every UI color appears once", () => {
    const keys = all.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort()).toEqual(Object.keys(color).sort());
  });

  it("every pair without a note passes WCAG AA", () => {
    for (const s of all) {
      for (const c of s.checks) {
        if (c.note) continue;
        const ratio = contrast(color[c.fg], color[c.bg]);
        expect(passesAA(ratio, c.use), `${c.fg} on ${c.bg} (${ratio.toFixed(2)})`).toBe(true);
      }
    }
  });

  it("screen-only groups hold only screen-only colors", () => {
    for (const g of swatchGroups) {
      for (const s of g.swatches) {
        expect(screenOnly.includes(`color.${s.key}` as never), s.key).toBe(g.screenOnly);
      }
    }
  });
});
