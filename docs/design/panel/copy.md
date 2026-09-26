# HQ panel copy deck (P2.5)

Status: draft by the ux-writer, 26 Sep 2026. For the Lab page `/lab/panel`, reused by Phase 5.
Pairs with `docs/design/panel/spec.md` (layout and keys by the ux-architect).

## How to read this

- `{curly}` means a value filled in from data. Example: `{helper}` becomes "Ops 07 helper".
- Text is written in sentence case. Tabs and tiny mono labels may be shown in UPPERCASE by CSS only. Screen readers still get the sentence case text.
- The dot "·" joins short facts on one line. Never use an em dash.
- Dates: "25 Sep 2026". Times: "9:20 AM". Time zone Asia/Manila.
- Rows marked **Lab** show only on `/lab/panel`. Rows marked **Phase 5+** are for the real panel, written now so the voice stays the same.
- Rows marked **Proposed** need a yes from Lawrence or the ux-architect before they are built.

## Shared rules for this panel

1. Helpers do, people decide. Helpers "prepared", "checked", "drafted". The user "approved", "held", "sent back".
2. A helper is always named by seat plus "helper": "CM 03 helper" (D-028). Never "CM 03" alone when we mean the helper.
3. Real people at a seat are never given a status, a count or a time. Only helpers have status.
4. No "monitoring", "tracking", "idle", "online", "agent", "queue", "pipeline", "hours saved".
5. Errors say what happened, then what to do next.

## Placeholders used

| Placeholder | Example | Source |
|---|---|---|
| `{helper}` | Ops 07 helper | seat id `ops-07` becomes "Ops 07" plus " helper" |
| `{nickname}` | Quote Table | optional, from `/define-role`. Hidden when empty |
| `{seat}` | CM 02 | the approver seat, used for "Deciding as" |
| `{workflow}` | PO amendments | `data/workflows.json` name |
| `{n}` / `{total}` | 3 / 4 | step position and step count in that workflow |
| `{stepLabel}` | Apply the authority rule: change in SAP, send to CM, or send to Planner | step label in `data/workflows.json` |
| `{time}` | 9:32 AM | local time, Asia/Manila |
| `{date}` | 25 Sep 2026 | |
| `{count}` | 3 | |
| `{audience}` | CM Wing (11 helpers) | see Instruction box |

---

## 1. Header

| Key | Text | Notes |
|---|---|---|
| header.product | SignalChain HQ | App title, 20 px bold navy. No logo, no tagline. |
| header.team | 26 on the team | Count of seats from the roster. Tooltip below. Keep it apart from the live dot, so it never reads as "26 people online". |
| header.team.tooltip | 26 seats, each with an AI helper. | Says seats, never who is in today. |
| header.about | About | Small text button. |
| header.about.body | SignalChain HQ. Unofficial prototype · Fictional data. | Exact wording from CLAUDE.md. Nothing else about ADI. |
| header.keys | Keyboard shortcuts | Icon button with "?" glyph. This is its aria-label and tooltip. |

### Live dot (server connection)

The dot and word describe the link to the local server. They never describe a person.

| Key | Text | Notes |
|---|---|---|
| live.connected | Live | Filled green dot. |
| live.connected.tooltip | Updates arrive as the helpers work. | |
| live.connecting | Connecting | Hollow ring, slow pulse (static ring with reduced motion). First load only. |
| live.connecting.tooltip | Connecting to the local server. | |
| live.reconnecting | Reconnecting | Hollow ring. Shown after a drop, while it retries. |
| live.reconnecting.tooltip | Lost the link to the local server. Trying again. Your last view stays on screen. | |
| live.offline | Offline | Grey ring plus the word. Never color alone. |
| live.offline.tooltip | Cannot reach the local server. What you see is from {time}. | |

---

## 2. Tabs

| Key | Text | Notes |
|---|---|---|
| tabs.label | Panel sections | aria-label for the tab list. |
| tabs.needsYou | Needs you | Count badge after it, for example "Needs you 3". Badge hidden at 0. |
| tabs.needsYou.aria | Needs you, {count} items | Singular: "Needs you, 1 item". At 0: "Needs you, nothing waiting". |
| tabs.team | Team | |
| tabs.board | Board | |
| tabs.office | Office | |

---

## 3. Needs you tab

### Top of the list

| Key | Text | Notes |
|---|---|---|
| needs.title | Needs you | Panel title with the 28 x 3 px accent bar. |
| needs.count | {count} items need you | Singular: "1 item needs you". Hidden at 0, the empty state takes over. |
| needs.filter.label | Show | Label for the filter pair (segmented control). |
| needs.filter.mine | For you | Default (D-027). Items where the Sr. Manager decides. Count badge after it. |
| needs.filter.team | Team items (demo) | Items that a CM, Ops Buyer or Lead would decide. Count badge after it. |
| needs.filter.team.tooltip | In real life, these go to the CM or Ops Buyer. In this demo, you can decide them for the seat. | Teaches the real authority rule. |
| needs.held | On hold · {count} | **Proposed.** Collapsed group at the bottom of the list for held items. Hidden at 0. |

### Card (list item)

Line order on every card, top to bottom:

| Key | Text | Notes |
|---|---|---|
| card.workflowLine | {workflow} · Step {n} of {total} | Small, ink-muted. Example: "PO amendments · Step 3 of 4". |
| card.kind.emailDraft | Email draft | Mono chip. From `kind: email-draft`. |
| card.kind.summary | Summary | `kind: summary` |
| card.kind.approval | Approval | `kind: approval` |
| card.kind.report | Report | `kind: report` |
| card.title | {title} | From the item. Section title style. Never cut mid-word, wrap to 2 lines, then end with "...". |
| card.fromLine | From {helper} · {age} | Example: "From Ops 07 helper · 20 min ago". Track badge before the helper name. |
| card.supplier | {supplier} | Shown only when the item has a supplier. Example: "Batangas Metalcraft Industries (fictional)". |
| card.decidingAs | Deciding as {seat} (demo) | Chip on team items only (D-027). Example: "Deciding as CM 02 (demo)". |
| card.decide | Decide | The one button on cards that are not focused. Opens and focuses the card. |
| card.decide.aria | Decide on {title} | |

### Age formats

| Key | Text | Notes |
|---|---|---|
| age.now | Just now | Under 1 minute. |
| age.minutes | {m} min ago | 1 to 59 minutes. Example: "20 min ago". |
| age.hour | 1 hour ago | |
| age.hours | {h} hours ago | 2 to 23 hours, same day. |
| age.yesterday | Yesterday, {time} | Example: "Yesterday, 4:15 PM". |
| age.date | {date} | Older than yesterday. Example: "23 Sep 2026". |
| age.tooltip | {date}, {time} | Full time on hover. Example: "25 Sep 2026, 9:20 AM". |

Age is about the item, never about how fast a person answered. No "waiting 3 hours" or red aging colors.

### Focused card

| Key | Text | Notes |
|---|---|---|
| focus.why.label | Why this came to you | Mono label, keep from `DecisionCard`. |
| focus.why.priceLarge | Price is up {pct} percent. Changes of 5 percent or more need a Category Manager. | Rule `price-large`. Example: "Price is up 6.5 percent." |
| focus.why.priceMid | Price is up {pct} percent, and the change is {amount} or more. This needs a Category Manager. | Rule for under 5 percent but 2K or more (D-013). |
| focus.why.quantity | The quantity changed. Quantity changes go to the Planner, outside this team. | |
| focus.why.mgr | {helper} prepared this for your review. | Items where `approver: mgr-01` and no rule applies. |
| focus.why.email | {helper} drafted this email. It needs your OK before it is saved to Outlook. | `kind: email-draft`. |
| focus.rule.chip | Rule not confirmed yet | Chip when the authority rule thresholds are not confirmed. |
| focus.rule.tooltip | The 5 percent and 2K limits are still being confirmed with the team. Check the numbers before you rely on them. | |
| focus.suggests | Helper suggests: | Bold lead-in, then the suggestion. Keep from `DecisionCard`. |
| focus.open | Open item | Link to the detail view. Hint "Enter". |

---

## 4. Item detail view

| Key | Text | Notes |
|---|---|---|
| detail.back | Back to Needs you | Top left. Hint "Esc". |
| detail.meta | {workflow} · Step {n} of {total} | Same as the card. |
| detail.stepLabel | {stepLabel} | Full step text under the meta line. |
| detail.fact.from | From | Value: `{helper}` with track badge. |
| detail.fact.supplier | Supplier | |
| detail.fact.decides | Decides | Value example: "CM 02, price change of 5 percent or more". For her own items: "You". |
| detail.fact.received | Received | Value: "{date}, {time}". |
| detail.fact.ref | Reference | PO, PR, RFQ or invoice number when the item has one. Example: "PO-452114". |
| detail.section.summary | Summary | From `## Summary`. |
| detail.section.why | Why this came to you | Same text as the focused card. |
| detail.section.checked | What the helper checked | From `## What the helper checked`. |
| detail.section.checked.empty | The helper did not list its checks for this item. | Honest, not alarming. |
| detail.section.options | Options | From `## Options`. |
| detail.section.suggests | Helper suggests | From `## Recommendation from the helper`. |
| detail.section.thisWeek | This week | For report items. Uses the heading from the file. |
| detail.section.email | Email draft | Only when the item has an email. |
| detail.section.decision | Your decision | Mono label above the four buttons. |
| detail.openFile | Open the file | Link to the markdown file. |
| detail.openFile.tooltip | Opens this item in Obsidian. | Obsidian is named only here. |

### Email draft preview

| Key | Text | Notes |
|---|---|---|
| email.to | To | Value: the address, for example `orders@luzonprecision.example`. |
| email.cc | Cc | Hidden when empty. |
| email.subject | Subject | |
| email.body | Message | Label above the body. |
| email.draftNote | Draft only. Nothing is sent from here. | Always under the preview. |
| email.signatureNote | The signature uses the seat name ({seat}). A real name is added only when sent. | When the body is signed with a seat placeholder, like "Ops 03". |
| email.placeholderBlock | This draft still has {placeholder}. Fill it in, then send. | Example: "This draft still has [Supplier Name]." Blocks sending (Phase 7). |
| email.footer | Unofficial prototype · Fictional data | Footer line shown in every draft preview. |
| email.saveDraft | Save draft in Outlook | **Phase 7.** Main email action. Hidden in the Lab. |
| email.lab | Lab only. This draft is not in Outlook. | **Lab.** |

---

## 5. Decisions

Buttons follow the adi-theme styles. Shortcut letter shows as a small key hint on the button.

| Key | Text | Notes |
|---|---|---|
| decide.approve | Approve | Key A. Green #1A7F50 (D-026). |
| decide.hold | Hold | Key H. |
| decide.sendBack | Send back to {helper} | Key S. Example: "Send back to Ops 07 helper" (D-028). If too long for the grid, wrap to 2 lines, never shrink. |
| decide.instruct | Instruct | Key I. Opens the instruction box with "To" set to `{helper}`. |
| decide.approve.aria | Approve {title} | |
| decide.hold.aria | Hold {title} | |
| decide.sendBack.aria | Send back {title} to {helper} | |
| decide.instruct.aria | Write an instruction for {helper} about {title} | |
| sendBack.note.label | Note for {helper} (optional) | **Proposed.** Small text field that appears after Send back. |
| sendBack.note.placeholder | For example: Ask the supplier to invoice at the PO price. | From the sample options. |
| sendBack.confirm | Send back | Button under the note. |
| instruct.fromItem.title | Instruction about {ref} | Title on the instruction box when opened from an item. Example: "Instruction about PO-452114". Falls back to the item title when there is no reference. |

### Undo bar (5 seconds, D-030)

One bar at the bottom of the panel, above the instruction box. A thin line shrinks over 5 s (a static line with reduced motion). No number countdown, it flickers.

| Key | Text | Notes |
|---|---|---|
| undo.approve | Approved by you, {time}. | Example: "Approved by you, 9:32 AM." |
| undo.approve.demo | Approved as {seat} (demo), {time}. | Team items. |
| undo.hold | On hold, {time}. You can find it under On hold. | Second sentence only if the On hold group is built. |
| undo.hold.demo | Put on hold as {seat} (demo), {time}. | |
| undo.sendBack | Sent back to {helper}, {time}. | Example: "Sent back to Ops 07 helper, 9:32 AM." |
| undo.sendBack.demo | Sent back to {helper} as {seat} (demo), {time}. | |
| undo.instruct | Instruction sent to {audience}, {time}. | After the instruction box is sent. Undo is allowed, this is not an email. |
| undo.action | Undo | Button. Key: see keyboard sheet. |
| undo.action.aria | Undo, {decision} on {title} | |
| undo.done | Undone. The item is back in Needs you. | Shows for 2 s, then the bar leaves. |
| undo.done.instruct | Undone. The instruction was not sent. | |
| undo.lab | Lab only, nothing is saved or sent. | **Lab.** Second line in every undo bar. |
| undo.noEmail | Emails cannot be undone after they are sent. | **Phase 7.** Shown on the send step, not in the undo bar. Sends never get an undo bar. |

---

## 6. Empty, loading and offline states

### Empty states

| Key | Text | Notes |
|---|---|---|
| empty.needs.mine | All clear. Nothing waiting on you. New items appear here when a helper needs your decision. | Calm. Scene relaxes. |
| empty.needs.team | No team items right now. Items that a CM, Ops Buyer or Lead would decide appear here. | "Team items (demo)" filter. |
| empty.needs.both | All clear for you and the team. Helpers are still working. New items appear here as they come in. | Both filters empty. |
| empty.team | No helpers to show yet. Helpers appear here once the team list loads from the local server. | |
| empty.board | No tasks yet. Tasks appear here from the board folder in the vault. | |
| empty.board.todo | Nothing to start. | Column empty. |
| empty.board.doing | No task in progress. | |
| empty.board.waiting | Nothing is waiting. | |
| empty.board.done | Finished tasks show here. | |
| empty.office | The office layout did not load. Try Reload. | Rare. Button "Reload". |

### Loading

Loading shows skeletons, not spinners. These strings are for screen readers and for slow loads over 3 s.

| Key | Text | Notes |
|---|---|---|
| loading.needs | Loading items | sr-only. |
| loading.team | Loading the team | sr-only. |
| loading.board | Loading the board | sr-only. |
| loading.slow | Still loading. The local server is taking longer than usual. | Visible after 3 s. |
| loading.hud | Loading stats | sr-only. HUD numbers show a skeleton bar, never a fake 0. |

### Offline and errors

| Key | Text | Notes |
|---|---|---|
| offline.banner | Cannot reach the local server. You are seeing the last update from {time}. | Banner at the top of the panel. The last view stays (DESIGN_DIRECTION section 5). |
| offline.banner.action | Try again | |
| offline.banner.help | Check that `pnpm dev` is still running. | Small line under the banner. |
| offline.decisionsOff | Decisions are paused until the server is back. | Buttons disabled while offline. Tooltip on the disabled buttons. |
| live.restored | Connected again. Updated at {time}. | Toast, 3 s. Not "back online", that word is kept away from the UI. |
| error.decision | Could not save your decision. The item is back in Needs you. Try again. | **Phase 5+.** |
| error.instruction | Could not send the instruction. Your text is still in the box. Try again. | **Phase 5+.** |
| error.openFile | Could not open the file. It may have moved. Try Reload. | |
| error.outlook | Could not reach Outlook. Your draft is saved here. Try again in a minute. | **Phase 7.** |

---

## 7. Team tab

| Key | Text | Notes |
|---|---|---|
| team.title | Team | Panel title. |
| team.intro | Each seat has an AI helper. This page shows the helpers' work, not the people. | One line under the title. |
| team.group.mgr | Sr. Manager | Group heading with star badge. |
| team.group.leads | Leads · 4 helpers | Triangle badge. |
| team.group.cm | Category Managers · 11 helpers | Diamond badge. |
| team.group.ops | Ops Buyers · 10 helpers | Square badge. |
| team.row.name | {helper} | Example: "CM 03 helper". Mgr seat: "Sr. Manager helper". |
| team.row.nickname | {nickname} | Second line, only when set with `/define-role`. |
| team.row.noRole | Role not defined yet | Small ink-muted text when there is no nickname. Tooltip: "Define it with /define-role." |
| team.row.workingOn | {workingOn} | From the profile. Example: "Endorsing approved PRs to Ops". |
| team.row.step | {workflow} · Step {n} of {total} | Example: "PR stock item approval · Step 3 of 3". |
| team.row.updated | Updated {age} | Uses the age formats. About the helper's status file only. |

### Status chip words (helpers only)

| Key | Text | Notes |
|---|---|---|
| status.working | Working | Filled dot. |
| status.waiting.you | Waiting on you | When the item's approver is the Sr. Manager. |
| status.waiting.seat | Waiting on {seat} | When another seat decides. Example: "Waiting on CM 02". |
| status.meeting | In a meeting | Pair of dots (D-032). |
| status.break | On break | Hollow ring. At Merienda Corner in the world. |
| status.off | Off duty | Grey ring plus text. |

---

## 8. Board tab

| Key | Text | Notes |
|---|---|---|
| board.title | Board | Panel title. |
| board.col.todo | To do | Column title with count, for example "To do · 2". |
| board.col.doing | Doing | |
| board.col.waiting | Waiting | |
| board.col.done | Done | |
| board.card.title | {title} | Example: "Endorse 14 approved stock item PRs to Ops". |
| board.card.meta | {helper} · {workflow} | Example: "CM 03 helper · PR stock item approval". |
| board.card.due | Due {date} | Same day: "Due today". No "overdue" label and no red. Tasks belong to helpers, but seats map to people. |
| board.card.waitingOn | Waiting on {seat} | Waiting column only, when known. |

---

## 9. Office tab

| Key | Text | Notes |
|---|---|---|
| office.title | Office | Panel title. |
| office.howTo | Drag to turn the view. Scroll to zoom. Pick a place below to jump there. | Adjust to the real controls in the spec. |
| office.presets.label | Go to | Mono label above the camera buttons. |
| office.preset.all | Whole office | |
| office.preset.cm | CM Wing | |
| office.preset.ops | Ops Wing | |
| office.preset.bridge | Endorsement Bridge | |
| office.preset.mgr | Sr. Manager's Office | |
| office.zones.label | Places | Mono label above the zone list. |
| zone.reception | Reception · Where you arrive. | |
| zone.mgr | Sr. Manager's Office · Your desk and the Needs you tray. | |
| zone.leads | Leads' Row · Four Lead desks with a view of both wings. | |
| zone.cm | CM Wing · Category Manager helpers, the commercial side. | |
| zone.ops | Ops Wing · Ops Buyer helpers, the PO side. | |
| zone.bridge | Endorsement Bridge · CM helpers hand approved PRs to Ops helpers here. | The hero place. |
| zone.sap | SAP Station · Helpers pull lists, load PRs and amend POs. | |
| zone.mail | Mail Dock · Supplier and A/P emails come in and go out. | |
| zone.contract | Contract Corner · SOW drafts in Conga, signatures in DocuSign. | |
| zone.negotiation | Negotiation Room · Supplier calls, SOW reviews and awards. | |
| zone.huddle | Huddle Room · Team huddles and AI Enablement sessions. | |
| zone.merienda | Merienda Corner · Coffee, snacks and helpers on break. | Charm lives in places. |
| zone.logistics | Logistics Window · Deliveries arrive when POs are received. | |

---

## 10. Over the 3D scene

### Stats HUD

Big number over a small mono label (ref-04 pattern). Numbers are about items and helpers, never about people.

| Key | Text | Notes |
|---|---|---|
| hud.aria | Office stats | aria-label for the group. |
| hud.needsYou | Needs you | Same number as the tab badge. |
| hud.needsYou.tooltip | Items waiting for your decision. | |
| hud.handoffs | Handoffs today | CM helper to Ops helper at the Endorsement Bridge. |
| hud.handoffs.tooltip | PR lists that CM helpers passed to Ops helpers today. | |
| hud.drafts | Drafts to review | |
| hud.drafts.tooltip | Email drafts from helpers that wait for a person to check them. | |
| hud.acknowledged | POs acknowledged | **Proposed** rename of "Orders acknowledged". "PO" is the team's word. |
| hud.acknowledged.tooltip | POs that suppliers confirmed today. | |

### Walk around pill

| Key | Text | Notes |
|---|---|---|
| walk.pill | Walk around | Pill over the scene. |
| walk.pill.tooltip | Walk the office with W, A, S, D. Press Esc to stop. | **Phase 4.** |
| walk.lab | Walk mode comes in Phase 4. In the Lab, this button only shows this note. | **Lab.** Small popover under the pill, closes on Esc or a click outside. |
| walk.active | Stop walking | **Phase 4.** Pill text while walking. Hint "Esc". |
| walk.hint | W A S D to walk · Esc to stop | **Phase 4.** Small hint at the bottom of the scene while walking. |

---

## 11. Instruction box

Sits at the bottom of the panel. The button always names who gets the instruction.

| Key | Text | Notes |
|---|---|---|
| instr.title | Give an instruction | Mono label above the box. |
| instr.placeholder | Tell the helpers what to do. For example: Ask Luzon Precision for a firm ship date by 29 Sep 2026. | Default. |
| instr.placeholder.one | Tell {helper} what to do. | When one helper is picked. |
| instr.placeholder.fromItem | {suggestion} | When opened from Instruct, show the helper's suggestion as the placeholder, not as typed text. |
| instr.to.label | To | Label for the picker. |
| instr.to.search | Find a helper or a group | Search field inside the picker. |
| instr.to.group.helper | One helper | Picker section heading. |
| instr.to.group.pod | A pod | |
| instr.to.group.wing | A wing | |
| instr.to.group.all | Everyone | |
| instr.to.helper | {helper} | Example: "CM 03 helper". Nickname in small text after it when set. |
| instr.to.pod | {Track} pod {letter} ({count} helpers) | Examples: "CM pod A (4 helpers)", "Ops pod C (2 helpers)". |
| instr.to.pod.seats | {first} to {last} | Small second line. Example: "CM 01 to CM 04". |
| instr.to.cm | CM Wing (11 helpers) | |
| instr.to.ops | Ops Wing (10 helpers) | |
| instr.to.leads | Leads' Row (4 helpers) | **Proposed.** Not in the brief, but Leads have no pod or wing. |
| instr.to.all | Everyone (26 helpers) | Includes the Sr. Manager helper. |
| instr.to.noMatch | No helper or group matches "{query}". | |
| instr.send | Send to {audience} | Examples: "Send to CM 03 helper", "Send to CM pod A (4 helpers)", "Send to CM Wing (11 helpers)", "Send to everyone (26 helpers)". Lowercase "everyone" inside the sentence. |
| instr.send.disabled | Write an instruction first. | Tooltip on the disabled button. |
| instr.send.noAudience | Pick who gets it first. | Tooltip when "To" is empty. |
| instr.clear | Clear | Small text button. |
| instr.lab.preview | This would go to {audience}: "{text}" | **Lab.** Shown after Send, in place of a real send. |
| instr.lab | Lab only, nothing is saved or sent. | **Lab.** Under the preview. |

---

## 12. Keyboard help sheet (?)

Keys follow the mode (D-031). The sheet lists them in plain words.

| Key | Text | Notes |
|---|---|---|
| keys.title | Keyboard shortcuts | Sheet title. |
| keys.close | Close | Button. Hint "Esc". |
| keys.group.panel | In the panel | Heading. |
| keys.jk | J and K · Next and previous item | |
| keys.enter | Enter · Open the item | |
| keys.esc | Esc · Back to the list, or close this sheet | |
| keys.a | A · Approve | |
| keys.h | H · Hold | |
| keys.s | S · Send back to the helper | |
| keys.i | I · Write an instruction | |
| keys.u | U · Undo, while the undo bar shows | **Proposed.** Not in D-031 yet. The ux-architect confirms the key. |
| keys.tabs | Left and right arrows · Move between tabs | When a tab has focus. |
| keys.group.walk | In walk mode | Heading. Lab adds " (Phase 4)". |
| keys.wasd | W A S D · Walk | |
| keys.walkEsc | Esc · Stop walking | |
| keys.group.any | Anywhere | Heading. |
| keys.help | ? · Show or hide this list | |
| keys.note.focus | Decision keys work when the panel has focus. Click the panel or press Tab to get there. | Footer line 1. |
| keys.note.typing | No shortcut works while you type in a box. | Footer line 2. |

---

## 13. Lab-only notes (all in one place)

| Key | Text | Where |
|---|---|---|
| lab.banner | Lab only, nothing is saved or sent. | Thin strip at the top of `/lab/panel`. |
| lab.data | Sample data from vault.sample. All suppliers and numbers are fictional. | Under the banner, small. |
| lab.undo | Lab only, nothing is saved or sent. | Second line in the undo bar. |
| lab.email | Lab only. This draft is not in Outlook. | Under the email preview. |
| lab.instruction | Lab only, nothing is saved or sent. | Under the instruction preview. |
| lab.walk | Walk mode comes in Phase 4. In the Lab, this button only shows this note. | Walk around popover. |
| lab.reset | Reset the Lab | **Proposed.** Button that brings back all decided items. |
| lab.reset.done | All items are back in Needs you. | Status line after reset. |

---

## Checks done on this deck

- No em dashes. Sentence case everywhere. Dates as "25 Sep 2026", times as "9:20 AM".
- Every helper string says "{seat} helper". No status, count or time about a person.
- None of: monitoring, tracking, idle, online, agent, queue, pipeline, hours saved, productivity.
- Suppliers and addresses come only from `vault.sample/` (fictional, `.example` domains).

## Open points for Lawrence

1. Undo key: "U" is proposed. Other option: Ctrl+Z (Cmd+Z on Mac).
2. HUD label: rename "Orders acknowledged" to "POs acknowledged"?
3. Add "On hold" as a group in Needs you, and "Leads' Row" as an instruction audience?
