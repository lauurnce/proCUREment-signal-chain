# Prompt pack

Segmented prompts for Claude Code, in order. Paste **one prompt at a time**, let Claude finish, check the result, then answer the gate before moving on.

## How to use this file
- **Where** tells you which folder or worktree to run it in. **New session** means start a fresh `claude` (or `claude -w <name>`). **Same session** means keep going.
- Blanks like `___` are for you to fill in before pasting.
- Every prompt ends at a gate. Reply with **"Go"**, **"Change: ..."**, or **"Stop"**.
- The personas live in `.claude/agents/`, the procedures in `.claude/skills/`. You never need to describe them again, just name them.
- Handy commands: `Shift+Tab` toggles plan mode, `/clear` starts fresh between phases, `/context` shows what is loaded, `/agents` lists the personas, `/rename` names a session.

---

## Phase 0. Kickoff and alignment
Where: main checkout (the project folder). No worktree yet.

Before P0.1, do these yourself in the VS Code terminal (Claude is not allowed to change your git identity):
```bash
cd ~/projects/signalchain-hq
git init -b main
git config user.name "Lawrence Panes"
git config user.email "<the email on your GitHub account>"
git config hq.ownerEmail "<the same email>"
bash scripts/setup.sh
```
Fix anything `setup.sh` marks as todo. Then start Claude Code in this folder with `claude`, accept the trust prompt, press `Shift+Tab` until you see plan mode, and paste P0.1.

### P0.1 Orientation, no code (new session, plan mode)
```text
Hi Claude. This is SignalChain HQ, my private side project. Before any code, I want us on the same page.

Read in this order: CLAUDE.md, README.md, docs/IMPLEMENTATION_PLAN.md, docs/DECISIONS.md, docs/TEAM_TEMPLATE.md, docs/DESIGN_REFERENCES.md, docs/ARCHITECTURE.md. Skim every file in .claude/agents/ and .claude/skills/. Look at the images in docs/references/private/.

Then reply with:
1. The project in 5 plain-English sentences: what it is, who it is for, and what it is not.
2. The 26 seats and what "placeholder role" means here.
3. The phase plan, one line per phase.
4. The guardrails you will follow: privacy, fictional data, brand, Outlook safety, sole contributor.
5. Anything unclear, risky, or contradictory in the docs. Ask me up to 3 questions, multiple choice if possible.

Do not create or change any files yet.
```
Gate: correct anything Claude misunderstood. If a doc needs fixing, say "Change: update <file> so that ...".

### P0.2 Safe repo setup and first commit (same session)
```text
Now let's set up the repo safely.

1. Run bash scripts/setup.sh and show me the output. If anything is marked todo, give me the exact command for my Mac (Apple Silicon, zsh, nvm). Do not install global tools yourself and do not change my git name or email.
2. Test the commit-msg hook without committing: create a temp message file in /tmp that contains a normal subject line plus a "Co-Authored-By: Claude <noreply@anthropic.com>" line, run .githooks/commit-msg on it, show me the file before and after, then delete it.
3. Update docs/PROGRESS.md with what we did so far, so it is part of the first commit.
4. Show git status and the list of files that will be committed. Confirm that nothing from docs/references/private/, .env, or vault/ is included.
5. Propose the first commit message. Wait for my OK before committing.

After the commit, run bash scripts/verify-sole-contributor.sh and show me the result.
```
Gate: say "Go" to commit.

### P0.3 Private GitHub repo (same session)
```text
Let's put this on GitHub as a private repo under my account.

1. Run gh auth status and tell me what you see.
2. Show me the exact command you plan to run, it should be:
   gh repo create signalchain-hq --private --source=. --remote=origin --description "<the description from README.md>" --push
3. Wait for my OK, then run it.
4. Add these topics with gh repo edit --add-topic: react-three-fiber, threejs, isometric, virtual-office, procurement, microsoft-graph, outlook, claude-code.
5. Run bash scripts/verify-sole-contributor.sh again.
6. Mark Phase 0 done in docs/PROGRESS.md, propose a small commit, and after my OK commit and push it, so main is clean before Phase 1.
```
Gate: check the repo on github.com shows only you as a contributor. Then `/clear`.

---

## Phase 1. Scaffold and tooling
Where: new session in a worktree: `claude -w p1-scaffold`

### P1.1 Plan the scaffold (plan mode)
```text
We are in Phase 1, Scaffold and tooling. Read docs/IMPLEMENTATION_PLAN.md (Phase 1), docs/TECH_STACK.md, docs/ARCHITECTURE.md, and .claude/rules/.

Use the r3f-engineer and integration-engineer subagents in parallel to each draft a short plan for their side, web and server. Then merge them into one plan with:
- the folder tree you will create
- the packages per workspace, using the latest stable versions, after checking peer dependency ranges
- the pnpm scripts: dev, check, test, e2e, shots, vault:reset, format
- how ports work so two worktrees can run at the same time
- how vault.sample/ is copied to vault/ on first run
- risks, for example TypeScript 7 compatibility, and your fallback

Keep it to one screen. Do not write files yet. Ask me anything unclear.
```
Gate: "Go" or "Change: ...".

### P1.2 Build the workspace (same session)
```text
Plan approved. Build it in small steps and tell me after each step what you did, in one line:

1. Root: package.json with the packageManager field, pnpm-workspace.yaml, tsconfig.base.json, biome.json, and .vscode/settings.json so Biome formats on save.
2. packages/shared: zod schemas and types for Seat, QueueItem, Task, Zone, Accessory, Workflow, AuthorityRule and ServerEvent, following docs/ARCHITECTURE.md. Add a validate script that checks data/*.json and every file in vault.sample/ against the schemas, and make it part of pnpm check.
3. apps/server: Fastify on 127.0.0.1 with GET /api/health, GET /api/state (roster merged with vault state), and GET /api/events (SSE with a heartbeat every 15 seconds). On start, copy every file that exists in vault.sample/ but is missing in vault/, and never overwrite existing files. pnpm vault:reset makes a completely fresh copy.
4. apps/web: Vite, React, TypeScript, Tailwind v4, fonts from @fontsource (Quattrocento Sans and IBM Plex Mono), a full-screen React Three Fiber canvas with an orthographic isometric camera over a simple placeholder floor, a small dev badge that shows server health, and an empty /lab route.
5. scripts/ports.mjs: stable ports per worktree, printed clearly by pnpm dev. The main checkout uses 5173 and 4317.

Rules: TypeScript strict, no any, small files, no em dashes. Run pnpm check at the end and fix everything. Do not commit yet.
```

### P1.3 Our eyes: tests and screenshots (same session)
```text
Now set up the tools that let the Design Council see real screens.

1. Playwright with Chromium only, plus a smoke test: the app loads, the canvas renders, the health badge says OK, and the console has no errors.
2. pnpm shots: start the app, wait for window.__HQ_READY__, and save PNGs of / and /lab at 1440x900 and 1920x1080 to docs/qa/shots/<YYYY-MM-DD>/.
3. Vitest with at least one test per shared schema.

Then ask the qa-playtester subagent to test everything from a clean install and report. Fix what it finds. Show me the screenshots.
```

### P1.4 Checkpoint and merge (same session)
```text
/checkpoint Phase 1
```
Then, after the commit:
```text
Phase 1 is done. Using the worktree-flow skill, show me the exact commands to merge worktree-p1-scaffold into main from the main checkout, and to run pnpm install and pnpm check there. Wait for my OK before running anything outside this worktree.
```
Gate: `pnpm dev` works on `main`. Then `/clear`.

---

## Phase 2. Design direction in the Lab
Where: `claude -w p2-design-lab`. This phase sets the quality bar. Take your time.

### P2.1 Points of view from the council (plan mode is fine)
```text
Phase 2: design direction. Quality matters more than speed here.

Convene the Design Council in parallel: creative-director, ux-architect, world-artist, motion-designer, brand-guardian, ux-writer, and the procurement-sme for workflow realism. Give each of them docs/DESIGN_REFERENCES.md, the images in docs/references/private/, the adi-theme skill, docs/TEAM_TEMPLATE.md, and data/workflows.json.

Each member writes a one-page point of view to docs/design/pov/<name>.md:
- what to borrow from the references (patterns, not pixels)
- what to avoid
- 3 ideas that would make this feel premium and cozy, and true to how CM and Ops really work
- their risks and non-negotiables

Then the creative-director combines them into docs/design/DESIGN_DIRECTION.md: a one-sentence north star, 5 design principles, a mood description, and 2 or 3 distinct style directions (A, B, C) with trade-offs.

Ask me to choose a direction with the AskUserQuestion tool. Do not build anything yet.
```
Optional, uses more tokens: add `"env": {"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"}` to `.claude/settings.local.json`, then add this line to the prompt: "Instead of subagents, spawn an agent team with teammates using the creative-director, ux-architect and world-artist agent types, and have them debate the directions and try to disprove each other's favorite." In the VS Code terminal, agent teams run in-process (split panes need tmux or iTerm2).

### P2.2 Tokens and components in the Lab (same session)
```text
I chose direction ___. Make it real in the /lab route so we judge it on screen, not on paper.

1. The brand-guardian and world-artist create apps/web/src/theme/tokens.ts and theme.css: UI palette with roles, 3D world palette, status colors, track accents, type scale, spacing, radii, elevation, and the motion tokens from the motion-designer. Follow the adi-theme skill. List every screen-only exception for my approval (decision D-011).
2. Build these Lab sections: color swatches with contrast ratios, a typography specimen, status chips, the name tag pill, the stats HUD card, and a panel card with the four decision buttons (Approve, Hold, Send back, Instruct).
3. Run pnpm shots for /lab, look at the images yourself, then show me.
```

### P2.3 The 3D diorama study (same session)
```text
Next, a 3D study at /lab/diorama: one desk pod of 4 with chairs, monitors and a plant, plus 4 characters, one per track (Sr. Manager, Lead, CM, Ops), in the world-artist's style. Add the motion-designer's idle and typing animations and the name tags from P2.2 above their heads.

Give me 3 lighting and material variations with a small dev toggle, and a day and night version of the favorite. Screenshot each. The world-artist picks a favorite and explains why in plain English.
```

### P2.4 Floor plan for 26 seats (same session)
```text
Now the floor plan. The procurement-sme, world-artist and ux-architect work together.

1. Propose 2 floor plan options for 26 seats: Sr. Manager's Office, Leads' Row (4), CM Wing (11 in pods of 4, 4, 3), Ops Wing (10 in pods of 4, 4, 2), and every zone in vault.sample/office/zones.json. The Endorsement Bridge between the CM Wing and the Ops Wing is the hero of the layout, because it is the real PR handoff.
2. Draw each option at /lab/floorplan as a simple top-down diagram with colored rectangles and labels. Show the walking routes for the six workflows in data/workflows.json.
3. Screenshot both. Recommend one and explain why.

Do not build the full office yet, that is Phase 3.
```

### P2.5 Panel layout (same session)
```text
The ux-architect and ux-writer design the HQ panel at /lab/panel with mock data from vault.sample/:
- header with the product name, a live dot and "26 on the team"
- tabs: Needs you (with a count), Team, Board, Office
- the Needs You card list and the item detail view
- the stats HUD and the Walk around pill
- the instruction box at the bottom

Desktop first, 1280 to 1920 wide. Keyboard shortcuts for decisions. Plain-English copy with no em dashes. Screenshot it next to the diorama from P2.3 so we can judge them together.
```

### P2.6 Council review (same session)
```text
/design-council design lab: tokens, diorama, floor plan, and panel
```
Answer the council's questions.

### P2.7 Apply decisions and close the phase (same session)
```text
Apply my decisions: ___. Update docs/design/DESIGN_DIRECTION.md, the adi-theme skill (move approved values from "proposed" to final), the isometric-office skill (approved camera, scale and lighting values), and docs/DECISIONS.md. Make the changes in the Lab, re-shoot, and show me before and after.

Then /checkpoint Phase 2, and show me the merge steps.
```
Gate: merge to `main`, `/clear`.

---

## Phase 3. The office world
Where: `claude -w p3-office`

### P3.1 Plan the world (plan mode)
```text
Phase 3: build the office world from the approved floor plan and art direction. Read docs/design/DESIGN_DIRECTION.md, the isometric-office skill, and the chosen plan at /lab/floorplan.

The world-artist and r3f-engineer agree on one plan:
- the format of layout.json (floor, zones, walls, doors, windows, desk slots, landmarks) and its zod schema in packages/shared. The approved layout is committed at vault.sample/office/layout.json and the server copies it into vault/office/ when missing
- the component tree in apps/web/src/scene/
- instancing and the performance budget
- camera presets (Overview, CM Wing, Ops Wing, Sr. Manager's Office), zoom limits, and smooth moves

Show me the plan. No code yet.
```

### P3.2 Floor, walls, zones and desks (same session)
```text
Build it: the floor, cutaway walls, windows, subtle floor tints per zone, all 26 desk slots from layout.json, and zone labels that fade in when you zoom in. Use instancing for repeated furniture. Keep 60 fps on my Mac. Then pnpm shots for the overview and each camera preset, look at them, and show me.
```

### P3.3 Light, day and night, camera feel (same session)
```text
Now the mood: the approved lighting recipe, soft contact shadows, day and night themes that blend smoothly, and camera presets on keys 1 to 4 with smooth, eased moves. Respect prefers-reduced-motion. Add the r3f-perf overlay in dev only. Screenshot day and night, and tell me the FPS at the overview.
```

### P3.4 Landmarks and live props (same session)
```text
Add one clear landmark per zone: the Endorsement Bridge, SAP Station, Mail Dock, Contract Corner, Negotiation Room, Huddle Room, Merienda Corner, the Logistics Window with a small loading dock outside, and Reception with a "SignalChain HQ" sign (no company logo).

Props come from vault/office/accessories.json. When I edit and save that file, the office must update live without a page reload: the server watches the file and sends an office.updated event. Prove it: edit the file yourself, and show me before and after screenshots.
```

### P3.5 Council, checkpoint, merge (same session)
```text
/design-council office world
```
Then:
```text
Apply the Must fixes and the Should fixes I pick: ___. Re-shoot, then /checkpoint Phase 3 and show me the merge steps.
```
Gate: merge to `main`, `/clear`.

---

## Phase 4 and 5, in parallel
Open two VS Code terminals from the project root on `main`:
- Terminal A: `claude -w p4-team`
- Terminal B: `claude -w p5-panel`

Folder ownership: Phase 4 owns `apps/web/src/scene/characters/**`. Phase 5 owns `apps/web/src/ui/**` and `packages/shared/**`.

### Terminal A: Phase 4, the team

#### P4.1 Character generator
```text
Phase 4, the team. You own apps/web/src/scene/characters/** only. Do not edit apps/web/src/ui/** or packages/shared/**. If you need a shared schema change, stop and ask me.

Build a procedural voxel character generator from the approved Lab study: body parts, hair and outfit variations from a seed, and track badges (star, triangle, diamond, square) plus color so it works for colorblind users. Spawn all 26 seats from data/roster.template.json at their desk slots in layout.json. Use instancing where it helps. Screenshot the overview and a close-up of each wing.
```

#### P4.2 Name tags and status
```text
Add the name tag pills from the Lab: name, role, and status dot. Zoomed out, show only the dot and name. Zoomed in, add the role. Keep tags from overlapping badly with a simple nudge. Clicking a character focuses the camera on them and selects them. Expose a selectSeat(seatId) function and an onSeatSelected event in the scene so the panel can use them after the merge. Status comes from /api/state.
```

#### P4.3 Movement, behaviors, Walk around mode
```text
Make them alive:
- a navigation grid from layout.json with A* pathfinding and path smoothing
- walking with a gentle bob, idle breathing, typing at desks, "waiting on you" raises a hand with a small "!" bubble, on-break helpers walk to Merienda Corner
- a small behavior state machine per seat. When a seat's current workflow step has a zone in data/workflows.json (for example the SAP Station), the helper walks there, works for a moment, and returns

Then add Walk around mode: I control the Sr. Manager avatar with WASD or click-to-move, the camera follows, and walking near a teammate shows a small "Talk" hint (E opens their card later). Esc returns to the overview. Report FPS in walk mode.
```

#### P4.4 Council and checkpoint
```text
/design-council characters and movement
```
Then apply fixes and run `/checkpoint Phase 4`. Do not merge yet.

### Terminal B: Phase 5, the HQ panel

#### P5.1 Shell and HUD
```text
Phase 5, the HQ panel. You own apps/web/src/ui/** and packages/shared/**. Do not edit apps/web/src/scene/**.

Build the approved /lab/panel design as real components: header, tabs (Needs you, Team, Board, Office), the stats HUD, the Walk around pill, and the instruction box. Use a zustand store fed by GET /api/state and the SSE stream. Decisions are mocked for now, no writes. Use the motion tokens, keyboard support and visible focus states.
```

#### P5.2 Needs You and decisions
```text
Build Needs You: cards sorted by urgency, and the item detail view (status, from, workflow and step, supplier, date, summary, full content). Four decisions: Approve, Hold, Send back to <name>, Instruct, with shortcuts A, H, S, I and a 5-second undo toast. When an item was routed by the authority rule (data/authority-rules.template.json), show who must decide and why in one plain-English line. Email items show the draft and say "Approve creates a draft. Sending is a separate step."
```

#### P5.3 Team, Board and Office tabs
```text
Build the Team tab (grouped by Leads, CM, Ops, each row with status and what the helper is working on, expandable like the reference), the Board tab (To do, Doing, Waiting on you, Done today), and the Office tab (camera presets, day or night, accessory toggles, sound on or off, Demo Day placeholder). Put the selectSeat and onSeatSelected contract in packages/shared so the scene can plug in after the merge. Add honest empty states that name the data source.
```

#### P5.4 Council and checkpoint
```text
/design-council HQ panel
```
Then apply fixes and run `/checkpoint Phase 5`. Do not merge yet.

### P45 Merge both and integrate
Where: new session in the main checkout on `main`.
```text
Phases 4 and 5 are done in their worktrees. Using the worktree-flow skill:
1. Merge worktree-p5-panel into main first, then run pnpm install and pnpm check.
2. Merge worktree-p4-team. If there are conflicts, explain each one to me in plain English and wait for my choice.
3. Connect the halves: clicking a person in the Team tab calls selectSeat, and clicking a character opens their card in the panel. E in Walk around mode opens the card too.
4. Run pnpm shots, look at the images, show me, and stop.
```
Then type these two as separate messages:
```text
/design-council integrated HQ, office and panel together
```
```text
Apply the Must fixes and these Shoulds: ___. Then /checkpoint Phases 4 and 5.
```
Gate: `/clear`, remove both worktrees.

---

## Phase 6. Live data and Demo Day
Where: `claude -w p6-live`

### P6.1 The vault becomes live (plan first)
```text
Phase 6: make it live. Read docs/ARCHITECTURE.md and the data-and-vault rules. Plan first, then build with the integration-engineer:
1. The server loads the whole vault into memory at start, watches it with chokidar, validates every file with zod, and pushes SSE events on change. Writes are atomic, and the watcher ignores our own writes. A broken file shows a warning, never a crash.
2. POST /api/queue/:id/decision with approve, hold, send-back (note), and instruct (text). It updates the item's frontmatter and body, the seat's status, and appends to vault/log/<date>.md.
3. POST /api/instructions saves to vault/instructions/.
4. "Open in Obsidian" on each item, using the obsidian:// URL scheme and OBSIDIAN_VAULT_NAME from .env.
Add Vitest tests for the server and one Playwright flow that approves an item end to end.
```

### P6.2 Demo Day simulation (same session)
```text
Build Demo Day mode, off by default, toggled in the Office tab. It runs on its own copy of the vault in vault-demo/ (gitignored, reset at every start) so my live vault stays clean. It simulates the six workflows in data/workflows.json with fictional data only (suppliers from the procurement-domain skill, reserved .example email domains). It creates tasks, sends helpers to the right zones, performs the CM to Ops endorsement at the Endorsement Bridge, applies the authority rule, and creates Needs You items at the steps where a human must decide. Speed 1x, 5x, 20x. Seeded, so the same seed replays the same day. Ask the procurement-sme to review a sample of generated items for realism and fix what it flags.
```

### P6.3 Playtest and checkpoint (same session)
```text
Ask the qa-playtester to play Demo Day for 10 simulated hours at 20x as a busy Sr. Manager with 5 minutes between meetings. Report what felt confusing, slow, or fake. Fix the top 3. Then /checkpoint Phase 6 and show me the merge steps.
```

---

## Phase 7. Outlook
Before you start: do `docs/OUTLOOK_SETUP.md` steps 1 to 5 yourself. Then `claude -w p7-outlook`.

### P7.1 Plan (plan mode)
```text
Phase 7: Outlook. Read the outlook-integration skill and docs/OUTLOOK_SETUP.md. I finished setup steps 1 to 5. My .env has MAIL_PROVIDER=graph and MAIL_MODE=drafts. You cannot read .env, so ask me if you need to know a value.

With the integration-engineer, plan: the MailProvider interface, the outbox, graph, and power-automate (stub) drivers, token storage, the safety rules (MAIL_MODE, allowlist, redirect, limit, log), and a Mailroom tab (status, account, drafts, sent log, digest settings). Show me the plan.
```

### P7.2 Outbox driver first (same session)
```text
Build the outbox driver first, it must work with no sign-in: approving an email item creates an .eml draft in vault/outbox/ and shows "Open in Outlook" (mailto with subject and body), "Copy email", and "Download .eml". Tests included. Make MAIL_PROVIDER=outbox the default when nothing is configured.
```

### P7.3 Sign-in and drafts with Graph (same session)
```text
Now the graph driver:
1. Sign-in with MSAL Node: authorization code flow with PKCE, redirect to /auth/callback on the same localhost origin the browser uses (the Vite proxy forwards it to the server), token cache in the macOS Keychain through @azure/msal-node-extensions, with a .secrets/ fallback and a visible warning. The Mailroom tab shows the connection status, the signed-in account, and Sign out.
2. Approve on an email item creates a real draft in my Outlook Drafts (POST /me/messages) and shows "Open draft in Outlook" using the webLink.
3. A separate Send now button sends it (POST /me/messages/{id}/send) only when MAIL_MODE=send, and either every recipient is in MAIL_ALLOWED_RECIPIENTS or MAIL_REDIRECT_TO is set to an address that is itself in the allowlist. The confirm dialog lists the real recipients. Log every send.
4. Handle 401 (sign in again) and 429 or 503 (respect Retry-After) gracefully.
Tell me when to do the browser sign-in. I will do it myself.
```

### P7.4 Inbox to task, and the daily digest (same session)
```text
Two features:
1. Inbox to task: every HQ_INBOX_POLL_SECONDS, check for new inbox emails whose subject starts with HQ_INBOX_TAG. Read only id, subject, sender and time for the list, and open the body only for tagged emails. Turn each into a Board task for the right seat (simple keyword rules, Ops by default) and make that helper walk to the Mail Dock.
2. Daily digest: at DIGEST_TIME in Asia/Manila, or with a "Send digest now" button, build a clean HTML email from today's log (What needs you, What the team finished, Handoffs, Tomorrow) with inline CSS from our tokens and the footer "Sent from SignalChain HQ, an unofficial prototype. Fictional data." Same safety rules as any send.
```

### P7.5 Security review and checkpoint (same session)
```text
Run a security and privacy review with the integration-engineer and brand-guardian in parallel: no secrets or tokens in git or logs, minimal scopes, allowlist and redirect enforced on the server, plain-English errors, no real ADI data, the "Unofficial prototype" label present, and nothing that tracks real people. Fix the findings. Then /checkpoint Phase 7 and show me the merge steps.
```

---

## Phase 8. Polish and v0.1.0
Where: `claude -w p8-polish`

### P8.1 Full council sweep
```text
/design-council full app, as a first-time visitor and as a busy Sr. Manager
```
Then: "Fix every Must, and these Shoulds: ___."

### P8.2 Performance and accessibility (same session)
```text
Performance and accessibility pass with the qa-playtester and r3f-engineer: measure FPS at the overview and in Walk around mode, cut draw calls if needed, lazy load heavy parts, then check keyboard-only use, focus order, contrast, reduced motion, and screen reader labels in the panel. Report before and after numbers.
```

### P8.3 First-run experience (same session)
```text
Add a 4-step first-run tour (the office, your team, Needs you, Outlook), friendly empty states, and a help sheet with every keyboard shortcut. The ux-writer writes all copy in plain English with no em dashes, and the brand-guardian checks it.
```

### P8.4 Release (same session)
```text
Update README.md with 3 screenshots, a 20-second demo GIF (Playwright video converted to GIF is fine), and how to run. Then /checkpoint Phase 8. Ask me before tagging v0.1.0 and before pushing.
```

---

## Anytime prompts
- Define a role: `/define-role cm-03` or `/define-role OPS`
- One opinion: `Ask the ux-architect subagent to review the Needs You tab and list the top 3 fixes.`
- Where are we: `Read docs/PROGRESS.md and docs/DECISIONS.md and tell me in 5 lines where we are and what is next.`
- Something feels off: `Ask the qa-playtester to reproduce this: ___. Then explain the cause in plain English before fixing it.`
- Sole contributor check: `Run bash scripts/verify-sole-contributor.sh and explain the result.`

## Later prompts (after v0.1.0)
- `Plan how helpers could draft real content. Compare the Claude API for my personal prototype with Microsoft Copilot or Copilot Studio for anything ADI-facing, on cost, privacy, and effort. No code.`
- `Compare Tauri 2 and Electron for wrapping SignalChain HQ as a desktop app on macOS and Windows. No code.`
- `Design a phone layout that only does Needs You decisions. Lab first.`
- `Map the Procurement360 modules (Helpdesk, Savings, Projects, Policies, Contracts, Market Intelligence) to rooms in the office. Council review first.`
