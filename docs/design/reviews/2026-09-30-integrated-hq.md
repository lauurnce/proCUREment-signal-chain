# Design Council review: integrated HQ, office and panel together (P45)

Date: 30 Sep 2026. Branch: `main` at 652007b (Phases 4 and 5 merged and connected). Evidence: `pnpm shots` of 30 Sep 2026, mainly `office-overview`, `office-overview-night`, `office-card`, `office-walk-talk`, `office-walk`, `office-walk-night`, `office-selected`, `office-sap-trip`, `office-merienda`, `panel`, `panel-team`. Frame rate on the GPU-less cloud machine is not meaningful, so Smoothness is judged from code and timing values.

## Verdict
The office and the panel now work as one product. Before it goes to Lawrence, fix walk mode, the overlap layer and the Overview framing so nothing looks broken.

## Scorecard
| | Clarity | Brand fit | Charm | Craft | Smoothness | Realism |
|---|---|---|---|---|---|---|
| creative-director | 3 | 4 | 4 | 3 | 3 | |
| ux-architect | 4 | 4 | 4 | 3 | 4 | |
| brand-guardian | 4 | 4 | 4 | 3 | 4 | |
| world-artist | 3 | 4 | 4 | 3 | 4 | |
| motion-designer | 4 | 4 | 3 | 4 | 3 | |
| ux-writer | 3 | 4 | 4 | 3 | 4 | |
| procurement-sme | 4 | 4 | 4 | 4 | 4 | 3 |
| **Council** | **4** | **4** | **4** | **3** | **4** | **3** |

## Must fix
1. Walk mode shows that it is on and always ends: the pill reads "Stop walking" with an Esc key cap, the accent selected style (D-057) and aria-pressed. Esc in the panel stops walking when nothing else is open. On a narrow screen, E stops walking and focuses the opened row. (r3f-engineer, M)
2. Nothing covers anything: one overlap pass for tags, zone labels, the Talk hint and the help line at every zoom. Hide anchors under the panel, under the HUD, or within 8 px of an edge. "You" on top. The sticky Team header gets a white fill, and scrolling to a row leaves room for it. (r3f-engineer, M)
3. Frame the Overview tighter (80 to 85 percent of the free width, today about 695 of 910 px), and frame Walk around in the free space left of the panel. (world-artist with motion-designer, S)
4. Helpers disappear at night: raise the night sky light, a faint rim, warm floor light under the lamps. (world-artist, M)
5. Truthful data and copy: take cm-02 off the Ops amendments workflow. One shared waiting map for tags and the Team tab, fallback "a team decision". (procurement-sme with ux-writer, S)

## Should fix
- Clicking a helper keeps a half-read decision, with a "Back to decision" link.
- Screen readers hear "CM 02 helper opened in Team". One selected row with aria-current, synced with the office selection. After E, the "To" field holds that helper.
- A fade at the bottom edge instead of the "1 more below" pill over text.
- Camera moves update their target during the move and take 360 to 800 ms by distance.
- Copy: the new help line ("Move with W A S D, the arrow keys, or a click. Press E to talk. Press Esc to stop."), the Team intro, "Recharging at Merienda Corner", "Ready for its CM" for CM 02, the pill tooltip.
- One focus ring on the Needs you card, not two.

## Could fix
- Signature: on E, the helper turns toward you in 220 ms as the row opens.
- A ring under the helper who sent the focused card. A G key cap. The Merienda landmark in its view. The step label "Delivery follow-up". One shadow rule for overlays. Enter easing for the reduced-motion fade.

## Decisions for Lawrence
1. Break statuses next to seat labels. A: breaks are 3D scenery only, Team rows show work and waiting (recommended). B: keep with "Helper is recharging". C: keep as is.
2. The night slab edge. A: fix the helper lighting and add a faint lighter slab edge together (recommended). B: helpers only. C: leave the night.
3. Authority rule thresholds in the step detail. A: not until Lawrence confirms 5 percent, 2K and the currency (recommended). B: show now with "(to confirm)". C: never.

## Member reviews (short)
- creative-director: first time it feels like one product. The layer between office and panel collides at the edges and in close views.
- ux-architect: glance and explore pass. Decide, direct and walk have issues: a click closes an open item, "To" ignores the helper you talked to, no keyboard way out of Walk around from the panel, narrow screen focus on a hidden canvas.
- brand-guardian: pass with fixes. No contrast failures, no logo misuse, no em dashes. The Walk pill gives no sign walk mode is on. "WASD" is jargon.
- world-artist: close views are the high point. The Overview is too small, tags leak past the panel, helpers vanish at night, "You" hides behind tags.
- motion-designer: cross-half motion is sound (no loops, fast interrupts). Walk framing ignores the panel, the entry move can aim at an old spot, every hop is 800 ms.
- ux-writer: warm and safe. The pill label never changes, and waiting lines differ between the tag and the Team tab ("a teammate" sounds like a person).
- procurement-sme: realism 3. CM 02 runs an Ops workflow in the showcase shot. Authority route correct. Break words next to seat labels can read as a log of a person's breaks.
