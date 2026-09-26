import { useState } from "react";
import { typeStyle } from "../../theme/style";
import type { Decision } from "../../ui/DecisionButton";
import { DecisionCard, type DecisionItem } from "../../ui/DecisionCard";
import { PanelTitle } from "../../ui/PanelTitle";

// Fictional item, the same as vault.sample/queue/q-0003.
const ITEM: DecisionItem = {
  workflow: "PO amendments",
  step: "Step 3 of 4",
  title: "Price change of 6.5 percent on PO-452114",
  facts: [
    { label: "Supplier", value: "Batangas Metalcraft Industries (fictional)" },
    { label: "From", value: "Ops 07 helper" },
    { label: "Decides", value: "CM 02, price change of 5 percent or more" },
  ],
  fromTrack: "OPS",
  why: "The invoice is 6.5 percent above the PO price. A change of 5 percent or more needs a Category Manager, so the helper did not change it in SAP.",
  ruleConfirmed: false,
  decidingAs: "CM 02",
  suggestion: "Ask the supplier for a cost breakdown before you approve.",
  sendBackTo: "Ops 07 helper",
};

const DONE: Record<Decision, string> = {
  approve: "Approved",
  hold: "On hold",
  "send-back": "Sent back to Ops 07 helper",
  instruct: "Instruction box would open here",
};

export function DecisionSection() {
  const [last, setLast] = useState<Decision | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <div className="max-w-[640px] rounded-card bg-backdrop-day p-4">
        <div className="flex flex-col gap-4 rounded-card border border-hairline bg-white p-5">
          <PanelTitle as="h3">
            Needs you
            <span
              className="rounded-pill bg-status-waiting px-2 tabular-nums"
              style={typeStyle("label", "white")}
            >
              4
            </span>
          </PanelTitle>
          <DecisionCard item={ITEM} onDecide={setLast} />
        </div>
      </div>
      <p role="status" className="m-0 min-h-[22px]" style={typeStyle("body", "inkMuted")}>
        {last ? `${DONE[last]}. Lab only, nothing was saved or sent.` : "Press a button to try it."}
      </p>
      <p className="m-0" style={typeStyle("small")}>
        Approve leads. The other three are quieter. Keys A, H, S and I will work when the panel has
        focus (D-031). Only the focused card shows all four buttons.
      </p>
    </div>
  );
}
