# Design Council review: design lab (tokens, diorama, floor plan, panel)

Date: 27 Sep 2026. Phase 2, worktree `p2-design-lab`. Review only, nothing was changed.

Scope: `/lab` (tokens and UI pieces), `/lab/diorama` (3D study, look A), `/lab/floorplan` (Central Bridge, D-037), `/lab/panel` (HQ panel docked next to the diorama). Code in `apps/web/src/theme/`, `ui/`, `ui/panel/`, `scene/`, `lab/`.

Evidence: `docs/qa/shots/2026-09-27/` (23 screenshots, all passing with no console errors). Known facts: 60 fps on an M4 Pro, but about 221 draw calls for 4 helpers (budget 150 for the whole office). The office page `/` is still the Phase 1 placeholder floor.

## Verdict (creative-director)

The Lab found the right direction: cozy, credible and on brand. It is not ready to scale to 26 seats until the keyboard flow, the layout shifts and the draw calls are fixed.

## Scorecard (rounded average of 7 reviews)

| Clarity | Brand fit | Charm | Craft | Smoothness | Realism (SME) |
|---|---|---|---|---|---|
| 4 | 4 | 4 (3.7) | 3 (3.3) | 3 (3.3) | 4 |

## Must fix

1. **After a decision, keep keyboard focus in the panel.** After A, H, S or Decide, focus moves to the next card. After Undo, it moves to the restored card. On Enter, it moves to the detail title. Focus the first card on load. Today the second key press does nothing. Owner r3f-engineer, M. Files: `ui/panel/Panel.tsx`, `NeedsYouTab.tsx`.
2. **Accessibility floor.**
   - The instruction placeholder uses `text-ink-muted`. Today it is 3.3:1.
   - Targets are at least 24 px: the "about" chip close button and the detail back and next buttons.
   - `scroll-padding-bottom` is at least the height of the sticky decision bar, about 145 px (WCAG 2.4.11).
   - Floor plan route markers: a white circle, a track-color ring and a navy number. Today it is white on gold, 3.51:1.
   Owner r3f-engineer, S. Files: `InstructionBox.tsx`, `ItemDetail.tsx`, `Panel.tsx`, `lab/floorplan/PlanDrawing.tsx`.
3. **No layout shift and no camera jump.** The undo bar floats over the list and slides up 8 px with a 220 ms fade. The camera offset eases over 360 ms when the panel docks. The camera refits only when the panel space changes, so a resize keeps the user's pan. Owner motion-designer, S+M. Files: `UndoBar.tsx`, `Panel.tsx`, `lab/diorama/DioramaCamera.tsx`.
4. **Name tags that tell the truth.** Lift tags 0.35 m and nudge them apart when they collide. At overview, show only the dot and the name. Show real status in the sample, including one amber "waiting on you" helper. Owner world-artist, S. Files: `scene/tags/TagLayer.tsx`, `ui/NameTag.tsx`.
5. **Copy trust pass.**
   - "Waiting on CM 02" becomes "Waiting for a CM decision". It must not point at a person.
   - "26 on the team" becomes "26 helpers".
   - "16.9 M" becomes "16.9 m".
   - The q-0003 body says "5 percent or more" (D-013).
   Owner ux-writer, S.

## Should fix

- **Draw calls.** Use one shared rounded box, draw body parts as instances, and let only the torso and head cast shadows. The whole overview stays under 150. L. When to do it is Decision 3.
- **"Send back to Ops 03 helper" wraps.** Keep the full label (D-028) and fix the layout: Approve and Hold in row 1, then Send back at 3fr and Instruct at 2fr in row 2. Under 1000 px tall, use one row of 4. The detail view puts the summary above the facts. S.
- **Instruction composer.** One line until it gets focus. The button reads "Send", with the tooltip "Pick who gets it first." S.
- **Floor plan walkways.** Straight, flat #F2F4F7 lanes under the labels. Routes stay on the lanes (route 1 cuts through Contract Corner). Split markers 2 and 3. M.
- **Decided card motion.** The card fades and collapses in 220 ms. The detail content fades in 60 ms later. Presses use `spring.pop`. M.
- **Offline state.** Pause decisions while offline and say "Reconnecting. What you see is from {time}." M.
- **Night look.** Add a #8FB8DD rim glow and warm up the mauve back walls. S.
- **Helper variety.** More top colors and hair shapes. Today 3 of 4 tops are light blue. S.
- **Hex values outside the theme.** `Planks.tsx` has "#FFFFFF" and `materials.ts` has "#000000". Move both to tokens. S.
- **Small copy fixes.**
  - Team headings: "Leads · 4 helpers", "Category Managers · 11 helpers", "Ops Buyers · 10 helpers".
  - "Open details (Enter)" becomes "Open item" with the key hint.
  - "Needs You tray" becomes "Needs you tray".
  S.

## Could fix

- On Approve, the sending helper nods and lifts its chest (pop spring, 360 ms).
- A rounded plant to match the helpers, and chair contact shadows.
- J and K scroll the card into view. Esc from the text box returns to the last card.
- Align the breathing duration in the skill text (4 s vs 2.4 s). Add a board task: "Route Luzon 6 percent increase to CM".

## Settled, not reopened

- No off switch for letter keys (D-039). They only work while the panel has focus.
- "Send back to {seat} helper" wording (D-028).
- Hold leaves the list (D-040). The Board shows Waiting first (D-041).

## Decisions for Lawrence

1. **HUD tiles.** A (recommended): "Needs you", "Drafts to review", "Waiting on others", and add "Handoffs today" once the data exists. B: the deck labels now, with sample numbers. C: keep the current labels.
2. **Sample item q-0001** (a routine supplier follow-up, which is the Ops Buyer's call). A (recommended): reframe it as a real escalation to the Sr. Manager. B: move it to Team items with ops-03 as the approver. C: keep it.
3. **When to fix draw calls.** A (recommended): at the start of Phase 4, with the budget as a gate. B: now, in Phase 2. C: Phase 8 polish (not advised).

## Member reviews (short)

**creative-director.** Clarity 4, Brand 4, Charm 4, Craft 3, Smoothness 3.
- Sings: the night diorama, the four decisions as one block, and the Team tab line "the helpers' work, not the people".
- Off: every tag shows green, the faceted plant does not match the helpers, and the composer crowds the queue.

**ux-architect.** Clarity 4, Brand 4, Charm 3, Craft 3, Smoothness 3.
- Focus is lost after a decision, and the first card is not focused on load.
- Targets are under 24 px, and the scroll padding is shorter than the sticky bar.
- The detail view is tight at 900 px. J/K do not scroll. There is no offline state.

**brand-guardian.** Pass with fixes. Clarity 4, Brand 4, Charm 4, Craft 4, Smoothness 3.
- Contrast: the placeholder is 3.3:1, and white on the gold and teal route markers is too low.
- "16.9 M" reads as mega. Walkways cover the zone sub-labels.
- Two hex values sit outside the theme. All approved exceptions are used correctly.

**world-artist.** Clarity 4, Brand 4, Charm 4, Craft 3, Smoothness 3.
- Draw calls must drop for 26 helpers. The night rim needs a light blue edge.
- Tags sit on faces. Tops and heads look alike.
- The night walls go mauve. The floor plan walkways look like clouds.

**motion-designer.** Clarity 4, Brand 4, Charm 3, Craft 3, Smoothness 4.
- The camera jumps when the panel docks. The undo bar causes a layout shift.
- The panel has no transitions yet. Typing may flicker at overview.
- Signature idea: the helper nods on Approve.

**ux-writer.** Clarity 4, Brand 4, Charm 4, Craft 3, Smoothness 4.
- "16.9 M". The HUD labels drift from the deck. There are two verbs on one control.
- Team headings use zone names. The offline tip is missing its time.

**procurement-sme.** Realism 4, Clarity 4, Brand 4, Charm 4, Craft 4, Smoothness 3.
- The authority wording passes. The q-0003 body says "over 5 percent".
- "Waiting on CM 02" and "26 on the team" read like statements about people.
- q-0001 is the Ops Buyer's call.

## Lawrence's answers (27 Sep 2026)

1. HUD tiles: A, "Needs you", "Drafts to review", "Waiting on others" (D-042).
2. Sample q-0001: A, reframe as a real escalation (D-043).
3. Draw calls: A, start of Phase 4 with the budget as a gate (D-044).
