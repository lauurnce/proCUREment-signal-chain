# Design direction

Status: direction chosen 26 Sep 2026 (A with B's rules, D-025). All 6 open decisions are decided (D-026 to D-031). It combines the 7 council points of view in `docs/design/pov/`. Lawrence approved the choices, and they are logged in `docs/DECISIONS.md`.

## 1. North star

A calm command center you want to visit: in 3 seconds, the Sr. Manager sees what her team's helpers are doing and what needs her now.

## 2. Five principles

1. **Clarity first.** The world sets the mood, and the panel carries the decisions. Every fact in 3D is also in the panel.
2. **Cute but credible.** Charm comes from shape, motion and small details. The chrome stays flat navy, white and accent blue, so she can show it to her director.
3. **Real work, not a generic office.** Zones, props and card lines come from the six real workflows. Each card names the workflow, the step, the supplier and who decides.
4. **Motion explains.** Every movement shows a cause and its effect: a decision, a handoff or an email leaving. The camera moves only when the user moves it.
5. **Helpers do, people decide.** The office shows AI helpers only. A human click comes before any commitment, and emails start as drafts.

## 3. Mood

A small, sunlit Manila office in the late afternoon. Oak floors, off-white walls, navy trim, plants, and a pantry that smells of merienda. Helpers work at a quiet, steady pace. Nothing flashes and nothing shouts. When the Needs You tray is empty, the office relaxes. At night the scene turns navy with warm windows and a glowing dashboard wall in her office. It should feel like a place you are glad to check on, not a place that checks on you.

## 4. Style directions

### A. Warm Diorama
- **Picture:** The office floats as a thick oak diorama with a navy slab edge and fills most of the screen. A slim panel sits over the right side. Chunky, big-headed helpers walk between zones in soft window light with gentle shadows. Folders cross the Endorsement Bridge, envelopes leave the Mail Dock, and a truck backs up to the Logistics Window.
- **Borrows most from:** ref 01, 03 and 05 (diorama, chunky characters), ref 11 (window light, prop density).
- **Pros:** most charm and most memorable in a demo. The handoff story reads without words.
- **Cons:** biggest build (pathfinding, props, day light cycle). Highest performance risk: shadows plus up to 26 characters. It could look like a toy if the props get busy.
- **Serves best:** the demo and the director moment, and team members who are still unsure about AI.

### B. Quiet Command Center
- **Picture:** A docked panel takes about 40 percent of the screen, and a big stats bar runs along the top. The world is a clean architectural model: matte white and panel-grey furniture, navy walls, no floor texture, and very soft light. Helpers mostly stay at their desks, and status shows as small desk lamps and raised hands. It leans toward the navy "Procurement360" feel, with night as the hero mode.
- **Borrows most from:** ref 12 (navy walls, zoned rooms), ref 02, 04 and 08 (panel, stats, detail).
- **Pros:** most credible and fastest to decide in. Lightest to build and render, and the easiest way to hit 60 fps on an average laptop.
- **Cons:** least cozy. It can feel like one more dashboard, and people may not come back for fun.
- **Serves best:** the daily decision run for a busy Sr. Manager.

### C. Paper Office
- **Picture:** An isometric illustration that comes alive. Flat, unlit colors with thin navy outlines and no real-time shadows, only baked shadow shapes on the floor. Helpers are flat-shaded, chunky figures. The panel is docked at about 30 percent. Motion is crisp and short, with paper that slides, stamps and folds.
- **Borrows most from:** ref 11 and 12 (clean flat shading, clear rooms), in our palette.
- **Pros:** sharp, and screenshots look illustrated. Cheap lighting, and very clear shapes at small sizes.
- **Cons:** outlines need a post effect or doubled geometry. The flat look sits closest to stock illustration, and night mode is weaker without real light.
- **Serves best:** screenshots, slides and program materials.

### Recommendation: A, with B's discipline

Build Warm Diorama as the world, and take three rules from B:
- a docked panel instead of a floating one, so the camera frames the office in the free space
- a strict tag budget
- a limit on how many helpers walk at once

A is the only direction that makes the real CM to Ops handoff something you can see and feel. That story is our difference (principle 3). B's rules protect clarity and credibility (principles 1 and 2). C is a good look, but it risks looking like the stock references we must not copy. The Lab should show all three side by side, so Lawrence can judge them on screen.

## 5. What stays true in every direction

- **The Endorsement Bridge is the hero.** A CM helper drops a folder with a gold diamond tab, and an Ops helper picks it up. "Handoffs today" goes up at the same moment. A mismatch goes back across the bridge with a note.
- **The decision loop.** Needs you works like a calm inbox. The four decisions are Approve, Hold, Send back and Instruct. A decision gets a visible follow-through in the panel and in the world. A 5 second undo covers normal decisions only, and email sends never get undo.
- **Cards speak the work.** Each card shows the workflow step ("PO amendments · Step 3 of 4"), the supplier, the PR or PO number, and "Why this came to you". When the authority rule applies, it adds a "Rule not confirmed yet" chip.
- **Honest states.** Empty states name what was checked. Loading uses skeletons. When the server is offline, a banner appears and the last view stays.
- **Brand discipline.** Deck DNA: an accent bar under titles, panel-grey cards, sentence case, and "21 Sep 2026" dates. No logo, wordmark or tagline. No triangle inside a square. "Unofficial prototype · Fictional data" appears in the About area and in email footers.
- **Status is never color alone.** Status and track always pair color with a shape, icon or text.
- **Few words in the world.** Facts live in the panel.
- **Privacy.** The app shows helpers only. It shows no "online" status, no idle state, no per-person counts or rankings, and none of the ref 10 HR use case. Words like "monitoring" and "tracking" are never used about people.
- **Drafts first.** The main email action is "Save draft in Outlook". Sending is a second step that lists every recipient. A draft with a placeholder cannot be sent.
- **Performance and access.** The scene runs at 60 fps, with under 150 draw calls and under 250k triangles. Text meets WCAG 2.2 AA contrast, focus rings are visible, and every animation has a reduced-motion version.

### Where members disagreed, and my call
- **Buttons on every card (ref 09).** The UX architect wants all four buttons only on the focused card. I suggested Approve as the main button on every card. **Call: the UX architect's version.** The focused card shows all four, and the other cards show one "Decide" entry. Principle 1.
- **Link to the file.** One member suggested "Open in Obsidian", another "Open the file". **Call: "Open the file"**, with Obsidian named in a tooltip. Plain words win.
- **Floating or docked panel.** The brand spec allows a floating panel with a shadow. The UX architect wants it docked. **Call: docked**, with `shadow-float` kept only for small overlays like the stats bar and toasts. Principle 1.
- **Instruction button.** Options were "Send to helper" or a button that names its audience. **Call: name the audience**, for example "Send to CM Wing (11 helpers)", with a "To" field.

## 6. Open decisions for Lawrence

1. **Approve green.** White text on #1E8E5A is 4.14:1 and fails for button text. Options: **(a) use #1A7F50 (about 5.0:1) for the button and the "working" dot, recommended**, (b) change the button only, (c) keep #1E8E5A with larger text.
2. **The Sr. Manager and seat-level items.** Options: **(a) by default her Needs you shows her own items, and a "Team items (demo)" filter lets her decide others with a "Deciding as CM 03 (demo)" label, recommended**, (b) always show everything with the label, (c) show her own items only. This matches how the real authority rule works (procurement-sme).
3. **Helper naming and wording.** Options: **(a) "CM 03 helper", plus an optional job nickname from `/define-role` like "Quote Table", and "Send back to CM 03 helper", recommended**, (b) job name first, "Quote Table (CM 03)", (c) object names like "Ledger". The UX architect wrote "CM 03's helper". I chose the form without "'s", which is shorter and easier to scan.
4. **World details.** Should the floor slab have a navy #12284C edge, and should Merienda Corner have a capiz-style pendant lamp? **Recommended: yes to both.** The edge frames the diorama in the deck palette. The lamp is a small local touch built as original geometry. Option (b): an oak edge and a plain lamp.
5. **New motion values.** Proposed:
   - at most 6 helpers walking at once
   - 5 s undo
   - 60 ms content fade after a card opens
   - 600 ms folder slide across the bridge
   - buttons scale to 0.97 in 80 ms when pressed

   **Recommended: accept all** and add them to the brand guide (adi-theme skill). Option (b): try them in the Lab first.
6. **Keyboard conflict.** W A S D walk, and A H S I decide. Options: **(a) scope keys by mode, recommended.** Walk keys work only in walk mode, decision keys and J/K only when the panel has focus, and no shortcut fires while typing. (b) Move the decisions to Shift plus a letter. (c) Walk with the arrow keys only.
