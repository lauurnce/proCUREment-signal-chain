import { z } from "zod";
import { Id } from "./common";

/** Body of POST /api/queue/:id/decision. Instruct needs its text. */
export const DecisionRequest = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("hold") }),
  // The panel has no note box for Send back yet, so the note is optional (saved when given).
  z.object({ action: z.literal("send-back"), note: z.string().trim().min(1).max(2000).optional() }),
  z.object({ action: z.literal("instruct"), text: z.string().trim().min(1).max(2000) }),
]);
export type DecisionRequest = z.infer<typeof DecisionRequest>;

/** Body of POST /api/instructions: what you told which helpers, saved to vault/instructions/. */
export const InstructionRequest = z.object({
  /** The "To" picker id, like "seat:cm-02" or "zone:cm-wing". */
  audienceId: z.string().min(1).max(80),
  audienceLabel: z.string().min(1).max(120),
  seats: z.array(Id).min(1),
  /** The item it is about, like "PO-451208", or null. */
  about: z.string().max(40).nullable(),
  text: z.string().trim().min(1).max(2000),
});
export type InstructionRequest = z.infer<typeof InstructionRequest>;
