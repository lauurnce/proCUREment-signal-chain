---
name: define-role
description: Turn a placeholder seat (for example cm-03) or a whole track (CM, OPS, LEAD, MGR) into a defined role by interviewing Lawrence one question at a time, then updating the roster template and the seat profile in the sample vault.
disable-model-invocation: true
argument-hint: "[seat id like cm-03, or a track like CM]"
---

# Define a role: $ARGUMENTS

Roles start as placeholders on purpose. This skill fills them in together with Lawrence, a little at a time.

## Rules
- Ask one question at a time, multiple choice when possible, with an "other" option. Use the AskUserQuestion tool.
- Offer smart defaults from the procurement-domain skill and `data/workflows.json`, so Lawrence mostly picks instead of typing.
- Committed files get role details only, never real names or emails. If Lawrence gives a real name, store it only in `data/roster.local.json` (gitignored) and tell him you did.
- Describe what the AI helper does, never how a real person should be watched.
- No em dashes. Plain English.

## Interview (skip questions already answered)
1. Scope: this one seat, or every seat in the track?
2. Role title as shown in the app (default from the roster).
3. Top 3 workflows for this seat (pick from `data/workflows.json`, or describe a new one).
4. For each workflow: which steps can the AI helper do (drafting, checking, summarizing, comparing), and which steps need a human decision?
5. Who approves this seat's items by default? (Sr. Manager, a Lead, a CM for Ops price changes above the threshold, the seat owner themselves)
6. Where does this seat usually go in the office during the day? (own desk, SAP Station, Mail Dock, Endorsement Bridge, Negotiation Room, Contract Corner, Huddle Room)
7. Helper name and one-line personality (offer 3 options from the ux-writer style, or keep "TBD").
8. Site: PH, TH, or TBD.

## Then update
- `data/roster.template.json`: fields for the seat(s). Set `placeholder` to false only if Lawrence confirms the role is defined.
- `vault.sample/team/<seat>/profile.md`: frontmatter plus the sections "What the AI helper does", "What needs a human decision", "Where they work in the office".
- If a new workflow was described, add it to `data/workflows.json` with steps, zones and `needsHuman` flags, and ask the procurement-sme subagent to check it for realism.
- Run the schema validation script (after Phase 1 it is part of `pnpm check`).

## Finish
Show a short before and after, then suggest `/checkpoint`.
