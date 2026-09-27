---
name: checkpoint
description: End-of-segment ritual. Runs checks, captures screenshots, writes a plain-English summary, updates PROGRESS and DECISIONS, verifies Lawrence is the only contributor, and proposes a commit message. Use at the end of every segment, when a prompt says "/checkpoint", or when Lawrence asks for a checkpoint. Never commits without his OK.
argument-hint: "[phase or segment, for example: Phase 3 or P3.2]"
---

# Checkpoint: $ARGUMENTS

Do these steps in order and report each one in one line.

## 1. Where are we
- Current branch and whether this is a worktree (`git branch --show-current`, `git worktree list`).
- Files changed since the last commit (`git status --short`).

## 2. Health checks
- Run `pnpm check` if it exists. Report pass or fail per part (types, lint, unit tests). Fix simple failures and say what you fixed. If something is not simple, stop and explain.
- If the UI changed, run `pnpm shots` and look at the images. Mention anything that looks wrong.
- Make sure git will not leave new source files out: `git status --ignored --short apps packages vault.sample docs .claude` must show no `!!` line for source code or docs. Anchor any root-only gitignore entry with a leading slash (`/vault/`, not `vault/`).

## 3. Summary for Lawrence (plain English, no em dashes)
```
## What changed (max 8 bullets)
## How to try it
Commands and the URL, plus what to click.
## Known issues or shortcuts we took
## Decisions made in this segment
## Next step (the next prompt in docs/PROMPTS.md)
```

## 4. Update the records
- Add a short entry at the top of the "Log" section in `docs/PROGRESS.md` (date, segment, 1 to 3 lines) and update the "Now" line. Keep the file under about 60 lines by trimming the oldest log lines into one summary line.
- Add any new decisions to `docs/DECISIONS.md` with the next ID.

## 5. Sole contributor check
Run `bash scripts/verify-sole-contributor.sh`. If it reports a problem, stop and explain it in plain English.

## 6. Commit proposal
- Propose one Conventional Commit message, for example `feat(scene): add CM and Ops wings with desk pods`.
- The message must have no AI attribution of any kind.
- Ask Lawrence: "Commit now?" Only commit after he says yes. Never push unless he asks.

## 7. Verify from a fresh clone (after the commit)
Plain meaning: prove the commit has every file it needs. `pnpm check` passes in the working folder even when git leaves files out, so only a real clone shows it (this happened in Phase 1: a `vault/` ignore rule hid source folders).
- Clone the branch into the scratchpad: `git clone --branch <branch> <repo root> <scratchpad>/clone-check`.
- In the clone, run `pnpm install --frozen-lockfile` and `pnpm check`. Both must pass.
- Delete the clone. If anything fails, stop, explain it, and fix it with a new commit before any merge.

## 8. If the phase is finished and we are in a worktree
Show the merge steps from the `worktree-flow` skill and ask whether to merge now.
