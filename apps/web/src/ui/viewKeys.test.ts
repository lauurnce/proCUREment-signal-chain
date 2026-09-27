import { describe, expect, it } from "vitest";
import { viewForKey } from "./viewKeys";

const press = (key: string, extra: Partial<Parameters<typeof viewForKey>[0]> = {}) =>
  viewForKey({
    key,
    target: null,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    repeat: false,
    ...extra,
  });

describe("camera view keys", () => {
  it("1 to 5 pick Whole office, CM Wing, Ops Wing, the Sr. Manager's Office and the bridge", () => {
    expect(["1", "2", "3", "4", "5"].map((key) => press(key))).toEqual([
      "overview",
      "cm",
      "ops",
      "mgr",
      "bridge",
    ]);
    expect(press("6")).toBeNull();
    expect(press("a")).toBeNull();
  });

  it("never fire with a modifier key or a held key", () => {
    expect(press("2", { metaKey: true })).toBeNull();
    expect(press("2", { ctrlKey: true })).toBeNull();
    expect(press("2", { shiftKey: true })).toBeNull();
    expect(press("2", { repeat: true })).toBeNull();
  });

  it("never fire while typing in a field", () => {
    const field = { tagName: "TEXTAREA", isContentEditable: false } as unknown as EventTarget;
    const editor = { tagName: "DIV", isContentEditable: true } as unknown as EventTarget;
    expect(press("2", { target: field })).toBeNull();
    expect(press("2", { target: editor })).toBeNull();
    const button = { tagName: "BUTTON", isContentEditable: false } as unknown as EventTarget;
    expect(press("2", { target: button })).toBe("cm");
  });
});
