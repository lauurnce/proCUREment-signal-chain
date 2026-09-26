# Floor plan recommendation, 26 Sep 2026

Author: world-artist. Inputs: `docs/design/FLOORPLAN_OPTIONS.md`, the two plan shots in `docs/qa/shots/2026-09-26/`, route lengths from the Lab, and the procurement-sme and ux-architect reviews. All 19 floor plan tests pass for both options.

## 1. Recommendation: Option 1, Central Bridge

Take Option 1 into Phase 3. The walk lengths, both reviewers and the screenshots all agree.

| Route (one walk) | How often | Option 1 | Option 2 |
|---|---|---|---|
| 1. PR stock item approval | Medium | 16.9 m | 31 m |
| 2. Contract generation in Conga | Low | 48 m | 35 m |
| 3. RFQ process | Low to medium | 6.9 m | 13 m |
| 4. PR to PO (stock item) | High | 38.7 m | 58.6 m |
| 5. eRFQ to PO | Medium | 7.4 m | 13.4 m |
| 6. PO amendments | Medium to high | 17.7 m | 26.1 m |
| Total | | 136 m | 177 m |

- **Shorter where it matters.** Option 1 is shorter on every route that people walk often. The busiest route, PR to PO, is 20 m shorter. Option 2 only wins on Conga, and that route is walked a few times a week.
- **It reads at a glance.** In the shot, the bridge is the only dark blue block, right in the middle of the floor. The two wings sit on either side of it. On screen the handoff is one flat line from left to right. In Option 2 the bridge looks like an open square, and the handoff line runs downhill.
- **Both reviewers pick it.** The ux-architect scores Option 1 as 6 pass and 4 partial, and Option 2 as 4 pass, 4 partial and 2 fail. The procurement-sme picks it for the route lengths.
- **One honest caveat.** "Own desk" is measured from each wing's pennant, and in Option 1 the pennants sit at the wing gates next to the bridge. So the numbers flatter Option 1 a little. A walk from the farthest pod adds about 8 m. The gap between the options is 41 m, so the ranking still holds.

## 2. What to borrow from Option 2

- **Her straight view of the bridge.** In Option 2 nothing stands between her desk and the bridge. Option 1 needs fixes 2 and 3 below to get the same view.
- **Contract Corner next to the Negotiation Room.** Option 2 puts them side by side, and that is why it wins on Conga. See fix 1.
- **Pennants that face each other.** Put a gold pennant and a teal pennant at the two wing gates, facing each other across the bridge, so the two wings are easy to tell apart.
- **Optional: the loading dock on the front edge.** In Option 2 the dock is on the front edge, away from the panel. For Option 1, see fix 9.

## 3. Ranked fixes for Phase 3 (Option 1)

| # | Fix | Exact values | From | Effort |
|---|---|---|---|---|
| 1 | Move Contract Corner next to the Negotiation Room, at the front right end of the CM Wing. Use the space on the left wall that Contract Corner leaves to re-lay the CM pods (two rows are fine). | Contract Corner about 3.5 x 3.5 m, touching the west wall of the Negotiation Room. Target: Conga under 30 m. Keep pod pitch at 4.5 m. | SME | M |
| 2 | Keep the bridge's line of sight clear. The Reception and Negotiation Room walls must be low, because both sit on the bridge view line. | Glass or 1.0 m walls. Name sign and round table under 0.9 m. | UX, own | S |
| 3 | Open the Sr. Manager's view of the bridge. Her sight line crosses her own east wall at x 5 and the front left corner of the Huddle Room. | East and front walls of her office: glass. Cut the front left corner of the Huddle Room back by about 1 m (x 5 to 6.5, z 3.5 to 4.5). Her desk faces the bridge. Her office stays flat, with no raised floor. | SME, UX | S |
| 4 | Give the bridge more room. The west side of the ring is only 0.4 m from the bridge. | Shrink the bridge rect to [12.5, 7, 3, 4]. The anchor stays at (14, 9). The ring at x 11.6 is then 0.9 m away. | UX | S |
| 5 | Add the "To Planner" tray at the Ops end of the Mail Dock. | A low tray at about (22.5, 7.6), the corner of the Mail Dock nearest the Ops pods. | SME | S |
| 6 | Show the four Leads as one group pill at Overview. | One pill on the Review board: "Leads · N waiting". Single pills only when zoomed in. | UX | S |
| 7 | Close the dead end at the front of the CM pods. | Link the front aisle of pod C (10.55, 16.3) to the Negotiation Room side of the ring (or to the new Contract Corner, once fix 1 is done). | Own | S |
| 8 | Measure "own desk" from the real seat in the Phase 3 walking model, not from the wing pennant. | Rerun the route table. Nothing is decided on the old numbers. | Own | S |
| 9 | Optional: swap the Logistics Window and the Merienda Corner so the dock opens on the front edge, away from the panel. | Logistics Window [22, 14.5, 6, 3.5], dock at (25, 18). Merienda Corner [22, 11, 6, 3.5]. Check at 1440 x 900 before keeping it. | Borrowed | S |

### Disagreement: split Leads' Row?

The procurement-sme wants lead-03 and lead-04 on the Ops side of the bridge, near the Ops pods. **My call: keep Leads' Row as one row for Phase 3.**

- Each zone has one rectangle in the layout file.
- The group pill in fix 6 needs one place.
- Lead scope is still a placeholder. Some Leads may cover a category or a site, not a wing.

The row already has the CM Leads on the CM end and the Ops Leads on the Ops end. Revisit the split after `/define-role` defines the Leads. If we split then, both halves keep the 3 m clear ring.

## Mood note

It should feel like a warm little town square: you arrive at the front, look up, and the handoff in the middle of the room tells you the story before you read a single label.
