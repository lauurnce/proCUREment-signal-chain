# Phase 7 plan: Outlook

Written in P7.1 with the integration-engineer, 13 Oct 2026. Branch `worktree-p7-outlook`.
Contract: the `outlook-integration` skill. Human setup: `docs/OUTLOOK_SETUP.md` (Lawrence did steps 1 to 5 on his Mac).

Mail is a side effect of a saved decision. The decision is written first, then the mail driver acts. The browser never sees a token. Nothing is sent without a separate "Send now" click.

## 1. Shared contract
`packages/shared/src/schemas/mail.ts`, plus `src/mail/compose.ts`:
- `MailStatus`: driver, mode, connected, account?, sendReady, redirectTo?, allowlistCount, sendsThisHour, maxPerHour, cacheWarning?, problem?. It replaces the small `MailStatus` and `mail.status` event in `events.ts`.
- `DraftInput`: itemId, to, cc, bcc, subject, text, html.
- `MailRef` (the draft reference): driver, state (dry-run, draft, sent, failed), draftId?, webLink?, file?, to (the final recipients), createdAt, sentAt?, problem?.
- `SentEntry`: at, itemId, to, driver, result, redirectedFrom?.
- `MailOverview`: status, the last 20 sends, digest {time, tz, lastSentAt?}, inbox {tag, lastCheck?}.
- `QueueItem` gets an optional `mail: MailRef`.
- The mail status stays out of `AppState`, because `AppState` is built only from vault files. It has its own `GET /api/mail`, and the live stream sends `mail.updated`.
- `composeEmail(item)` builds the email from the item's "## Draft email" section and adds the footer. Web and server both use it, so the copy, the mailto link and the .eml file always match.

## 2. Where mail fits the flow
- Approve still saves when the 5 s undo bar closes (D-108). After `applyDecision` succeeds on an email-draft item, the route calls `mail.afterApprove(item)`.
- The draft reference goes into the item's frontmatter as `mail:`, so it shows in the panel and in Obsidian. The .eml file goes to `vault/outbox/<id>.eml`.
- Send history, the hourly count, inbox checks and the last digest are kept in a small record file, `vault/.state/mail.json` (technical term: ledger), written atomically.
- If the draft fails, the decision still stands. The item shows the reason and a "Make the draft again" button (D-119).
- Demo Day never touches real mail (D-120):
  - While Demo Day runs, mail always uses the outbox driver inside `vault-demo/outbox/`.
  - Send now, the inbox check and the digest are off.
  - Simulated approvals never create mail.

## 3. Drivers (`apps/server/src/mail/`)
- **outbox** (the default when nothing is set up, and the fallback when `graph` has no `MS_CLIENT_ID`):
  - Writes a CRLF .eml file with `X-Unsent: 1`.
  - Rejects any line break inside a header (technical term: header injection).
  - Cannot send. The human way to send is "Open in Outlook" (a mailto link), "Copy email", or "Download .eml".
  - A mailto link over 2,000 characters drops the body and points to Copy email.
- **graph**:
  - A small `fetch` wrapper that checks every response with zod.
  - On 429 or 503, it waits as long as `Retry-After` says (at most 60 s) and tries up to 3 times.
  - On 401, one quiet token refresh, then "Please sign in to Outlook again."
  - Drafts with `POST /me/messages`, sends with `POST /me/messages/{id}/send`.
  - With `MAIL_REDIRECT_TO`, the draft is created already redirected, so a draft never holds a supplier address.
  - Before a send, the server reads the draft's recipients from Graph again and checks them again.
  - `webLink` is shown only on outlook.live.com or outlook.office.com.
- **power-automate**: a stub only. It says "The Power Automate bridge is not set up. It needs ADI IT approval first."
- **dry-run mode**, for any driver: nothing is created. It shows the recipients it would use and logs "dry run, nothing created".

## 4. Sign-in and token storage (`apps/server/src/auth/`)
- `GET /auth/login`:
  - PKCE verifier and challenge plus a random `state`, kept in memory for 10 minutes and usable once.
  - Redirects to the Microsoft sign-in page with the 4 scopes.
  - The redirect URI is `http://localhost:<webPort>/auth/callback`. Microsoft ignores the port for localhost, so it matches the registered URI.
- `GET /auth/callback`:
  - Checks `state`, exchanges the code, then goes back to `/?tab=mail`.
  - If you decline: "You did not accept the permissions, so Outlook is not connected."
- The Vite proxy forwards `/auth` to the server.
- Token cache:
  - The macOS Keychain (service `SignalChainHQ`), through `@azure/msal-node-extensions`, loaded in a try so a missing Keychain never crashes the server.
  - Fallback: `.secrets/msal-cache.json` (folder mode 700, file mode 600), with the warning "Your sign-in is saved in a file in .secrets/, not the Keychain."
- `POST /api/mail/signout` removes the account from the cache.
- New dependencies, exact versions: `@azure/msal-node@7.0.1` and `@azure/msal-node-extensions@5.5.2`.
  - Their native modules need entries in `allowBuilds`.
  - The release-age rule (D-024) is checked at install.

## 5. Safety rules, all in `mail/guard.ts`, on the server
Every POST to `/api/mail/*` also checks the `Origin` header and needs JSON.

| Rule | Message |
|---|---|
| Mode is not send | "Sending is off. MAIL_MODE is drafts, so the app only makes drafts." |
| A To, Cc or Bcc address is not allowed (exact match, any case) | "Not sent. These addresses are not on your allowed list: X. Add them to MAIL_ALLOWED_RECIPIENTS or set MAIL_REDIRECT_TO." |
| Redirect address is not allowed | "Sending is off: MAIL_REDIRECT_TO must also be on the allowed list." |
| Redirect is set | Cc and Bcc are dropped, and the email starts with "Demo redirect. Originally to: ..." |
| Hourly limit (default 20) | "Not sent. You reached the limit of 20 emails this hour. Try again after 14:05." |
| A placeholder like [Supplier Name] is left | "Not sent. The email still has a placeholder like [Supplier Name]. Send it back to the helper to fix it." |
| Recipients changed since the check | "The recipients changed since you checked. Please look at the list again." |
| Demo Day | "Demo Day never creates real drafts or sends email." |
| Not signed in | "Outlook is not connected. Open the Mail tab and click Connect Outlook." |
| Outlook busy after 3 tries | "Outlook is busy. Please try again in a minute." |
| Network lost | "Could not reach Outlook. Your draft is safe. Try again when you are online." |
| Request from another website | "This request did not come from the SignalChain HQ page." |

- One log line for every draft, send and block, for example `mail: draft for q-0001 (graph) to you@...`.
- Log lines never hold tokens, email bodies or codes.
- Every email ends with "Sent from SignalChain HQ, an unofficial prototype. Fictional data."

## 6. Web
- A 5th panel tab, "Mail" (`MailroomTab.tsx`, D-117). It shows:
  - A status card: driver, mode, the signed-in account, Connect Outlook or Sign out, the Keychain warning, and any problem.
  - Drafts, each with its buttons.
  - The sent log: the last 20 sends.
  - Read-only settings: allowlist count, redirect, hourly limit, digest time and timezone, inbox tag.
  - "Send digest now".
- `EmailActions.tsx` in the item detail:
  - While the undo bar is open: "The draft is made when this bar closes."
  - Outbox: "Open in Outlook", "Copy email", "Download .eml".
  - Graph: "Open draft in Outlook", plus "Send now" when sending is ready.
  - Send now opens a confirm dialog that lists the real recipients and any redirect banner.
- `state/mail.ts` loads `/api/mail` and listens for `mail.updated`.

## 7. Routes
| Route | Purpose |
|---|---|
| `GET /api/mail` | Mail overview |
| `GET /api/mail/items/:id/eml` | Download the .eml (any driver) |
| `POST /api/mail/items/:id/draft` | Make the draft again (only after a failure, D-119) |
| `GET /api/mail/items/:id/send-check` | The final recipients, or why sending is blocked |
| `POST /api/mail/items/:id/send` | Send now. The recipients must match the send-check |
| `POST /api/mail/digest` | Send the digest now |
| `POST /api/mail/signout` | Sign out |
| `GET /auth/login`, `GET /auth/callback` | Sign-in |

## 8. Tests
All of these run with no real network and no real Keychain.
- **Guard:** a table test for each rule.
- **Outbox:** .eml headers and CRLF, header injection, the mailto limit.
- **Graph** with a fake fetch:
  - zod rejects a bad response.
  - 429 and 503 respect `Retry-After`.
  - 401 leads to "sign in again".
  - Recipients are checked again before a send.
- **Auth** with a mocked MSAL: a wrong state, single use, PKCE values in the sign-in URL, the fallback file has mode 600.
- **Routes** with inject:
  - Approve makes the draft after the save.
  - Demo Day only writes to `vault-demo/outbox`, and a send gives 409.
  - A request from another website gives 403.
  - A send in drafts mode is blocked.
- **Playwright** on `vault-e2e`: approve q-0001, then "Download .eml" shows and the file exists.

## 9. Build order
- **P7.2, cloud:** schemas and `composeEmail`, mail config, guard, ledger, outbox driver, approve hook, Demo Day rule, routes, Mail tab with the outbox buttons, tests, shots.
- **P7.3, cloud with Graph mocked (D-118):** auth, cache, `/auth` routes, Vite proxy, Graph client and driver, Send now with the confirm dialog.
  - **Then Lawrence, on the Mac:**
    1. Pull and `pnpm install` (allow native builds if asked).
    2. Confirm with a yes or no, not the values, that `MAIL_ALLOWED_RECIPIENTS` and `MAIL_REDIRECT_TO` are set.
    3. Connect Outlook, approve q-0001, check Drafts on outlook.live.com.
    4. Set `MAIL_MODE=send`, restart, click Send now.
- **P7.4, cloud with Graph mocked:**
  - Inbox to task: only with graph, never in Demo Day, select only `id, subject, from, receivedDateTime`, a body only for `[HQ]` emails. Keyword rules live in `data/inbox-rules.json`, with Ops by default. A `mail.received` event makes the helper walk to the Mail Dock.
  - Digest: once a day at `DIGEST_TIME` in `HQ_TIMEZONE`, or with the button. With outbox, it is saved as `outbox/digest-<date>.eml`.
  - **Then Lawrence, on the Mac:** send an `[HQ]` email, then click Send digest now.
- **P7.5:** a security and privacy review by the integration-engineer and the brand-guardian, then the fixes, `/checkpoint`, and the merge steps.
