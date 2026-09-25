---
seat: ops-05
status: working
workingOn: "Checking an eRFQ quotation's validity"
currentWorkflow: ops-erfq-to-po
currentStep: check-quote
updated: 2026-09-25T09:30:00+08:00
---
# Ops 05 · Ops Buyer (placeholder)

Identity and desk placement live in `data/roster.template.json`. This file holds live status and notes. Define the role with `/define-role ops-05`.

## What the AI helper does (draft)
- Compares the CM Excel file against the SAP extract and lists every mismatch.
- Drafts supplier follow-ups with a clear ask and a reply-by date.
- Compares PO and invoice line by line and explains which authority rule applies.

## What needs a human decision
- Whether mismatches are real before converting PRs to POs.
- Which emails go out to suppliers.

## Where they work in the office
Own desk, the SAP Station (ME57, conversions, amendments), the Mail Dock for supplier and A/P emails, the Endorsement Bridge to pick up PR-PO lists.

## Notes
