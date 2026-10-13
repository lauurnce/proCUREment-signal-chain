import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Id, type Seat, type Task, Track } from "@hq/shared";
import { z } from "zod";

const Rule = z.object({ track: Track, workflow: Id, keywords: z.array(z.string().min(1)) });

/** data/inbox-rules.json: which track and workflow a tagged email belongs to. */
export const InboxRules = z.object({
  version: z.literal(1),
  note: z.string().optional(),
  rules: z.array(Rule),
  default: Rule.omit({ keywords: true }),
});
export type InboxRules = z.infer<typeof InboxRules>;

const FALLBACK: InboxRules = {
  version: 1,
  rules: [],
  default: { track: "OPS", workflow: "ops-pr-to-po-stock-item" },
};

/** Reads the rules. A missing or broken file sends every email to Ops, and says so. */
export async function loadInboxRules(
  dataDir: string,
): Promise<{ rules: InboxRules; problem: string | null }> {
  try {
    const parsed = InboxRules.safeParse(
      JSON.parse(await readFile(join(dataDir, "inbox-rules.json"), "utf8")),
    );
    if (parsed.success) return { rules: parsed.data, problem: null };
  } catch {
    // Fall through.
  }
  return {
    rules: FALLBACK,
    problem: "data/inbox-rules.json could not be read, so every [HQ] email goes to an Ops helper.",
  };
}

/** The first rule with a keyword in the subject or body (any case), else the default. */
export function routeEmail(rules: InboxRules, text: string): { track: Track; workflow: string } {
  const lower = text.toLowerCase();
  const rule = rules.rules.find((r) => r.keywords.some((k) => lower.includes(k.toLowerCase())));
  return rule ? { track: rule.track, workflow: rule.workflow } : rules.default;
}

/** The helper of that track with the fewest open tasks (ties by seat id). Never you. */
export function pickOwner(seats: Seat[], tasks: Task[], track: Track): Seat | null {
  const open = new Map<string, number>();
  for (const t of tasks) if (t.status !== "done") open.set(t.owner, (open.get(t.owner) ?? 0) + 1);
  return (
    seats
      .filter((s) => s.track === track && !s.isPlayer)
      .sort(
        (a, b) => (open.get(a.id) ?? 0) - (open.get(b.id) ?? 0) || a.id.localeCompare(b.id),
      )[0] ?? null
  );
}

/** The next free task id, like "t-0012". */
export function nextTaskId(tasks: Task[]): string {
  const max = Math.max(0, ...tasks.map((t) => Number(/^t-(\d+)$/.exec(t.id)?.[1] ?? 0)));
  return `t-${String(max + 1).padStart(4, "0")}`;
}

/** The task title: the subject without the tag, short. */
export function taskTitle(subject: string, tag: string): string {
  const title = subject.slice(tag.length).trim() || "Email from your inbox";
  return title.length > 90 ? `${title.slice(0, 87)}...` : title;
}
