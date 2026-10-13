import { describe, expect, it } from "vitest";
import { checkSend, redirectBanner, type SendCheckInput, sameRecipients } from "./guard";

const ok: SendCheckInput = {
  demo: false,
  driver: "graph",
  connected: true,
  mode: "send",
  allowed: ["me@test.example"],
  redirectTo: "me@test.example",
  maxPerHour: 20,
  sendsThisHour: 0,
  nextFreeAt: null,
  recipients: ["Me@Test.example"],
  text: "Hello Luzon Precision team,",
};

describe("the send guard", () => {
  it("passes when every rule is met, with lowercase recipients", () => {
    expect(checkSend(ok)).toEqual({ ok: true, to: ["me@test.example"] });
  });

  it.each<[string, Partial<SendCheckInput>, RegExp]>([
    ["Demo Day", { demo: true }, /^Demo Day never creates real drafts/],
    ["the outbox", { driver: "outbox" }, /works only with Outlook connected/],
    ["not signed in", { connected: false }, /^Outlook is not connected/],
    ["drafts mode", { mode: "drafts" }, /^Sending is off\. MAIL_MODE is drafts/],
    ["dry-run mode", { mode: "dry-run" }, /MAIL_MODE is dry-run/],
    [
      "a redirect not on the list",
      { redirectTo: "other@test.example" },
      /MAIL_REDIRECT_TO must also be on the allowed list/,
    ],
    [
      "a supplier address",
      { redirectTo: null, recipients: ["orders@luzonprecision.example"] },
      /not on your allowed list: orders@luzonprecision\.example\. Add them/,
    ],
    [
      "a Bcc added in Outlook",
      { recipients: ["me@test.example", "boss@elsewhere.example"] },
      /not on your allowed list: boss@elsewhere\.example/,
    ],
    ["no recipients", { recipients: [] }, /no recipients/],
    [
      "the hourly limit",
      { sendsThisHour: 20, nextFreeAt: "14:05" },
      /limit of 20 emails this hour\. Try again after 14:05\./,
    ],
    [
      "a placeholder",
      { text: "Dear [Supplier Name],\nThanks." },
      /placeholder like \[Supplier Name\]\. Send it back/,
    ],
  ])("blocks %s, in plain English", (_name, change, message) => {
    const result = checkSend({ ...ok, ...change });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(message);
  });

  it("compares recipients in any order and case, and writes the redirect banner", () => {
    expect(sameRecipients(["A@x.example", "b@x.example"], ["b@x.example", "a@x.example"])).toBe(
      true,
    );
    expect(sameRecipients(["a@x.example"], ["a@x.example", "c@x.example"])).toBe(false);
    expect(redirectBanner(["orders@luzonprecision.example"])).toBe(
      "Demo redirect. Originally to: orders@luzonprecision.example",
    );
  });
});
