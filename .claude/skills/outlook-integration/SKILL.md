---
name: outlook-integration
description: How SignalChain HQ talks to Outlook. The MailProvider contract and its three drivers (outbox, graph, power-automate), MSAL Node sign-in with PKCE on localhost, the Microsoft Graph mail calls and permissions, token storage, the safety rules for drafts and sending, inbox-to-task, and the daily digest. Use for any mail, auth or Graph work.
paths:
  - "apps/server/src/mail/**"
  - "apps/server/src/auth/**"
  - "docs/OUTLOOK_SETUP.md"
---

# Outlook integration

Human setup steps are in `docs/OUTLOOK_SETUP.md`. This skill is the engineering contract.

## 1. One interface, three drivers

```ts
// packages/shared/src/mail.ts (shape, refine in Phase 7)
export type MailDriverId = "outbox" | "graph" | "power-automate";

export interface MailStatus {
  driver: MailDriverId;
  mode: "dry-run" | "drafts" | "send";
  connected: boolean;
  account?: string;          // shown in the Mailroom tab
  lastInboxCheck?: string;   // ISO time
  problem?: string;          // plain English, when something is wrong
}

export interface DraftInput {
  queueItemId: string;
  to: string[]; cc?: string[];
  subject: string;
  html: string;              // rendered from the item's markdown
}

export interface DraftRef { driver: MailDriverId; id: string; webLink?: string; filePath?: string }

export interface MailProvider {
  status(): Promise<MailStatus>;
  createDraft(input: DraftInput): Promise<DraftRef>;
  send(ref: DraftRef): Promise<{ sentAt: string }>;   // guarded, see safety rules
  listTaggedInbox?(sinceIso: string): Promise<Array<{ id: string; subject: string; from: string; receivedAt: string }>>;
  getBody?(messageId: string): Promise<string>;
}
```

- `outbox` (default, no sign-in): writes an `.eml` draft to `vault/outbox/` with the header `X-Unsent: 1` (classic Outlook for Windows opens it as a new draft, test on Mac), and offers "Open in Outlook" through a `mailto:` link (plain text, keep the whole link under about 2,000 characters), "Copy email", and "Download .eml". This path needs no IT approval anywhere.
- `graph` (personal test account): real drafts and sends through Microsoft Graph with delegated permissions.
- `power-automate` (future ADI path, stub only): writes a JSON request into a folder synced by OneDrive. A Power Automate flow (OneDrive for Business "When a file is created", then Office 365 Outlook "Send an email (V2)") does the sending. Build only after ADI IT approves.

## 2. Safety rules (enforced on the server, not only in the UI)

1. `MAIL_MODE`: `dry-run` (no writes, show what would happen), `drafts` (default, create drafts only), `send` (drafts plus sending).
2. Approve never sends. Approve creates a draft. A separate "Send now" click sends it, with a confirm step that lists the recipients.
3. Every recipient (To, Cc, Bcc) must be in `MAIL_ALLOWED_RECIPIENTS` to send. Otherwise block with a plain-English message.
4. Demo redirect: if `MAIL_REDIRECT_TO` is set (and that address is itself in the allowlist), all sends go to that address instead, with a banner at the top of the email: "Demo redirect. Originally to: ...". Fictional suppliers use reserved domains like `@luzonprecision.example`, which can never deliver.
5. Limit: at most `MAIL_MAX_SENDS_PER_HOUR` (default 20).
6. Log every draft and send to `vault/log/<date>.md` (time, item id, recipients, driver, result). Never log tokens or full bodies.
7. Privacy: when checking the inbox, request only `id, subject, from, receivedDateTime`. Fetch a body only for messages whose subject starts with `HQ_INBOX_TAG`.
8. Every email footer: "Sent from SignalChain HQ, an unofficial prototype. Fictional data." No ADI logo.

## 3. Sign-in with MSAL Node (graph driver)

- Library: `@azure/msal-node`, `PublicClientApplication` (no client secret, because this app runs on a laptop).
- Flow: authorization code with PKCE.
  1. `GET /auth/login`: create PKCE verifier and challenge (MSAL's `CryptoProvider`), a random `state`, then redirect the browser to `getAuthCodeUrl({ scopes, redirectUri, codeChallenge, codeChallengeMethod: "S256", state })`.
  2. `GET /auth/callback`: check `state`, then `acquireTokenByCode({ code, scopes, redirectUri, codeVerifier })`. Redirect back to the app's Mailroom tab.
  3. Later calls: `acquireTokenSilent({ account, scopes })`. On `InteractionRequiredAuthError`, set status `connected: false` with the problem "Please sign in again".
- Redirect URI: register `http://localhost/auth/callback` under the "Mobile and desktop applications" platform. For localhost, Microsoft ignores the port when matching, so it works for every worktree port. Do not register several localhost URIs that differ only by port. Personal-account apps cannot use query strings in redirect URIs.
- Authority from `.env`: `https://login.microsoftonline.com/consumers` (personal accounts only) or `/common` (personal plus work or school).
- Scopes: `User.Read Mail.ReadWrite Mail.Send offline_access`. Nothing more.
- Token cache: `@azure/msal-node-extensions` with the macOS Keychain (service "SignalChainHQ"). Fallback, with a visible warning: `.secrets/msal-cache.json`, file mode 600, gitignored and denied to Claude Code in settings.

## 4. Microsoft Graph calls (v1.0)

| Need | Call | Permission |
|---|---|---|
| Who is signed in | `GET /me?$select=displayName,mail,userPrincipalName` | User.Read |
| Create a draft | `POST /me/messages` (returns `id` and `webLink`) | Mail.ReadWrite |
| Edit a draft | `PATCH /me/messages/{id}` | Mail.ReadWrite |
| Send a draft | `POST /me/messages/{id}/send` (202 Accepted) | Mail.Send |
| Send the digest | `POST /me/sendMail` | Mail.Send |
| Check tagged inbox | `GET /me/mailFolders/inbox/messages?$top=25&$select=id,subject,from,receivedDateTime&$orderby=receivedDateTime desc` then filter by tag in code | Mail.ReadWrite |
| Read a tagged body | `GET /me/messages/{id}?$select=body` | Mail.ReadWrite |

Use plain `fetch` with a small wrapper: base URL, bearer token, JSON, zod-validated responses, and retries that respect `Retry-After` on 429 and 503.

References (read before coding, they change):
- MSAL Node token requests: https://learn.microsoft.com/entra/msal/javascript/node/acquire-token-requests
- Redirect URI rules: https://learn.microsoft.com/entra/identity-platform/reply-url
- Create message: https://learn.microsoft.com/graph/api/user-post-messages
- Send message: https://learn.microsoft.com/graph/api/message-send
- sendMail: https://learn.microsoft.com/graph/api/user-sendmail

## 5. Inbox to task
Every `HQ_INBOX_POLL_SECONDS` (default 120): list recent inbox messages, keep those whose subject starts with `HQ_INBOX_TAG` (default "[HQ]"), skip ones already seen (store the last seen time and ids in `vault/.state/mail.json`), create a Board task for the right seat (simple keyword rules, Ops by default), and send an SSE event so a helper walks to the Mail Dock.

## 6. Daily digest
At `DIGEST_TIME` in `HQ_TIMEZONE` (default 17:30 Asia/Manila), or with "Make digest now": build a clean HTML email from today's log, as a draft (Outlook) or a file (outbox). The scheduled digest is never sent on its own: nothing is sent without a click (D-127). "Send digest now" (Outlook in send mode only) sends after a confirm step that lists the recipients, with the same safety rules as any send. Sections: What needs you, What the helpers finished, Handoffs (CM to Ops), Tomorrow. Helpers by name ("CM 03 helper"), never seat ids or time stamps of work. A 600 px table layout with inline styles written out one by one, theme tokens, Quattrocento Sans with a system font fallback, no images, no logo.

## 7. Environment variables
`MAIL_PROVIDER`, `MAIL_MODE`, `MAIL_ALLOWED_RECIPIENTS`, `MAIL_REDIRECT_TO`, `MAIL_MAX_SENDS_PER_HOUR`, `DIGEST_TO`, `DIGEST_TIME`, `HQ_TIMEZONE`, `HQ_INBOX_TAG`, `HQ_INBOX_POLL_SECONDS`, `MS_CLIENT_ID`, `MS_AUTHORITY`, `MS_REDIRECT_PATH`, `MS_SCOPES`, `PA_BRIDGE_DIR`. All documented in `.env.example`. Claude Code cannot read `.env` by design, so ask Lawrence to confirm values instead of reading them.

## 8. Never
- Never connect an ADI account or tenant without Lawrence confirming written IT approval.
- Never auto-send. Never send to a non-allowlisted address. Never log tokens.
- Never add AI attribution to emails.
