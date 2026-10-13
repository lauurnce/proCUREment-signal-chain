import { cp, mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  type AccountInfo,
  InteractionRequiredAuthError,
  type TokenCacheContext,
} from "@azure/msal-node";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app";
import { fileCachePlugin } from "../auth/cache";
import { type MsalLike, OutlookAuth, SCOPES } from "../auth/outlook";
import { SseHub } from "../sse/hub";
import { VaultStore } from "../vault/store";
import { loadMailConfig } from "./config";
import { GraphClient } from "./graph";
import { MailService } from "./service";

const repoRoot = resolve(import.meta.dirname, "../../../..");
const account = { username: "me@test.example", homeAccountId: "1" } as AccountInfo;

/** A fake MSAL: remembers what it was asked, signs in with any code. */
function fakeMsal(signedIn = false) {
  let current: AccountInfo | null = signedIn ? account : null;
  const msal = {
    getAuthCodeUrl: vi.fn(
      async (r: { state?: string; codeChallenge?: string }) =>
        `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?state=${r.state}&code_challenge=${r.codeChallenge}`,
    ),
    acquireTokenByCode: vi.fn(async () => {
      current = account;
      return { account, accessToken: "token" };
    }),
    acquireTokenSilent: vi.fn(async () => ({ account, accessToken: "token" })),
    getAllAccounts: vi.fn(async () => (current ? [current] : [])),
    signOut: vi.fn(async () => {
      current = null;
    }),
  };
  return msal;
}

describe("the Outlook sign-in", () => {
  it("sends you to Microsoft with PKCE and a one-time state, then takes the code once", async () => {
    const msal = fakeMsal();
    const auth = new OutlookAuth(msal as unknown as MsalLike);
    const url = new URL(await auth.loginUrl("http://localhost:5173/auth/callback"));
    const state = url.searchParams.get("state") ?? "";
    expect(state).toMatch(/^[0-9a-f-]{36}$/);
    expect(msal.getAuthCodeUrl.mock.calls[0]?.[0]).toMatchObject({
      scopes: SCOPES,
      redirectUri: "http://localhost:5173/auth/callback",
      codeChallengeMethod: "S256",
    });

    await expect(auth.callback({ state: "wrong", code: "abc" })).rejects.toThrow(
      /old or was already used/,
    );
    await auth.callback({ state, code: "abc" });
    expect(auth.connected).toBe(true);
    expect(auth.account).toBe("me@test.example");
    const verifier = (
      msal.acquireTokenByCode.mock.calls[0] as unknown as [{ codeVerifier: string }]
    )[0].codeVerifier;
    expect(verifier.length).toBeGreaterThan(40);
    // The same state cannot be used twice.
    await expect(auth.callback({ state, code: "abc" })).rejects.toThrow(/old or was already used/);
  });

  it("says plainly when you decline, or when the link is too old", async () => {
    const auth = new OutlookAuth(fakeMsal() as unknown as MsalLike);
    const declined = new URL(await auth.loginUrl("http://localhost:5173/auth/callback"));
    await expect(
      auth.callback({ state: declined.searchParams.get("state") ?? "", error: "access_denied" }),
    ).rejects.toThrow("You did not accept the permissions, so Outlook is not connected.");
    const old = new URL(await auth.loginUrl("http://localhost:5173/auth/callback", 0));
    await expect(
      auth.callback({ state: old.searchParams.get("state") ?? "", code: "x" }, 11 * 60_000),
    ).rejects.toThrow(/old or was already used/);
  });

  it("asks you to sign in again when the refresh needs you, and signs out", async () => {
    const msal = fakeMsal(true);
    const auth = new OutlookAuth(msal as unknown as MsalLike);
    await auth.load();
    msal.acquireTokenSilent.mockRejectedValueOnce(
      new InteractionRequiredAuthError("interaction_required", "test"),
    );
    await expect(auth.token()).rejects.toThrow("Please sign in to Outlook again.");
    expect(auth.connected).toBe(false);
    await auth.signOut();
    expect(auth.account).toBeNull();
    expect(msal.signOut).toHaveBeenCalled();
  });

  it("keeps the fallback cache in a file only you can read", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hq-secrets-"));
    const secrets = join(dir, ".secrets");
    const plugin = fileCachePlugin(secrets);
    await plugin.afterCacheAccess({
      cacheHasChanged: true,
      tokenCache: { serialize: () => '{"tokens":"x"}', deserialize: () => undefined },
    } as unknown as TokenCacheContext);
    expect((await stat(secrets)).mode & 0o777).toBe(0o700);
    expect((await stat(join(secrets, "msal-cache.json"))).mode & 0o777).toBe(0o600);
    await rm(dir, { recursive: true, force: true });
  });
});

describe("Outlook drafts and Send now", () => {
  let temp: string;
  let vaultDir: string;
  let app: FastifyInstance;
  let store: VaultStore;
  let outlook: { recipients: string[]; drafts: unknown[]; sent: string[]; gone: boolean };

  async function setup(env: NodeJS.ProcessEnv) {
    temp = await mkdtemp(join(tmpdir(), "hq-outlook-"));
    vaultDir = join(temp, "vault");
    await cp(join(repoRoot, "vault.sample"), vaultDir, { recursive: true });
    store = new VaultStore({ vaultDir, dataDir: join(repoRoot, "data") });
    await store.reload();
    outlook = { recipients: [], drafts: [], sent: [], gone: false };
    // A fake Outlook mailbox behind the real Graph client.
    const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const path = String(url).replace("https://graph.microsoft.com/v1.0", "");
      if (outlook.gone) return new Response("{}", { status: 404 });
      if (path === "/me/messages" && init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        outlook.drafts.push(body);
        outlook.recipients = body.toRecipients.map(
          (r: { emailAddress: { address: string } }) => r.emailAddress.address,
        );
        return Response.json({
          id: "AAMk1",
          webLink: "https://outlook.live.com/owa/?ItemID=AAMk1",
        });
      }
      if (path.startsWith("/me/messages/AAMk1?")) {
        return Response.json({
          id: "AAMk1",
          toRecipients: outlook.recipients.map((address) => ({ emailAddress: { address } })),
        });
      }
      if (path === "/me/messages/AAMk1/send") {
        outlook.sent.push("AAMk1");
        return new Response(null, { status: 202 });
      }
      return new Response("{}", { status: 500 });
    });
    const msal = fakeMsal(true);
    const auth = new OutlookAuth(msal as unknown as MsalLike);
    await auth.load();
    const graph = new GraphClient({
      token: (force) => auth.token(force),
      fetch: fetch as typeof globalThis.fetch,
      sleep: async () => undefined,
    });
    const mail = new MailService({
      config: loadMailConfig({ MAIL_PROVIDER: "graph", MS_CLIENT_ID: "test", ...env }),
      store,
      auth,
      graph,
    });
    app = await buildApp({
      store,
      hub: new SseHub(),
      webPort: 5173,
      apiPort: 4317,
      worktree: null,
      vaultPath: "vault",
      mail,
    });
    return mail;
  }
  afterEach(async () => {
    await app?.close();
    if (temp) await rm(temp, { recursive: true, force: true });
  });

  const headers = { host: "127.0.0.1:5173", origin: "http://127.0.0.1:5173" };
  const approve = () =>
    app.inject({
      method: "POST",
      url: "/api/queue/q-0001/decision",
      payload: { action: "approve" },
      headers,
    });
  const check = () => app.inject({ url: "/api/mail/items/q-0001/send-check", headers });
  const send = (recipients: string[]) =>
    app.inject({
      method: "POST",
      url: "/api/mail/items/q-0001/send",
      payload: { recipients },
      headers,
    });
  const allToday = async () => {
    const files = await readdir(join(vaultDir, "log"));
    return (await Promise.all(files.map((f) => readFile(join(vaultDir, "log", f), "utf8")))).join(
      "",
    );
  };

  it("approve makes a real draft, already redirected to you, and drafts mode never sends", async () => {
    const mail = await setup({
      MAIL_MODE: "drafts",
      MAIL_ALLOWED_RECIPIENTS: "me@test.example",
      MAIL_REDIRECT_TO: "me@test.example",
    });
    expect(mail.status()).toMatchObject({ driver: "graph", connected: true, sendReady: false });
    const item = (await approve()).json().item;
    expect(item.mail).toMatchObject({
      driver: "graph",
      state: "draft",
      draftId: "AAMk1",
      webLink: "https://outlook.live.com/owa/?ItemID=AAMk1",
      to: ["me@test.example"],
      redirectedFrom: ["orders@luzonprecision.example"],
    });
    // The draft in Outlook never holds the supplier's address, and starts with the banner.
    const draft = outlook.drafts[0] as { body: { content: string }; ccRecipients: unknown[] };
    expect(draft.body.content).toMatch(
      /^Demo redirect\. Originally to: orders@luzonprecision\.example/,
    );
    expect(draft.ccRecipients).toEqual([]);
    expect(await allToday()).toContain("mail: draft for q-0001 (graph) in your Outlook Drafts");

    expect((await check()).json()).toEqual({
      ok: false,
      error: "Sending is off. MAIL_MODE is drafts, so the app only makes drafts.",
    });
    expect((await send(["me@test.example"])).statusCode).toBe(409);
    expect(outlook.sent).toEqual([]);
  });

  it("Send now sends only the confirmed recipients, logs it, and records it", async () => {
    await setup({
      MAIL_MODE: "send",
      MAIL_ALLOWED_RECIPIENTS: "me@test.example",
      MAIL_REDIRECT_TO: "me@test.example",
    });
    await approve();
    expect((await check()).json()).toEqual({
      ok: true,
      to: ["me@test.example"],
      redirectedFrom: ["orders@luzonprecision.example"],
    });

    // Someone added an address in Outlook after the check: the send stops.
    outlook.recipients = ["me@test.example", "boss@elsewhere.example"];
    const changed = await send(["me@test.example"]);
    expect(changed.statusCode).toBe(409);
    expect(changed.json().error).toMatch(/not on your allowed list: boss@elsewhere\.example/);
    outlook.recipients = ["me@test.example"];

    const sent = await send(["me@test.example"]);
    expect(sent.statusCode).toBe(200);
    expect(sent.json().item.mail).toMatchObject({ state: "sent" });
    expect(outlook.sent).toEqual(["AAMk1"]);
    expect(await allToday()).toContain(
      "mail: sent q-0001 (graph) to me@test.example (redirected from orders@luzonprecision.example)",
    );
    const overview = (await app.inject({ url: "/api/mail", headers })).json();
    expect(overview.sent[0]).toMatchObject({ itemId: "q-0001", to: ["me@test.example"] });
    expect(overview.status.sendReady).toBe(true);
    // Sent once is sent.
    expect((await send(["me@test.example"])).json().error).toBe("q-0001 was already sent.");
  });

  it("blocks a supplier address without a redirect, and the hourly limit", async () => {
    await setup({ MAIL_MODE: "send", MAIL_ALLOWED_RECIPIENTS: "me@test.example" });
    await approve();
    expect((await check()).json().error).toMatch(
      /not on your allowed list: orders@luzonprecision\.example/,
    );
    await app.close();
    await rm(temp, { recursive: true, force: true });

    await setup({
      MAIL_MODE: "send",
      MAIL_ALLOWED_RECIPIENTS: "me@test.example",
      MAIL_REDIRECT_TO: "me@test.example",
      MAIL_MAX_SENDS_PER_HOUR: "0",
    });
    await approve();
    expect((await check()).json().error).toMatch(/limit of 0 emails this hour/);
  });

  it("a draft deleted in Outlook can be made again, once", async () => {
    await setup({
      MAIL_MODE: "send",
      MAIL_ALLOWED_RECIPIENTS: "me@test.example",
      MAIL_REDIRECT_TO: "me@test.example",
    });
    await approve();
    outlook.gone = true;
    expect((await check()).json().error).toBe(
      "The draft is not in Outlook any more. Make the draft again.",
    );
    outlook.gone = false;
    const again = await app.inject({
      method: "POST",
      url: "/api/mail/items/q-0001/draft",
      payload: {},
      headers,
    });
    expect(again.statusCode).toBe(200);
    expect(again.json().item.mail.state).toBe("draft");
  });

  it("Connect Outlook goes to Microsoft, and the callback comes back to the Mail tab", async () => {
    await setup({});
    const login = await app.inject({ url: "/auth/login", headers: { host: "localhost:5173" } });
    expect(login.statusCode).toBe(302);
    const location = new URL(login.headers.location as string);
    expect(location.host).toBe("login.microsoftonline.com");
    const back = await app.inject({
      url: `/auth/callback?state=${location.searchParams.get("state")}&code=abc`,
      headers: { host: "localhost:5173" },
    });
    expect(back.headers.location).toBe("http://localhost:5173/?tab=mail");
    const bad = await app.inject({
      url: "/auth/callback?state=nope&code=abc",
      headers: { host: "localhost:5173" },
    });
    expect(bad.headers.location).toMatch(/mailProblem=This%20sign-in%20link%20is%20old/);
  });

  it("Sign out needs the page's own origin", async () => {
    const mail = await setup({});
    const evil = await app.inject({
      method: "POST",
      url: "/api/mail/signout",
      payload: {},
      headers: { ...headers, origin: "https://evil.example" },
    });
    expect(evil.statusCode).toBe(403);
    expect(mail.status().connected).toBe(true);
    const out = await app.inject({
      method: "POST",
      url: "/api/mail/signout",
      payload: {},
      headers,
    });
    expect(out.json().status).toMatchObject({ connected: false, account: null });
  });
});
