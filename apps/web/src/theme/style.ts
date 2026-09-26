import type { CSSProperties } from "react";
import { type ColorKey, font, type } from "./tokens";

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** A token color as a CSS variable, for inline styles and SVG fills. */
export function cssColor(key: ColorKey): string {
  return `var(--color-${kebab(key)})`;
}

export type TypeKey = keyof typeof type;

/** Inline style for one step of the type scale, so sizes live only in tokens.ts. */
export function typeStyle(key: TypeKey, colorKey?: ColorKey): CSSProperties {
  const t = type[key];
  return {
    fontFamily: font[t.font],
    fontSize: t.size,
    lineHeight: `${t.lineHeight}px`,
    fontWeight: t.weight,
    letterSpacing: t.letterSpacing,
    textTransform: t.uppercase ? "uppercase" : undefined,
    color: cssColor(colorKey ?? t.colorKey),
  };
}

/** A token easing like "cubic-bezier(0.2, 0.8, 0.2, 1)" as the four numbers motion needs. */
export function bezier(css: string): [number, number, number, number] {
  const [a = 0, b = 0, c = 1, d = 1] = (css.match(/-?[\d.]+/g) ?? []).map(Number);
  return [a, b, c, d];
}
