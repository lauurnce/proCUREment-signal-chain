# Outlook setup (Phase 7)

This connects SignalChain HQ to **your own test mailbox**, so approved items become real Outlook drafts, "Send now" really sends, tagged emails become tasks, and a daily digest lands in your inbox. The app works without this step (the default `outbox` driver saves `.eml` drafts and gives you "Open in Outlook" and "Copy email" buttons).

Time needed: about 20 to 30 minutes, once.

## Before you start: which account?

| Account | Use it? | Why |
|---|---|---|
| A personal Outlook.com or Hotmail account, ideally a new one just for testing (for example `signalchainhq.test@outlook.com`) | **Yes, recommended** | You control it fully, you consent to permissions yourself, nothing from work or school is touched |
| Your PUP school account | Not for this | The school controls app approvals and may block them, and the app would live in the school's directory |
| Any ADI account | **Never**, unless ADI IT approves in writing | NDA, company policy, and data rules. See "The ADI path" below |

## Step 1. Get a Microsoft Entra directory where you can register an app

Registering an app needs a Microsoft Entra ID tenant (a directory). The easy way for a student:

1. Go to https://azure.microsoft.com/free/students and sign up for **Azure for Students** with your personal Microsoft account, verifying with your school email. No credit card is needed and it gives a yearly credit while you are a student. (The regular Azure free account also works, but asks for a card to verify.)
2. This creates a directory called **Default Directory** that you own. The app registration itself is free, we do not create any paid Azure resources.

## Step 2. Register the app

1. Open https://entra.microsoft.com and sign in with the same account.
2. If you see more than one directory, switch to **Default Directory** (settings icon, top right).
3. Go to **Entra ID > App registrations > New registration**.
4. Name: `SignalChain HQ (local dev)`.
5. Supported account types: choose **Personal accounts only** (the wording may read "Personal Microsoft accounts only"). If you think you will later test a work or school account, choose **Any Entra ID Tenant + Personal Microsoft accounts** instead.
6. Leave Redirect URI empty for now. Click **Register**.
7. On the Overview page, copy the **Application (client) ID**. You will put it in `.env`.

## Step 3. Add the redirect URI

1. In your app, open **Authentication**, then **Add a platform** (or **Add redirect URI**), then **Mobile and desktop applications**.
2. Add this custom redirect URI exactly: `http://localhost/auth/callback`
3. Save.

Why no port number: for `localhost`, Microsoft ignores the port when it matches redirect URIs, so this works for every worktree port. Do not add extra localhost URIs that differ only by port. Redirect URIs for personal accounts cannot contain `?query` parts.

We use the "Mobile and desktop" platform because the app runs on your laptop as a public client with PKCE (a one-time secret code made for each sign-in), so no client secret is stored anywhere.

## Step 4. Add permissions

1. Open **API permissions > Add a permission > Microsoft Graph > Delegated permissions**.
2. Add `Mail.ReadWrite`, `Mail.Send`, and `offline_access`. `User.Read` is usually there already, keep it.
3. You do not need "Grant admin consent" for a personal account. You will approve the permissions yourself at the first sign-in.

What each one is for, in plain English:
- `User.Read`: show your name and email in the Mail tab.
- `Mail.ReadWrite`: create and edit drafts, and check new inbox emails. The permission itself allows more, but the app only reads subject lines, and opens the body only of emails tagged `[HQ]`.
- `Mail.Send`: send a draft after you click "Send now".
- `offline_access`: stay signed in between runs without asking every hour.

## Step 5. Fill in `.env`

```bash
cp .env.example .env
```
Then edit `.env` yourself (Claude Code is not allowed to read it):

```
MAIL_PROVIDER=graph
MAIL_MODE=drafts
MS_CLIENT_ID=<your Application (client) ID>
MS_AUTHORITY=https://login.microsoftonline.com/consumers
MAIL_ALLOWED_RECIPIENTS=<your test mailbox>
MAIL_REDIRECT_TO=<your test mailbox>
DIGEST_TO=<your test mailbox>
```

Use `https://login.microsoftonline.com/common` as the authority only if you registered for "Any Entra ID Tenant + Personal Microsoft accounts".

## Step 6. Connect and test (after Claude builds Phase 7)

1. `pnpm dev`, open the app, go to the **Mail** tab, click **Connect Outlook**, sign in, and accept the permissions. On macOS you may get a Keychain prompt, click Allow.
2. Approve the sample item "Luzon Precision missed a second firm date on PO-451208" (q-0001). When the undo bar closes, a draft appears in your Outlook **Drafts** folder (check https://outlook.live.com). With `MAIL_REDIRECT_TO` set, the draft is already addressed to you and starts with "Demo redirect". The Mail tab shows **Open draft in Outlook**.
3. Change `MAIL_MODE=send` in `.env`, restart `pnpm dev`, open the **Mail** tab, click **Send now** on the draft, check the recipients in the confirm box, and click **Send**. Because of `MAIL_REDIRECT_TO`, the email comes to your test inbox with a "Demo redirect" banner, never to the fictional supplier.
4. From your test mailbox itself, or an address on `MAIL_ALLOWED_RECIPIENTS`, email your test mailbox with the subject `[HQ] Please chase PO-451208 with Luzon Precision`. Emails from anyone else are ignored. Within about 2 minutes a task appears on the Board and an Ops helper walks to the Mail Dock.
5. In the Mail tab, under **Daily digest and inbox**: in drafts mode, click **Make digest now** and the digest waits in your Drafts. With `MAIL_MODE=send` and `DIGEST_TO` set to an allowed address, click **Send digest now**, check the recipients in the confirm box, and click **Send**. It arrives in your test inbox. The 5:30 PM digest is always only a draft, so nothing goes out without your click.

## Troubleshooting

| You see | Likely cause | Fix |
|---|---|---|
| `AADSTS50011` redirect URI mismatch | The URI in the app registration is different from `MS_REDIRECT_PATH` | Register exactly `http://localhost/auth/callback` under Mobile and desktop |
| `AADSTS700016` application not found | Wrong client ID, or the authority does not match the account types you picked | Recheck `MS_CLIENT_ID` and `MS_AUTHORITY` |
| "The client does not exist or is not enabled for consumers" | The app was registered for organizations only | Change supported account types, or register again with personal accounts |
| "Need admin approval" | You signed in with a school or work account whose admin blocks app consent | Use the personal test account |
| Signed out after some time | Token expired or was cleared | Click Connect Outlook again |
| `429` or "try again later" | Too many requests | The app waits and retries. Keep test volume small |
| Emails land in Junk | New test mailbox | Mark as "Not junk" once |

## The ADI path (later, only with ADI IT approval)

Ranked from easiest to hardest:
1. **Manual bridge (works today, no approvals):** the `outbox` driver. Approve in the game, then "Open in Outlook" or "Copy email", and the person sends it from their own Outlook. Nothing connects to ADI systems.
2. **Power Automate bridge:** the app writes a small JSON file into a folder that OneDrive syncs. A Power Automate flow ("When a file is created" in OneDrive for Business, then "Send an email (V2)" in Office 365 Outlook) creates or sends the email. Uses standard connectors some of the team already know, but still needs ADI's data policy check.
3. **Graph app in ADI's tenant:** ADI IT registers the app and grants consent. Most powerful, needs a security review.
4. **Copilot Studio agent:** ADI's sanctioned AI path. The helpers' drafting could move here in the long run.

Do not try any of these with ADI accounts before written approval. Record the approval in `docs/DECISIONS.md` first.
