# Decisions

One line of context, the decision, and why. Newest at the bottom. Claude adds entries during `/checkpoint`, Lawrence confirms them.

| ID | Date | Decision | Why | Status |
|---|---|---|---|---|
| D-001 | 25 Sep 2026 | Project name "SignalChain HQ", repo `signalchain-hq` | ADI's world is the analog signal chain, the team's world is the supply chain, HQ is the office. Neutral name, no ADI trademark | Proposed, rename is easy until Phase 1 ends |
| D-002 | 25 Sep 2026 | Localhost-first web app for desktop browsers. Mobile layout later. Desktop wrapper later | Private, fast to iterate, runs every time we update | Accepted |
| D-003 | 25 Sep 2026 | 26 seats that mirror the real team: 1 Sr. Manager (player), 4 Leads, 11 CM, 10 Ops. Roles are placeholders until defined | Matches the program roster, lets us define details as we go | Accepted |
| D-004 | 25 Sep 2026 | Each seat shows an AI helper's work, never a real person's activity | Trust and dignity. The team already worries about AI replacing people | Accepted |
| D-005 | 25 Sep 2026 | Fictional data only in git. Real names only in gitignored local files. No ADI logo | NDA, privacy, and not looking like an official ADI tool | Accepted |
| D-006 | 25 Sep 2026 | Stack: pnpm monorepo, React Three Fiber web app, Fastify local server, markdown and JSON vault, Server-Sent Events | Smooth 3D in React, simple local server, data readable in Obsidian and by Claude Code | Accepted |
| D-007 | 25 Sep 2026 | Outlook through a MailProvider with three drivers: outbox (default), graph (personal test), power-automate (future ADI path). Drafts first, allowlist, never auto-send | Works today without IT, safe testing with a personal account, clear path for ADI later | Accepted |
| D-008 | 25 Sep 2026 | Sole contributor: attribution off in settings, commit-msg hook strips co-author lines, pre-commit checks the owner email | Lawrence wants to be the only contributor from day one | Accepted |
| D-009 | 25 Sep 2026 | One worktree per phase, `worktree.baseRef = head`. Phases 4 and 5 run in parallel | Practice worktrees, keep `main` stable, build faster | Accepted |
| D-010 | 25 Sep 2026 | Design Council runs as subagents by default. Agent teams are optional for big debates | Subagents cost less and work in the VS Code terminal. Agent teams are experimental | Accepted |
| D-011 | 25 Sep 2026 | Screen-only additions to the ADI palette (muted text color, status colors, track accents, IBM Plex Mono labels, one floating-panel shadow, 3D world palette) | Needed for accessibility and a readable 3D scene | Proposed, decide in Phase 2 |
