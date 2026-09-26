# Point of view: UX writer

Voice in one line: a calm, kind coworker who shows their work and always lets people decide.

## 1. Borrow from the references (patterns, not pixels)

- **ref-02, ref-06:** each row has a name, a role and a status in one short line. We keep that shape: "CM 03 helper · RFQ process · working".
- **ref-04:** a big number over a small label. Ours: "3 NEEDS YOU", "12 HANDOFFS TODAY".
- **ref-07:** an honest empty state that names where the data comes from. This is the best copy idea in the set.
- **ref-08, ref-09:** four decision verbs (Approve, Hold, Send back, Instruct) and a "Your decision" label. Send back names who gets it.
- **ref-02:** a "Give an instruction" box with a plain placeholder. Ours ends in "Send to helper", not "Send to my inbox".

## 2. Avoid

- Human first names for helpers (ref-01). They blur helper and person, and they make it feel like the helper replaces someone.
- System words shown to users, like "NEEDS-ANNIKKA" slugs and file paths in titles (ref-06, ref-10). Say "Needs you" and hide paths behind "Open in Obsidian".
- Whole sentences in capitals (ref-08 title). Use capitals only on tiny labels.
- ISO dates like "2026-09-21". Use "21 Sep 2026".
- Jokes that could land on people, like "in the gym" (ref-04). Charm belongs to places, not to workers.
- The HR use case in ref-10. We never check, list or report on staff hours.
- The words "agent", "queue", "pipeline", "idle", "online", "tracking", "monitoring".

## 3. Three ideas: premium, cozy, and true to the work

**Idea 1. Every item says its workflow and step.** CMs and Ops Buyers think in steps, not tickets. So each card shows where it sits in the real flow, and the handoff at the Endorsement Bridge gets its own line.
- "PO amendments · Step 3 of 4, apply the authority rule"
- "CM 03 helper endorsed 12 PRs. Ops 05 helper picked them up."

**Idea 2. "Why this came to you" in one plain line.** When the authority rule routes an item, we show the rule, the number and the reason. We also show what the helper checked, so trust is earned, not assumed.
- "Price is up 6.2 percent. Changes of 5 percent or more need a Category Manager."
- "Checked against the SAP extract from 25 Sep 2026, 9:10 AM."

**Idea 3. A calm day with a clear end.** Empty states give closure, not guilt. Emails always have a firm ask and a reply-by date. The morning brief and the end-of-day note sound like a good teammate.
- "All clear. Nothing waiting on you. New items appear here when a helper needs a decision."
- "Could you confirm the new delivery date for PO-450218 by 30 Sep 2026?"

Naming the helpers (pick first):
1. **"CM 03 helper"** by default, with an optional job nickname from `/define-role`, like "Quote Table" or "PR Checker".
2. Job only: "Quote Table (CM 03)".
3. Object names, like "Compass" or "Ledger". Charming, but harder to scan.

## 4. Risks and non-negotiables

- **Helpers do, people decide.** Helpers "prepared", "checked", "drafted". People "approved", "decided", "sent". Never "AI approved" or "AI handled your work".
- **Never imply AI replaces people.** No "saved 3 hours of CM time", no "fewer people needed", no comparing a helper to its person. Say "ready for your review" instead.
- **Status words describe helpers only.** The person at a seat is never "idle", "away" or "online".
- **Drafts first, out loud.** The main button is "Save draft in Outlook". "Send" appears only after review. Placeholders block a send: "This draft still has [Supplier Name]. Fill it in, then send."
- **Every decision leaves a plain record.** "Approved by you, 25 Sep 2026, 5:30 PM. Undo" (short undo window).
- **Errors say what happened and what to do.** "Could not reach Outlook. Your draft is saved here. Try again in a minute."
- **Fictional data only.** Suppliers from the approved list, like MetroPack Industrial Supplies Inc. Seat names stay placeholders.
- **Never pretend to be ADI.** Emails end with "Unofficial prototype · Fictional data".
- **Risk: second-language readers.** Short lines, common words, one idea per line. If a label does not fit, cut words, never shrink text.
