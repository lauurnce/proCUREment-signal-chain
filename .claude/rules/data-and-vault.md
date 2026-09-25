---
paths:
  - "packages/shared/**"
  - "data/**"
  - "vault.sample/**"
  - "vault/**"
---

# Data and vault rules

- `packages/shared` is the single source of truth for data shapes. Change a schema there first, then update the server, the web app, `data/*.json` and `vault.sample/` in the same change.
- Vault records are one file per record: markdown with YAML frontmatter for data and the body for human notes. Keep it readable in Obsidian.
- Ids are lowercase kebab case (`cm-03`, `q-0012`, `t-0007`). Dates are ISO in frontmatter and friendly in the UI.
- Everything committed is fictional. Seat names are placeholders. Real names only in `data/roster.local.json` (gitignored).
- Fictional email addresses use reserved domains that can never deliver, like `orders@luzonprecision.example`.
- Never add fields that track real people's time, activity or productivity.
