import { describe, expect, it } from "vitest";
import {
  composeEmail,
  draftSection,
  emailAsText,
  MAIL_FOOTER,
  MAILTO_LIMIT,
  mailtoUrl,
} from "./mail";

const body = `## Summary
Two dates missed.

## Draft email
Hello Luzon Precision team,

Please send a recovery plan by 29 Sep.

Thank you,
Ops 03

## Helper notes
- Placeholder signature on purpose.`;

const item = {
  email: {
    to: ["orders@luzonprecision.example"],
    cc: [],
    subject: "PO-451208: recovery plan needed",
  },
  body,
};

describe("composing an approved email", () => {
  it("takes only the Draft email section, and adds the footer", () => {
    expect(draftSection(body)).toBe(
      "Hello Luzon Precision team,\n\nPlease send a recovery plan by 29 Sep.\n\nThank you,\nOps 03",
    );
    const email = composeEmail(item);
    expect(email?.text).not.toContain("Helper notes");
    expect(email?.text.endsWith(`--\n${MAIL_FOOTER}`)).toBe(true);
    expect(email?.to).toEqual(["orders@luzonprecision.example"]);
  });

  it("works when the draft is the last section, and is null without one", () => {
    expect(draftSection("## Draft email\nHi there.\n")).toBe("Hi there.");
    expect(composeEmail({ ...item, body: "## Summary\nNo draft." })).toBeNull();
    expect(composeEmail({ body })).toBeNull();
  });

  it("builds a mailto link with CRLF line breaks, and drops the body when it is too long", () => {
    const email = composeEmail(item);
    if (!email) throw new Error("no email");
    const short = mailtoUrl(email);
    expect(short.withBody).toBe(true);
    expect(short.url).toMatch(/^mailto:orders@luzonprecision\.example\?subject=PO-451208/);
    expect(short.url).toContain("%0D%0A");
    const long = mailtoUrl({ ...email, text: "x".repeat(MAILTO_LIMIT) });
    expect(long.withBody).toBe(false);
    expect(long.url).not.toContain("body=");
  });

  it("copies the whole email as text", () => {
    const email = composeEmail(item);
    if (!email) throw new Error("no email");
    expect(emailAsText(email)).toMatch(
      /^To: orders@luzonprecision\.example\nSubject: PO-451208: recovery plan needed\n\nHello/,
    );
  });
});
