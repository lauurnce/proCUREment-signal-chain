import type { AuthorityRule, QueueItem, Seat, Workflow } from "@hq/shared";
import type { DecisionItem } from "../DecisionCard";
import { firstLine, sections } from "./markdown";
import { decidingAs, helperName } from "./queue";

/** "PO amendments" and "Step 3 of 4" for an item, from data/workflows.json. */
export function stepInfo(workflows: Workflow[], item: QueueItem) {
  const workflow = workflows.find((w) => w.id === item.workflow);
  const index = workflow?.steps.findIndex((s) => s.id === item.step) ?? -1;
  return {
    workflow: workflow?.name ?? item.workflow,
    step: index >= 0 && workflow ? `Step ${index + 1} of ${workflow.steps.length}` : "",
    stepLabel: index >= 0 ? (workflow?.steps[index]?.label ?? "") : "",
  };
}

/** The PO, PR or RFQ number in a title, like "PO-452114". */
export function reference(item: QueueItem): string | null {
  return /\b(PO|PR|RFQ|INV)-\d+/.exec(`${item.title} ${item.body}`)?.[0] ?? null;
}

/** Shown on every email item, so no one thinks Approve sends the email. */
export const EMAIL_NOTE = "Approve creates a draft. Sending is a separate step.";

/**
 * "Why this came to you", in plain words (copy deck, section 3). An item routed by the
 * authority rule names who must decide and why, in the rule's own words from
 * data/authority-rules.template.json.
 */
export function whyText(seats: Seat[], item: QueueItem, rules: AuthorityRule[]): string {
  const helper = helperName(seats, item.from);
  if (item.rule) {
    const who = decidingAs(seats, item) ?? "You";
    const rule = rules.find((r) => r.id === item.rule);
    return rule
      ? `${who} must decide. ${rule.plainEnglish}`
      : `${who} must decide. The rule "${item.rule}" is not in the authority rules file.`;
  }
  if (item.kind === "email-draft") return `${helper} drafted this email. ${EMAIL_NOTE}`;
  return `${helper} prepared this for your review.`;
}

/** The helper's suggestion: its recommendation, or else the first option. */
export function suggestion(item: QueueItem): string | undefined {
  const s = sections(item.body);
  return (
    firstLine(s.find((x) => x.heading.startsWith("Recommendation"))) ??
    firstLine(s.find((x) => x.heading === "Options")) ??
    undefined
  );
}

/** Maps a queue item to the focused card (P2.2 DecisionCard). */
export function toDecisionItem(
  seats: Seat[],
  workflows: Workflow[],
  item: QueueItem,
  rules: AuthorityRule[],
): DecisionItem {
  const info = stepInfo(workflows, item);
  const as = decidingAs(seats, item);
  const fromSeat = seats.find((s) => s.id === item.from);
  return {
    workflow: info.workflow,
    step: info.step,
    title: item.title,
    facts: [
      ...(item.supplier ? [{ label: "Supplier", value: item.supplier }] : []),
      { label: "From", value: helperName(seats, item.from) },
      { label: "Decides", value: as ? `${as} (you decide for the seat in this demo)` : "You" },
    ],
    fromTrack: fromSeat?.track ?? item.track,
    why: whyText(seats, item, rules),
    ruleConfirmed: !item.rule,
    decidingAs: as ?? undefined,
    suggestion: suggestion(item),
    sendBackTo: helperName(seats, item.from),
  };
}

/** Keeps codes like "PO-451208" on one line, so a title never breaks at the hyphen. */
export function keepCodesTogether(text: string): string {
  return text.replace(/\b(PO|PR|RFQ|INV)-(\d+)/g, "$1\u2011$2");
}
