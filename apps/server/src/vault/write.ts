import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, normalize, sep } from "node:path";
import { parseFrontmatter } from "@hq/shared/vault";

/** How long the watcher skips a file after we wrote it, in ms. Longer than its 200 ms debounce. */
const OWN_WRITE_MS = 2_000;

/** Files the server wrote itself, by vault-relative path, with when to stop skipping them. */
const ownWrites = new Map<string, number>();

/** True while `relPath` is a file the server just wrote, so the watcher does not reload twice. */
export function isOwnWrite(relPath: string, now = Date.now()): boolean {
  const until = ownWrites.get(normalize(relPath));
  if (until === undefined) return false;
  if (now > until) {
    ownWrites.delete(normalize(relPath));
    return false;
  }
  return true;
}

/** A vault-relative path that cannot climb out of the vault. */
function inside(vaultDir: string, relPath: string): string {
  const clean = normalize(relPath);
  if (clean.startsWith("..") || clean.startsWith(sep))
    throw new Error(`Not a vault path: ${relPath}`);
  return join(vaultDir, clean);
}

/**
 * Writes a whole file safely: a temp file first, then a rename, so Obsidian, Claude Code or the
 * watcher never see half a file. The watcher ignores .tmp files and, for a moment, this file.
 */
export async function writeAtomic(vaultDir: string, relPath: string, text: string): Promise<void> {
  const target = inside(vaultDir, relPath);
  await mkdir(dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  ownWrites.set(normalize(relPath), Date.now() + OWN_WRITE_MS);
  await writeFile(temp, text, "utf8");
  await rename(temp, target);
}

/** Adds lines to the end of a file (the daily log). Creates it with `header` when it is new. */
export async function appendLines(
  vaultDir: string,
  relPath: string,
  lines: string[],
  header: string,
): Promise<void> {
  const target = inside(vaultDir, relPath);
  ownWrites.set(normalize(relPath), Date.now() + OWN_WRITE_MS);
  let existing: string | null = null;
  try {
    existing = await readFile(target, "utf8");
  } catch {
    existing = null;
  }
  if (existing === null) {
    await writeAtomic(vaultDir, relPath, `${header}\n\n${lines.join("\n")}\n`);
    return;
  }
  // A small append to an append-only file: one write call, so a reader sees all or nothing of it.
  const glue = existing.endsWith("\n") ? "" : "\n";
  await appendFile(target, `${glue}${lines.join("\n")}\n`, "utf8");
}

/** Reads a markdown record from the vault: its frontmatter data and its body. */
export async function readRecord(vaultDir: string, relPath: string) {
  return parseFrontmatter(await readFile(inside(vaultDir, relPath), "utf8"));
}
