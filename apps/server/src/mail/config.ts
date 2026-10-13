import { MailDriverId, MailMode } from "@hq/shared";
import { z } from "zod";

export interface MailConfig {
  provider: MailDriverId;
  mode: MailMode;
  /** Lowercase addresses that may receive a send. */
  allowed: string[];
  redirectTo: string | null;
  maxPerHour: number;
  digestTo: string | null;
  digestTime: string;
  timezone: string;
  inboxTag: string;
  msClientId: string | null;
  /** Plain-English problems with the settings. Each one falls back to a safe value. */
  problems: string[];
}

const Email = z.email();
const list = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);

/**
 * Mail settings from .env (Claude never reads it, the server does). Nothing set means the outbox
 * driver in drafts mode: no sign-in, nothing sent. A wrong value falls back to the safe default
 * and says so in plain English.
 */
export function loadMailConfig(env: NodeJS.ProcessEnv = process.env): MailConfig {
  const problems: string[] = [];
  const provider = MailDriverId.safeParse(env.MAIL_PROVIDER?.trim() || "outbox");
  if (!provider.success) {
    problems.push(`MAIL_PROVIDER "${env.MAIL_PROVIDER}" is not known, so the outbox is used.`);
  }
  const mode = MailMode.safeParse(env.MAIL_MODE?.trim() || "drafts");
  if (!mode.success) {
    problems.push(`MAIL_MODE "${env.MAIL_MODE}" is not known, so the app only makes drafts.`);
  }

  const allowed = list(env.MAIL_ALLOWED_RECIPIENTS);
  const badAllowed = allowed.filter((a) => !Email.safeParse(a).success);
  if (badAllowed.length > 0) {
    problems.push(
      `MAIL_ALLOWED_RECIPIENTS has addresses that are not valid: ${badAllowed.join(", ")}.`,
    );
  }
  const redirect = env.MAIL_REDIRECT_TO?.trim().toLowerCase() || null;
  if (redirect && !Email.safeParse(redirect).success) {
    problems.push("MAIL_REDIRECT_TO is not a valid address, so the redirect is off.");
  }
  const max = Number(env.MAIL_MAX_SENDS_PER_HOUR || 20);
  const time = env.DIGEST_TIME?.trim() || "17:30";

  return {
    provider: provider.success ? provider.data : "outbox",
    mode: mode.success ? mode.data : "drafts",
    allowed: allowed.filter((a) => Email.safeParse(a).success),
    redirectTo: redirect && Email.safeParse(redirect).success ? redirect : null,
    maxPerHour: Number.isInteger(max) && max >= 0 ? max : 20,
    digestTo: env.DIGEST_TO?.trim() || null,
    digestTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : "17:30",
    timezone: env.HQ_TIMEZONE?.trim() || "Asia/Manila",
    inboxTag: env.HQ_INBOX_TAG?.trim() || "[HQ]",
    msClientId: env.MS_CLIENT_ID?.trim() || null,
    problems,
  };
}
