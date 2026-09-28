# Progress

Now: Phase 4 in `p4-team`. P4.2 done, waiting at the gate. Next: P4.3 movement and Walk around mode.

## Phases
- [x] 0. Kickoff and alignment (main checkout)
- [x] 1. Scaffold and tooling (`p1-scaffold`)
- [x] 2. Design direction in the Lab (`p2-design-lab`)
- [x] 3. The office world (`p3-office`)
- [ ] 4. The team, characters and movement (`p4-team`, parallel with 5)
- [ ] 5. The HQ panel (`p5-panel`, parallel with 4)
- [ ] 6. Live data and Demo Day (`p6-live`)
- [ ] 7. Outlook (`p7-outlook`)
- [ ] 8. Polish and v0.1.0 (`p8-polish`)

## Open questions
- Night: the navy slab rim almost disappears on the navy backdrop. Kept quiet for now, or add a faint lighter edge at night?
- Which Outlook account will we test with? (personal Outlook.com recommended)
- Confirm the authority rule thresholds (5 percent, 2K, and the currency) before they drive real routing.
- Which Leads cover which groups? Placeholder for now.
- Confirm the pnpm release-age exceptions for new package versions (D-024).

## Log
- 27 Sep 2026, P4.2: name tags over every helper except off-duty ones (badge, name, status dot, plus the role when zoomed in), with status from /api/state. Tags spread to the nearest free spot and keep the four main zone names clear. Clicking a helper selects them: the camera eases in, a ring shows on the floor, the tag gets an outline, Esc clears, a drag never selects. `selectSeat` and `onSeatSelected` are ready for the panel (D-067 to D-069). Still 29 draw calls and 70k triangles at the Overview. 211 unit tests and 10 smoke tests pass.
- 27 Sep 2026, P4.1: character generator. All 26 roster seats sit at their desk slots, each with its own look from the roster seed (body, hair, outfit, accessory) and a track badge in shape plus color (star, triangle, diamond, square). Drawn as one crowd of instanced parts (D-063 to D-066): 29 draw calls and 70k triangles at the Overview, up from 16 and 14k. The Lab diorama uses the same recipe. 197 unit tests pass. The Overview budget test now covers the helpers too (45 calls, 100k triangles). Frame rate on real hardware not measured yet.
- 27 Sep 2026, P3.5: Design Council review (`docs/design/reviews/2026-09-27-office-world.md`, Clarity 3, Brand 4, Charm 3, Craft 3, Smooth 4, Realism 4). Applied the 5 Must fixes and the picked Should fixes: the bridge as the hero, names at the Overview, framing around the page controls, backing pills, a night lift, lower glass, a bridge view on key 5, accent selected buttons, no desk flags (D-057 to D-062). 16 draw calls, 14.2k triangles.
- 27 Sep 2026, P3.4: one landmark per zone, built as boxes in the same batches (bridge counter with a capiz-style pendant, SAP terminal, mail pigeonholes and To Planner tray, signing desk, round table, whiteboard and table, coffee cart under a capiz-style lamp, logistics counter with a loading dock and apron, Reception counter with a "SignalChain HQ" sign, the Needs you tray and dashboard wall, the Leads' review board, the wing pennants). Props come from accessories.json (D-055), and saving that file updates the office live through office.updated (D-056): proven with before and after shots, the event arrived 235 ms after the save, with no reload. 15 draw calls, 13.5k triangles.
- 27 Sep 2026, P3.3: look A day and a navy night (moon, 4 warm lamps, glowing windows and screens, a faint bridge seam) that blend through dusk in 1.2 s, soft contact shadows, a Go to and Light card (D-051), keys 1 to 4 with 800 ms eased camera moves, a 140 ms fade with reduced motion, and r3f-perf in dev (D-054). 120 fps at the Overview by day and at night on the M4 Pro, 9 draw calls. Fixed: contact shadows too faint to see (D-053), a view framed too wide on load (D-052).
- 27 Sep 2026, P3.2: the office world from `vault.sample/office/layout.json` (new schema and checks in `packages/shared`): slab, planks, zone rugs, cutaway walls with glass and low walls, windows, all 26 desks, zone labels that fade in with zoom, and camera presets from zone rects (`?view=`). 7 draw calls and 9.6k triangles at the Overview. 120 fps on the M4 Pro. A broken layout keeps the last good one (D-050). Lawrence picked variant 1a for Contract Corner (D-049), now in layout.json.
- 27 Sep 2026, P3.1: the r3f-engineer and the world-artist planned Phase 3 (`docs/design/PHASE3_PLAN.md`). Lawrence chose a Lab pick for Contract Corner (D-049) and the last good layout on errors (D-050).
- 27 Sep 2026, P2.6 and P2.7: Design Council review (`docs/design/reviews/2026-09-27-design-lab.md`), then applied the 5 Must fixes and Lawrence's decisions (D-042 to D-048): panel focus, accessibility floor, no jumps, truthful name tags, copy trust pass, new stats tiles, q-0001 as a real escalation. Final values written to DESIGN_DIRECTION and both skills. Phase 2 done.
- 26 Sep 2026, P2.5: the ux-architect wrote the panel spec and the ux-writer the copy deck (`docs/design/panel/`). Built the panel in `apps/web/src/ui/panel/` with sample data: header, 4 tabs, Needs you cards and detail, decisions with keys and a 5 s undo, Team, Board, Office, and the instruction box. A keyboard-only smoke test passes.
- 26 Sep 2026, P2.4: the procurement-sme and ux-architect wrote adjacency and readability notes, the world-artist drew 2 options as data, shown at `/lab/floorplan` with the six workflow routes and their walk lengths. Lawrence chose Option 1, Central Bridge (D-037), and one Leads' Row for now (D-038).
- 26 Sep 2026, P2.3: diorama study with one desk pod, 4 seated helpers (one per track), idle and typing loops, name tags, and 3 looks with a dev toggle. The world-artist picked A, Soft daylight (D-034), and its fixes were applied. 60 fps on the M4 Pro, but 284 draw calls for 4 helpers, so Phase 3 and 4 must merge helper meshes.
- 26 Sep 2026, P2.2: the brand-guardian wrote the UI tokens and `docs/design/SCREEN_EXCEPTIONS.md`, the world-artist wrote `docs/design/WORLD_PALETTE.md`, merged into `tokens.ts`. The Lab shows colors with contrast, type, status and track, name tags, stats and the decision card. The brand-guardian reviewed the screenshots, fixes applied (D-032, D-033). 57 unit tests pass.
- 26 Sep 2026, P2.1: 7 council members wrote points of view (`docs/design/pov/`). The creative-director combined them into `docs/design/DESIGN_DIRECTION.md`. Lawrence chose A, Warm Diorama with B's rules (D-025), Approve green #1A7F50 (D-026), and a demo filter for seat items (D-027). Then decided the rest: helper naming (D-028), navy slab edge and capiz lamp (D-029), motion values (D-030), keys follow the mode (D-031).
- 25 Sep 2026, P1.3 and P1.4: Playwright smoke tests, `pnpm shots` (office and Lab at 1440x900 and 1920x1080), a test per schema (49 unit tests). The qa-playtester tested a clean install and found 10 bugs, all fixed (reconnect, clean shutdown, port collisions, plain warnings, Host check). Decisions D-015 to D-024.
- 25 Sep 2026, P1.2: pnpm monorepo with shared zod schemas and validator, Fastify server (health, state, live events, vault seeding and reset), web app with the isometric camera over a placeholder floor and the `/lab` page, and per-worktree ports.
- 25 Sep 2026, P1.1: web and server plans drafted in parallel and merged into one plan.
- 25 Sep 2026, P0.3: pushed `main` to the private repo lauurnce/signalchain-hq (it already existed, empty). Added 8 topics. Sole contributor check OK. Phase 0 done.
- 25 Sep 2026, P0.1 answers: real first name replaced with "the Sr. Manager" (D-012), authority rule gaps go to the CM (D-013), repo stays privately held (D-014).
- 25 Sep 2026, P0.2: setup check all OK (Node 24, pnpm, gh, hooks, owner email). commit-msg hook tested, it removes a Co-Authored-By line. First commit prepared.
- 25 Sep 2026, P0.1: orientation done. Claude read the docs, agents, skills and reference images, and raised 3 questions (answered, see D-012 to D-014).
- 25 Sep 2026: starter kit created (CLAUDE.md, council agents, skills, docs, roster, sample vault, hooks).
