# HQ panel spec (P2.5, /lab/panel)

Author: ux-architect. Status: draft for P2.5, 26 Sep 2026. Copy here is a working draft. Final words come from `copy.md` (ux-writer). Built on D-025, D-027, D-028, D-030, D-031, D-032, D-033.

## 1. Page layout

**Panel width:** `clamp(440px, 36vw, 600px)`. The camera measures the real width and centers its target in the free area (the scene left of the panel).

| Viewport | Panel | Free area |
|---|---|---|
| 1280 x 800 | 461 px | 795 px |
| 1440 x 900 | 518 px | 898 px |
| 1920 x 1080 | 600 px | 1296 px |

- **Scene:** the canvas fills the whole window. The camera uses a view offset, so a width change never reflows the canvas.
- **Panel:** docked right, 12 px from the top, right and bottom edges. White, 1 px hairline border, 14 px corner, no shadow (D-033).
- **Over the scene** (all inside the free area, 24 px from its edges, `shadow-float`, 20 px corner):
  - Top left: the stats HUD. Four numbers: Needs you, Helpers working, Open tasks, Handoffs today (hidden until the data exists). Team numbers only. "Needs you" is a button that opens that tab. Compact version at 1280 (cells 112 px wide).
  - Bottom center: the "Walk around" pill. In the Lab it shows a short note ("Walk mode comes in Phase 4").
  - Bottom right: camera buttons (zoom in, zoom out, rotate left, rotate right, Overview), 32 px each.
  - Bottom left: "Unofficial prototype · Fictional data", a link that opens About.
- **Panel regions, top to bottom:**

| Region | Height | Content |
|---|---|---|
| Header | 56 | "SignalChain HQ" (app title), live dot plus word, "26 on the team", About button |
| Tabs | 48 | Needs you (count), Team, Board, Office. Mono labels, accent underline on the selected tab |
| Tab body | fills the rest, scrolls | The only part that scrolls |
| Instruction box | 104, pinned | See section 4 |

At 1280 x 800 the tab body is about 570 px: the focused card plus one list card.

**Selection stays in sync.** J/K or a click on a card highlights that helper in the office (ring plus full name pill). The camera does not move on every J/K. It glides only on Enter, "Show on the map", or when the helper is off screen. A click on a helper in the office opens the Team tab with that row open. The camera target always lands in the free area, never under the panel.

## 2. Needs you

**Filter** (segmented control under the tabs, 44 px): "You decide · 3" (default) and "Team items (demo) · 1".
- Default: items where `approver` is `mgr-01`.
- Team items: all other `needs-you` items. Each card carries the chip "Deciding as CM 02 (demo)". The seat comes from the item's `approver`. (D-027 text says CM 03 as an example, and the sample item q-0003 names CM 02.)
- The tab count and the HUD always show the default filter only.
- Sort: oldest first. Nothing is red. Held items go in a closed "Held for later (1)" section at the end of the list and do not count.

**List card** (not focused, about 112 px, 14 px corner, panel fill):
1. Mono label: workflow and step ("PO amendments · Step 3 of 4"). Right side: received time ("8:40 AM", or "24 Sep" when older).
2. Title, 17/24 bold, max 2 lines, then cut with an ellipsis.
3. Small line: track badge, "From Ops 03 helper", then the supplier. One line, cut with an ellipsis, full text in a tooltip.
4. Chips, only when they apply: "Email draft", "Rule not confirmed yet", "Deciding as CM 02 (demo)".
5. Right side: one "Decide" button (32 px high). It makes this card the focused card.

A click on the title opens the item detail.

**Focused card** (one at a time, the first card on load): the existing `DecisionCard`. Accent bar, workflow line and chips, title, facts (Supplier, From, Decides), "Why this came to you", "Helper suggests", then the four decisions in a 2 x 2 grid with their key hints. Button labels may wrap to 2 lines. Never cut "Send back to Ops 03 helper". Add a small "Open details (Enter)" link under the title. When a card becomes focused, it grows in place (220 ms, D-030 60 ms content fade). The card before it shrinks back.

**Item detail** (replaces the list inside the tab body):
1. Top bar: "Back" (Esc), "2 of 3", previous and next (K, J).
2. Workflow line and chips.
3. Title (panel title style with the 28 x 3 accent bar).
4. Facts: Supplier, From, Decides, Received ("25 Sep 2026, 8:40 AM"), and the rule when there is one.
5. Why this came to you.
6. The body sections in file order. Known headings get their own look: Summary, What the helper checked (checklist), Options (numbered list), Recommendation from the helper, and tables (scroll sideways, first column fixed).
7. **Email draft preview** (`email-draft` only), a white box with a hairline border:
   - To (every address shown, never "+2")
   - Cc, only when it has addresses
   - Subject
   - Body, 15/22. A placeholder signature gets a chip: "Placeholder, added when sent".
   - Footer line: "Unofficial prototype · Fictional data".
   - For email items, Approve means "save as a draft". Sending is a separate second step that lists every recipient. It comes in Phase 7, and in the Lab it shows as a disabled button with that note.
8. "Helper notes", closed by default.
9. "Open the file" (tooltip: "Opens in Obsidian").
10. A sticky decision bar at the bottom of the detail with the four decisions in 2 x 2.

**After a decision:** the card leaves the list (220 ms). The next card becomes focused, or the one above if it was the last. In the detail view, the next item's detail opens. When nothing is left, the list shows the empty state.

## 3. Team, Board and Office

**Team.** Helpers only. Group headers are sticky mono labels: "SR. MANAGER · 1 HELPER", "LEADS' ROW · 4", "CM WING · 11" (with sub-headers CM pod A, B and C), "OPS WING · 10" (with its pods). A toggle at the top switches between "All" and "Waiting on you".
- Each row is 64 px: track badge, "CM 03 helper" and its nickname, the status chip (D-032 shapes), `workingOn` ("Endorsing approved PRs to Ops"), and workflow and step in small text.
- Rows that are "Waiting on you" get a "See item" link that opens Needs you on that card.
- A click opens the row in place: bio, what needs a human decision, workflows, "Instruct this helper" (sets the To field), and "Show on the map".
- Never shown: counts per helper, time, "last active", "online", or any ranking.

**Board.** A vertical list in status sections: Waiting, Doing, To do, and Done (Done is closed by default). Waiting comes first because that is where she can unblock work. Each section shows its task count.
- Each task shows: the title (2 lines max), a track badge with "Ops 07 helper", the workflow name, and "Due 25 Sep 2026".
- An overdue task gets a clock icon and the word "Overdue", never color alone.
- Filter chips: All, CM, Ops, Leads.

**Office.**
1. Camera presets: 4 buttons with their keys: 1 Overview, 2 CM Wing, 3 Ops Wing, 4 Sr. Manager's Office.
2. Zones, grouped:
   - Work areas: CM Wing, Ops Wing, Leads' Row, Sr. Manager's Office.
   - Shared stations: Endorsement Bridge, SAP Station, Mail Dock, Contract Corner, Negotiation Room, Huddle Room, Logistics Window.
   - Arrive and rest: Reception, Merienda Corner.
   Each zone gets a one-line purpose and a "Show" button.
3. Light: Day, Night.
4. "How to move the camera": drag to pan, scroll to zoom, Q and E to rotate, 1 to 4 for presets, or use the buttons at the bottom right of the office.

## 4. Instruction box

Pinned at the bottom of the panel. Row 1: the To picker, plus an "About: q-0003" chip when it is tied to an item (with an x to remove it). Row 2: a text field (2 lines, grows to 5) and the send button.

- **The To picker** is a combobox with search. Groups:
  - One helper: search by seat or nickname.
  - Pods: CM pod A (4 helpers) and the others.
  - Wings and rows: CM Wing (11 helpers), Ops Wing (10), Leads' Row (4).
  - Everyone (26 helpers).
- **Default audience.**
  - With a focused Needs you card, To is the helper the item came from, and the item is attached.
  - With a selected Team row, To is that helper.
  - Otherwise To is empty and the button reads "Choose who to send to" (disabled).
  - Never default to Everyone.
- **The button names the audience:** "Send to Ops 03 helper", "Send to CM pod A (4 helpers)", "Send to CM Wing (11 helpers)", "Send to everyone (26 helpers)".
- **I (Instruct)** moves focus here with the item attached, plus up to 3 suggestion chips for the step ("Ask for a cost breakdown").
- **Keys:** Enter sends, Shift+Enter adds a new line, Esc leaves the box (the text is kept) and goes back to the last card.
- **After sending:** the undo bar appears. Lab only: "Ready for Ops 03 helper (Lab, not sent)".

## 5. Keyboard

Shortcuts fire only when focus is inside the panel and not in a text field, the picker, or a dialog (D-031). Camera keys 1 to 4, Q and E work anywhere except while typing. W A S D work only in walk mode.

| Key | Action |
|---|---|
| Left and Right arrows, Home, End | Move between tabs (when a tab has focus) |
| `[` and `]` | Previous or next tab, from anywhere in the panel |
| J and K (also Down and Up in the list) | Next and previous card, or item in the detail view |
| Enter | Open the item detail |
| Esc | Back one step: close help, close picker, detail to list, list to clear highlight |
| A, H, S, I | Approve, Hold, Send back, Instruct on the focused card |
| U (also Cmd+Z outside text fields) | Undo the last decision while the bar shows |
| ? | Key list (a dialog). It also has a switch that turns off single-key shortcuts |

No key ever sends an email.

**Focus order:**
1. "Skip to Needs you" link
2. Panel header (About)
3. Tab list (one stop)
4. Filter
5. Card list (one stop, roving focus, J/K inside). Tab from the focused card goes into its 4 buttons, then leaves the list. The "Decide" buttons of other cards are not Tab stops.
6. Undo bar (while it shows)
7. Instruction box: To, text, send
8. Scene controls: HUD "Needs you", Walk around, camera buttons, About link

Decisions come first on purpose. On load, focus goes to the first card without scrolling.

**Undo bar:**
- It sits above the instruction box, full panel width. Navy fill, white text: "Approved: PO-451208 follow-up", with an "Undo (U)" button and an "Add a note" button after Send back.
- It lasts 5 s (D-030), with a thin line that shrinks. The timer pauses while the bar has hover or focus.
- A new decision confirms the one before it and replaces the bar.
- Undo puts the card back in its old place and returns focus to it.
- Email sends never get undo.

## 6. States

| State | Behavior |
|---|---|
| Loading | Skeletons: 3 card shapes, 6 Team rows, a gray chip for the count. `aria-busy`. No spinners, no layout shift when data lands |
| Empty, Needs you | "All clear. Nothing needs you right now." Below it: "Checked 4 items, last update 9:30 AM". If team items exist: "See team items (demo)" |
| Empty, other tabs | Name what was checked: "No tasks on the board. We checked vault/board." "No team items right now." |
| Offline | The dot changes to a hollow ring with "Reconnecting", and after 10 s to "Offline". A banner under the tabs: "Can't reach the local server. Showing the last update from 9:30 AM. Decisions are paused." Plus "Try again". The last view stays. Decision buttons are `aria-disabled`. Pressing A, H, S or I points to the banner. Send is disabled with the note "Send when back online" |
| Item changed elsewhere | The focused card swaps its buttons for "This item was decided somewhere else" and leaves on the next J/K |
| Server warnings | A "2 warnings" link in the header opens the plain-English list |
| Count 0 | Tab and HUD show "0" in a neutral chip (hairline border, ink-muted text). Never the waiting color |
| Count 99+ | The tab chip shows "99+", and its accessible name gives the real number ("Needs you, 124 items"). The HUD shows up to 999, then "999+" |
| Long text | Titles 2 lines, supplier and nickname 1 line with a tooltip. The detail always shows the full text |

## 7. WCAG 2.2 AA notes

- **1.4.3 and 1.4.11 (contrast).** Use Approve #1A7F50 (D-026). `track-cm` #A8841A and `footer` are for shapes only, never text. The key hint chips inherit the button text color.
- **1.4.1 (use of color).** Status uses the D-032 shapes plus words. Tracks use badges. Overdue has an icon plus text. The selected tab has an underline plus bold, not only color.
- **2.1.4 (character key shortcuts).** Single keys work only while the panel has focus, and the help dialog has an off switch.
- **2.4.3 (focus order), 2.4.7 (focus visible).** Use the order in section 5. The focus ring is 2 px accent with a 2 px offset. On navy (the undo bar), the ring is white.
- **2.4.11 (focus not obscured).** The sticky decision bar, undo bar and instruction box must never cover focus. Set `scroll-padding-bottom` to their combined height.
- **2.5.7 (dragging), 2.5.8 (target size).** Every camera drag has a button. Every target is at least 24 x 24 px (the Decide button is 32, the decisions are 40).
- **2.2.1 (timing).** The undo timer pauses on hover and focus.
- **4.1.3 (status messages).** One polite live region announces: "Approved. Undo for 5 seconds, press U." It also announces count changes and connection changes.
- **1.3.1 (structure).** Tabs use `tablist`, `tab` and `tabpanel`. Headings: h1 is the app name, h2 the tab, h3 each card title. The 3D canvas is labeled "Office view. The same facts are in the panel", and the name tags are hidden from screen readers.
- **1.4.4 and 1.4.10 (resize and reflow).** At 200 percent zoom (under 960 CSS px), the panel goes full width and the scene hides behind a "Show office" button.
- **2.3.3 and reduced motion.** With reduced motion, the camera cuts with a short fade, cards swap without growing, and the undo line is replaced by the words "5 seconds".
- **2.4.2 (page title).** "Needs you (3) · SignalChain HQ".
