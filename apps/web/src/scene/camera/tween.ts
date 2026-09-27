import { cubicBezier } from "motion";
import type { Framing } from "./presets";

/** Turns a CSS "cubic-bezier(a, b, c, d)" token into an easing function, so 3D moves match the UI. */
export function easingFromCss(css: string): (t: number) => number {
  const numbers = css.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
  if (numbers.length !== 4) return (t) => t;
  const [a, b, c, d] = numbers as [number, number, number, number];
  return cubicBezier(a, b, c, d);
}

/**
 * The camera framing at eased progress `t` (0 to 1) between two framings.
 * The target moves in a straight line. The zoom changes by the same ratio each step, so zooming
 * in and out feels even (a linear zoom rushes at the far end).
 */
export function mixFraming(from: Framing, to: Framing, t: number): Framing {
  const [fx, fy, fz] = from.target;
  const [tx, ty, tz] = to.target;
  return {
    target: [fx + (tx - fx) * t, fy + (ty - fy) * t, fz + (tz - fz) * t],
    zoom: from.zoom * (to.zoom / from.zoom) ** t,
  };
}
