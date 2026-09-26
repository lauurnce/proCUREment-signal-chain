# Point of view: UX architect

Focus: flows, layout, hierarchy, keyboard, accessibility (WCAG 2.2 AA), states, and how the 3D office and the HQ panel work together.

## 1. Borrow from the references (patterns, not pixels)

- **ref-02, ref-09:** four tabs with a count badge on Needs you. One panel, always in the same place.
- **ref-09:** card anatomy. Tag, date, title, then a "from and context" line. "Send back to Paige" names who gets it back. We keep that: "Send back to CM 03's helper".
- **ref-08:** item detail with a small facts table and the four decisions in one row. We add a real summary in the panel, not just links.
- **ref-06, ref-07:** a person card that expands in place. An honest empty state that names the data source.
- **ref-10:** the "Instruct only" card for items that need guidance, not a yes or no. We borrow the variant only, never the HR use case.
- **ref-04:** big number plus small mono label. Easy to read in 3 seconds.
- **ref-01, ref-11, ref-12:** "Walk around" as one clear entry point. Cutaway walls so the camera never looks through a wall. Clear rooms help you find your way.

## 2. Avoid

- **Label pile-up (ref-01, ref-03).** 9 pills already overlap. With 26 seats it breaks. Show full pills only for helpers waiting on you, hovered, or selected. Others show a small track badge.
- **Four buttons on every card (ref-09).** It is noisy and easy to misclick. Show them on the focused card. Other cards show one clear "Decide" entry.
- **Everything red (ref-09).** If every tag says DECIDE in red, nothing is urgent. Sort by age and due date instead.
- **UPPERCASE mono titles (ref-08)** and ISO dates. Hard to read. Use "21 Sep 2026".
- **An instruction box pinned to every tab (ref-02).** It takes space. Also, "Send to my inbox" does not say where the instruction goes.

## 3. Three ideas

1. **The Decision Tray loop.** Needs you works like a calm inbox. J and K move between items, A, H, S, I decide. After a decision the next item opens by itself, and a toast offers "Undo" for 5 seconds. Each item shows the workflow step ("PR stock item approval, step 2 of 3: Review"), the supplier, the PR or PO number, and one recommendation line. When the authority rule applies, one plain line says who decides and why. At zero you see "All clear" and the office relaxes.
2. **One selection, two views.** The panel is docked on the right at a fixed width. The camera frames its target in the free space on the left, so the panel never hides it. Select a card and the camera glides to that helper's desk. Click a helper and their card opens. Selection always stays in sync both ways. Esc goes back one step.
3. **Instructions with a clear audience.** The Instruct box has a "To" field: one helper, a pod, CM, Ops, or everyone. The button says who: "Send to CM Wing (11 helpers)". Suggested chips come from the step, for example "Ask for a new quote" or "Check the last price".

## 4. Risks and non-negotiables

- **Key clash.** Walking uses W, A, S, D, and deciding uses A and S. Walk keys work only in walk mode. Decision keys work only when the panel has focus. No shortcut fires while typing.
- **Email safety.** Drafts first. Sending needs a second step that lists every recipient. Only normal decisions get Undo.
- **Every state is designed.** Loading shows skeletons, not spinners. Empty says what we checked. If the server is offline, show a banner, keep the last known view, and pause decisions. Counts show 0 and 99+. Long supplier names cut with a tooltip.
- **WCAG 2.2 AA.** Text 4.5:1, UI parts 3:1. Visible 2 px focus ring that is never hidden under the panel (2.4.11). Targets at least 24 px (2.5.8). Camera rotate and zoom have buttons and keys, not only drag (2.5.7). Status is never color alone. With reduced motion, the camera cuts instead of gliding.
- **Helpers, never people.** No "online", no "last active", no counts per person. Every status line says what the helper is doing.
