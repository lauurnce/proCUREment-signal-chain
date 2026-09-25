---
paths:
  - "apps/server/**"
---

# Server rules

- Fastify, TypeScript strict. Listen on `127.0.0.1` only. CORS only for the local web origin.
- Every request body, query and file read is validated with zod schemas from `packages/shared`.
- Vault writes are atomic (write a temp file, then rename). The file watcher debounces and ignores our own writes.
- A broken vault file must never crash the server. Skip it and surface a plain-English warning in `/api/state`.
- Events go through one SSE endpoint, `/api/events`, using the typed event union from `packages/shared`.
- Mail and auth code follows the `outlook-integration` skill. Never log tokens, never read `.env` from Claude Code, never auto-send.
- Log lines are short and useful. No secrets, no full email bodies.
