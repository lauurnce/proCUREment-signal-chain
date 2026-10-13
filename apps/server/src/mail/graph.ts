import { z } from "zod";
import { MailError } from "./eml";

const BASE = "https://graph.microsoft.com/v1.0";
/** Tries for a busy Outlook (429, 503), waiting as long as Retry-After says, at most 60 s each. */
const TRIES = 3;
const MAX_WAIT_S = 60;

export const BUSY = "Outlook is busy. Please try again in a minute.";
export const OFFLINE =
  "Could not reach Outlook. Your draft is safe. Try again when you are online.";

/** Graph refused the token even after a refresh: you must sign in again. */
export class GraphAuthError extends MailError {}
/** The message is not in the mailbox any more, for example deleted in Outlook. */
export class GraphNotFoundError extends MailError {}

export interface GraphDeps {
  /** A fresh access token. `force` asks MSAL for a new one after a 401. */
  token: (force?: boolean) => Promise<string>;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

const Recipient = z.object({ emailAddress: z.object({ address: z.string() }) });
const Message = z.object({
  id: z.string().min(1),
  webLink: z.string().optional(),
  toRecipients: z.array(Recipient).optional(),
  ccRecipients: z.array(Recipient).optional(),
  bccRecipients: z.array(Recipient).optional(),
});
const Me = z.object({
  displayName: z.string().nullable().optional(),
  mail: z.string().nullable().optional(),
  userPrincipalName: z.string().optional(),
});

/** Only Outlook's own web addresses become "Open draft in Outlook" links. */
export function safeWebLink(link: string | undefined): string | undefined {
  return link && /^https:\/\/outlook\.(live|office|office365)\.com\//.test(link) ? link : undefined;
}

/**
 * A small Microsoft Graph client: base URL, bearer token, JSON, and zod checks on every answer.
 * 429 and 503 wait for Retry-After and try again. A 401 gets one quiet token refresh. Errors are
 * plain English. Tokens and email bodies are never logged.
 */
export class GraphClient {
  readonly #deps: Required<GraphDeps>;

  constructor(deps: GraphDeps) {
    this.#deps = {
      fetch: globalThis.fetch,
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      ...deps,
    };
  }

  async #call(method: string, path: string, body?: unknown): Promise<Response> {
    let refreshed = false;
    for (let attempt = 1; ; attempt++) {
      const token = await this.#deps.token(refreshed);
      let response: Response;
      try {
        response = await this.#deps.fetch(`${BASE}${path}`, {
          method,
          headers: {
            authorization: `Bearer ${token}`,
            ...(body === undefined ? {} : { "content-type": "application/json" }),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      } catch {
        throw new MailError(OFFLINE);
      }
      if (response.status === 401 && !refreshed) {
        refreshed = true;
        continue;
      }
      if (response.status === 401) throw new GraphAuthError("Please sign in to Outlook again.");
      if (response.status === 404)
        throw new GraphNotFoundError("The draft is not in Outlook any more.");
      if (response.status === 429 || response.status === 503) {
        if (attempt >= TRIES) throw new MailError(BUSY);
        const wait = Number(response.headers.get("retry-after"));
        await this.#deps.sleep(
          Math.min(Number.isFinite(wait) && wait > 0 ? wait : 2 ** attempt, MAX_WAIT_S) * 1000,
        );
        continue;
      }
      if (!response.ok) {
        throw new MailError(
          `Outlook answered with an error (${response.status}). Try again later.`,
        );
      }
      return response;
    }
  }

  async #json<T>(schema: z.ZodType<T>, method: string, path: string, body?: unknown): Promise<T> {
    const response = await this.#call(method, path, body);
    const parsed = schema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) throw new MailError("Outlook sent an answer the app does not understand.");
    return parsed.data;
  }

  /** Who is signed in. */
  async me(): Promise<string> {
    const me = await this.#json(Me, "GET", "/me?$select=displayName,mail,userPrincipalName");
    return me.mail || me.userPrincipalName || me.displayName || "your Outlook account";
  }

  /** POST /me/messages: a draft in your Drafts folder. */
  async createDraft(input: {
    to: string[];
    cc: string[];
    subject: string;
    text: string;
  }): Promise<{ id: string; webLink?: string }> {
    const toList = (list: string[]) => list.map((address) => ({ emailAddress: { address } }));
    const message = await this.#json(Message, "POST", "/me/messages", {
      subject: input.subject,
      body: { contentType: "Text", content: input.text },
      toRecipients: toList(input.to),
      ccRecipients: toList(input.cc),
    });
    return { id: message.id, webLink: safeWebLink(message.webLink) };
  }

  /** Every recipient the draft has now (To, Cc and Bcc), read again from Outlook. */
  async recipients(id: string): Promise<string[]> {
    const message = await this.#json(
      Message,
      "GET",
      `/me/messages/${encodeURIComponent(id)}?$select=id,toRecipients,ccRecipients,bccRecipients`,
    );
    return [
      ...(message.toRecipients ?? []),
      ...(message.ccRecipients ?? []),
      ...(message.bccRecipients ?? []),
    ].map((r) => r.emailAddress.address);
  }

  /** POST /me/messages/{id}/send. Outlook answers 202 Accepted. */
  async send(id: string): Promise<void> {
    await this.#call("POST", `/me/messages/${encodeURIComponent(id)}/send`);
  }
}
