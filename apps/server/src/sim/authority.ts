import type { AuthorityRule } from "@hq/shared";

/** A change an Ops Buyer finds on a PO: a price change, a quantity change, or commercial terms. */
export type Change =
  | { type: "price-change"; percent: number; amount: number }
  | { type: "quantity-change" }
  | { type: "commercial-terms" };

/**
 * The first rule that matches a change, from data/authority-rules.template.json. Limits follow
 * the file: max means strictly under, min means at or above. Null when no rule matches, which
 * goes to the Category Manager as the safer default (D-013).
 */
export function ruleFor(rules: AuthorityRule[], change: Change): AuthorityRule | null {
  for (const rule of rules) {
    const w = rule.when;
    if (w.type !== change.type) continue;
    if (change.type === "price-change") {
      if (w.maxPercent !== undefined && !(change.percent < w.maxPercent)) continue;
      if (w.minPercent !== undefined && !(change.percent >= w.minPercent)) continue;
      if (w.maxAmount !== undefined && !(change.amount < w.maxAmount)) continue;
      if (w.minAmount !== undefined && !(change.amount >= w.minAmount)) continue;
    }
    return rule;
  }
  return null;
}
