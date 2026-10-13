import { describe, expect, it, vi } from "vitest";
import {
  BUSY,
  GraphAuthError,
  GraphClient,
  GraphNotFoundError,
  OFFLINE,
  safeWebLink,
} from "./graph";

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

function client(answers: (Response | Error)[]) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = answers.shift();
    if (!next) throw new Error("no more answers");
    if (next instanceof Error) throw next;
    return next;
  });
  const token = vi.fn(async (force?: boolean) => (force ? "fresh-token" : "token"));
  const sleep = vi.fn(async () => undefined);
  return {
    graph: new GraphClient({ token, fetch: fetch as typeof globalThis.fetch, sleep }),
    calls,
    token,
    sleep,
  };
}

describe("the Graph client", () => {
  it("creates a draft with POST /me/messages and keeps only an Outlook web link", async () => {
    const { graph, calls } = client([
      json(201, { id: "AAMk1", webLink: "https://outlook.live.com/owa/?ItemID=AAMk1" }),
    ]);
    const draft = await graph.createDraft({
      to: ["me@test.example"],
      cc: [],
      subject: "PO-451208",
      text: "Hello",
    });
    expect(draft).toEqual({ id: "AAMk1", webLink: "https://outlook.live.com/owa/?ItemID=AAMk1" });
    expect(calls[0]?.url).toBe("https://graph.microsoft.com/v1.0/me/messages");
    expect(calls[0]?.init.method).toBe("POST");
    expect((calls[0]?.init.headers as Record<string, string> | undefined)?.authorization).toBe(
      "Bearer token",
    );
    expect(JSON.parse(String(calls[0]?.init.body))).toMatchObject({
      subject: "PO-451208",
      body: { contentType: "Text", content: "Hello" },
      toRecipients: [{ emailAddress: { address: "me@test.example" } }],
    });
    expect(safeWebLink("https://evil.example/owa")).toBeUndefined();
    expect(safeWebLink("javascript:alert(1)")).toBeUndefined();
  });

  it("rejects an answer it does not understand", async () => {
    const { graph } = client([json(201, { nope: true })]);
    await expect(
      graph.createDraft({ to: ["a@b.example"], cc: [], subject: "s", text: "t" }),
    ).rejects.toThrow("Outlook sent an answer the app does not understand.");
  });

  it("waits for Retry-After on 429 and 503, then gives up after 3 tries", async () => {
    const { graph, sleep } = client([
      json(429, {}, { "retry-after": "7" }),
      json(503, {}, { "retry-after": "999" }),
      json(202, {}),
    ]);
    await graph.send("AAMk1");
    expect(sleep.mock.calls).toEqual([[7_000], [60_000]]);

    const busy = client([json(429, {}), json(429, {}), json(429, {})]);
    await expect(busy.graph.send("AAMk1")).rejects.toThrow(BUSY);
  });

  it("refreshes the token once on 401, then asks you to sign in again", async () => {
    const once = client([json(401, {}), json(202, {})]);
    await once.graph.send("AAMk1");
    expect(once.token.mock.calls).toEqual([[false], [true]]);

    const twice = client([json(401, {}), json(401, {})]);
    await expect(twice.graph.send("AAMk1")).rejects.toBeInstanceOf(GraphAuthError);
  });

  it("reads every recipient again, says when a draft is gone, and when you are offline", async () => {
    const { graph, calls } = client([
      json(200, {
        id: "AAMk1",
        toRecipients: [{ emailAddress: { address: "me@test.example" } }],
        bccRecipients: [{ emailAddress: { address: "hidden@other.example" } }],
      }),
    ]);
    expect(await graph.recipients("AAMk1")).toEqual(["me@test.example", "hidden@other.example"]);
    expect(calls[0]?.url).toContain("$select=id,toRecipients,ccRecipients,bccRecipients");

    await expect(client([json(404, {})]).graph.recipients("x")).rejects.toBeInstanceOf(
      GraphNotFoundError,
    );
    await expect(client([new TypeError("fetch failed")]).graph.send("x")).rejects.toThrow(OFFLINE);
  });
});
