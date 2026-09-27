import { Color } from "three";
import { describe, expect, it } from "vitest";
import { world } from "../../theme/tokens";
import { easingFromCss, mixFraming } from "../camera/tween";
import { BLEND_MS, colorThroughDusk, nightHalf, smooth, stepToward, throughDusk } from "./blend";

describe("day and night blend", () => {
  it("takes about 1.2 s from day to night at 60 fps", () => {
    let progress = 0;
    let frames = 0;
    while (progress < 1) {
      progress = stepToward(progress, 1, 1000 / 60);
      frames++;
    }
    // 72 frames, give or take one for rounding.
    expect(Math.abs(frames - BLEND_MS / (1000 / 60))).toBeLessThanOrEqual(1);
  });

  it("can turn back halfway without a jump", () => {
    const halfway = stepToward(0.5, 0, 100);
    expect(halfway).toBeCloseTo(0.5 - 100 / BLEND_MS);
  });

  it("passes through dusk at the middle", () => {
    expect(throughDusk(2.4, 3.4, 0.5, 0)).toBe(2.4);
    expect(throughDusk(2.4, 3.4, 0.5, 0.5)).toBe(3.4);
    expect(throughDusk(2.4, 3.4, 0.5, 1)).toBe(0.5);
    const out = new Color();
    const [day, dusk, night] = [world.backdropDay, world.backdropDusk, world.backdropNight].map(
      (hex) => new Color(hex),
    ) as [Color, Color, Color];
    expect(colorThroughDusk(out, day, dusk, night, 0.5).getHexString()).toBe(dusk.getHexString());
    expect(colorThroughDusk(out, day, dusk, night, 1).getHexString()).toBe(night.getHexString());
  });

  it("windows and lamps only start to glow after dusk", () => {
    expect(nightHalf(0.4)).toBe(0);
    expect(nightHalf(0.75)).toBeGreaterThan(0);
    expect(nightHalf(1)).toBe(1);
    expect(smooth(0.5)).toBe(0.5);
  });
});

describe("camera move", () => {
  it("uses the move easing from the tokens: slow start, fast middle, slow end", () => {
    const ease = easingFromCss("cubic-bezier(0.65, 0, 0.35, 1)");
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBeCloseTo(0.5);
    expect(ease(0.1)).toBeLessThan(0.05);
  });

  it("changes the zoom by an even ratio, and moves the target in a line", () => {
    const from = { target: [0, 0, 0] as [number, number, number], zoom: 20 };
    const to = { target: [10, 0, 4] as [number, number, number], zoom: 80 };
    const mid = mixFraming(from, to, 0.5);
    expect(mid.zoom).toBeCloseTo(40);
    expect(mid.target).toEqual([5, 0, 2]);
    expect(mixFraming(from, to, 1)).toEqual(to);
  });
});
