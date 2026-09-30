# Design Council review: characters and movement (P4.4)

Date: 29 Sep 2026. Branch: `worktree-p4-team` after P4.3. Evidence: `pnpm shots` of 29 Sep 2026 (`office-overview`, `office-cm`, `office-ops-night`, `office-waiting`, `office-merienda`, `office-sap-trip`, `office-selected`, `office-walk`, `office-walk-night`, `diorama-a-day`). The HQ panel lives in `worktree-p5-panel`, so the floating Go to card still shows here, as expected.

Note on evidence: three shots (`office-waiting`, `office-merienda`, `office-selected`) came out blank in the long 61 shot run, because the GPU-less cloud machine lost its 3D drawing context (WebGL) late in the run. Rerun alone, all of them render correctly. Not an app bug, but the shots must fail when the canvas is blank (Must 5).

## Verdict
The helpers feel alive when zoomed in, but tags and markers still collide, one status risks reading as a real person's status, and poses snap, so it isn't ready to merge.

## Scorecard
| | Clarity | Brand fit | Charm | Craft | Smoothness | Realism |
|---|---|---|---|---|---|---|
| world-artist | 2 | 4 | 3 | 2 | 3 | |
| motion-designer | 3 | 4 | 4 | 3 | 3 | |
| ux-architect | 3 | 4 | 4 | 2 | 4 | |
| brand-guardian | 3 | 4 | 4 | 3 | 4 | |
| procurement-sme | 3 | 4 | 4 | 2 | 4 | 4 |
| **Council** (after the blank frames were explained) | **3** | **4** | **4** | **3** | **3** | **4** |

## Must fix
1. Helper status never reads as a person's status: "On break" becomes "Recharging". Off duty keeps the helper in its chair with a dimmed screen and a "Paused" pill, not an empty chair. (procurement-sme with ux-writer, M)
2. No overlaps: "You" and the Talk hint get reserved boxes that tags keep clear of. Tags sit 0.2 m above the head top and never overlap each other. A 0.9 m accent floor ring at 60 percent under the avatar. (r3f-engineer with world-artist, M)
3. One Esc order before the merge: dialog, then panel detail, then walk, then selection. SeatPicker gets a focus check. (ux-architect, S)
4. Poses glide instead of snapping: each joint eases toward its target over about 140 ms, and standing up or sitting down uses the move easing. (motion-designer, M)
5. Screenshots fail when the canvas is blank, and the set is taken in shorter runs. (qa-playtester, S)

## Should fix
- Night: a small glow lift on characters, and a white "You" pill with navy text (the navy pill is 1.1:1 on the navy scene).
- "!" bubble: 0.28 m, white outline, one spring on appear, then calm. Only the oldest waiting helper waves.
- Desk trips every 45 to 90 s, at most 3 helpers per landmark. On arrival, finish the stride with feet together.
- Walk mode: focus moves to the canvas on entry, and a screen reader line "Near CM 02 helper. Press E to talk."
- The SAP trip shot frames the SAP Station.
- Selection ring opacity 0.9.

## Could fix
- A chunkier walk, and props on trips (folder, envelope).
- CM and Ops helpers meet at the Bridge.
- On approve, the hand lowers and the helper nods (Phase 6).
- Shorter help line: "Move with WASD, arrows or a click. E to talk. Esc to leave."
- A G hint in the Go to card.
- Rejected: shadow-float on small pills (UI chrome stays flat).

## Decisions for Lawrence
1. What the Overview shows. A: small chips (badge and dot), full tags only for waiting, selected or hovered helpers, amber border on waiting (recommended). B: only waiting and selected tags. C: all 26 full tags.
2. What the amber "!" means. A: only "waiting on you", other waits get a hollow bubble and "Waiting for a CM decision" (recommended). B: one bubble for every wait with a line saying who decides. C: keep as is.
3. Standing height. A: about 1.65 m, shown side by side (recommended). B: 1.55 m. C: 1.75 m.

## Member reviews (short)
- **world-artist:** standing helpers look like stilts, shorten to about 1.55 m. Avatar lost in walk mode, add a floor ring and raise "You". Night characters vanish. Bigger "!" bubble. Tags cover heads.
- **motion-designer:** the walk body is good (stride from distance, bob at mid step, frame-rate independent follow camera). Poses snap between activities, the bubble pops in one frame, all waiting helpers wave in sync, stand and sit are linear, strides freeze on arrival.
- **ux-architect:** Esc is handled twice, define one order before the merge. "You" and Talk hint must be boxes tags avoid. Screen reader line for Talk. Focus the canvas on walk entry. Waiting helpers do not stand out at the Overview.
- **brand-guardian:** pass with fixes. No logo, no stray colors, badges follow track rules. Two-line tags overlap, "You" and Talk overlap tags, navy "You" pill fails at night, ring too faint.
- **procurement-sme:** trips follow the real workflows, a CM or Ops Buyer would recognize them. Authority: the amber "!" implies the Sr. Manager approves every PR. Privacy: "On break" and an empty chair read as the real person's status. Desk loop looks like pacing.
- **creative-director (first look):** zoomed-in views are the best yet. The Overview is a wall of 26 pills that hides the diorama.
