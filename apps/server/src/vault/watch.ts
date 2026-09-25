import { stat } from "node:fs/promises";
import { relative, sep } from "node:path";
import { type FSWatcher, watch } from "chokidar";

/** Ignores dot files and folders (like .state/), editor temp files, and our own .tmp files. */
export function isIgnored(relPath: string): boolean {
  if (relPath.endsWith("~") || relPath.endsWith(".tmp")) return true;
  return relPath.split(sep).some((part) => part.startsWith("."));
}

/** Identity of the vault folder, or null when it is missing. Changes when the folder is replaced. */
async function folderId(dir: string): Promise<string | null> {
  try {
    const info = await stat(dir);
    return `${info.dev}:${info.ino}`;
  } catch {
    return null;
  }
}

/**
 * Watches the vault and calls onChange once per burst of changes. Returns a stop function.
 * If the whole folder is moved, deleted or replaced (a git checkout, a sync tool), the watcher
 * notices within a few seconds, starts again on the new folder, and reloads.
 */
export function watchVault(
  vaultDir: string,
  onChange: () => void,
  options: { debounceMs?: number; recheckMs?: number } = {},
): () => Promise<void> {
  const { debounceMs = 200, recheckMs = 2_000 } = options;
  let timer: NodeJS.Timeout | undefined;
  let watcher: FSWatcher | null = null;
  let currentId: string | null = null;

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(onChange, debounceMs);
  };
  const start = () => {
    watcher = watch(vaultDir, {
      ignoreInitial: true,
      ignored: (path) => isIgnored(relative(vaultDir, path)),
    });
    watcher.on("all", schedule);
  };

  void folderId(vaultDir).then((id) => {
    currentId = id;
  });
  start();

  const recheck = setInterval(() => {
    void folderId(vaultDir).then(async (id) => {
      if (id === currentId) return;
      currentId = id;
      await watcher?.close();
      start();
      schedule();
    });
  }, recheckMs);
  recheck.unref();

  return async () => {
    clearInterval(recheck);
    clearTimeout(timer);
    await watcher?.close();
  };
}
