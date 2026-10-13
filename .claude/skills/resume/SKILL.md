---
name: resume
description: Coming back to SignalChain HQ after a break. Reads docs/HANDOFF.md, PROGRESS and DECISIONS, checks the branches and the health of the repo, and tells Lawrence in plain English where things stand and the one next step. Use when Lawrence types /resume, says he is back, or asks where the project stands after a pause. Changes nothing.
argument-hint: "[optional: what Lawrence wants to do first]"
---

# Resume: $ARGUMENTS

Read only. Do not edit, commit, merge or push in this skill. Do not read `.env`, `.env.local` or `.secrets/`.

## 1. Read
- `docs/HANDOFF.md` (the plan for coming back), then the "Now" line and the newest log lines of `docs/PROGRESS.md`, and the last 10 rows of `docs/DECISIONS.md`.

## 2. Check what changed since the handoff
- `git fetch origin`, then `git branch -a` and `git log --oneline -5 origin/main`.
- Is `worktree-p7-outlook` merged into `main` yet? (`git merge-base --is-ancestor origin/worktree-p7-outlook origin/main`)
- Does a Phase 8 branch exist (`worktree-p8-polish`)?
- `git status --short` on the current checkout.
- If the checkout has `node_modules`, run `pnpm check` and report pass or fail per part. If not, say `pnpm install` comes first.
- Run `bash scripts/verify-sole-contributor.sh` and report the result in one line.

## 3. Tell Lawrence (plain English, short sentences, no em dashes)
```
## Where we are (max 5 lines)
## What changed since the handoff (or "nothing")
## The next step (one, with the exact commands or prompt to paste)
## Waiting for your decision (from HANDOFF section 5, only what is still open)
```
Pick the next step in this order: test Phase 7 on the Mac if it is not merged, then merge it, then start Phase 8 with P8.1 from `docs/PROMPTS.md`. If `$ARGUMENTS` names something else, plan for that instead and say how it fits.

## 4. Stop at the gate
Wait for Lawrence before doing anything. When work starts again, update the "Now" line in `docs/PROGRESS.md`, and update `docs/HANDOFF.md` or mark it as past once Phase 8 begins.
