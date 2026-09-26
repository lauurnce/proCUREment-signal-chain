import { describe, expect, it } from "vitest";
import { contrast, formatRatio, passesAA } from "./contrast";

describe("contrast", () => {
  it("black on white is 21:1 and a color on itself is 1:1", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrast("#0067B9", "#0067B9")).toBeCloseTo(1, 5);
  });

  it("matches the ratios in the adi-theme skill", () => {
    expect(contrast("#12284C", "#FFFFFF")).toBeCloseTo(14.65, 1);
    expect(contrast("#0067B9", "#FFFFFF")).toBeCloseTo(5.77, 1);
    expect(contrast("#98A2B3", "#FFFFFF")).toBeCloseTo(2.58, 1);
  });

  it("shows why the Approve green changed (D-026)", () => {
    expect(passesAA(contrast("#FFFFFF", "#1E8E5A"), "text")).toBe(false);
    expect(passesAA(contrast("#FFFFFF", "#1A7F50"), "text")).toBe(true);
  });

  it("rounds down, never up", () => {
    expect(formatRatio(4.499)).toBe("4.49:1");
  });

  it("rejects a color that is not #RRGGBB", () => {
    expect(() => contrast("#FFF", "#000000")).toThrow();
  });
});
