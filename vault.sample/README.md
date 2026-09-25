# Sample vault

This folder is the example "vault": the office's memory, stored as plain markdown and JSON so people, Obsidian, and Claude Code can all read and edit it. Everything here is fictional.

When the server starts, it copies any file from this folder that is missing in `vault/` (gitignored), and never overwrites your live files. Your live data lives in `vault/`. `pnpm vault:reset` makes a completely fresh copy. Office files here (`office/*.json`) are the committed masters: to keep a live change, copy it back here and commit.

| Folder | What it holds |
|---|---|
| `office/` | `zones.json` (the rooms and areas), `accessories.json` (props you can toggle), and later `layout.json` (positions, from Phase 3) |
| `team/<seat>/profile.md` | Live status of each seat's AI helper and notes. Identity comes from `data/roster.template.json` |
| `queue/` | Items that need a decision (Needs You). One file per item |
| `board/` | Tasks. One file per task |
| `instructions/` | What you asked the team to do, saved from the instruction box |
| `log/<date>.md` | Append-only activity log. The daily digest is built from it |
| `outbox/` | Email drafts from the outbox mail driver (`.eml`) |

Rules: one file per record, YAML frontmatter for data, body for humans. Fictional names and data only. Nothing here tracks real people.
