import { describe, expect, it } from "vitest";
import { nudgeTags } from "./layout";

const tag = (id: string, x: number, y: number) => ({ id, x, y, w: 150, h: 40 });

describe("name tag nudge", () => {
  it("leaves tags that do not touch where they are", () => {
    const y = nudgeTags([tag("a", 0, 100), tag("b", 400, 100)]);
    expect(y.get("a")).toBe(100);
    expect(y.get("b")).toBe(100);
  });

  it("moves the tag behind up, and keeps the front tag in place", () => {
    const y = nudgeTags([tag("back", 50, 90), tag("front", 0, 100)]);
    expect(y.get("front")).toBe(100);
    expect(y.get("back")).toBe(100 - 40 - 4);
  });

  it("stacks three tags without any overlap", () => {
    const y = nudgeTags([tag("a", 0, 100), tag("b", 20, 95), tag("c", 40, 90)]);
    const [low = 0, mid = 0, high = 0] = [...y.values()].sort((m, n) => m - n);
    expect(mid - low).toBeGreaterThanOrEqual(44);
    expect(high - mid).toBeGreaterThanOrEqual(44);
  });
});
