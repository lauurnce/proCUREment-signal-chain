import { z } from "zod";
import { Id } from "./common";

export const ChangeType = z.enum(["price-change", "quantity-change", "commercial-terms"]);

/** Limits are exclusive: max means strictly under, min means at or above. */
export const RuleCondition = z.object({
  type: ChangeType,
  maxPercent: z.number().positive().optional(),
  minPercent: z.number().positive().optional(),
  maxAmount: z.number().positive().optional(),
  minAmount: z.number().positive().optional(),
  currency: z.string().optional(),
});

export const AuthorityRule = z.object({
  id: Id,
  when: RuleCondition,
  decidedBy: z.enum(["MGR", "LEAD", "CM", "OPS", "PLANNER"]),
  plainEnglish: z.string().min(1),
});
export type AuthorityRule = z.infer<typeof AuthorityRule>;

export const AuthorityRulesFile = z.object({
  version: z.literal(1),
  confirmed: z.boolean(),
  source: z.string().optional(),
  rules: z.array(AuthorityRule).min(1),
});
export type AuthorityRulesFile = z.infer<typeof AuthorityRulesFile>;
