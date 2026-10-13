import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import type { DemoSpeed, DemoStatus, QueueStatus } from "@hq/shared";
import { toMarkdown } from "@hq/shared/vault";
import type { SseHub } from "../sse/hub";
import { applyDecision, logLine } from "../vault/decide";
import { seedVault } from "../vault/seed";
import type { VaultStore } from "../vault/store";
import { readRecord, writeAtomic } from "../vault/write";
import { DemoDayEngine, type Effect } from "./engine";

/** Real time between steps of the simulation, in ms. At 1x, one simulated second each second. */
const TICK_MS = 1_000;

/** Today's date in Manila, for the simulated day. */
const manilaDay = (now: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(now);

/**
 * Runs Demo Day: copies vault.sample to vault-demo/ (fresh at every start), points the server at
 * it, and plays a seeded day there. Your live vault is never touched. Stopping points the server
 * back at your vault.
 */
export class DemoRunner {
  #engine: DemoDayEngine | null = null;
  #timer: NodeJS.Timeout | null = null;
  #speed: DemoSpeed = 5;
  /** Simulated seconds since the day started, so slow speeds still move on. */
  #seconds = 0;
  #busy = false;
  readonly #deps: {
    store: VaultStore;
    hub: SseHub;
    sampleDir: string;
    demoDir: string;
    liveDir: string;
  };

  constructor(deps: {
    store: VaultStore;
    hub: SseHub;
    sampleDir: string;
    demoDir: string;
    liveDir: string;
  }) {
    this.#deps = deps;
  }

  status(): DemoStatus | null {
    const e = this.#engine;
    return e ? { running: true, speed: this.#speed, seed: e.seed, clock: e.iso() } : null;
  }

  async start(options: { seed?: number; speed?: DemoSpeed } = {}): Promise<DemoStatus> {
    if (this.#engine) await this.stop(false);
    const { store, sampleDir, demoDir } = this.#deps;
    const live = store.state;
    // A fresh copy of the sample, without its open items, tasks and logs: the day starts empty.
    await rm(demoDir, { recursive: true, force: true });
    await seedVault(sampleDir, demoDir);
    for (const folder of ["queue", "board", "log", "instructions"]) {
      for (const name of await readdir(join(demoDir, folder)).catch(() => [] as string[])) {
        if (name.endsWith(".md")) await rm(join(demoDir, folder, name));
      }
    }
    this.#speed = options.speed ?? 5;
    this.#seconds = 0;
    this.#engine = new DemoDayEngine({
      seed: options.seed ?? 42,
      date: manilaDay(new Date()),
      seats: live.seats.map((s) => ({
        id: s.id,
        track: s.track,
        workflows: s.workflows,
        label: s.displayName,
      })),
      workflows: live.workflows,
      rules: live.authorityRules,
    });
    store.switchTo(demoDir);
    store.demo = this.status();
    await this.#apply(this.#engine.start());
    await this.#publish();
    this.#timer = setInterval(() => void this.#tick(), TICK_MS);
    this.#timer.unref();
    return this.status() as DemoStatus;
  }

  async stop(publish = true): Promise<void> {
    if (this.#timer) clearInterval(this.#timer);
    this.#timer = null;
    this.#engine = null;
    const { store, liveDir } = this.#deps;
    store.switchTo(liveDir);
    store.demo = null;
    if (publish) await this.#publish();
  }

  async setSpeed(speed: DemoSpeed): Promise<DemoStatus | null> {
    this.#speed = speed;
    this.#deps.store.demo = this.status();
    if (this.#engine) await this.#publish();
    return this.status();
  }

  /** Moves the day on by `seconds` of simulated time at once (tests and the playtest). */
  async fastForward(seconds: number): Promise<void> {
    this.#seconds += seconds;
    await this.#step();
  }

  async #tick() {
    if (this.#busy) return;
    this.#seconds += (TICK_MS / 1000) * this.#speed;
    await this.#step();
  }

  async #step() {
    const engine = this.#engine;
    if (!engine || this.#busy) return;
    this.#busy = true;
    try {
      const target = 8 * 60 + Math.floor(this.#seconds / 60);
      if (target <= engine.minute) return;
      const statuses = new Map<string, QueueStatus>(
        this.#deps.store.state.queue.map((q) => [q.id, q.status]),
      );
      await this.#apply(engine.advance(target, statuses));
      this.#deps.store.demo = this.status();
      await this.#publish();
    } catch (error) {
      console.error("Demo Day step failed", error);
    } finally {
      this.#busy = false;
    }
  }

  async #apply(effects: Effect[]) {
    const engine = this.#engine;
    if (!engine) return;
    const dir = this.#deps.demoDir;
    const at = new Date(engine.iso());
    const when = engine.iso();
    for (const effect of effects) {
      switch (effect.type) {
        case "seat": {
          const file = `team/${effect.seat}/profile.md`;
          const body = await readRecord(dir, file).then(
            (r) => r.body,
            () => "",
          );
          const { seat, status, workingOn, currentWorkflow, currentStep } = effect;
          await writeAtomic(
            dir,
            file,
            toMarkdown(
              { seat, status, workingOn, currentWorkflow, currentStep, updated: when },
              body,
            ),
          );
          break;
        }
        case "item": {
          const { body, file: _file, ...data } = effect.item;
          await writeAtomic(
            dir,
            `queue/${effect.item.id}-${effect.slug}.md`,
            toMarkdown(data, body),
          );
          break;
        }
        case "task": {
          const { body, ...data } = effect.task;
          await writeAtomic(dir, `board/${effect.task.id}.md`, toMarkdown(data, body));
          break;
        }
        case "log":
          await logLine(dir, at, effect.text);
          break;
        case "decide": {
          // The item must be in the store to be decided: read the vault again first.
          await this.#deps.store.reload();
          const request =
            effect.action === "send-back"
              ? { action: "send-back" as const, ...(effect.note ? { note: effect.note } : {}) }
              : { action: "approve" as const };
          await applyDecision(dir, this.#deps.store.state, effect.id, request, at, effect.by).catch(
            () => undefined,
          );
          break;
        }
        case "remind": {
          // Your hold stays in the item's history. The helper still waits on you (D-114).
          const item = this.#deps.store.state.queue.find((q) => q.id === effect.id);
          const record = item?.file ? await readRecord(dir, item.file).catch(() => null) : null;
          if (!item?.file || record?.data.status !== "held") break;
          const body = `${record.body.trimEnd()}\n\n## Reminder\nStill on hold after an hour, so it is back in Needs you.\n`;
          await writeAtomic(
            dir,
            item.file,
            toMarkdown(
              { ...record.data, status: "needs-you", decision: null, updated: when },
              body,
            ),
          );
          break;
        }
      }
    }
  }

  async #publish() {
    const state = await this.#deps.store.reload();
    this.#deps.hub.broadcast({ type: "state.snapshot", state });
  }
}
