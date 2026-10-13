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
const InboxList = z.object({
  value: z.array(
    z.object({
      id: z.string().min(1),
      subject: z.string().nullable().optional(),
      from: z
        .object({ emailAddress: z.object({ address: z.string() }) })
        .nullable()
        .optional(),
      receivedDateTime: z.string(),
    }),
  ),
});
const Body = z.object({ body: z.object({ contentType: z.string(), content: z.string() }) });
const Me = z.object({
  displayName: z.string().nullable().optional(),
  mail: z.string().nullable().optional(),
  userPrincipalName: z.string().optional(),
});

export interface OutgoingEmail {
  to: string[];
  cc: string[];
  subject: string;
  text: string;
  html?: string;
}

export interface InboxMessage {
  id: string;
  subject: string;
  from: string;
  receivedAt: string;
}

function graphMessage(input: OutgoingEmail) {
  const toList = (list: string[]) => list.map((address) => ({ emailAddress: { address } }));
  return {
    subject: input.subject,
    body: input.html
      ? { contentType: "HTML", content: input.html }
      : { contentType: "Text", content: input.text },
    toRecipients: toList(input.to),
    ccRecipients: toList(input.cc),
  };
}

/** Rough HTML to text for a task note: drops tags, styles and scripts, keeps line breaks. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

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

  /** POST /me/messages: a draft in your Drafts folder. With `html`, the body is HTML (the digest). */
  async createDraft(input: OutgoingEmail): Promise<{ id: string; webLink?: string }> {
    const message = await this.#json(Message, "POST", "/me/messages", graphMessage(input));
    return { id: message.id, webLink: safeWebLink(message.webLink) };
  }

  /** POST /me/sendMail: sends a new email at once, kept in Sent Items. Only the digest uses it. */
  async sendMail(input: OutgoingEmail): Promise<void> {
    await this.#call("POST", "/me/sendMail", {
      message: graphMessage(input),
      saveToSentItems: true,
    });
  }

  /**
   * The newest inbox emails, with only id, subject, sender and time (skill, rule 7). No bodies.
   */
  async listInbox(): Promise<InboxMessage[]> {
    const list = await this.#json(
      InboxList,
      "GET",
      "/me/mailFolders/inbox/messages?$top=25&$select=id,subject,from,receivedDateTime&$orderby=receivedDateTime%20desc",
    );
    return list.value.map((m) => ({
      id: m.id,
      subject: m.subject ?? "",
      from: m.from?.emailAddress.address ?? "",
      receivedAt: m.receivedDateTime,
    }));
  }

  /** The body of one email, as plain text. Called only for emails tagged for the HQ. */
  async body(id: string): Promise<string> {
    const message = await this.#json(
      Body,
      "GET",
      `/me/messages/${encodeURIComponent(id)}?$select=body`,
    );
    return message.body.contentType.toLowerCase() === "html"
      ? htmlToText(message.body.content)
      : message.body.content;
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

  /** PATCH /me/messages/{id}: exactly these recipients, with Cc and Bcc cleared. */
  async setRecipients(id: string, to: string[]): Promise<void> {
    await this.#call("PATCH", `/me/messages/${encodeURIComponent(id)}`, {
      toRecipients: to.map((address) => ({ emailAddress: { address } })),
      ccRecipients: [],
      bccRecipients: [],
    });
  }

  /** POST /me/messages/{id}/send. Outlook answers 202 Accepted. */
  async send(id: string): Promise<void> {
    await this.#call("POST", `/me/messages/${encodeURIComponent(id)}/send`);
  }
}
