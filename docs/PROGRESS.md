# Progress

Now: Phase 2 in `p2-design-lab`. P2.4 done: floor plan Option 1, Central Bridge, chosen (D-037). Next: P2.5, the panel layout.

## Phases
- [x] 0. Kickoff and alignment (main checkout)
- [x] 1. Scaffold and tooling (`p1-scaffold`)
- [ ] 2. Design direction in the Lab (`p2-design-lab`)
- [ ] 3. The office world (`p3-office`)
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
