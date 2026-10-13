import {
  type AccountInfo,
  CryptoProvider,
  InteractionRequiredAuthError,
  PublicClientApplication,
} from "@azure/msal-node";
import { createTokenCache } from "./cache";

/** The four delegated permissions (OUTLOOK_SETUP step 4). Nothing more. */
export const SCOPES = ["User.Read", "Mail.ReadWrite", "Mail.Send", "offline_access"];

/** How long a sign-in may take between Connect Outlook and the callback. */
const PENDING_MS = 10 * 60_000;

/** The parts of MSAL's PublicClientApplication we use, so tests can pass a fake. */
export interface MsalLike {
  getAuthCodeUrl: PublicClientApplication["getAuthCodeUrl"];
  acquireTokenByCode: PublicClientApplication["acquireTokenByCode"];
  acquireTokenSilent: PublicClientApplication["acquireTokenSilent"];
  getAllAccounts: PublicClientApplication["getAllAccounts"];
  signOut: PublicClientApplication["signOut"];
}

/** Plain-English sign-in problems. The routes and the Mail tab show the message as it is. */
export class SignInError extends Error {}

export const SIGN_IN_AGAIN = "Please sign in to Outlook again.";
export const NOT_CONNECTED =
  "Outlook is not connected. Open the Mail tab and click Connect Outlook.";

/**
 * The Outlook sign-in with MSAL Node: authorization code flow with PKCE (a one-time secret made
 * for each sign-in), as a public client, so no client secret is stored anywhere. Tokens stay on
 * the server, in the Keychain or the .secrets/ file. The browser never sees one.
 */
export class OutlookAuth {
  readonly #msal: MsalLike;
  readonly #crypto = new CryptoProvider();
  /** Sign-ins in progress, by their random `state`. Each one can be used once. */
  readonly #pending = new Map<string, { verifier: string; redirectUri: string; until: number }>();
  #account: AccountInfo | null = null;
  #problem: string | null = null;
  readonly cacheWarning: string | null;

  constructor(msal: MsalLike, cacheWarning: string | null = null) {
    this.#msal = msal;
    this.cacheWarning = cacheWarning;
  }

  /** The real MSAL app, with the Keychain cache (or the file fallback). */
  static async create(options: {
    clientId: string;
    authority: string;
    secretsDir: string;
  }): Promise<OutlookAuth> {
    const cache = await createTokenCache(options.secretsDir);
    const msal = new PublicClientApplication({
      auth: { clientId: options.clientId, authority: options.authority },
      cache: { cachePlugin: cache.plugin },
    });
    const auth = new OutlookAuth(msal, cache.warning);
    await auth.load();
    return auth;
  }

  /** Reads the saved account, if you signed in before. */
  async load(): Promise<void> {
    const accounts = await this.#msal.getAllAccounts().catch(() => []);
    this.#account = accounts[0] ?? null;
  }

  get account(): string | null {
    return this.#account?.username || null;
  }

  get connected(): boolean {
    return this.#account !== null && this.#problem === null;
  }

  get problem(): string | null {
    return this.#problem;
  }

  /** Step 1 of Connect Outlook: the Microsoft sign-in page to send the browser to. */
  async loginUrl(redirectUri: string, now = Date.now()): Promise<string> {
    for (const [key, p] of this.#pending) if (p.until < now) this.#pending.delete(key);
    const { verifier, challenge } = await this.#crypto.generatePkceCodes();
    const state = this.#crypto.createNewGuid();
    this.#pending.set(state, { verifier, redirectUri, until: now + PENDING_MS });
    return this.#msal.getAuthCodeUrl({
      scopes: SCOPES,
      redirectUri,
      codeChallenge: challenge,
      codeChallengeMethod: "S256",
      state,
      prompt: "select_account",
    });
  }

  /** Step 2: Microsoft sends the browser back with a code. Throws SignInError in plain English. */
  async callback(query: Record<string, string | undefined>, now = Date.now()): Promise<void> {
    const pending = query.state ? this.#pending.get(query.state) : undefined;
    if (query.state) this.#pending.delete(query.state);
    if (!pending || pending.until < now) {
      throw new SignInError(
        "This sign-in link is old or was already used. Click Connect Outlook again.",
      );
    }
    if (query.error) {
      throw new SignInError(
        query.error === "access_denied"
          ? "You did not accept the permissions, so Outlook is not connected."
          : "Microsoft did not finish the sign-in. Click Connect Outlook to try again.",
      );
    }
    if (!query.code) throw new SignInError("Microsoft did not send a sign-in code. Try again.");
    try {
      const result = await this.#msal.acquireTokenByCode({
        code: query.code,
        scopes: SCOPES,
        redirectUri: pending.redirectUri,
        codeVerifier: pending.verifier,
      });
      this.#account = result.account;
      this.#problem = null;
    } catch {
      throw new SignInError("The sign-in did not finish. Click Connect Outlook to try again.");
    }
  }

  /** An access token for Graph, refreshed quietly when it can be. Never logged, never sent to the page. */
  async token(force = false): Promise<string> {
    if (!this.#account) throw new SignInError(NOT_CONNECTED);
    try {
      const result = await this.#msal.acquireTokenSilent({
        account: this.#account,
        scopes: SCOPES,
        forceRefresh: force,
      });
      this.#problem = null;
      return result.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) this.#problem = SIGN_IN_AGAIN;
      throw new SignInError(
        error instanceof InteractionRequiredAuthError
          ? SIGN_IN_AGAIN
          : "Could not reach Microsoft to refresh the sign-in. Try again when you are online.",
      );
    }
  }

  /** Graph said 401 even with a fresh token: the sign-in is no longer good. */
  expire(): void {
    this.#problem = SIGN_IN_AGAIN;
  }

  /** Sign out: removes the account and its tokens from the cache. */
  async signOut(): Promise<void> {
    if (this.#account) await this.#msal.signOut({ account: this.#account }).catch(() => undefined);
    this.#account = null;
    this.#problem = null;
  }
}
