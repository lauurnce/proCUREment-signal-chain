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
