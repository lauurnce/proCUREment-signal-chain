import type { AppState } from "@hq/shared";
import { loadVault } from "@hq/shared/vault";

type Listener = (state: AppState) => void;

/** Holds the latest AppState and tells listeners when it changes. */
export class VaultStore {
  #state: AppState | null = null;
  #listeners = new Set<Listener>();
  readonly #options: { vaultDir: string; dataDir: string; obsidianVault?: string | null };

  constructor(options: { vaultDir: string; dataDir: string; obsidianVault?: string | null }) {
    this.#options = options;
  }

  get vaultDir(): string {
    return this.#options.vaultDir;
  }

  get state(): AppState {
    if (!this.#state) throw new Error("Vault store used before the first load");
    return this.#state;
  }

  async reload(): Promise<AppState> {
    const { vaultDir, dataDir, obsidianVault = null } = this.#options;
    const next = await loadVault({ vaultDir, dataDir, includeLocalRoster: true });
    next.obsidianVault = obsidianVault;
    // A broken layout.json during a live edit keeps the last good floor plan (D-050).
    const lastGood = this.#state?.office.layout ?? null;
    if (next.office.layout === null && lastGood) {
      next.office.layout = lastGood;
      next.warnings.push("Using the last good office layout until office/layout.json is fixed.");
    }
    this.#state = next;
    for (const listener of this.#listeners) listener(this.#state);
    return this.#state;
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
}
