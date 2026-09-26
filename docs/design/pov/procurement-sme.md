# Point of view: procurement-sme

Role: make the office feel true to how a real CM, Ops Buyer, Lead and Sr. Manager work. Fictional data only.

## 1. Borrow from the references (patterns, not pixels)

- **ref-06, "Working on" rows.** Good shape. Our rows must read like real work: "PO-451203 price differs from INV-88214, Luzon Precision Components Corp." The tag shows the workflow and the step ("PO amendments · Apply the rule"), not a client.
- **ref-08, item detail.** Keep the four decisions. Add three lines a buyer would expect: **Source** (A/P email, vendor email, SAP extract), **Rule** (the authority rule in plain English), and **Decides** (Ops, CM, or Planner).
- **ref-09, Needs You cards.** Keep the DECIDE tag, but say who decides: "DECIDE · CM". A 2 percent freight fix and a supplier award are not the same weight.
- **ref-07, honest empty state.** Name the source: "Nothing waiting. Checked the SAP extract and the Mail Dock at 9:00 AM."
- **ref-04, stats card.** "Handoffs today" is a real, healthy number. Keep all counts at team level.
- **ref-12, zoning.** The round-table room becomes the Negotiation Room. **ref-11** props fit the SAP Station: filing cabinet, printer, a tray of documents.

## 2. Avoid

- **Ops agreeing to commercial terms.** No Ops helper accepts a new price above the limit, a lead time change, or new payment terms. It routes them to the CM.
- **Everything goes to the Sr. Manager.** In real life she does not approve a small PO amendment. Most items belong to a CM or Ops seat.
- **Ops "paying invoices".** A/P pays. Ops fixes the PO when it does not match the invoice.
- **Instant work.** Suppliers take days to acknowledge a PO. Show "waiting on supplier" on the item, with a reply-by date.
- **Quantity changes decided inside the team.** They go to the Planner. The Planner has no seat. Show an outbox tray labeled "To Planner".
- **Real names.** No real supplier brands, part numbers, ADI sites or staff.
- **Tool words the team never uses.** "Open in Obsidian" means nothing to a buyer. Say "Open the file".

## 3. Three ideas: premium, cozy, and true

1. **The Endorsement Bridge as a real handoff.** A CM helper walks over with a folder, "PR-PO list, 25 Sep, Pod A". It drops the folder in a tray. An Ops helper picks it up and checks each line against SAP. Lines that match turn into POs. A mismatch goes back across the bridge as a small returned folder with a note. The whole team can see the seam that costs them the most time today.
2. **The authority rule as a friendly signpost.** At every decision, show one small card. For example: "Price up 3.2 percent (PHP 1,450). Under 5 percent and under 2K, so Ops can change it in SAP." Add a "Rule not confirmed yet" chip. Then the helper walks to the right place: the SAP Station, the CM Wing, or the Planner tray. People learn the rule by watching it.
3. **A real day rhythm.** Mornings: SAP extracts and endorsements. Midday: PR to PO at the SAP Station. Afternoons: supplier follow-ups at the Mail Dock, and deliveries at the Logistics Window. The Outlook digest reads like a good Lead's stand-up: "3 POs have no acknowledgment after 2 days (Batangas Metalcraft Industries, MetroPack Industrial Supplies Inc.). Follow-up drafts are ready, reply-by 29 Sep 2026."

## 4. Risks and non-negotiables

- **Helpers only, never people.** Statuses describe helpers. Name pills say "CM 03 helper". No counts, speed, rankings or "overdue" per person. Do not use the words monitoring, tracking, idle, flags, or discipline about people.
- **Right decider, always.** Ops never approves commercial terms. When the player decides a CM item in the demo, the card says "Deciding as CM 03 (demo)". Thresholds and currency stay configurable and marked unconfirmed.
- **Humans decide money and commitment.** PR approval, awards, price changes over the limit, and contracts need a human click.
- **Drafts first.** No placeholder like [Supplier Name] reaches a sent email. Sign with the seat title.
- **Fictional and unofficial.** Use only the four fictional suppliers, `PO-45xxxx` style numbers, and `.example` email domains. Label the SAP Station "simulated". Copilot remains the team's sanctioned AI tool. This is a personal prototype.
