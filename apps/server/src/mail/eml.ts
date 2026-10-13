import type { ComposedEmail } from "@hq/shared";

export class MailError extends Error {}

/** A header value may not hold a line break, or it could add headers of its own. */
function headerSafe(value: string): string {
  if (/[\r\n]/.test(value)) {
    throw new MailError(
      "The email has a line break in its subject or an address, so no draft was made.",
    );
  }
  return value;
}

/** Non-ASCII subjects use an encoded word (RFC 2047), so every mail app reads them. */
function encodeSubject(subject: string): string {
  if (/^[\x20-\x7e]*$/.test(subject)) return subject;
  return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
}

/**
 * An unsent draft as an .eml file. `X-Unsent: 1` makes classic Outlook for Windows open it as a
 * new draft you can edit and send. Lines end in CRLF, and the body is base64 in 76-character lines.
 */
export function buildEml(email: ComposedEmail, at: Date, html?: string): string {
  const headers = [
    "X-Unsent: 1",
    `To: ${email.to.map(headerSafe).join(", ")}`,
    ...(email.cc.length ? [`Cc: ${email.cc.map(headerSafe).join(", ")}`] : []),
    `Subject: ${encodeSubject(headerSafe(email.subject))}`,
    `Date: ${at.toUTCString().replace("GMT", "+0000")}`,
    "MIME-Version: 1.0",
    `Content-Type: text/${html ? "html" : "plain"}; charset=UTF-8`,
    "Content-Transfer-Encoding: base64",
  ];
  const body = Buffer.from((html ?? email.text).replace(/\r?\n/g, "\r\n"), "utf8").toString(
    "base64",
  );
  const lines = body.match(/.{1,76}/g) ?? [];
  return `${headers.join("\r\n")}\r\n\r\n${lines.join("\r\n")}\r\n`;
}
