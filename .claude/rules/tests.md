---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "e2e/**"
  - "apps/*/e2e/**"
---

# Test rules

- Vitest for logic (schemas, vault parsing, routing by the authority rule, simulator steps, mail safety rules).
- Playwright (Chromium) for flows and screenshots. Wait for `window.__HQ_READY__` before taking a screenshot of the 3D scene.
- Tests use `vault.sample/` copied to a temp folder, never the live `vault/`.
- Mail tests use the `outbox` driver or a mocked Graph client. Tests never send real email.
- Name tests by behavior: "approve creates a draft and never sends".
