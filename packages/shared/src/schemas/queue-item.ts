import { z } from "zod";
import { Id, IsoDateTime, Track } from "./common";

export const QueueKind = z.enum(["email-draft", "summary", "approval", "escalation", "report"]);

export const QueueStatus = z.enum([
  "needs-you",
  "approved",
  "held",
  "sent-back",
  "instructed",
  "sent",
  "done",
]);
export type QueueStatus = z.infer<typeof QueueStatus>;

export const DecisionAction = z.enum(["approve", "hold", "send-back", "instruct"]);

export const Decision = z.object({
  action: DecisionAction,
  by: Id,
  at: IsoDateTime,
  note: z.string().optional(),
});
export type Decision = z.infer<typeof Decision>;

export const EmailDraft = z.object({
  to: z.array(z.email()).min(1),
  cc: z.array(z.email()),
  subject: z.string().min(1),
});

/** A Needs You item, from vault/queue/<id>-<slug>.md frontmatter. The body is kept as markdown. */
export const QueueItem = z.object({
  id: Id,
  title: z.string().min(1),
  kind: QueueKind,
  status: QueueStatus,
  from: Id,
  approver: Id,
  track: Track,
  workflow: Id,
  step: Id,
  supplier: z.string().optional(),
  rule: Id.optional(),
  created: IsoDateTime,
  updated: IsoDateTime,
  email: EmailDraft.optional(),
  decision: Decision.nullable(),
  body: z.string(),
});
export type QueueItem = z.infer<typeof QueueItem>;
