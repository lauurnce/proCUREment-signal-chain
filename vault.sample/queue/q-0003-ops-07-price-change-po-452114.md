---
id: "q-0003"
title: "Price change of 6.5 percent on PO-452114: needs a Category Manager decision"
kind: "approval"
status: "needs-you"
from: "ops-07"
approver: "cm-02"
track: "OPS"
workflow: "ops-po-amendments"
step: "decide"
supplier: "Batangas Metalcraft Industries (fictional)"
rule: "price-large"
created: "2026-09-25T09:20:00+08:00"
updated: "2026-09-25T09:20:00+08:00"
decision: null
---
## Summary
The invoice for PO-452114 is 6.5 percent above the PO price. Under the authority rule (to confirm), a price change over 5 percent needs Category Manager approval, so the Ops helper routed it to CM 02 instead of changing it in SAP.

## What the helper checked
- PO price vs invoice price, line by line.
- Freight is the same on both.
- Quantity matches, so the Planner is not needed.

## Options
1. Approve the new price and let Ops amend the PO.
2. Send back to Ops: ask the supplier to invoice at the PO price.
3. Instruct: ask the supplier for a cost breakdown first.
