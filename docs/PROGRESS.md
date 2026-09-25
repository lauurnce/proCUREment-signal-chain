# Progress

Now: Phase 1 built and checked in `p1-scaffold`, waiting for commit and merge (P1.4). Next: Phase 2, Design direction in the Lab. Start a new session with `claude -w p2-design-lab`, then paste P2.1 from `docs/PROMPTS.md`.

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
- Which Outlook account will we test with? (personal Outlook.com recommended)
- Confirm the authority rule thresholds (5 percent, 2K, and the currency) before they drive real routing.
- Which Leads cover which groups? Placeholder for now.
- Confirm the pnpm release-age exceptions for new package versions (D-024).

## Log
- 25 Sep 2026, P1.3 and P1.4: Playwright smoke tests, `pnpm shots` (office and Lab at 1440x900 and 1920x1080), a test per schema (49 unit tests). The qa-playtester tested a clean install and found 10 bugs, all fixed (reconnect, clean shutdown, port collisions, plain warnings, Host check). Decisions D-015 to D-024.
- 25 Sep 2026, P1.2: pnpm monorepo with shared zod schemas and validator, Fastify server (health, state, live events, vault seeding and reset), web app with the isometric camera over a placeholder floor and the `/lab` page, and per-worktree ports.
- 25 Sep 2026, P1.1: web and server plans drafted in parallel and merged into one plan.
- 25 Sep 2026, P0.3: pushed `main` to the private repo lauurnce/signalchain-hq (it already existed, empty). Added 8 topics. Sole contributor check OK. Phase 0 done.
- 25 Sep 2026, P0.1 answers: real first name replaced with "the Sr. Manager" (D-012), authority rule gaps go to the CM (D-013), repo stays privately held (D-014).
- 25 Sep 2026, P0.2: setup check all OK (Node 24, pnpm, gh, hooks, owner email). commit-msg hook tested, it removes a Co-Authored-By line. First commit prepared.
- 25 Sep 2026, P0.1: orientation done. Claude read the docs, agents, skills and reference images, and raised 3 questions (answered, see D-012 to D-014).
- 25 Sep 2026: starter kit created (CLAUDE.md, council agents, skills, docs, roster, sample vault, hooks).
