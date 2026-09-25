---
name: procurement-domain
description: Domain knowledge for the procurement team that SignalChain HQ mirrors, including roles (Sr. Manager, Leads, Category Managers, Ops Buyers), the six real workflows mapped at kickoff, the authority rule, AI helper ideas per step, fictional data rules, and privacy and dignity guardrails. Use when writing tasks, emails, simulations, zones, copy, or anything that should feel true to how the team works.
---

# Procurement domain knowledge

Context: Lawrence facilitates a 13-week AI enablement program (Aug to Oct 2026) for the procurement and logistics team of ADI in the Philippines, with some members based in ADI Thailand. Microsoft Copilot is the team's sanctioned AI tool. SignalChain HQ is his personal prototype. Everything in it is fictional.

Glossary: [glossary.md](glossary.md). Workflow data: `data/workflows.json`. Authority rule data: `data/authority-rules.template.json`.

## Team structure (seats in the office)
| Track | Seats | What the role does |
|---|---|---|
| Sr. Manager | 1 (`mgr-01`, the player) | Sets direction, makes big calls, wants one view of everything (she calls her vision "Procurement360") |
| Leads | 4 (`lead-01` to `lead-04`) | Guide their groups, review outputs, unblock issues. Exact scope to be defined |
| Category Managers (CM) | 11 (`cm-01` to `cm-11`) | Commercial side: requirements, sourcing, RFQs, quote analysis, negotiation, contracts, approving requisitions (EREQs), endorsing PRs to Ops |
| Ops Buyers (Ops) | 10 (`ops-01` to `ops-10`) | Transactional side: PR to PO in SAP, PO release and acknowledgment, delivery commitments in SAP, order status with logistics, PO amendments, payment and invoice issues |

Source: the program attendee list and progress tracker (Sep 2026). Roles are placeholders until defined with `/define-role`.

## The six real workflows (mapped by the team at kickoff, 12 Sep 2026)
CM
1. PR stock item approval: extract list from SAP, review each PR, endorse to Ops. Ends where Ops workflow 6 begins.
2. Contract generation in Conga: gather project details (supplier, scope, authorized signatory), generate SOW template, finalize with requestor and vendor, route for approval and signature in DocuSign.
3. RFQ process: clarify requirement (OEM, non-OEM, sole source), sourcing (identify, qualify, benchmark), bid and quote analysis (commercial vs technical, tabulation), negotiation and award.

Ops
4. PO amendments: request from A/P (PO vs invoice mismatch: price, a second field to confirm, freight) or from the vendor (price, quantity, other). Apply the authority rule.
5. eRFQ to PO: check the quotation (description, price, receivable item, validity), verify vendor code in SAP master file (local vs foreign currency setup), convert to PO.
6. PR to PO (stock item): receive the PR-PO list from CM, load PRs in SAP (ME57), counter-check the CM Excel file against SAP, convert PR to PO, PO auto-sends to the vendor, confirm acknowledgment.

The seam: CM endorsement (1) hands off to Ops PO creation (6) through an Excel file that Ops reconciles against SAP by hand. In the office this is the **Endorsement Bridge**, the hero landmark.

## Authority rule (from the PO Amendments board, to confirm)
- Price change under 5 percent and under 2K (currency not confirmed): Ops Buyer changes it in SAP.
- Price change under 5 percent but 2K or more: needs Category Manager approval (safer default, D-013).
- Price change of 5 percent or more: needs Category Manager approval.
- Any quantity change: goes to the Planner (outside this team).
Treat thresholds as configurable and unconfirmed. Show the rule in plain English whenever it routes an item.

## Where the AI helper fits (the three kinds of work)
- Checking and verification (safest start): compare PO vs invoice, CM Excel vs SAP extract, quotation validity, vendor code and currency setup.
- Comparison and tabulation: normalize three supplier quotes into one table, commercial vs technical.
- Drafting and summarizing: supplier follow-ups with a clear ask and a reply-by date, SOW first drafts, PR summaries, weekly status for the Sr. Manager.
Humans decide: approving PRs, commercial terms, price changes above the threshold, awards, anything with money or commitment.

## Lessons from the program that the helpers should model
- Stay in your lane: Ops never agrees to commercial terms or lead time changes, they route them to the CM.
- Always ask for a firm date and give a reply-by date.
- Never invent facts. Placeholders like [Supplier Name] must never reach a sent email.
- Sign with the right name and title.

## Fictional data rules
- Suppliers (fictional, from the program): Luzon Precision Components Corp., MetroPack Industrial Supplies Inc., Bayanihan Logistics Services, Batangas Metalcraft Industries. If you need more, invent clearly fictional names, check they are not real companies, and mark them "(fictional)" in the vault.
- Numbers: POs `PO-45xxxx`, PRs `PR-10xxxx`, invoices `INV-88xxx`, RFQs `RFQ-26-0xx`. Prices in PHP or USD, realistic but invented.
- People: seat placeholders only ("CM 03", "Ops 07"). No real names or emails in git.

## Privacy and dignity guardrails
- Helpers do the work, humans decide. The app never shows whether a real person is working, online, or on time.
- No time tracking, no screen or app monitoring, no productivity scores, no rankings of people.
- Words to avoid about people: monitoring, tracking, idle, flags, discipline.
- Reason: the program is also the team's upskilling moment, and some members worry about being replaced. The app should make AI feel like help, not surveillance.
