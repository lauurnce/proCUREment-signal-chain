import type { MailDriverId, MailMode } from "@hq/shared";

export interface SendCheckInput {
  demo: boolean;
  driver: MailDriverId;
  connected: boolean;
  mode: MailMode;
  /** MAIL_ALLOWED_RECIPIENTS, lowercase. */
  allowed: string[];
  redirectTo: string | null;
  maxPerHour: number;
  sendsThisHour: number;
  /** When the oldest send of the last hour leaves the window, for the "try again after" time. */
  nextFreeAt: string | null;
  /** Every recipient the draft has now: To, Cc and Bcc. */
  recipients: string[];
  /** The email text, to catch a placeholder left in it. */
  text: string;
}

export type SendCheck = { ok: true; to: string[] } | { ok: false; error: string };

/** A placeholder like [Supplier Name] that a helper left for a person to fill in. */
const PLACEHOLDER = /\[[A-Z][A-Za-z .'-]{1,40}\]/;

/**
 * Every rule a send must pass, on the server (outlook-integration skill, section 2). The order
 * puts the most useful message first. Approve never sends: this guards only "Send now".
 */
export function checkSend(input: SendCheckInput): SendCheck {
  if (input.demo) return { ok: false, error: "Demo Day never creates real drafts or sends email." };
  if (input.driver !== "graph") {
    return {
      ok: false,
      error: "Send now works only with Outlook connected. Send this one yourself from Outlook.",
    };
  }
  if (!input.connected) {
    return {
      ok: false,
      error: "Outlook is not connected. Click Connect Outlook at the top of the Mail tab.",
    };
  }
  if (input.mode !== "send") {
    return {
      ok: false,
      error: `Sending is off. MAIL_MODE is ${input.mode}, so the app only makes drafts. To send, set MAIL_MODE=send in .env and restart pnpm dev.`,
    };
  }
  const allowed = new Set(input.allowed);
  if (input.redirectTo && !allowed.has(input.redirectTo)) {
    return {
      ok: false,
      error:
        "Sending is off: MAIL_REDIRECT_TO must also be on the allowed list. Add it to MAIL_ALLOWED_RECIPIENTS in .env and restart pnpm dev.",
    };
  }
  const to = [...new Set(input.recipients.map((r) => r.trim().toLowerCase()))];
  if (to.length === 0) return { ok: false, error: "Not sent. The draft has no recipients." };
  // With the demo redirect on, a draft may only go to the redirect address, even if someone
  // added another allowed address in Outlook, or the draft was made before the redirect.
  if (input.redirectTo && (to.length !== 1 || to[0] !== input.redirectTo)) {
    return {
      ok: false,
      error: `Not sent. The demo redirect is on, so this draft may only go to ${input.redirectTo}. Remove the other addresses in Outlook, or make the draft again.`,
    };
  }
  const blocked = to.filter((r) => !allowed.has(r));
  if (blocked.length > 0) {
    return {
      ok: false,
      error: `Not sent. These addresses are not on your allowed list: ${blocked.join(", ")}. Add them to MAIL_ALLOWED_RECIPIENTS or set MAIL_REDIRECT_TO in .env, then restart pnpm dev.`,
    };
  }
  if (input.sendsThisHour >= input.maxPerHour) {
    const after = input.nextFreeAt ? ` Try again after ${input.nextFreeAt}.` : "";
    return {
      ok: false,
      error: `Not sent. You reached the limit of ${input.maxPerHour} emails this hour.${after}`,
    };
  }
  const placeholder = PLACEHOLDER.exec(input.text)?.[0];
  if (placeholder) {
    return {
      ok: false,
      error: `Not sent. The email still has a placeholder like ${placeholder}. Fill it in in the Outlook draft, then try again.`,
    };
  }
  return { ok: true, to };
}

/** True when two recipient lists hold the same addresses, in any order and case. */
export function sameRecipients(a: string[], b: string[]): boolean {
  const norm = (list: string[]) =>
    [...new Set(list.map((x) => x.trim().toLowerCase()))].sort().join(",");
  return norm(a) === norm(b);
}

/** The banner at the top of a redirected email. */
export function redirectBanner(originalTo: string[]): string {
  return `Demo redirect. Originally to: ${originalTo.join(", ")}`;
}
