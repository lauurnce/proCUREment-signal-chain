import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, rename } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

/**
 * Copies every file from the sample vault that is missing in the live vault.
 * Never overwrites a file. Returns the copied paths, relative to the vault.
 */
export async function seedVault(sampleDir: string, vaultDir: string): Promise<string[]> {
  const copied: string[] = [];
  for (const source of await listFiles(sampleDir)) {
    const rel = relative(sampleDir, source);
    const target = join(vaultDir, rel);
    if (existsSync(target)) continue;
    await mkdir(dirname(target), { recursive: true });
    // COPYFILE_EXCL fails instead of overwriting, in case a file appears in between.
    await copyFile(source, target, 1);
    copied.push(rel);
  }
  return copied;
}

/** A folder-safe timestamp in local time, like 2026-09-25T09-30-00. */
export function backupStamp(now: Date): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 19).replaceAll(":", "-");
}

/**
 * Moves the live vault into vault-backups/<time>/ and makes a fresh copy of the sample.
 * Nothing is deleted. Returns the backup folder, or null when there was no vault.
 */
export async function resetVault(options: {
  sampleDir: string;
  vaultDir: string;
  backupsDir: string;
  now?: Date;
}): Promise<string | null> {
  let backup: string | null = null;
  if (existsSync(options.vaultDir)) {
    backup = join(options.backupsDir, backupStamp(options.now ?? new Date()));
    if (existsSync(backup)) throw new Error(`Backup folder already exists: ${backup}`);
    await mkdir(options.backupsDir, { recursive: true });
    await rename(options.vaultDir, backup);
  }
  await seedVault(options.sampleDir, options.vaultDir);
  return backup;
}
