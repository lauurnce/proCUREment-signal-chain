# Demo Day playtest, P6.3 (13 Oct 2026)

Tester: qa-playtester. Branch `worktree-p6-live`. Throwaway vault (`HQ_VAULT=vault-e2e`), Demo Day on `vault-demo/`.

## Summary

One scripted run: seed 42, 20x, 1440x900, headless Chromium with software WebGL. Sim day 08:03 to 18:18 (about 31 real minutes). The "busy Sr. Manager" opened Needs you once per sim hour (09:00 to 18:00) for a 5 sim minute window, pressed A for most items and H or S now and then, and was away in between.

The decision flow itself is fast and calm: 2 items cleared in about 4 real seconds with the A key, no errors. The problems are around it. Time is not visible, Hold quietly turns into Approve, the log mixes real and simulated time, and the helpers approve their own work.

Health: yellow. No console errors, but two logic bugs (Hold, timestamps) make the demo say things that are not true.

## Numbers

| What | Value |
|---|---|
| Items for you in 10 sim hours | 9 (0.9 per hour, peak 2 at 11:00, 0 in 5 of 10 windows) |
| Mix of items for you | 6 "missed a second firm date" follow-up drafts (4 of them MetroPack), 2 escalations (cap is 2, `MAX_ESCALATIONS`), 1 daily digest |
| Longest wait for you, seen at a window | 40 sim minutes (q-1174, 17:20 to 18:00) |
| Typical wait for you | 7 to 32 sim minutes, set by the hourly check-in |
| Team items (decided by the sim) | 189 raised, 171 approved, 15 sent back |
| Team items approved by the same seat that raised them | 155 of 171 (for example "cm-03 approved q-1016 from cm-03") |
| My decisions saved | 9 approve, 1 hold (2 extra key presses landed on an empty list and did nothing) |
| Console | 0 errors, 0 failed requests, 0 HTTP errors, 1 warning once at load: `THREE.Clock: This module has been deprecated` |
| FPS | Not measured. Software WebGL runs at about 3 fps, so numbers would mean nothing. |

Evidence: screenshots in `docs/qa/shots/2026-10-13-playtest/` (h08 to h18), log `vault-demo/log/2026-10-13.md`.

## Confusing

1. **No clock and no "this is a demo" signal outside the Office tab.** The header shows a green "Live" dot during a simulated day. The sim time is only in the Demo Day switch hint, deep in the Office tab. The office stays in full daylight at 18:18. A manager glancing for 3 seconds cannot tell if this is real or simulated, or what time it is. Where: `PanelHeader.tsx` (live dot), `OfficeTab.tsx:121`. Fix: a "Demo Day 14:03, 20x" pill next to Live (or replacing it), and drive day and dusk from the sim clock.
2. **Three "waiting" counts that disagree.** At 18:18 (`h18-board.png`): header says 1 Needs you and 3 Waiting on others, Board says "Waiting on a decision 0". At every window 5 to 9 helpers had status `waiting-on-you` and orange "!" tags, while Needs you said "All clear". Fix: Board column counts open queue items, or rename it to match tasks only. Use one word for "waiting on a CM or Lead" across tags, stats and Board.
3. **Hold looks like a pause but acts like a slow Approve.** After 45 sim minutes a held item continues as if approved, including the Endorsement Bridge handoff. Where: `apps/server/src/sim/engine.ts` about lines 228 to 245 (`heldUntil`, then `afterDecision` and `enterStep`). For a draft email, "Hold" should never lead to the next step. Fix: a held item stays waiting until you decide again, or the helper sends a reminder item.
4. **Dev only: the r3f-perf overlay covers the Board and Office tabs at 1440x900.** The first run could not click the Office tab. Where: `apps/web/src/scene/Scene.tsx:34`, `PerfOverlay.tsx` (`position="top-right"`). Fix: move it to bottom-left, or off by default with `?perf=1`.

## Slow

5. **Long empty stretches.** 5 of 10 hourly visits found nothing for you, and the busiest hour had 2 items. At 20x a 5 minute demo shows about 1 or 2 decisions. For Demo Day this is too quiet to show the value of the panel. Fix: seed a few more "needs you" moments (a price change above threshold, a supplier dispute), spread across the day.
6. **The day does not end.** Items still arrived after 18:00 (q-1187, q-1188 at 18:10, q-1189 at 18:17) and the sim was still running at 18:18. The digest arrived at 16:30, before 4 more items for you. Fix: stop at 18:00 with a short "Day done" card (decisions, handoffs, what still waits), and draft the digest last.

## Fake

7. **Your decisions are stamped with the real clock, not the sim clock.** The demo log shows "17:33 you approved q-1187" right after "18:10 ops-01 raised q-1187". The log is out of order and the item was approved 37 minutes before it existed. The undo message uses real time too. Where: `apps/server/src/vault/decide.ts:67` (`at = new Date()`), `Panel.tsx:218` (`clockTime(now)`). Fix: when Demo Day runs, pass the sim clock to decide and to the panel.
8. **Helpers approve their own work.** 155 of 171 team approvals read "cm-03 approved q-1016 from cm-03". A procurement viewer reads this as no separation of duties. All 15 send backs have the same note "Please add the missing details and send it again." Fix: route team items to another seat (CM to Lead, Ops to CM per the authority rule) and vary the notes.
9. **Repetitive items for you.** 6 of 9 were the same template, "X missed a second firm date: OK a firmer follow-up?", 4 of them MetroPack. The digest body is a placeholder with no numbers. Idle helpers all say "Clearing the inbox". "In a meeting" never appears (0 all day). Fix: more templates and suppliers per seed, a digest with real counts from the log, a few varied idle lines.

## Privacy flag (could look like monitoring real people)

The demo log records, to the minute, that a seat id like `cm-03` or `ops-07` approved or sent back work. Seat ids stand for real roles, and `data/roster.local.json` can map them to real names. Read later, "10:06 ops-07 sent back q-1023" looks like a record of what a person did and when. Fix: write sim decisions as "Demo reviewer for CM 03 helper (simulated)", never as the seat, and keep the word "helper" in every log line.

## Ranked top 5

| Rank | Issue | Severity |
|---|---|---|
| 1 | Hold turns into Approve after 45 sim minutes (#3) | high |
| 2 | Decisions stamped with real time, log out of order (#7) | high |
| 3 | Sim decisions attributed to seat ids, plus self-approval (#8 and privacy flag) | high |
| 4 | No sim clock or Demo badge, "Live" shown during a simulation (#1) | medium |
| 5 | Waiting counts disagree across header, Board and name tags (#2) | medium |

Not covered: Send back through the UI (both S presses landed on an empty list), reduced motion, other viewports, FPS on real hardware.

## Fixed in P6.3

- Finding 1, a hold turned into an approval: fixed. The helper reminds you after an hour and the item comes back to Needs you (D-114).
- Finding 2, decisions used the real clock: fixed. In Demo Day the server and the panel use the simulated clock (D-115).
- Finding 3, simulated decisions read like a person's activity: fixed. The log names a kind of decider, never a seat (D-116).
- Findings 4 and 5, and the smaller notes, are carried to Phase 8 (see `docs/PROGRESS.md`).
