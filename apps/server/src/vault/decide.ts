import type { AppState, DecisionRequest, InstructionRequest, QueueItem } from "@hq/shared";
import { toMarkdown } from "@hq/shared/vault";
import { appendLines, readRecord, writeAtomic } from "./write";

/** The Sr. Manager's seat: every decision in the panel is made as this seat. */
export const PLAYER_SEAT = "mgr-01";

const STATUS: Record<DecisionRequest["action"], QueueItem["status"]> = {
  approve: "approved",
  hold: "held",
  "send-back": "sent-back",
  instruct: "instructed",
};

const VERB: Record<DecisionRequest["action"], string> = {
  approve: "approved",
  hold: "held",
  "send-back": "sent back",
  instruct: "gave an instruction on",
};

/** The team works in the Philippines, so log files and times follow Manila time. */
const TZ = "Asia/Manila";
const day = (at: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(at);
const clock = (at: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(at);
const longDay = (at: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(at);
/** ISO time with the Manila offset, like the rest of the vault ("2026-09-25T09:30:00+08:00"). */
function manilaIso(at: Date): string {
  const local = new Date(at.getTime() + 8 * 3_600_000).toISOString().slice(0, 19);
  return `${local}+08:00`;
}

/** Appends one line to today's log, vault/log/<date>.md. */
export async function logLine(vaultDir: string, at: Date, text: string): Promise<string> {
  const line = `- ${clock(at)} ${text}`;
  await appendLines(vaultDir, `log/${day(at)}.md`, [line], logHeader(at));
  return line;
}

const logHeader = (at: Date) =>
  `# Log for ${longDay(at)}\n\nAppend-only. One line per event. The daily digest is built from this file.`;

export class DecisionError extends Error {
  readonly status: 404 | 409;
  constructor(status: 404 | 409, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Records your decision on a Needs You item: the item's status, decision and body, the sender's
 * seat status, and one line in today's log. Throws DecisionError for an unknown or decided item.
 */
export async function applyDecision(
  vaultDir: string,
  state: AppState,
  id: string,
  request: DecisionRequest,
  at = new Date(),
): Promise<{ line: string }> {
  const item = state.queue.find((q) => q.id === id);
  if (!item?.file) throw new DecisionError(404, `No Needs you item with the id ${id}.`);
  if (item.status !== "needs-you") {
    throw new DecisionError(409, `${id} is already ${item.status.replace("-", " ")}.`);
  }
  const note =
    request.action === "send-back"
      ? request.note
      : request.action === "instruct"
        ? request.text
        : undefined;
  const when = manilaIso(at);

  const record = await readRecord(vaultDir, item.file);
  const decision = { action: request.action, by: PLAYER_SEAT, at: when, ...(note ? { note } : {}) };
  const data = { ...record.data, status: STATUS[request.action], updated: when, decision };
  const said = note ? ` Note: ${note}` : "";
  const body = `${record.body.trimEnd()}\n\n## Decision\n${longDay(at)}, ${clock(at)}: ${capitalize(VERB[request.action])} by the Sr. Manager.${said}\n`;
  await writeAtomic(vaultDir, item.file, toMarkdown(data, body));

  // The sender goes back to work, unless it still waits on you for another item. A hold keeps
  // it waiting.
  const stillWaiting = state.queue.some(
    (q) => q.id !== id && q.from === item.from && q.status === "needs-you",
  );
  if (request.action !== "hold" && !stillWaiting) {
    const profile = `team/${item.from}/profile.md`;
    try {
      const seat = await readRecord(vaultDir, profile);
      if (seat.data.status === "waiting-on-you") {
        await writeAtomic(
          vaultDir,
          profile,
          toMarkdown({ ...seat.data, status: "working", updated: when }, seat.body),
        );
      }
    } catch {
      // A seat without a profile file keeps its default status. The decision still counts.
    }
  }

  const line = await logLine(
    vaultDir,
    at,
    `you ${VERB[request.action]} ${id} from ${item.from}${said ? ` (${note})` : ""}`,
  );
  return { line };
}

/** Saves an instruction to vault/instructions/<date>-<time>-<audience>.md and logs it. */
export async function saveInstruction(
  vaultDir: string,
  request: InstructionRequest,
  at = new Date(),
): Promise<{ file: string; line: string }> {
  const when = manilaIso(at);
  const slug = request.audienceId
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const stamp = `${day(at)}-${clock(at).replace(":", "")}${String(at.getUTCSeconds()).padStart(2, "0")}`;
  const file = `instructions/${stamp}-${slug}.md`;
  const data = {
    to: request.audienceId,
    toLabel: request.audienceLabel,
    seats: request.seats,
    about: request.about,
    by: PLAYER_SEAT,
    created: when,
  };
  await writeAtomic(vaultDir, file, toMarkdown(data, `## Instruction\n${request.text}`));
  const line = await logLine(
    vaultDir,
    at,
    `you instructed ${request.audienceLabel}${request.about ? ` about ${request.about}` : ""}`,
  );
  return { file, line };
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
