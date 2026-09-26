# Screen-only exceptions to the deck palette

Status: approved by Lawrence on 26 Sep 2026, all 14 (D-011). Written 26 Sep 2026 by the brand-guardian for P2.2.

The program decks use 8 colors, one font, no shadows. A screen app needs a few more things: readable secondary text, status colors, track colors, a label font and one shadow. This page lists every one of them, so you can approve them together or change some. In code they live in `apps/web/src/theme/tokens.ts`, and the `screenOnly` list there marks them "Needs approval" in the Lab.

How to read the numbers: contrast is the WCAG 2.2 ratio, computed with the relative luminance formula. Text needs 4.5:1 (3:1 if large, 18.66 px bold or 24 px). Icons, dots, badges and borders need 3:1. White is #FFFFFF, panel is #F2F4F7, navy is #12284C.

## Colors

| # | Token | Value | Why we need it | On white | On panel | On navy | Where it may be used |
|---|---|---|---|---|---|---|---|
| 1 | `inkMuted` | #4B5565 | Secondary text. Deck `footer` grey is only 2.58:1, too low to read | 7.54 | 6.84 | 1.94 (fail) | Small text, name tag roles, mono labels, "Unofficial prototype · Fictional data". Light surfaces only. On navy use `blueLight` |
| 2 | `statusWorking` | #1A7F50 | "Working" dot, and the Approve button (D-026) | 5.01 | 4.54 | 2.93 (fail) | Filled dot with the word "Working". Approve button fill with white text (white on it: 5.01). Never as body text |
| 3 | `statusWaiting` | #B45309 | "Waiting on you" dot with "!", the one status that asks for action | 5.02 | 4.56 | 2.92 (fail) | Dot with "!", count badges, short warning text on white or panel |
| 4 | `statusMeeting` | #0067B9 (same as accent) | "In a meeting" dot | 5.77 | 5.24 | 2.54 (fail) | Pair of dots (big and small), its own shape, so it never depends on color |
| 5 | `statusBreak` | #0067B9 (same as accent) | "On break" ring, a different shape from meeting | 5.77 | 5.24 | 2.54 (fail) | Hollow ring with the words "On break" |
| 6 | `statusOff` | #98A2B3 (same as footer) | "Off duty", calm and quiet | 2.58 (below 3:1) | 2.34 (below 3:1) | 5.69 | Hollow ring, only next to the words "Off duty". Allowed only because the text carries the meaning. Never alone |
| 7 | `trackMgr` | #12284C (same as navy) | Sr. Manager badge | 14.65 | 13.29 | not used | Star badge |
| 8 | `trackLead` | #0067B9 (same as accent) | Leads badge | 5.77 | 5.24 | 2.54 (fail) | Outline triangle that points up, never inside a filled square |
| 9 | `trackCm` | #A8841A | Category Managers, gold as in the program roadmap | 3.51 | 3.19 | 4.17 | Diamond badge, bars and card rules. Not text (below 4.5:1) |
| 10 | `trackCmWorld` | #C9A227 | Brighter gold that reads well under 3D light | 2.42 (below 3:1) | not used | not used | 3D world only: folder tabs, CM props. Never in the UI. On the oak floor #E6D3B3 it is only 1.65:1, so gold objects need a navy or white edge to stand out |
| 11 | `trackOps` | #1F8A8A | Ops Buyers, teal (moved away from green so it never looks like "Working") | 4.15 | 3.77 | 3.53 | Square badge, bars and card rules. Not text (below 4.5:1) |

On navy (night mode): status dots and the Leads badge fail 3:1 on navy. In night mode, always place them on a white name pill or a white chip, never straight on navy.

Colors 4 to 8 reuse deck hex values in a new role. They are listed because the role is new, not the color.

## Font

| # | Token | Value | Why | Contrast | Where it may be used |
|---|---|---|---|---|---|
| 12 | `font.mono` | IBM Plex Mono 500, self-hosted | The deck has one font. Small UPPERCASE labels, IDs and numbers read better in mono, and it gives the "command center" feel | Same as its color: navy 14.65, inkMuted 7.54 on white | Only 10 or 11 px UPPERCASE labels, tabs, IDs (PO and PR numbers), counts. Letter spacing 0.08em. Never titles, body text or buttons |

## Shadow

| # | Token | Value | Why | Where it may be used |
|---|---|---|---|---|
| 13 | `shadow.float` | `0 8px 24px rgba(18, 40, 76, 0.12)` (navy at 12 percent) | The deck has no shadows. Things that float over the 3D scene need a soft edge to separate from it | Only small overlays on the 3D scene: stats bar, toasts, health badge, name pills. Not on the docked panel (D-025), not on cards |

## 3D world palette

| # | Token | Why | Where it may be used |
|---|---|---|---|
| 14 | `world.*` (floor, walls, plants, lights, backdrops) | A warm, readable diorama needs wood, plant and light colors the deck does not have | 3D materials and the page background only. Never in UI chrome. The world-artist writes the full list; it follows the same approval |

## Not exceptions

These come straight from the deck and need no approval: navy, accent, blueMid, blueLight, panel, ink, footer, hairline, white, Quattrocento Sans. Radii, spacing and motion values are layout rules, not palette changes (motion values were approved in D-030).

## Your call

- **Approve all:** I mark D-011 "Accepted" and remove the "Needs approval" marks in the Lab.
- **Change some:** tell me the row numbers. The likely ones to discuss are row 6 (off duty grey is below 3:1, safe only with its text label; the other choice is `inkMuted` for the ring) and row 10 (world gold, which needs an edge on the oak floor).
