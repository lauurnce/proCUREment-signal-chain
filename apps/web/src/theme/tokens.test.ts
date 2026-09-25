import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { color, world } from "./tokens";

const css = readFileSync(new URL("./theme.css", import.meta.url), "utf8");
const cssColors = Object.fromEntries(
  [...css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [
    m[1],
    m[2]?.toUpperCase(),
  ]),
);
const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

describe("theme tokens", () => {
  it("theme.css has every UI color from tokens.ts with the same value", () => {
    for (const [key, hex] of Object.entries(color)) {
      expect(cssColors[kebab(key)], key).toBe(hex);
    }
  });

  it("theme.css has no color that tokens.ts does not know", () => {
    const known = new Map<string, string>([
      ...Object.entries(color).map(([k, v]): [string, string] => [kebab(k), v]),
      ["backdrop-day", world.backdropDay],
    ]);
    for (const [name, hex] of Object.entries(cssColors)) {
      expect(known.get(name), name).toBe(hex);
    }
  });
});
