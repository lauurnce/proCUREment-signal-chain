import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ICachePlugin, TokenCacheContext } from "@azure/msal-node";

export const CACHE_WARNING = "Your sign-in is saved in a file in .secrets/, not the Keychain.";

export interface TokenCache {
  plugin: ICachePlugin;
  /** Where the sign-in is kept. */
  store: "keychain" | "file";
  /** Plain English, when the safer Keychain could not be used. */
  warning: string | null;
}

/**
 * Keeps the Outlook sign-in in a file only you can read: .secrets/msal-cache.json, folder mode
 * 700, file mode 600, written atomically. .secrets/ is gitignored and denied to Claude Code.
 */
export function fileCachePlugin(secretsDir: string): ICachePlugin {
  const file = join(secretsDir, "msal-cache.json");
  return {
    async beforeCacheAccess(context: TokenCacheContext) {
      const text = await readFile(file, "utf8").catch(() => null);
      if (text) context.tokenCache.deserialize(text);
    },
    async afterCacheAccess(context: TokenCacheContext) {
      if (!context.cacheHasChanged) return;
      await mkdir(secretsDir, { recursive: true, mode: 0o700 });
      await chmod(secretsDir, 0o700);
      const temp = `${file}.${process.pid}.tmp`;
      await writeFile(temp, context.tokenCache.serialize(), { mode: 0o600 });
      await rename(temp, file);
    },
  };
}

/**
 * The macOS Keychain (service "SignalChainHQ") through msal-node-extensions. It is loaded only
 * here, inside a try: if the native module or the Keychain is missing (Linux, a container, a
 * failed install), the sign-in falls back to the .secrets/ file with a visible warning, and the
 * server never crashes.
 */
export async function createTokenCache(secretsDir: string): Promise<TokenCache> {
  if (process.platform === "darwin") {
    try {
      const { KeychainPersistence, PersistenceCachePlugin } = await import(
        "@azure/msal-node-extensions"
      );
      await mkdir(secretsDir, { recursive: true, mode: 0o700 });
      // The file only marks when the Keychain entry last changed. It holds no tokens.
      const persistence = await KeychainPersistence.create(
        join(secretsDir, "msal-keychain-marker"),
        "SignalChainHQ",
        "outlook-sign-in",
      );
      if (await persistence.verifyPersistence()) {
        return {
          plugin: new PersistenceCachePlugin(persistence),
          store: "keychain",
          warning: null,
        };
      }
    } catch {
      // Fall through to the file below.
    }
  }
  return { plugin: fileCachePlugin(secretsDir), store: "file", warning: CACHE_WARNING };
}
