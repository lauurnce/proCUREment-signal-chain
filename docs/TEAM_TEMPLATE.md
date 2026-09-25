# Team template

The office has one seat for every person on the real team, so the game feels like their team. Each seat holds an **AI helper** that does that role's repetitive work. The humans stay the decision makers. Roles are placeholders now and get defined step by step with `/define-role`.

## Seat count (source: program attendee list and progress tracker, Sep 2026)

| Track | Seats | Seat ids | Where they sit | Badge |
|---|---|---|---|---|
| Sr. Manager (the player) | 1 | `mgr-01` | Sr. Manager's Office | star, navy |
| Leads | 4 | `lead-01` to `lead-04` | Leads' Row | triangle, accent blue |
| Category Managers (CM) | 11 | `cm-01` to `cm-11` | CM Wing, pods A (4), B (4), C (3) | diamond, gold |
| Ops Buyers (Ops) | 10 | `ops-01` to `ops-10` | Ops Wing, pods A (4), B (4), C (2) | square, teal |
| **Total** | **26** | | | |

Notes
- The July survey had 9 CM and 8 Ops respondents. The attendee list (11 CM, 10 Ops, 4 Leads) is the source for seats because it matches who is in the program now.
- Some members are based in ADI Thailand. Each seat has a `site` field (PH, TH, or TBD).
- The 4 Leads had no CM or Ops tag on the attendee list. Their exact scope is a placeholder.

## Where the data lives

| File | What | Committed |
|---|---|---|
| `data/roster.template.json` | Seat identity and placement: id, track, display name, role title, zone, pod, site, helper name, workflows, default approver, avatar seed, `placeholder` flag | Yes (fictional placeholders) |
| `data/roster.local.json` | Your private overrides, for example nicknames. Copy from `roster.local.example.json` | No, gitignored |
| `vault/team/<seat>/profile.md` | Live status (working, waiting on you, in a meeting, on break, off duty), what the helper is working on, and notes | No, `vault/` is gitignored. The sample lives in `vault.sample/` |
| `data/workflows.json` | The six real workflows plus two placeholders, with steps, the zone each step happens in, what the helper can do, and whether a human must decide | Yes |
| `data/authority-rules.template.json` | Who decides price, quantity and commercial changes | Yes, marked not confirmed |

## Status meanings (for helpers, never for people)
- **working**: the helper is doing a step of a workflow.
- **waiting on you**: the helper finished something that needs a human decision.
- **in a meeting**: the helper is in the Negotiation Room or Huddle Room for a step.
- **on break**: a short idle animation at Merienda Corner, for charm and pacing.
- **off duty**: the helper is not active (for example outside the simulated working day).

## Workflows per track (from the kickoff boards)
- CM: PR stock item approval, Contract generation in Conga, RFQ process.
- Ops: PR to PO processing (stock item), eRFQ to PO, PO amendments.
- Leads: review and unblock (placeholder).
- Sr. Manager: decisions and direction (placeholder).

The CM endorsement at the end of "PR stock item approval" hands off to the start of Ops "PR to PO processing". In the office that handoff happens at the Endorsement Bridge.

## Defining roles over time
Run `/define-role cm-03` for one seat, or `/define-role CM` for the whole track. Claude asks one question at a time: title, top workflows, what the helper does, what needs a human, who approves, where the seat goes during the day, helper name, site. Then it updates the roster and the profile, and keeps real names out of git.

## Privacy rules (always)
- Placeholders in git, never real names or emails.
- No time tracking, activity monitoring, productivity scores, or rankings of people.
- The app describes what helpers do. People decide.
