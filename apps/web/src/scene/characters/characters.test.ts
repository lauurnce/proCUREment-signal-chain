import { describe, expect, it } from "vitest";
import { motion, worldCharacter } from "../../theme/tokens";
import { appearanceFor, seededRandom } from "./appearance";
import { poseAt, typingAmount } from "./motion";

describe("appearance", () => {
  it("the same seed always gives the same look", () => {
    expect(appearanceFor("cm-03")).toEqual(appearanceFor("cm-03"));
  });

  it("different seeds give different looks", () => {
    const looks = ["mgr-01", "lead-01", "cm-03", "ops-07"].map((s) =>
      JSON.stringify(appearanceFor(s)),
    );
    expect(new Set(looks).size).toBe(4);
  });

  it("only uses colors from the world palette", () => {
    const skins = worldCharacter.skinTones.map((s) => s.hex);
    const hair = worldCharacter.hairColors.map((s) => s.hex);
    for (let i = 0; i < 200; i++) {
      const a = appearanceFor(`seat-${i}`);
      expect(skins).toContain(a.skin);
      expect(hair).toContain(a.hair);
      expect(worldCharacter.topColors).toContain(a.top);
      expect(worldCharacter.bottomColors).toContain(a.bottom);
    }
  });

  it("random numbers stay between 0 and 1", () => {
    const r = seededRandom("x");
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("seated motion", () => {
  const c = motion.character;

  it("idle helpers never lift their hands", () => {
    for (let t = 0; t < 10; t += 0.05) {
      const p = poseAt(t, "idle", 0.3);
      expect(p.leftHandLift).toBe(0);
      expect(p.rightHandLift).toBe(0);
    }
  });

  it("movements stay inside the token amounts", () => {
    for (let t = 0; t < 20; t += 0.013) {
      const p = poseAt(t, "typing", 0.7);
      expect(p.chestLift).toBeGreaterThanOrEqual(0);
      expect(p.chestLift).toBeLessThanOrEqual(c.breathLift);
      expect(Math.abs(p.headTilt)).toBeLessThanOrEqual(c.headSway);
      expect(p.leftHandLift).toBeLessThanOrEqual(c.typingLift);
      expect(p.rightHandLift).toBeLessThanOrEqual(c.typingLift);
    }
  });

  it("typing pauses to read between bursts", () => {
    const [on, off] = c.typingBurstSeconds;
    expect(typingAmount(on / 2)).toBe(1);
    expect(typingAmount(on + off / 2)).toBe(0);
  });

  it("the seed phase keeps two helpers out of sync", () => {
    expect(poseAt(1, "idle", 0.1).chestLift).not.toBeCloseTo(poseAt(1, "idle", 0.6).chestLift, 4);
  });
});
