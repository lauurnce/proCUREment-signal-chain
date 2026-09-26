// WCAG 2.2 contrast math, used by the Lab swatches and the token tests.

/** Relative luminance of a "#RRGGBB" color. */
export function luminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match?.[1]) throw new Error(`Not a #RRGGBB color: ${hex}`);
  const value = Number.parseInt(match[1], 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const [r = 0, g = 0, b = 0] = channels;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two colors, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** AA needs 4.5 for normal text and 3 for large text and shapes like dots and badges. */
export function passesAA(ratio: number, use: "text" | "large" | "shape"): boolean {
  return ratio >= (use === "text" ? 4.5 : 3);
}

/** Round down to 2 decimals, so a ratio never looks better than it is. */
export function formatRatio(ratio: number): string {
  return `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1`;
}
