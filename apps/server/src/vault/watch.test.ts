import { cp, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isIgnored, watchVault } from "./watch";

const sampleDir = resolve(import.meta.dirname, "../../../../vault.sample");
let temp: string;
let stop: (() => Promise<void>) | undefined;

beforeEach(async () => {
  temp = await mkdtemp(join(tmpdir(), "hq-watch-"));
});
afterEach(async () => {
  await stop?.();
  stop = undefined;
  await rm(temp, { recursive: true, force: true });
});

describe("isIgnored", () => {
  it("ignores dot folders, temp files and editor backups, but not records", () => {
    expect(isIgnored(join(".state", "mail.json"))).toBe(true);
    expect(isIgnored(join("board", "t-0001.md.tmp"))).toBe(true);
    expect(isIgnored(join("board", "t-0001.md~"))).toBe(true);
    expect(isIgnored(join("board", "t-0001.md"))).toBe(false);
  });
});

describe("watchVault", () => {
  it("calls onChange once for a burst of edits", async () => {
    const vaultDir = join(temp, "vault");
    await cp(sampleDir, vaultDir, { recursive: true });
    const onChange = vi.fn();
    stop = watchVault(vaultDir, onChange, { debounceMs: 100 });
    await new Promise((r) => setTimeout(r, 300));

    await writeFile(join(vaultDir, "board", "t-0001.md"), "edit 1");
    await writeFile(join(vaultDir, "board", "t-0002.md"), "edit 2");

    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1), { timeout: 3_000 });
  });

  it("keeps working after the whole vault folder is replaced", async () => {
    const vaultDir = join(temp, "vault");
    await cp(sampleDir, vaultDir, { recursive: true });
    const onChange = vi.fn();
    stop = watchVault(vaultDir, onChange, { debounceMs: 50, recheckMs: 100 });
    await new Promise((r) => setTimeout(r, 300));

    await rename(vaultDir, join(temp, "old-vault"));
    await cp(sampleDir, vaultDir, { recursive: true });
    await vi.waitFor(() => expect(onChange).toHaveBeenCalled(), { timeout: 3_000 });

    onChange.mockClear();
    await new Promise((r) => setTimeout(r, 300));
    await writeFile(join(vaultDir, "board", "t-0003.md"), "edit in the new folder");
    await vi.waitFor(() => expect(onChange).toHaveBeenCalled(), { timeout: 3_000 });
  });
});
