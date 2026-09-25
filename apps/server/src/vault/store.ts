import type { AppState } from "@hq/shared";
import { loadVault } from "@hq/shared/vault";

type Listener = (state: AppState) => void;

/** Holds the latest AppState and tells listeners when it changes. */
export class VaultStore {
  #state: AppState | null = null;
  #listeners = new Set<Listener>();
  readonly #options: { vaultDir: string; dataDir: string };

  constructor(options: { vaultDir: string; dataDir: string }) {
    this.#options = options;
  }

  get state(): AppState {
    if (!this.#state) throw new Error("Vault store used before the first load");
    return this.#state;
  }

  async reload(): Promise<AppState> {
    this.#state = await loadVault({ ...this.#options, includeLocalRoster: true });
    for (const listener of this.#listeners) listener(this.#state);
    return this.#state;
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
}
