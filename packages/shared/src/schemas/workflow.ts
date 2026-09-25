import { z } from "zod";
import { Id, Track } from "./common";

/** Who decides a step. RULE means the authority rule picks the role. */
export const StepDecider = z.enum(["MGR", "LEAD", "CM", "OPS", "RULE"]);

export const WorkflowStep = z.object({
  id: Id,
  label: z.string().min(1),
  /** A zone id, or "own-desk" for the seat's own desk. */
  zone: Id,
  aiAssist: z.string().min(1),
  needsHuman: z.boolean(),
  decidedBy: StepDecider.optional(),
});
export type WorkflowStep = z.infer<typeof WorkflowStep>;

export const Workflow = z.object({
  id: Id,
  track: Track,
  name: z.string().min(1),
  handoffTo: Id.optional(),
  handoffFrom: Id.optional(),
  steps: z.array(WorkflowStep).min(1),
});
export type Workflow = z.infer<typeof Workflow>;

export const WorkflowsFile = z.object({
  version: z.literal(1),
  source: z.string().optional(),
  zonesNote: z.string().optional(),
  workflows: z.array(Workflow),
});
export type WorkflowsFile = z.infer<typeof WorkflowsFile>;
