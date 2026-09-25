import { describe, expect, it } from "vitest";
import { offsetFor, resolvePorts, worktreeName } from "../../../scripts/ports.mjs";

describe("ports per worktree", () => {
  it("the main checkout uses 5173 and 4317", () => {
    expect(resolvePorts({ cwd: "/Users/me/signalchain-hq", env: {} })).toEqual({
      worktree: null,
      webPort: 5173,
      apiPort: 4317,
    });
  });

  it("a worktree gets the same ports every time", () => {
    const cwd = "/Users/me/signalchain-hq/.claude/worktrees/p3-office";
    expect(worktreeName(cwd)).toBe("p3-office");
    expect(resolvePorts({ cwd, env: {} })).toEqual(resolvePorts({ cwd, env: {} }));
  });

  it("every phase worktree gets its own ports, and the web and API ranges never overlap", () => {
    const names = [
      "p1-scaffold",
      "p2-design-lab",
      "p3-office",
      "p4-team",
      "p5-panel",
      "p6-live",
      "p7-outlook",
      "p8-polish",
    ];
    const offsets = names.map(offsetFor);
    expect(new Set(offsets).size).toBe(names.length);
    for (const offset of offsets) {
      expect(4317 + offset + 9).toBeLessThan(5173);
    }
  });

  it("a worktree never lands on the main checkout's busy-port fallbacks (+1 to +9)", () => {
    for (let i = 0; i < 500; i++) {
      const offset = offsetFor(`worktree-${i}`);
      expect(offset).toBeGreaterThanOrEqual(10);
      expect(offset).toBeLessThanOrEqual(99);
    }
  });

  it("WEB_PORT and API_PORT from the environment win", () => {
    const cwd = "/x/.claude/worktrees/p3-office";
    expect(resolvePorts({ cwd, env: { WEB_PORT: "6000", API_PORT: "6001" } })).toMatchObject({
      webPort: 6000,
      apiPort: 6001,
    });
  });
});
