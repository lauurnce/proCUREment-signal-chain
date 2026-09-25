# Implementation plan

## The idea
SignalChain HQ is a cozy isometric office where 26 AI helpers mirror a real procurement team (1 Sr. Manager, 4 Leads, 11 Category Managers, 10 Ops Buyers). You watch them work through the team's real workflows, walk around the office, and clear what needs you with Approve, Hold, Send back, or Instruct. Approved emails become Outlook drafts, and a daily digest lands in your inbox. It runs on localhost, uses fictional data, and never watches real people.

## What v0.1.0 looks like (the demo you can show)
1. Open `localhost`. A navy and warm-wood office fades in. 26 chunky characters are at their desks, some walking to the SAP Station or the Mail Dock.
2. The stats card says: 14 working, 3 on break, 4 need you, 18 open tasks, 6 handoffs today.
3. A CM helper carries a folder to the Endorsement Bridge, and an Ops helper picks it up. That is the real PR to PO handoff.
4. "Needs you (4)". You open the Luzon Precision follow-up, read the draft, press A. It becomes a draft in your Outlook. You click Send now, and it arrives in your test inbox.
5. You press "Walk around", walk your avatar to Ops 07, and see why a 6.5 percent price change was routed to a Category Manager.
6. At 5:30 PM the daily digest arrives in Outlook.

## How we work: the segment loop
Every phase is a few small segments. Each segment follows the same loop, so we stay on the same page:

1. **Plan** (plan mode, no code): Claude restates the goal, lists what it will and will not do, and asks up to 3 questions.
2. **Build**: small steps, one-line report after each.
3. **See**: `pnpm shots`, Claude looks at the screenshots first, then shows you.
4. **Council**: `/design-council` for anything visual or user-facing.
5. **Checkpoint**: `/checkpoint` runs checks, updates PROGRESS and DECISIONS, proposes a commit. You say yes or no.
6. **Merge**: at the end of a phase, merge the worktree into `main`.

Gates: every prompt ends with a stop. You answer "Go", "Change: ...", or "Stop". Nothing moves forward without you.

## Phases

### Phase 0. Kickoff and alignment
- Where: main checkout, no worktree. Personas: none yet.
- You get: Claude's own summary of the project, guardrails and plan, your answers to its questions, git hooks active, first commit, private GitHub repo.
- Done when: Claude's summary matches your intent, `scripts/verify-sole-contributor.sh` says OK, the repo is on GitHub as private.
- Gate: "Does Claude understand the project the way you do?"

### Phase 1. Scaffold and tooling
- Where: `p1-scaffold`. Personas: r3f-engineer, integration-engineer, qa-playtester.
- You get: pnpm monorepo (`apps/web`, `apps/server`, `packages/shared`), shared zod schemas that validate `data/` and `vault.sample/`, a server with health, state and live events, a web app with an isometric camera over a placeholder floor, the `/lab` route, per-worktree ports, Biome, Vitest, Playwright, and `pnpm shots`.
- Done when: `pnpm dev` works from a clean clone, `pnpm check` passes, screenshots are saved, two worktrees can run at once.
- Gate: "Is the foundation solid enough to design on?"

### Phase 2. Design direction in the Lab
- Where: `p2-design-lab`. Personas: the full Design Council plus procurement-sme.
- You get: each council member's point of view, a design direction with 2 or 3 style options, then in the Lab: design tokens, a type and color specimen with contrast, name tags and HUD components, a 3D desk-pod diorama with 4 characters and 3 lighting options, 2 floor plans for 26 seats, and the panel layout.
- Done when: you have chosen a style, a floor plan, and the screen-only additions (D-011), and the council's Must fixes are done.
- Gate: "Would you proudly show this look to the Sr. Manager?"

### Phase 3. The office world
- Where: `p3-office`. Personas: world-artist, r3f-engineer, motion-designer, qa-playtester.
- You get: `vault/office/layout.json` and its schema, the full floor with zones, walls, windows and all 26 desk slots, landmarks for every zone, day and night lighting, camera presets (1 to 4) and smooth moves, and live props from `accessories.json`.
- Done when: 60 fps on your Mac, every zone is findable from the overview, editing `accessories.json` updates the office live.
- Gate: "Does it feel like their office, and does it feel cozy?"

### Phase 4. The team (parallel with Phase 5)
- Where: `p4-team`, owns `apps/web/src/scene/characters/**`. Personas: world-artist, motion-designer, r3f-engineer.
- You get: 26 seeded voxel characters with track badges, name tags with status dots, idle, typing, walking and "waiting on you" animations, pathfinding to zones per workflow step, click to focus, and Walk around mode with the Sr. Manager avatar.
- Done when: characters move to the right zones for their steps, the scene stays smooth, the council's Must fixes are done.

### Phase 5. The HQ panel (parallel with Phase 4)
- Where: `p5-panel`, owns `apps/web/src/ui/**` and `packages/shared/**`. Personas: ux-architect, ux-writer, brand-guardian, r3f-engineer.
- You get: header, tabs (Needs you, Team, Board, Office), stats HUD, Needs You cards and detail with the four decisions and keyboard shortcuts, undo toast, authority rule explanations, Team, Board and Office tabs, and the instruction box, all on live state (decisions mocked until Phase 6).
- Done when: you can clear the 4 sample items in under a minute with the keyboard, accessibility checks pass.
- Merge step for 4 and 5: merge the panel first, then the team, connect selection both ways, then one integrated council review.

### Phase 6. Live data and Demo Day
- Where: `p6-live`. Personas: integration-engineer, procurement-sme, qa-playtester.
- You get: the vault as the live source (watch, validate, atomic writes), decisions and instructions saved to files, activity log, "Open in Obsidian" links, and Demo Day: a seeded simulation of the six workflows with fictional data at 1x, 5x or 20x, including the CM to Ops handoff.
- Done when: a 10-hour simulated day at 20x runs without errors and the procurement-sme rates it realistic.

### Phase 7. Outlook
- Where: `p7-outlook`. Personas: integration-engineer, brand-guardian, qa-playtester.
- Before: you do `docs/OUTLOOK_SETUP.md` steps 1 to 5.
- You get: the MailProvider with the `outbox` driver (works with no sign-in) and the `graph` driver (sign-in with PKCE, drafts, safe sending, allowlist, redirect, log), a Mailroom tab, inbox-to-task for `[HQ]` emails, and the daily digest.
- Done when: the full demo from "What v0.1.0 looks like" works with your test mailbox, and the security review passes.

### Phase 8. Polish and v0.1.0
- Where: `p8-polish`. Personas: the whole council and crew.
- You get: a full council sweep, a performance and accessibility pass, a first-run tour, empty states, a help sheet, README screenshots and a short demo GIF, and a `v0.1.0` tag.
- Done when: the council scores 4 or more on every criterion and you are happy to demo it.

## Timeline guidance
Plan for about 2 to 4 focused sessions per phase. Phases 4 and 5 together take about the same calendar time as one phase because they run in parallel. Do not rush Phase 2, it sets the quality bar for everything after it.

## Risks and how we handle them

| Risk | How we handle it |
|---|---|
| It looks generic or childish | Phase 2 Lab, council reviews with screenshots, the creative-director's principles |
| Frame drops as the office grows | Budgets in the isometric-office skill, instancing, FPS readout at every checkpoint |
| Parallel worktrees collide | Folder ownership per worktree, shared schema changes only in one place |
| Very new package versions break each other | Check peer ranges in Phase 1, fall back (for example TypeScript 6.0.3) and log a decision |
| Outlook setup blocks progress | The `outbox` driver works without sign-in, so Phase 7 can finish even if Graph setup waits |
| It feels like surveillance | The guardrails, the ux-writer's banned words, and the procurement-sme's dignity check |
| Brand or NDA problems | Fictional data, no logo, "Unofficial prototype" label, private repo |
| Claude drifts from the plan | Plan-first segments, gates, `/checkpoint`, and PROGRESS imported into every session through CLAUDE.md |

## Later (after v0.1.0)
- Define real roles seat by seat with `/define-role`.
- Real AI drafting for helpers (Claude API for the personal prototype, Copilot or Copilot Studio for anything ADI-facing).
- Desktop app wrapper (Tauri or Electron).
- A phone layout focused on Needs You.
- Rooms for Procurement360 modules: Helpdesk, Savings, Projects, Policies, Contracts, Market Intelligence.
- An "AI Enablement" corner that shows the program's weekly challenge.
