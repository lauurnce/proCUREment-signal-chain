# Design Council review: office world, 27 Sep 2026

Scope: the Phase 3 office at `/`. It covers the floor plan (variant 1a), walls, desks, zone rugs, the landmarks and the live props, day and night lighting, camera views and keys, zone labels, and the Go to and Light card.
Evidence: `docs/qa/shots/2026-09-27/office-*` (the overview and the 3 presets, day and night, at 1440 x 900 and 1920 x 1080) and `live-edit-compare.png`. Measured: 120 fps at the overview on an M4 Pro, 15 draw calls, 13.5k triangles.
Not in scope yet: the helpers (Phase 4) and the HQ panel (Phase 5).

## Verdict (creative-director)

The plan is right and the build runs very fast. What's missing is a hero the eye goes to first, names you can see at overview, and page controls that stop fighting the scene.

## Scorecard

| Member | Clarity | Brand | Charm | Craft | Smooth |
|---|---|---|---|---|---|
| Creative director | 3 | 4 | 3 | 3 | 5 |
| UX architect | 2 | 4 | 4 | 3 | 4 |
| Brand guardian | 4 | 4 | 4 | 3 | - |
| World artist | 3 | 4 | 3 | 3 | - |
| Motion designer | 4 | 4 | 3 | 4 | 4 |
| UX writer | 3 | 4 | 4 | 3 | - |
| Procurement SME | Realism 4 | | | | |
| **Final** | **3** | **4** | **3** | **3** | **4** |

Smoothness is 4 and not 5 because interrupting one camera view with another starts again from zero speed, which causes a small hitch.

## Must fix

1. **Make the Bridge the hero.**
   - Counter 3.0 x 1.05 x 0.7 m.
   - Two 0.9 m posts at each end, with a 0.08 m navy beam at 2.2 m.
   - The rug becomes a 0.04 m plinth in #0067B9 with #8FB8DD edges, 1.4 m wide, inside the rect [12.5, 7, 3, 4].
   - The label is always on.
   - One name everywhere: "Endorsement Bridge" (not "Handoff bridge").
   - Owner: world-artist, then r3f-engineer. Effort: M.
2. **Show labels at overview.**
   - Compact labels for CM WING, OPS WING, ENDORSEMENT BRIDGE and SR. MANAGER'S OFFICE.
   - Keep every label 16 px inside the screen edges. Hide any label that would be cut or would sit under the card.
   - Owner: r3f-engineer, with ux-architect. Effort: M.
3. **Frame the scene around the page controls.**
   - Pass the Go to card to `fitRects` as right and bottom insets, plus top and bottom insets for the title and footer.
   - The truck and the apron must be visible at overview.
   - Owner: r3f-engineer. Effort: S.
4. **Copy trust pass.**
   - Title and "Unofficial prototype · Fictional data" on a backing pill: #F2F4F7, 1 px hairline, radius 999, padding 4 x 10. Navy #12284C at night.
   - Fix the false tooltip in `apps/web/src/ui/panel/OfficeTab.tsx:51`. New text: "Camera views come with the panel in Phase 5."
   - Owner: ux-writer and r3f-engineer. Effort: S.
5. **Write the privacy rule into DESIGN_DIRECTION.** The dashboard wall and the review board show work items only. Never per-seat counts, speed or rankings. Owner: creative-director. Effort: S.

## Should fix

- **Night lift.**
  - Hemisphere 0.9 to 1.25.
  - Screen glow 0.45 to 0.8.
  - Window light patches on the floor in #FFE2A8 at 12 percent.
  - A faint lighter slab edge. This answers the open night question.
- **Lower glass fronts.** The Negotiation Room and Contract Corner fronts at 1.0 m.
- **Logistics canopy.** #F5F2EC with 0.04 m navy trim, not a black bar.
- **Props.** Rounder plants in 2 or 3 tiers. Every chair faces its own desk.
- **Camera views.**
  - Ignore key repeat, and requests for the view the camera is already moving to.
  - When a new view interrupts, continue with the enter easing.
  - The reduced-motion fade cancels when the user starts dragging (controlstart).
  - Buttons press to 0.97 in 80 ms and hover in 140 ms.
- **Two-way Bridge.** Tray sides labelled "Endorsed to Ops" and "Back to CM". Add a "From A/P" pigeonhole at the Mail Dock.
- **Warnings and labels.**
  - Accessory warning copy: "Accessory acc-x has no position (pos), so it is not shown. Add pos in office/accessories.json."
  - Nudge the Sr. Manager's Office and Huddle Room label anchors.

## Could fix

- Lamps light one by one at night: 90 ms apart, 220 ms each. With reduced motion, all together.
- Camera duration scales with distance, 560 to 900 ms.
- 2 plants and a bench between the Bridge and the Mail Dock.
- Warmer back walls #F3EBDD. This is a palette change and needs approval.
- A "?" keys sheet.
- A screen reader line: "Now showing CM Wing."
- The Logistics counter means "Delivery follow-up".
- The SAP Station bio says both tracks use it.
- One visitor chair at Contract Corner.
- Carry into Phase 4: helpers get blob shadows. Never redraw the contact shadows every frame.

## Decisions for Lawrence

1. **Selected button color.**
   - (a) Accent for both Go to and Light (recommended)
   - (b) Navy for toggles, accent for navigation
   - (c) Leave as is
2. **Country flags on desks.**
   - (a) Remove them (recommended)
   - (b) One flag per wing
   - (c) Keep them on desks
3. **Bridge view.**
   - (a) Add key 5 "Endorsement Bridge" (recommended)
   - (b) Keep 4 views and remove it from the copy deck
   - (c) Decide in Phase 5

## Lawrence's decisions and what was applied

- **Decisions:** accent for every selected button (D-057), desk flags removed (D-058), a bridge view on key 5 (D-059).
- **Must fixes 1 to 5:** all applied (D-060, D-061, the OfficeTab tooltip, and the privacy rule in DESIGN_DIRECTION).
- **Should fixes picked:**
  - Night lift (D-062).
  - Lower Negotiation Room glass (D-062).
  - Logistics canopy in off-white with a navy trim.
  - Rounder plants in tiers.
  - Camera: interrupts take over with the enter easing, a repeat request for the same view is ignored, and a drag cancels the reduced-motion fade.
  - Buttons: press 0.97 in 80 ms, hover 140 ms.
  - Warning copy that says what to do.
  - Label anchors moved off the glass and the chairs.
- **Checked, no change:** every chair already faces its own desk. The pod chairs look mixed from the camera because the two rows face each other.
- **Not picked this round:** the two-way bridge tray and the A/P pigeonhole, and every Could item. They stay on this list for later.

## Member reviews (short)

**Creative director (first impression).** A clean, credible floor, but without helpers it reads as an empty architect's model.
- The hero Bridge has the same weight as Reception.
- No labels at overview, so the 3-second test fails.
- Chrome collisions: the title sits on the wall in the Ops view, the card covers desks and clips labels.
- Props show low craft, with bare floor between zones.
- At night the floor goes very dark.

**UX architect.** Clarity 2.
- Must: overview labels, a Bridge hero, and card insets in `fitRects`.
- Should: keep labels inside the free area, and a pill or insets for the header and footer.
- Could: a keys help sheet.

**Brand guardian.** Pass with fixes.
- Must: a backing pill for the title and the About note.
- Should: keep labels 16 px inside the edges, one selected style (accent), and room for the card at overview.
- Could: the sign is too small at overview.
- Passes: gold and teal at 0.2 m or less, truck with no logo, tokens only, no em dashes, card radius and shadow.

**World artist.**
- Must: the Bridge hero (exact values above), the card covers the truck, and the pennants look like stray sticks (pole 1.1 m, flag 0.36 x 0.26).
- Should: night lift, the logistics canopy, and 1.0 m front glass.
- Could: floor density, warmer back walls.

**Motion designer.** The camera and the blend are careful.
- Should: no restart from zero speed on an interrupt, press and hover feedback, and cancel the reduced-motion timer on drag.
- Could: duration by distance, eased title color.
- Phase 4: blob shadows for the helpers.
- Signature idea: lamps turn on one by one.

**UX writer.**
- Must: the pill behind the title and the footer, and the false OfficeTab tooltip.
- Should: overview labels, the Bridge preset versus the copy deck, and warnings that say what to do.
- Could: layout warning wording, "Light" versus "Time of day", "Now showing CM Wing."

**Procurement SME.** Realism 4.
- Should: one name for the Bridge, a two-way tray (amendments of 5 percent or more, or 2K or more, go back to the CM), and A/P at the Mail Dock.
- Could: the dock means delivery follow-up, SAP serves both tracks, one visitor chair.
- Privacy passes. Must: write the work-items-only rule for the dashboard and the board. Should: desk flags tie a country to a seat.
