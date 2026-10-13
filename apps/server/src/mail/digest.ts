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
 * The daily digest from today's log and the vault (skill, section 6): What needs you, What the
 * team finished, Handoffs (CM to Ops), and Tomorrow. Clean HTML with inline styles, no images and
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
      title: "What the team finished",
      lines: [
        ...doneToday.map((t) => `${t.title} (${helperOf(state, t.owner)})`),
        ...lines.filter((l) => /^\d\d:\d\d you /.test(l)),
      ],
      empty: "Nothing finished yet today.",
    },
    {
      title: "Handoffs (CM to Ops)",
      lines: lines.filter((l) => l.includes("Endorsement Bridge")),
      empty: "No handoffs today.",
    },
    {
      title: "Tomorrow",
      lines: next.map((t) => `${t.title} (${helperOf(state, t.owner)}, due ${t.due})`),
      empty: "Nothing planned yet.",
    },
  ];

  const subject = `SignalChain HQ daily digest, ${input.longDate}`;
  const text = [
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
    <h2 style="margin:24px 0 8px;font:700 16px/22px ${FONT};color:${C.navy};">${escapeHtml(s.title)}</h2>
    ${
      s.lines.length
        ? `<ul style="margin:0;padding:0 0 0 20px;font:400 14px/21px ${FONT};color:${C.ink};">${s.lines
            .map((l) => `<li style="margin:0 0 4px;">${escapeHtml(l)}</li>`)
            .join("")}</ul>`
        : `<p style="margin:0;font:400 14px/21px ${FONT};color:${C.inkMuted};">${escapeHtml(s.empty)}</p>`
    }`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.panel};">
  <div style="max-width:600px;margin:0 auto;padding:24px;background:#FFFFFF;border-top:4px solid ${C.accent};">
    <h1 style="margin:0;font:700 22px/28px ${FONT};color:${C.navy};">SignalChain HQ daily digest</h1>
    <p style="margin:4px 0 0;font:400 14px/21px ${FONT};color:${C.inkMuted};">${escapeHtml(input.longDate)}</p>
    ${sections.map(section).join("")}
    <p style="margin:32px 0 0;padding-top:12px;border-top:1px solid ${C.hairline};font:400 12px/18px ${FONT};color:${C.inkMuted};">${escapeHtml(MAIL_FOOTER)}</p>
  </div>
</body></html>
`;
  return { subject, html, text };
}
