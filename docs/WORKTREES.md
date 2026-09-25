# Worktrees, the practical guide

## What and why, in plain English
A **worktree** is a second folder of the same project, on its own branch, that shares the same git history. You can have Claude build the office in one folder while another Claude builds the panel in a second folder, and neither can break the other or `main`. When a piece is done, you merge its branch into `main`.

## The plan for this project

| Phase | Worktree | Runs |
|---|---|---|
| 0 Kickoff | none, main checkout | alone |
| 1 Scaffold | `p1-scaffold` | alone |
| 2 Design Lab | `p2-design-lab` | alone |
| 3 Office world | `p3-office` | alone |
| 4 Team and movement | `p4-team` | **in parallel with 5** |
| 5 HQ panel | `p5-panel` | **in parallel with 4** |
| 6 Live data | `p6-live` | alone |
| 7 Outlook | `p7-outlook` | alone |
| 8 Polish | `p8-polish` | alone |

## Everyday commands

Start a phase (from the project root, on `main`, with nothing uncommitted):
```bash
git switch main
git status            # should say "nothing to commit"
claude -w p3-office   # creates .claude/worktrees/p3-office on branch worktree-p3-office
```

First time inside it:
```bash
pnpm install
pnpm dev              # note the two ports it prints
```

Open it in its own VS Code window (optional):
```bash
code .claude/worktrees/p3-office
```

See all worktrees:
```bash
git worktree list
```

## Running Phase 4 and 5 at the same time
1. VS Code terminal 1: `claude -w p4-team`, paste the P4 prompts.
2. VS Code terminal 2 (click the + in the terminal panel): `claude -w p5-panel`, paste the P5 prompts.
3. Each prompt tells Claude which folders it owns. If one side needs a change in the other side's folder, Claude stops and asks you.
4. Both can run `pnpm dev` at once, the ports are different. Open both URLs side by side.
5. Tip: agent teams in split panes do not work inside the VS Code terminal. Separate terminals is the simple way.

## Merging back
When a phase passes `/checkpoint`:
```bash
cd <project root>        # the main checkout, not the worktree
git switch main
git merge --no-ff worktree-p3-office -m "feat(scene): office world (phase 3)"
pnpm install
pnpm check
```
Or just ask Claude in the main checkout: "Merge worktree-p3-office into main using the worktree-flow skill." It will show you each command and wait for your OK.

If git reports a conflict, ask Claude to explain both sides in plain English before choosing.

## Cleaning up
When you exit the worktree session, Claude asks whether to keep or remove it. Remove it after the merge. Manually:
```bash
git worktree remove .claude/worktrees/p3-office
git branch -d worktree-p3-office
```

## Things that surprise people
- A new worktree only contains **committed** files. Commit docs and data before you start a worktree that needs them.
- `.env`, `data/roster.local.json` and `docs/references/private/` are copied in automatically by `.worktreeinclude`. `node_modules` is not, so run `pnpm install`.
- `worktree.baseRef` is set to `head`, so a new worktree starts from your current commit. Always start from `main` in the main checkout.
- Each worktree has its own `vault/` (made from `vault.sample/`). Changes in one do not appear in another.
- Your Outlook sign-in works in every worktree, because localhost ports do not matter for the redirect URI.
