import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetVault, seedVault } from "./seed";

const sampleDir = resolve(import.meta.dirname, "../../../../vault.sample");
let temp: string;

beforeEach(async () => {
  temp = await mkdtemp(join(tmpdir(), "hq-seed-"));
});
afterEach(async () => {
  await rm(temp, { recursive: true, force: true });
});

describe("seedVault", () => {
  it("copies every sample file into an empty vault", async () => {
    const vaultDir = join(temp, "vault");
    const copied = await seedVault(sampleDir, vaultDir);
    expect(copied).toContain(join("queue", "q-0001-ops-03-luzon-po-451208.md"));
    expect(copied).toContain(join("office", "zones.json"));
    expect(copied).toContain(join("office", "layout.json"));
  });

  it("never overwrites a file that already exists", async () => {
    const vaultDir = join(temp, "vault");
    await seedVault(sampleDir, vaultDir);
    const profile = join(vaultDir, "team", "cm-03", "profile.md");
    await writeFile(profile, "my live edit");

    const copied = await seedVault(sampleDir, vaultDir);

    expect(copied).toEqual([]);
    expect(await readFile(profile, "utf8")).toBe("my live edit");
  });

  it("brings back only the files that were deleted", async () => {
    const vaultDir = join(temp, "vault");
    await seedVault(sampleDir, vaultDir);
    await rm(join(vaultDir, "board", "t-0001.md"));

    expect(await seedVault(sampleDir, vaultDir)).toEqual([join("board", "t-0001.md")]);
  });
});

describe("resetVault", () => {
  it("moves the old vault to a backup and makes a fresh copy, deleting nothing", async () => {
    const vaultDir = join(temp, "vault");
    const backupsDir = join(temp, "vault-backups");
    await seedVault(sampleDir, vaultDir);
    await writeFile(join(vaultDir, "instructions", "mine.md"), "keep me");

    const backup = await resetVault({
      sampleDir,
      vaultDir,
      backupsDir,
      now: new Date(2026, 8, 25, 9, 30),
    });

    expect(backup).toBe(join(backupsDir, "2026-09-25T09-30-00"));
    expect(
      await readFile(join(backupsDir, "2026-09-25T09-30-00", "instructions", "mine.md"), "utf8"),
    ).toBe("keep me");
    expect(await readdir(join(vaultDir, "instructions"))).toEqual([".gitkeep"]);
  });

  it("works when there is no vault yet", async () => {
    const backup = await resetVault({
      sampleDir,
      vaultDir: join(temp, "vault"),
      backupsDir: join(temp, "vault-backups"),
    });
    expect(backup).toBeNull();
  });
});
