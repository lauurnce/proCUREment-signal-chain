import { z } from "zod";
import { Accessory } from "./accessory";
import { AuthorityRule } from "./authority-rule";
import { IsoDateTime } from "./common";
import { LayoutFile } from "./layout";
import { QueueItem } from "./queue-item";
import { Seat } from "./seat";
import { Task } from "./task";
import { Workflow } from "./workflow";
import { Zone } from "./zone";

export const OfficeState = z.object({
  zones: z.array(Zone),
  accessories: z.array(Accessory),
  /** The floor plan, or null when office/layout.json has never been read. */
  layout: LayoutFile.nullable(),
});
export type OfficeState = z.infer<typeof OfficeState>;

export const Stats = z.object({
  working: z.int(),
  onBreak: z.int(),
  inMeeting: z.int(),
  needsYou: z.int(),
  openTasks: z.int(),
});
export type Stats = z.infer<typeof Stats>;

/** Everything the UI needs, from GET /api/state and the first SSE event. */
export const AppState = z.object({
  generatedAt: IsoDateTime,
  seats: z.array(Seat),
  queue: z.array(QueueItem),
  tasks: z.array(Task),
  office: OfficeState,
  workflows: z.array(Workflow),
  authorityRules: z.array(AuthorityRule),
  stats: Stats,
  /** Plain-English problems, like a vault file that could not be read. */
  warnings: z.array(z.string()),
  /** The Obsidian vault name for "Open in Obsidian" links (OBSIDIAN_VAULT_NAME), or null. */
  obsidianVault: z.string().nullable().default(null),
});
export type AppState = z.infer<typeof AppState>;

export const MailStatus = z.object({
  provider: z.enum(["outbox", "graph", "power-automate"]),
  mode: z.enum(["dry-run", "drafts", "send"]),
  signedIn: z.boolean(),
});
export type MailStatus = z.infer<typeof MailStatus>;

export const ServerEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("state.snapshot"), state: AppState }),
  z.object({ type: z.literal("seat.updated"), seat: Seat }),
  z.object({ type: z.literal("queue.upserted"), item: QueueItem }),
  z.object({ type: z.literal("task.upserted"), task: Task }),
  z.object({ type: z.literal("office.updated"), office: OfficeState }),
  z.object({ type: z.literal("log.appended"), line: z.string() }),
  z.object({ type: z.literal("mail.status"), status: MailStatus }),
  z.object({ type: z.literal("sim.tick"), clock: IsoDateTime, speed: z.number() }),
  z.object({ type: z.literal("warning"), message: z.string() }),
]);
export type ServerEvent = z.infer<typeof ServerEvent>;

export const Health = z.object({
  ok: z.boolean(),
  version: z.string(),
  vaultPath: z.string(),
  /** Which checkout this server runs from: a worktree name, or null for the main checkout. */
  worktree: z.string().nullable(),
  warnings: z.int(),
});
export type Health = z.infer<typeof Health>;
