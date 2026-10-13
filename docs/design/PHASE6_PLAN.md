# Phase 6 head start: live data and Demo Day

Written 30 Sep 2026 at the end of P45, so the `p6-live` session starts warm. Start on your Mac:
`git checkout main && git pull && pnpm install`, then `claude -w p6-live` and paste P6.1 from `docs/PROMPTS.md`.

## Where things stand on `main` (d3b06e9)
- Phases 0 to 5 done and merged. Office and panel are connected through the office link (`packages/shared/src/office-link.ts`, D-097, D-099).
- The server already has: `vault/store.ts` (loads the vault), `vault/watch.ts` (chokidar, `isIgnored`), `vault/events.ts` (`eventForChange`, snapshot or `office.updated`), `sse/hub.ts`, routes `health`, `state`, `events`, and the 127.0.0.1 Host check (`security/host.ts`). About 500 lines, read only today.
- Decisions in the panel are mocked (`panelStore.decide`, "Demo: decisions are not saved yet."). The undo bar and 5 s undo already exist (D-047).
- `.env.example` already has `OBSIDIAN_VAULT_NAME` and `MAIL_MODE=drafts`. `vault-demo/` is already in `.gitignore`.

## P6.1 plan (the vault becomes live)
1. **Writes:** `vault/write.ts` with atomic writes (write a temp file, then rename) and a short "our own write" list, so the watcher ignores its own changes (add it to `isIgnored` or a time-boxed set).
2. **Decision route:** `POST /api/queue/:id/decision` with a zod body: `approve | hold | send-back (note) | instruct (text)`. It updates the item frontmatter and body, the sender seat's status, and appends one line to `vault/log/<date>.md`. It returns the new state; the SSE event follows from the watcher.
3. **Instruction route:** `POST /api/instructions` saves `vault/instructions/<stamp>.md`.
4. **Panel:** swap the mocked `decide` for the route, keep optimistic UI and the 5 s undo (undo calls the route with the previous state). Remove "Demo: decisions are not saved yet."
5. **Obsidian:** "Open in Obsidian" link per item, `obsidian://open?vault=<OBSIDIAN_VAULT_NAME>&file=<path>`, hidden when the name is empty. The web never reads `.env`; the server sends only the vault name in `/api/state`.
6. **Tests:** Vitest per route (valid, invalid body, unknown id, broken file stays a warning), and one Playwright flow: approve an item, see it leave Needs you, see the log line.

## P6.2 notes (Demo Day)
- Off by default, a switch in the Office tab. Runs on `vault-demo/`, copied fresh at every start.
- Seeded random (reuse the `seededRandom` idea from `scene/characters/appearance.ts`), speeds 1x, 5x, 20x.
- Only fictional suppliers from the `procurement-domain` skill and `.example` email domains.
- The helpers already walk to the zone of their current step (`behavior.ts`), so the simulator only has to move `currentWorkflow` and `currentStep` and create queue items.
- Authority rule thresholds are not confirmed yet (D-107): keep them in data and mark items "Rule not confirmed yet".

## Saving money
- Use 3 council members, not 7, unless the change is visual.
- Take shots only for the pages that changed (`pnpm exec playwright test --project=shots --grep <name>`), in short runs.
- Open questions to settle first: the Outlook test account (Phase 7), Lead coverage, the pnpm release-age exceptions.
