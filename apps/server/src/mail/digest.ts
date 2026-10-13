import { type AppState, MAIL_FOOTER } from "@hq/shared";
import { PLAYER_SEAT } from "../vault/decide";

/** Theme colors for email, inline because mail apps drop style sheets (adi-theme skill). */
const C = {
  navy: "#12284C",
  accent: "#0067B9",
  ink: "#1A1A1A",
  inkMuted: "#4B5565",
  hairline: "#D9E3F0",
  panel: "#F2F4F7",
};
const FONT = "'Quattrocento Sans', Arial, Helvetica, sans-serif";

export interface Digest {
  subject: string;
  html: string;
  text: string;
}

interface Section {
  title: string;
  lines: string[];
  empty: string;
}

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** "cm-03" becomes "CM 03 helper": the digest is about AI helpers, never people (D-046). */
const helperOf = (state: AppState, seatId: string) =>
  `${state.seats.find((s) => s.id === seatId)?.displayName ?? seatId} helper`;

/**
 * A log line for the email: no time stamp, and every seat id becomes its helper, so a line never
 * reads like a record of what a person did when (D-046, D-116).
 */
const asHelpers = (state: AppState, line: string) =>
  line
    .replace(/^\d\d:\d\d\s+/, "")
    .replace(/\b(?:mgr|lead|cm|ops)-\d+\b/g, (id) => `the ${helperOf(state, id)}`)
    .replace(/^the /, "The ")
    .replace(/^you /, "You ");

/** Inline text styles, written out one by one: Outlook for Windows drops the `font` shorthand. */
const text = (size: number, line: number, weight: number, color: string) =>
  `font-family:${FONT};font-size:${size}px;line-height:${line}px;font-weight:${weight};color:${color};`;

/**
 * The daily digest from today's log and the vault (skill, section 6): What needs you, What the
 * helpers finished, Handoffs (CM to Ops), and Tomorrow. Clean HTML with inline styles, no images and
 * no logo, plus a plain-text copy. Every value is escaped.
 */
export function buildDigest(input: {
  state: AppState;
  /** Today's log lines, like "- 09:12 cm-03 walked to the Endorsement Bridge with 14 PRs". */
  log: string[];
  /** Today in Manila, like "2026-10-13". */
  date: string;
  longDate: string;
}): Digest {
  const { state, log, date } = input;
  const lines = log.map((l) => l.replace(/^- /, "").trim()).filter(Boolean);
  const open = state.queue.filter((q) => q.status === "needs-you" && q.approver === PLAYER_SEAT);
  const doneToday = state.tasks.filter(
    (t) => t.status === "done" && t.completed && t.completed.slice(0, 10) === date,
  );
  const next = state.tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 5);

  const sections: Section[] = [
    {
      title: "What needs you",
      lines: open.map((q) => `${q.title} (from the ${helperOf(state, q.from)})`),
      empty: "Nothing is waiting for you.",
    },
    {
      title: "What the helpers finished",
      lines: [
        ...doneToday.map((t) => `${t.title} (${helperOf(state, t.owner)})`),
        ...lines.filter((l) => /^\d\d:\d\d you /.test(l)).map((l) => asHelpers(state, l)),
      ],
      empty: "Nothing finished yet today.",
    },
    {
      title: "Handoffs (CM to Ops)",
      lines: lines.filter((l) => l.includes("Endorsement Bridge")).map((l) => asHelpers(state, l)),
      empty: "No handoffs today.",
    },
    {
      title: "Tomorrow",
      lines: next.map((t) => `${t.title} (${helperOf(state, t.owner)}, due ${t.due})`),
      empty: "Nothing planned yet.",
    },
  ];

  const subject = `SignalChain HQ daily digest, ${input.longDate}`;
  const plain = [
    subject,
    "",
    ...sections.flatMap((s) => [
      s.title,
      ...(s.lines.length ? s.lines.map((l) => `- ${l}`) : [s.empty]),
      "",
    ]),
    "--",
    MAIL_FOOTER,
  ].join("\n");

  const section = (s: Section) => `
          <h2 style="margin:24px 0 8px;${text(16, 22, 700, C.navy)}">${escapeHtml(s.title)}</h2>
          ${
            s.lines.length
              ? `<ul style="margin:0;padding:0 0 0 20px;${text(14, 21, 400, C.ink)}">${s.lines
                  .map((l) => `<li style="margin:0 0 4px;">${escapeHtml(l)}</li>`)
                  .join("")}</ul>`
              : `<p style="margin:0;${text(14, 21, 400, C.inkMuted)}">${escapeHtml(s.empty)}</p>`
          }`;

  // A 600 px table on a panel-colored table: the layout every mail app keeps, Outlook included.
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;" bgcolor="${C.panel}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.panel}">
    <tr><td align="center" style="padding:24px 8px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="width:600px;max-width:100%;border-top:4px solid ${C.accent};">
        <tr><td style="padding:24px;">
          <h1 style="margin:0;${text(22, 28, 700, C.navy)}">SignalChain HQ daily digest</h1>
          <p style="margin:4px 0 0;${text(14, 21, 400, C.inkMuted)}">${escapeHtml(input.longDate)}</p>
          ${sections.map(section).join("")}
          <p style="margin:32px 0 0;padding-top:12px;border-top:1px solid ${C.hairline};${text(12, 18, 400, C.inkMuted)}">${escapeHtml(MAIL_FOOTER)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
`;
  return { subject, html, text: plain };
}
