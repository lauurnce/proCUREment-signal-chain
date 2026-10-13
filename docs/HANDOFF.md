# Handoff: SignalChain HQ

Written 13 Oct 2026, when Lawrence paused the project. Read this first when you come back.
To pick up again, open Claude Code in the repo and type `/resume`.

## 1. Where things stand, in 5 lines

1. Phases 0 to 6 are done and merged into `main`.
2. Phase 7 (Outlook) is built and reviewed, and Lawrence merged it into `main` when he closed the project on 13 Oct 2026. The real Outlook test on the Mac was not done yet, so do it first if the project starts again.
3. Phase 8 (polish and the v0.1.0 release) has not started.
4. All checks pass on `worktree-p7-outlook`: 88 server tests, 194 web tests, 47 shared tests, 26 browser tests, lint and types.
5. Decisions D-001 to D-129 are in `docs/DECISIONS.md`. Every commit is Lawrence's only (`scripts/verify-sole-contributor.sh` says OK).

## 2. What SignalChain HQ is

A cozy isometric 3D office for a procurement team, running on localhost. Every desk holds an AI helper that mirrors a real role (Category Manager, Ops Buyer, Lead). You watch the helpers work, walk around, and decide what they bring to you: Approve, Hold, Send back, or Instruct. Approved emails become drafts in Outlook, and nothing is sent without your click. A private, local-first side project on fictional data, not an ADI product.

## 3. What we built, phase by phase

| Phase | What it gave the app | Where |
|---|---|---|
| 0. Kickoff | Rules, council of agents, skills, sample vault, sole-contributor hooks | `main` |
| 1. Scaffold | pnpm monorepo, Fastify server, React app, shared zod schemas, tests, ports per worktree | `main` |
| 2. Design Lab | Look A "Warm Diorama", tokens, panel spec and copy deck, floor plan option 1 (Central Bridge) | `main`, `/lab` |
| 3. Office world | Slab, zones, 26 desks, landmarks, day and night, camera views on keys 1 to 5 | `main` |
| 4. Team | Voxel helpers that walk to the zone of their step, name tags, breaks, meetings, Walk around mode with E to talk | `main` |
| 5. HQ panel | Needs you (A, H, S, I and a 5 s undo), Team, Board, Office tabs, instruction box, link between office and panel | `main` |
| 6. Live data and Demo Day | Decisions saved to the markdown vault, live updates, "Open in Obsidian", a seeded Demo Day simulator on its own vault copy (1x, 5x, 20x), playtest fixes | `main` |
| 7. Outlook | Mail tab, outbox `.eml` drafts with no sign-in, Outlook sign-in (MSAL, PKCE, Keychain), real drafts, Send now with a confirm box, inbox to task for `[HQ]` emails, the daily digest, security and brand review fixes | `worktree-p7-outlook` only |

The details of every step are in the log at the bottom of `docs/PROGRESS.md`.

## 4. The very next steps

### Step A. Test Phase 7 on the Mac (Lawrence, about 20 minutes)

Setup steps 1 to 5 of `docs/OUTLOOK_SETUP.md` are already done. `.env` has `MAIL_PROVIDER=graph` and `MAIL_MODE=drafts`.

```bash
git fetch
git checkout worktree-p7-outlook
pnpm install          # say yes if pnpm asks to allow the build for keytar
pnpm dev
```

1. Mail tab: click **Connect Outlook**, sign in, accept the permissions, click Allow on the Keychain prompt.
2. Needs you: approve q-0001 and wait for the undo bar to close. A draft appears in Drafts on outlook.live.com.
3. Set `MAIL_MODE=send` in `.env`, restart, then in the Mail tab: **Send now**, check the list, **Send**.
4. From your test address, email the test mailbox with the subject `[HQ] Please chase PO-451208 with Luzon Precision`. Within about 2 minutes a task shows on the Board and an Ops helper walks to the Mail Dock.
5. **Send digest now** (send mode) or **Make digest now** (drafts mode).

If something fails, copy the exact message the app shows and give it to Claude.

### Step B. Merge Phase 7 into `main` (done on 13 Oct 2026)

```bash
git switch main
git pull
git merge --no-ff worktree-p7-outlook -m "feat(mail): Outlook drafts, sending, inbox to task and the digest (phase 7)"
pnpm install
pnpm check
git push origin main
```

### Step C. Phase 8, polish and v0.1.0

Start with `claude -w p8-polish`, then paste the prompts P8.1 to P8.4 from `docs/PROMPTS.md`, one at a time: a full council sweep, a performance and accessibility pass, a first-run tour, then the release (README, screenshots, a demo GIF, the v0.1.0 tag).

Bring these into P8.1, they are already waiting:
- From the Demo Day playtest (`docs/qa/2026-10-13-demo-day-playtest.md`): a "Demo Day" pill with the simulated clock in the header; daylight that follows the simulated clock; one meaning for "waiting" across tags, header stats and Board; the r3f-perf overlay covers the panel in dev at 1440 px; the simulated day should end at 18:00; varied Send back notes.
- From the P6.1 build: a note box for Send back in the panel; an instruction about an item does not change that item's status.

## 5. Decisions waiting for Lawrence

- **Digest wording:** should the digest list each helper's finished and planned work by name ("CM 03 helper"), or only by role ("a CM helper")? By name could read like a daily report per seat.
- **Redirect banner colors:** keep light orange and Arial, or use our grey panel with an amber left line and our font?
- **Send now button:** it became a plain button in P7.5, and only the Send inside the confirm box is blue. Keep it, or make Send now blue again?
- **Open questions** in `docs/PROGRESS.md`: the authority rule thresholds (5 percent, 2K, currency), which Leads cover which groups, pnpm release-age exceptions, the frame rate in Walk around on the M4 Pro.

## 6. Housekeeping

- Old branches on GitHub that can be deleted (the cloud session could not delete them): `worktree-p4-team`, `worktree-p5-panel`, `worktree-p6-live`. After Step B, also `worktree-p7-outlook`.
  ```bash
  git push origin --delete worktree-p4-team worktree-p5-panel worktree-p6-live
  ```
- The repo stays private. `.env`, `.secrets/`, `vault/`, `vault-demo/`, `vault-e2e/` are gitignored and must stay that way.
- Real names, if ever needed, go only in `data/roster.local.json` (gitignored).

## 7. How to run it and check it

```bash
pnpm install
pnpm dev              # web and server, ports per worktree, opens on 127.0.0.1
pnpm check            # types, lint, unit tests
pnpm e2e              # browser tests, on a throwaway vault, mail always on the outbox
pnpm shots            # screenshots to docs/qa/shots/<date>/
pnpm vault:reset      # copy vault.sample/ to vault/ again
bash scripts/verify-sole-contributor.sh
```

Useful pages: `/` (the office), `/?tab=mail` (Mail tab), `/?walk=1` (Walk around), `/lab` (design lab), `/lab/floorplan`.

## 8. Map of the code

| Area | Files |
|---|---|
| Shared schemas | `packages/shared/src/schemas/` (queue item, seat, task, mail, events), `packages/shared/src/mail.ts` (compose email, footer, sign-in messages) |
| Vault | `apps/server/src/vault/` (load, watch, atomic writes, decisions, log) |
| Demo Day | `apps/server/src/sim/` (seeded engine, runner on `vault-demo/`) |
| Mail | `apps/server/src/mail/` (config, guard with every safety rule, outbox `.eml`, Graph client, inbox to task, digest, ledger in `vault/.state/mail.json`), `apps/server/src/auth/` (MSAL sign-in, Keychain cache) |
| Routes | `apps/server/src/routes/` (state, events, queue, sim, mail and `/auth`) |
| 3D office | `apps/web/src/scene/` (world, characters, camera) |
| Panel | `apps/web/src/ui/panel/` (Needs you, Team, Board, Office, Mail tabs) |
| Data | `data/` (roster, workflows, authority rules, inbox rules), `vault.sample/` |

## 9. Rules that must never break

- Every commit is Lawrence's only. No `Co-Authored-By`, no "Generated with", no AI attribution anywhere. Never change git `user.name` or `user.email`, never `--no-verify`, never rewrite history, never force push.
- Ask before commit, merge, push, tag or opening a PR, and show the exact message first.
- Never read `.env`, `.env.local`, `.secrets/` or token caches.
- Fictional data only in git. The office shows AI helpers, never what a real person does.
- Nothing is sent by email without a human click. Every send must pass the allowlist, the redirect and the hourly limit on the server.
- Plain English, no em dashes, in code comments, docs, UI copy and commit messages.

The full rules are in `CLAUDE.md`.
