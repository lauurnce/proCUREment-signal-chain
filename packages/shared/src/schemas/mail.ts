import { z } from "zod";
import { IsoDateTime } from "./common";

/** How email leaves the app (outlook-integration skill, section 1). */
export const MailDriverId = z.enum(["outbox", "graph", "power-automate"]);
export type MailDriverId = z.infer<typeof MailDriverId>;

/** MAIL_MODE: dry-run creates nothing, drafts only makes drafts, send also allows "Send now". */
export const MailMode = z.enum(["dry-run", "drafts", "send"]);
export type MailMode = z.infer<typeof MailMode>;

/**
 * What happened to the email of an approved item. Saved in the item's frontmatter as `mail:`,
 * so the panel and Obsidian both show it.
 */
export const MailRef = z.object({
  driver: MailDriverId,
  state: z.enum(["dry-run", "draft", "sent", "failed"]),
  /** The recipients the draft really has, after any demo redirect. */
  to: z.array(z.string()),
  /** The outbox driver's .eml file, like "outbox/q-0001.eml". */
  file: z.string().optional(),
  draftId: z.string().optional(),
  webLink: z.string().optional(),
  createdAt: IsoDateTime,
  sentAt: IsoDateTime.optional(),
  /** The original recipients, when MAIL_REDIRECT_TO points the draft at you instead. */
  redirectedFrom: z.array(z.string()).optional(),
  /** Plain English, when the draft could not be made. */
  problem: z.string().optional(),
});
export type MailRef = z.infer<typeof MailRef>;

export const MailStatus = z.object({
  /** The driver in use right now. Demo Day and missing settings fall back to the outbox. */
  driver: MailDriverId,
  /** MAIL_PROVIDER as you set it. */
  configured: MailDriverId,
  mode: MailMode,
  connected: z.boolean(),
  account: z.string().nullable(),
  /** True only when "Send now" can work: send mode, a connected driver, and a safe allowlist. */
  sendReady: z.boolean(),
  redirectTo: z.string().nullable(),
  allowlistCount: z.number().int().min(0),
  maxPerHour: z.number().int().min(0),
  /** Plain English, when something is not set up or is wrong. */
  problem: z.string().nullable(),
  /** Plain English, when the sign-in is kept in a file instead of the Keychain. */
  cacheWarning: z.string().nullable(),
});
export type MailStatus = z.infer<typeof MailStatus>;

/** One send, in vault/.state/mail.json and the Mail tab's Sent list. Never the email body. */
export const SentEntry = z.object({
  at: IsoDateTime,
  itemId: z.string(),
  subject: z.string(),
  /** Who it really went to. */
  to: z.array(z.string()),
  driver: MailDriverId,
  /** The original recipients, when MAIL_REDIRECT_TO sent it to you instead. */
  redirectedFrom: z.array(z.string()).optional(),
});
export type SentEntry = z.infer<typeof SentEntry>;

/** GET /api/mail: what the Mail tab shows. Settings come from .env and are read-only here. */
export const MailOverview = z.object({
  status: MailStatus,
  /** The last 20 sends, newest first. */
  sent: z.array(SentEntry),
  digest: z.object({
    time: z.string(),
    timezone: z.string(),
    hasRecipient: z.boolean(),
    /** When the last digest went out (or was saved), or null. */
    lastAt: IsoDateTime.nullable(),
    /** True when "Send digest now" really sends (Outlook in send mode). Otherwise it makes a draft. */
    sends: z.boolean(),
  }),
  inbox: z.object({
    tag: z.string(),
    pollSeconds: z.number().int(),
    /** True when tagged emails become tasks: Outlook connected, and not in Demo Day. */
    active: z.boolean(),
    lastCheck: IsoDateTime.nullable(),
  }),
});
export type MailOverview = z.infer<typeof MailOverview>;
