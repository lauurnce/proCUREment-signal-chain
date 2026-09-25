# Design references

Images are in `docs/references/private/` (gitignored so they never reach GitHub, and copied into every worktree by `.worktreeinclude`). This file describes them in words so the intent survives even without the images.

Golden rule: **borrow patterns, never pixels.** No copying of images, characters, names, stock art, or logos.

## Set A: the "AI team HQ" demo (screenshots from a Facebook video, Sep 2026)

A founder built a virtual office where her AI agents (each with a name and a job) work at desks. She approves their outputs from a panel and chats with a "COO" agent in Telegram. Data lives in markdown files she opens in Obsidian.

| File | What it shows | Borrow | Change for us |
|---|---|---|---|
| `ref-01-office-overview-walk-around.jpg` | Isometric cutaway office on a green background, rows of small cubicles, floating white name pills (name, role, colored status dot), a "Walk around" pill at top, a stats card at bottom right, low-poly trees outside | Diorama framing, name pills, "Walk around" entry, stats card, calm backdrop | ADI palette backdrop, our zones and 26 seats, original furniture and characters |
| `ref-02-team-tab.jpg` | Panel: title with live dot, "9 on the team" chip, tabs NEEDS YOU (count 12), TEAM, BOARD, OFFICE, a list of people with role and status ("working", "waiting on you"), an instruction box with a "Send to my inbox" button | Tab set, count badge, list rows, instruction box | Group by Leads, CM, Ops. Button becomes "Send to the team" |
| `ref-03-office-angled-view.jpg` | Rotated isometric view with a gym area where off-duty agents stand | Rotation snaps, an off-duty zone | Our off-duty zone is Merienda Corner |
| `ref-04-stats-hud.jpg` | Big numbers with small mono labels: 6 WORKING, 3 IN THE GYM, 8 OPEN TASKS, 14 ACCESSORIES | Number plus label pattern | Our stats: working, on break, needs you, open tasks, handoffs today |
| `ref-05-desks-and-name-tags-closeup.jpg` | Close-up of chunky voxel characters at cubicle desks with name pills | Character scale and chunkiness, desk dividers | Original character design, track badges |
| `ref-06-teammate-working-on.jpg` | Expanded person card: "Working on" list with item titles and tags (client and status) plus "Instruction for Paige" box | Expandable card, per-person instruction box | Items show workflow and step |
| `ref-07-teammate-empty-state.jpg` | "Nothing of Mike's is in the queue or on the board right now" and the data source "Review Queue + tasks.md" | Honest empty state that names the data source | Same honesty, our wording |
| `ref-08-item-detail-decision.jpg` | Item detail: title, status, client, from, dated, summary links ("Read the full report", "Open in Obsidian"), decision buttons Approve, Hold, Send back to Paige, Instruct | Detail layout, the four decisions, Obsidian link | Add the authority rule line when it applies, drafts-first for emails |
| `ref-09-needs-you-list.jpg` | Needs You cards with a DECIDE tag, date, title, "from and client" line, and the four buttons on each card | Card anatomy, inline actions | Keyboard shortcuts A, H, S, I and a short undo |
| `ref-10-instruct-only-cards-and-board.jpg` | Cards that only offer "Instruct", then a BOARD section with tasks | Card variant for items that need guidance, board preview | **Do not borrow the use case**: those cards are an HR agent checking staff hours. We never monitor people |
| Not stored | Telegram chat with the "COO" agent: a morning summary, what needs decisions, and a question with a recommendation | Morning summary with a clear recommendation | We do this as an Outlook daily digest. We do not copy the HR monitoring content |

The footer text in `ref-01` says the office "edits accessories.json and the ship updates by itself". That inspired our live `accessories.json`.

## Set B: isometric office illustrations (stock style, mood only)

| File | What it shows | Borrow |
|---|---|---|
| `ref-11-isometric-room-style.jpg` | One cutaway room: big window wall, light wood desks, red chairs and dividers, shelves, copier, water dispenser, clean flat shading | Cutaway walls, window light, prop density, clean shading |
| `ref-12-isometric-multi-room-style.jpg` | Several rooms in one cutaway: reception with sofa, meeting room with round table, cubicle area, navy walls | Room zoning, navy walls (fits our palette), reception and meeting room ideas |

## Our own brand anchors
- The program deck theme (navy, accent blue, Quattrocento Sans, accent bar under titles). See the `adi-theme` skill.
- The Sr. Manager's own vision image for "Procurement360": a dark blue command center with many dashboards. Our night mode can nod to it.

## What makes ours different
1. Real workflows shape the space: the Endorsement Bridge, SAP Station, Mail Dock, Contract Corner.
2. AI helpers mirror real roles, and the app never watches real people.
3. Outlook is the channel, because that is what the team uses every day.
4. ADI-inspired, clearly unofficial, fictional data.
