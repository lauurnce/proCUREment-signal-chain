import type { QueueItem } from "./schemas/queue-item";

/** Every email ends with this line (outlook-integration skill, safety rule 8). */
export const MAIL_FOOTER = "Sent from SignalChain HQ, an unofficial prototype. Fictional data.";

/**
 * Sign-in problems, by the short code /auth/callback puts in the address bar. The page shows only
 * these fixed messages, so a crafted link cannot put its own text in the app.
 */
export const SIGN_IN_PROBLEMS = {
  expired: "This sign-in link is old or was already used. Click Connect Outlook again.",
  declined: "You did not accept the permissions, so Outlook is not connected.",
  unfinished: "The sign-in did not finish. Click Connect Outlook to try again.",
  "no-client-id":
    "MS_CLIENT_ID is not set, so Outlook cannot connect. Set it in .env and restart pnpm dev.",
  demo: "Turn off Demo Day before you connect Outlook.",
  offline: "Could not reach Microsoft. Check your connection, then click Connect Outlook again.",
} as const;
export type SignInProblem = keyof typeof SIGN_IN_PROBLEMS;

/** Keep a whole mailto link under this many characters, so every mail app opens it. */
export const MAILTO_LIMIT = 2_000;

export interface ComposedEmail {
  to: string[];
  cc: string[];
  subject: string;
  /** Plain text, with the footer. */
  text: string;
}

/** The "## Draft email" section of an item's body, or null when there is none. */
export function draftSection(body: string): string | null {
  const match = /^## Draft email[ \t]*\r?\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(body);
  const text = match?.[1]?.trim();
  return text ? text : null;
}

/**
 * The email an approved item becomes: its recipients and subject, the "## Draft email" text and
 * the footer. Web and server both use this, so Copy email, the mailto link and the .eml file
 * always match. Null when the item has no email.
 */
export function composeEmail(item: Pick<QueueItem, "email" | "body">): ComposedEmail | null {
  const text = draftSection(item.body);
  if (!item.email || !text) return null;
  return {
    to: item.email.to,
    cc: item.email.cc,
    subject: item.email.subject,
    text: `${text}\n\n--\n${MAIL_FOOTER}`,
  };
}

/**
 * A mailto link for "Open in Outlook". Line breaks are sent as CRLF (RFC 6068). When the link
 * would be too long, it keeps the recipients and subject only, and `withBody` is false.
 */
export function mailtoUrl(email: ComposedEmail): { url: string; withBody: boolean } {
  const head = `mailto:${email.to.join(",")}?subject=${encodeURIComponent(email.subject)}${
    email.cc.length ? `&cc=${email.cc.join(",")}` : ""
  }`;
  const full = `${head}&body=${encodeURIComponent(email.text.replace(/\r?\n/g, "\r\n"))}`;
  return full.length <= MAILTO_LIMIT
    ? { url: full, withBody: true }
    : { url: head, withBody: false };
}

/** The whole email as text, for "Copy email". */
export function emailAsText(email: ComposedEmail): string {
  const cc = email.cc.length ? `Cc: ${email.cc.join(", ")}\n` : "";
  return `To: ${email.to.join(", ")}\n${cc}Subject: ${email.subject}\n\n${email.text}\n`;
}
