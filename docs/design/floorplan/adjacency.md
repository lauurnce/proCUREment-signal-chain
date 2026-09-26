# Floor plan adjacency, round 1

Author: procurement-sme. Status: draft for P2.4, 26 Sep 2026. Fictional data only. Zone ids come from `vault.sample/office/zones.json`, workflows from `data/workflows.json`.

## 1. Walks per workflow

Frequency means how often one helper walks this route in a normal simulated day. Low: 0 to 1 time. Medium: 2 to 4 times. High: 5 or more. The cap of 6 helpers walking at once still applies.

| Workflow | Zone sequence | Frequency | Why |
|---|---|---|---|
| CM 1. PR stock item approval | SAP Station, own desk, Endorsement Bridge | Medium | CMs extract and endorse in batches, usually one morning run and sometimes one after lunch. Not per PR. |
| CM 2. Contract generation in Conga | own desk, Contract Corner, Negotiation Room, Contract Corner | Low | A few contracts a week per CM. Each one takes days, mostly waiting on the requestor and vendor. |
| CM 3. RFQ process | own desk (3 steps), Negotiation Room | Low to medium | Most RFQ work is desk work: spec, shortlist, quote table. Only the negotiate and award step leaves the desk. |
| Ops 6. PR to PO (stock item) | Endorsement Bridge, SAP Station, own desk, SAP Station, Mail Dock | High | The main Ops volume. Every endorsed batch goes through it. The SAP Station is visited twice. |
| Ops 5. eRFQ to PO | own desk, SAP Station | Medium | Steady but smaller than stock items. Two SAP steps back to back, so one trip. |
| Ops 4. PO amendments | Mail Dock, own desk, then one of: SAP Station, CM Wing, or "To Planner" tray | Medium to high | A/P mismatches and vendor requests arrive all day. The route after the rule check shows the authority rule in action. |

Two side routes a real team would expect:
- A returned folder: a mismatch from Ops step "countercheck" goes back across the bridge to the CM desk. Low to medium.
- An amendment over the limit: an Ops helper walks to the CM Wing with a note. The CM decides. Ops never approves it.

## 2. Adjacency list

Must be close
- CM Wing and Endorsement Bridge and Ops Wing, in one line. The bridge sits between the wings. This is the hero seam.
- Ops Wing and SAP Station. Ops visits it most, up to 3 times per item.
- Ops Wing and Mail Dock. Acknowledgments and A/P emails, all day.
- SAP Station reachable from the bridge without crossing a room. CMs use it once or twice a day, so it can lean toward the Ops side.

Should be close
- CM Wing and Contract Corner.
- Contract Corner and Negotiation Room. SOW drafts go back and forth between them.
- CM Wing and Negotiation Room.
- "To Planner" tray at the Ops end of the Mail Dock. The Planner has no seat.
- Leads' Row and Huddle Room. Leads unblock items there.
- Sr. Manager's Office and Leads' Row.

Nice to have
- Reception and Negotiation Room, so a visiting supplier does not walk past desks.
- Mail Dock and Logistics Window. Delivery news and PO acknowledgments are the same story.
- Merienda Corner and Huddle Room. Breaks and sessions share the social side.

Should be apart
- Negotiation Room away from the Ops pods. Supplier calls are loud and commercial terms are confidential.
- Supplier visitor path (Reception to Negotiation Room) away from CM desks. Quote tables and prices sit on screens.
- Merienda Corner away from focus desks, and not on the bridge path. Folders should not cross the pantry.
- Logistics Window away from the CM Wing. Truck noise belongs on the Ops side.
- Contract Corner away from the Mail Dock. The busiest walkway should not cross a quiet station.

## 3. Leads and the Sr. Manager

Leads. A real Lead sits with or next to the group they guide, not in a separate management row. A realistic split for 26 seats: 2 Leads for the CM Wing (about 5 or 6 CMs each) and 2 for the Ops Wing (5 each). Place the Leads' Row as a short spine along the bridge axis, with lead-01 and lead-02 at the CM end and lead-03 and lead-04 at the Ops end. Keep it flat, same desks, no raised platform. The split stays a placeholder until `/define-role`, because some Leads may cover a category or a site instead of a wing.

Sr. Manager. She needs to see the flow, not the people:
- the Endorsement Bridge and its "Handoffs today" count
- the Needs You tray on her desk
- the Mail Dock and "To Planner" tray, where waiting items pile up
- a quick walk to the Leads' Row and Huddle Room

Her window should face the bridge, not look down over the desk pods. A glass box above the desks reads as a watch tower. That breaks our trust rule.

## 4. What would look fake to a real CM or Ops Buyer

- Helpers walking all the time. Real buyers sit most of the day. Most steps happen at the own desk, trips are short and few.
- The SAP Station as a queue. Everyone has SAP on their own laptop. Keep the station as a clear metaphor, labeled "simulated", and use it only for batch steps (extract, ME57 load, convert, amend).
- Ops receiving goods at the Logistics Window. Receiving is done by the warehouse. Ops only sees the delivery status. Keep it a view, not a workstation.
- Ops paying invoices. A/P pays. A/P emails arrive at the Mail Dock. A/P has no seat here.
- A big boardroom used every day. Most negotiations are Teams calls. A small room with a round table and a speakerphone is truer.
- Wet ink stamps in Contract Corner. Signing runs in DocuSign. Use a screen and a tray, not a stamp.
- Ops helpers walking into the Negotiation Room. Ops does not negotiate terms.
- Quantity changes decided inside the team. They always go to the "To Planner" tray.
- Every desk the same size in a grid. Pods of 4, 4, 3 and 4, 4, 2 with small personal props look like a real floor.
- All 26 seats in one Manila room is fine for the game. Do not mark which seats are in the Philippines or Thailand, or who is in the office. That drifts into "who is online".
