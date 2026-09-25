# SignalChain HQ

**GitHub description:** A cozy isometric virtual office for procurement teams. AI helpers for CM and Ops buyers work at their desks, surface what needs your decision, and send approved updates through Outlook. Local-first prototype built with React Three Fiber, Fastify and Microsoft Graph.

Unofficial prototype · Fictional data · Private repo · Owner and only contributor: Lawrence Panes

---

## What it is
A game-like office you can watch and walk around in. 26 seats mirror a real procurement team: 1 Sr. Manager (you, the player), 4 Leads, 11 Category Managers and 10 Ops Buyers. Each seat holds an AI helper that works through the team's real workflows: PR approval and endorsement, RFQs, contracts, PR to PO in SAP, eRFQ to PO, and PO amendments. When a helper needs a human decision, it lands in **Needs you**, and you Approve, Hold, Send back, or Instruct. Approved emails become Outlook drafts, and a daily digest arrives in your inbox.

What it is not: an ADI product, a real-data system, or a tool that watches people.

## Status
Starter kit, Phase 0. Progress: [docs/PROGRESS.md](docs/PROGRESS.md).

## Quick start (Phase 0)
You need: macOS, Node 24 LTS (`nvm install 24`), pnpm (`npm install -g pnpm`), git, the GitHub CLI (`brew install gh`), VS Code, and Claude Code.

```bash
# 1. Put this folder at ~/projects/signalchain-hq and open it in VS Code
cd ~/projects/signalchain-hq

# 2. Make it a repo with YOUR identity (Claude is not allowed to change these)
git init -b main
git config user.name "Lawrence Panes"
git config user.email "<the email on your GitHub account>"
git config hq.ownerEmail "<the same email>"

# 3. Turn on the sole-contributor hooks and check your tools
bash scripts/setup.sh

# 4. Start Claude Code, accept the trust prompt, switch to plan mode (Shift+Tab)
claude
```
Then paste **P0.1** from [docs/PROMPTS.md](docs/PROMPTS.md) and follow the prompts in order.

## What is in this starter kit

| Path | What it does |
|---|---|
| `CLAUDE.md` | Project memory Claude reads every session: goals, working rules, guardrails, stack, personas, skills |
| `.claude/agents/` | 10 personas: the Design Council (creative-director, ux-architect, world-artist, motion-designer, brand-guardian, ux-writer), the procurement-sme, and the build crew (r3f-engineer, integration-engineer, qa-playtester) |
| `.claude/skills/` | `/design-council`, `/checkpoint`, `/define-role`, plus knowledge skills: adi-theme, isometric-office, procurement-domain, outlook-integration, worktree-flow |
| `.claude/rules/` | Short coding rules that load only for matching folders |
| `.claude/settings.json` | Attribution off, worktree base, safe permissions, secrets denied |
| `.githooks/` | `commit-msg` strips co-author and AI lines, `pre-commit` accepts only your email |
| `scripts/` | `setup.sh` (safe setup check), `verify-sole-contributor.sh` |
| `data/` | Roster template (26 placeholder seats), the six real workflows, the authority rule template |
| `vault.sample/` | Example vault in markdown and JSON: team status, Needs You items, board tasks, office zones and props, a log |
| `docs/` | Plan, prompts, stack, architecture, team template, Outlook setup, worktrees guide, design references, decisions, progress |
| `docs/references/private/` | Reference images (gitignored, copied into worktrees) |

## How we build
- **Segments with gates**: plan, build, see, council, checkpoint. Claude stops and waits for you after each segment.
- **Worktrees**: one per phase (`claude -w p3-office`), with Phases 4 and 5 in parallel. See [docs/WORKTREES.md](docs/WORKTREES.md).
- **Design Council**: `/design-council <topic>` runs the personas in parallel on real screenshots, then the creative-director ranks the fixes.
- **Checkpoints**: `/checkpoint` runs checks, updates progress and decisions, and proposes a commit with no AI attribution.

## Guardrails
- Fictional data only. Placeholder seats, no real names or emails in git.
- The app shows what AI helpers do, never what real people do.
- ADI-inspired colors and font, no ADI logo, clearly labeled unofficial.
- Outlook: drafts first, allowlist, never auto-send, personal test account only.
- You are the only contributor.

## Docs
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Prompt pack](docs/PROMPTS.md)
- [Tech stack](docs/TECH_STACK.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Team template](docs/TEAM_TEMPLATE.md)
- [Outlook setup](docs/OUTLOOK_SETUP.md)
- [Worktrees guide](docs/WORKTREES.md)
- [Design references](docs/DESIGN_REFERENCES.md)
- [Decisions](docs/DECISIONS.md) and [Progress](docs/PROGRESS.md)
