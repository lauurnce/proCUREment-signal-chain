---
name: worktree-flow
description: How this repo uses git worktrees with Claude Code, including naming, starting a worktree session, first-time setup, running two worktrees in parallel without conflicts or port clashes, merging back to main, and cleaning up. Use when starting a phase, working in parallel, or merging.
---

# Worktree flow

Plain meaning: a worktree is a second working folder of the same project, on its own branch, sharing the same git history. We use one per phase so experiments never break `main`, and so two Claude sessions can build different parts at the same time.

## Naming
- Worktree name: `p<phase>-<slug>`, for example `p3-office`, `p4-team`, `p5-panel`.
- Claude Code creates it at `.claude/worktrees/<name>/` on branch `worktree-<name>`.
- `.claude/settings.json` sets `worktree.baseRef` to `head`, so a new worktree starts from the commit you are on. Always start new worktrees from the main checkout while on `main`.

## Start
From the repo root, on `main`, with a clean `git status`:
```bash
claude -w p3-office
```
Or, inside a session, ask Claude to "work in a worktree named p3-office".

First time inside a new worktree:
1. `pnpm install` (every worktree has its own `node_modules`).
2. `pnpm dev` once to confirm the ports it picked (they are printed at startup and differ per worktree).
3. `.worktreeinclude` already copied `.env`, `data/roster.local.json` and `docs/references/private/` if they exist.
4. If `vault/` is missing, `pnpm dev` creates it from `vault.sample/`, or run `pnpm vault:reset`.

Open it in its own VS Code window if you like: `code .claude/worktrees/p3-office`.

## Parallel rules (Phase 4 and 5 run together)
- Each worktree owns different folders. Phase 4 owns `apps/web/src/scene/characters/**`. Phase 5 owns `apps/web/src/ui/**` and, for that phase only, `packages/shared/**`.
- If a worktree needs a change in a folder it does not own, stop and ask Lawrence. Often the fix is to make that change on `main` first, commit, then pull it into both worktrees with `git merge main`.
- Commit small and often inside the worktree (with Lawrence's OK each time).
- Agent teams in split panes do not work in the VS Code terminal. Use separate terminals, or in-process mode.

## Merge back (from the main checkout)
1. In the worktree: `pnpm check` passes, `/checkpoint` done, everything committed.
2. In the main checkout:
```bash
git switch main
git merge --no-ff worktree-p3-office -m "feat(scene): office world (phase 3)"
pnpm install
pnpm check
```
3. If there are conflicts: list each file, explain both sides in plain English, propose a resolution, and wait for Lawrence's OK before resolving.
4. If the repo is on GitHub, push `main` only when Lawrence asks. Alternative flow: push the branch and open a PR with `gh pr create --fill`, then merge on GitHub. No AI attribution in PR text.

## Clean up
- When you exit a worktree session, Claude Code offers to keep or remove it. Remove it only after the merge.
- Manual cleanup:
```bash
git worktree list
git worktree remove .claude/worktrees/p3-office
git branch -d worktree-p3-office
```
- If git says the worktree is locked: `git worktree unlock .claude/worktrees/p3-office`, then remove.

## Gotchas
- A worktree only has committed files plus what `.worktreeinclude` copies. Commit docs before starting a new worktree if the worktree needs them.
- Never edit the same file in two worktrees at once.
- Two dev servers at once is fine because ports are per worktree. The Outlook redirect URI works on any localhost port.
