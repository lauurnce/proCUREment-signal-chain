# SignalChain HQ

A cozy, game-like isometric virtual office for a procurement team. Every desk holds an AI helper that mirrors a real role (Category Manager, Ops Buyer, Lead). You can watch the helpers work, walk around the office, and decide what they bring to you: Approve, Hold, Send back, or Instruct. Approved updates go out through Outlook.

- Owner and only contributor: Lawrence Panes (GitHub: lauurnce).
- Status: private, local-first prototype that runs on localhost. Current progress is at the bottom of this file.
- Context: Lawrence runs a 13-week AI enablement program for the procurement and logistics team of Analog Devices (ADI) in the Philippines. This app is his personal side project, built on fictional data. It is not an ADI product and must never look like an official one.
- Inspiration: an "AI team HQ" demo (see `docs/DESIGN_REFERENCES.md`). We borrow patterns, never pixels.

## How we work (every session)

1. One segment at a time. Prompts come from `docs/PROMPTS.md`. Finish the segment, show the result, then stop and wait at the gate.
2. Plan before code for anything bigger than a small fix. Use plan mode. Keep plans to one screen.
3. Explain in plain English first, then give the technical term. English is Lawrence's second language: short sentences, simple words, no jargon without a one-line meaning.
4. Never use em dashes in anything you write: code comments, docs, UI copy, commit messages. Use commas or periods.
5. When unsure, ask up to 3 questions, multiple choice when possible. Never guess on product or design decisions.
6. End every segment with `/checkpoint`. Record decisions in `docs/DECISIONS.md`.
7. Smooth is a feature: 60 fps, no jank, no layout shift, no flashing.
8. Show, don't tell: after UI work, run `pnpm shots` and look at the screenshots yourself before saying it is done.

## Sole contributor rules (never break)

- Every commit is authored by Lawrence only. Never add `Co-Authored-By`, "Generated with", session links, or any AI attribution to commits, PR text, tags, or release notes. `.claude/settings.json` turns attribution off and `.githooks/commit-msg` strips it as a backstop.
- Never change `user.name` or `user.email`, never use `--no-verify`, never rewrite history, never force push.
- Ask before you commit, merge, push, tag, or open a PR. Show the exact message or command first.

## Guardrails

Data and privacy
- The GitHub repo is privately held and stays private. Never make it public, never add collaborators, never fork or mirror it anywhere public. Reason: the docs describe ADI's internal workflows and program.
- The approved way to share is the public showcase: `lauurnce/signalchain-hq-showcase`, local folder `~/projects/signalchain-hq-showcase`. It is a separate repo, not a mirror. To refresh it: copy the tracked files with `git archive`, leave out `CLAUDE.md`, `docs/`, `.claude/` and `.worktreeinclude`, make the domain generic (no ADI, no program or kickoff sources, no Conga, DocuSign or ME57, sample rule limits of 10 percent and 50K), scan every file, run `pnpm check` and `pnpm shots` on separate ports, then show Lawrence the commit before pushing.
- Fictional data only in git: suppliers, PO numbers, emails, people. Use the fictional suppliers listed in the `procurement-domain` skill.
- No real names or emails of ADI staff in committed files. Seats use placeholders like "CM 03". Real names, if Lawrence ever wants them, live only in `data/roster.local.json` (gitignored).
- The office shows what AI helpers are doing, never what a real person is doing. No time tracking, activity monitoring, productivity scores, or "who is online" for real people. Reason: trust. Some team members already worry that AI will replace them.
- Never read `.env`, `.env.local`, `.secrets/`, or token caches. Never print secrets or tokens in logs.
- The local server binds to 127.0.0.1 only.

Brand
- ADI-inspired look: the deck palette and Quattrocento Sans (see the `adi-theme` skill).
- Do not draw, trace, or import the ADI logo or wordmark. The product name is "SignalChain HQ". The app shows "Unofficial prototype · Fictional data" in its About area.
- Never copy images, characters, names, or assets from the references. Build original art.

Outlook
- Drafts first. Nothing is sent without an explicit human click.
- Sending needs `MAIL_MODE=send` and every recipient must be in `MAIL_ALLOWED_RECIPIENTS`. Every send is logged.
- Personal test account only. Never connect ADI accounts or tenants unless Lawrence confirms ADI IT approved it.

## Tech stack (details in `docs/TECH_STACK.md`)

pnpm monorepo, Node 24 LTS, TypeScript strict, Biome for lint and format.
- `apps/web`: Vite, React 19, React Three Fiber, drei, postprocessing, zustand, Tailwind CSS v4, motion.
- `apps/server`: Fastify, Server-Sent Events, file vault (chokidar, gray-matter, zod), MSAL Node plus Microsoft Graph.
- `packages/shared`: zod schemas and types used by web and server.
- Tests: Vitest for logic, Playwright for end-to-end and screenshots.

## Repo map

```
apps/web/            3D office and HQ panel (created in Phase 1)
apps/server/         local API, vault, simulator, mail (created in Phase 1)
packages/shared/     schemas and types (created in Phase 1)
data/                roster, workflows and rules templates (fictional, committed)
vault.sample/        example vault in markdown and JSON (committed)
vault/               your live local vault (gitignored, copied from vault.sample)
docs/                plan, prompts, architecture, decisions, progress, design, qa
docs/references/private/   reference images (gitignored, copied into worktrees)
.claude/agents/      the council and build crew (subagents)
.claude/skills/      reusable procedures and knowledge
.claude/rules/       path-scoped coding rules
.githooks/           sole-contributor hooks
scripts/             setup and verification scripts
```

## Commands (available after Phase 1)

- `pnpm dev` runs web and server with ports for this worktree
- `pnpm check` runs type check, lint, and unit tests
- `pnpm test`, `pnpm e2e`, `pnpm shots` (screenshots to `docs/qa/shots/<date>/`)
- `pnpm vault:reset` copies `vault.sample/` to `vault/`

## The council and crew (subagents in `.claude/agents/`)

| Persona | Use for |
|---|---|
| `creative-director` | Council chair. Vision, taste, final ranking of fixes. |
| `ux-architect` | Flows, layout, hierarchy, accessibility, keyboard use. |
| `world-artist` | Isometric 3D world, characters, lighting, props, floor plan. |
| `motion-designer` | Animation, game feel, camera moves, micro-interactions. |
| `brand-guardian` | ADI theme compliance, contrast, copy rules, no logo misuse. |
| `ux-writer` | Microcopy, empty states, zone names, helper bios, tone. |
| `procurement-sme` | Real CM and Ops workflows, glossary, fictional data, privacy. |
| `r3f-engineer` | Frontend and 3D code, performance, tests. |
| `integration-engineer` | Server, vault, events, Outlook and Graph, security. |
| `qa-playtester` | Runs checks, plays the app as a busy Sr. Manager, reports bugs. |

Convene the council with `/design-council <topic>`. For one opinion, say for example "Ask the ux-architect subagent to review the Needs You tab". Independent reviews run in parallel, then the creative-director ranks the fixes.

## Skills (`.claude/skills/`)

| Skill | What it does |
|---|---|
| `/design-council` | Parallel council review, one ranked action list, decisions for Lawrence |
| `/checkpoint` | End-of-segment ritual: checks, screenshots, summary, commit proposal |
| `/define-role` | Interview Lawrence to turn a placeholder seat into a defined role |
| `adi-theme` | Colors, type, spacing, status colors, copy rules |
| `isometric-office` | Scene units, camera, layout file, characters, performance budgets |
| `procurement-domain` | Glossary, the six real workflows, authority rule, fictional data |
| `outlook-integration` | MailProvider contract, Graph calls, safety rules |
| `worktree-flow` | Starting, running in parallel, merging, and cleaning up worktrees |
| `/resume` | Coming back after a break: reads the handoff, checks the branches, says what is next |

## Worktrees

- One worktree per phase: from the main checkout on `main`, run `claude -w p<N>-<slug>`. The branch becomes `worktree-p<N>-<slug>`.
- Parallel worktrees must own different folders. Change `packages/shared` in one worktree at a time.
- Each worktree needs its own `pnpm install`. Ports are picked per worktree so two can run at once.
- Details: the `worktree-flow` skill and `docs/WORKTREES.md`.

## Definition of done (every segment)

Works in the browser, `pnpm check` passes, screenshots taken and reviewed if the UI changed, copy is plain English with no em dashes, `docs/PROGRESS.md` updated, and Lawrence said OK.

## Current status

The project is closed (13 Oct 2026). If it starts again, begin with `docs/HANDOFF.md`, or type `/resume`.

@docs/PROGRESS.md
