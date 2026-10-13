import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { composeEmail, Id } from "@hq/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { SignInError } from "../auth/outlook";
import { buildEml } from "../mail/eml";
import type { MailService } from "../mail/service";
import type { SseHub } from "../sse/hub";
import type { VaultStore } from "../vault/store";

/**
 * The Mail tab's routes. A POST must come from the SignalChain HQ page itself: a browser always
 * sends Origin on a POST, so another website cannot make drafts for you.
 */
export function registerMailRoutes(
  app: FastifyInstance,
  deps: { store: VaultStore; hub: SseHub; mail: MailService; webPort: number },
): void {
  const origins = new Set([`http://127.0.0.1:${deps.webPort}`, `http://localhost:${deps.webPort}`]);
  const fromPage = (request: FastifyRequest, reply: FastifyReply) => {
    const origin = request.headers.origin;
    if (origin && !origins.has(origin)) {
      reply.code(403).send({ error: "This request did not come from the SignalChain HQ page." });
      return false;
    }
    return true;
  };
  const itemId = (request: FastifyRequest) => Id.safeParse((request.params as { id?: string }).id);

  const publish = async (line: string) => {
    const state = await deps.store.reload();
    deps.hub.broadcast({ type: "state.snapshot", state });
    deps.hub.broadcast({ type: "log.appended", line });
    return state;
  };

  app.get("/api/mail", async () => deps.mail.overview());

  // The draft as a file. The outbox's saved file when there is one, else built from the item.
  app.get("/api/mail/items/:id/eml", async (request, reply) => {
    const id = itemId(request);
    const item = id.success ? deps.store.state.queue.find((q) => q.id === id.data) : undefined;
    const email = item ? composeEmail(item) : null;
    if (!item || !email) {
      return reply.code(404).send({ error: "There is no email draft for this item." });
    }
    // The path comes from a vault file you can edit, so only an outbox .eml is ever read.
    const file = item.mail?.file;
    const saved =
      file && /^outbox\/[a-z0-9-]+\.eml$/.test(file)
        ? await readFile(join(deps.store.vaultDir, file), "utf8").catch(() => null)
        : null;
    return reply
      .header("content-type", "message/rfc822")
      .header("content-disposition", `attachment; filename="${item.id}.eml"`)
      .send(saved ?? buildEml(email, new Date()));
  });

  app.post("/api/mail/items/:id/draft", async (request, reply) => {
    if (!fromPage(request, reply)) return reply;
    const id = itemId(request);
    if (!id.success) return reply.code(400).send({ error: "That item id is not valid." });
    const result = await deps.mail.redraft(id.data);
    if ("error" in result) return reply.code(409).send(result);
    const state = await publish(result.line);
    return { item: state.queue.find((q) => q.id === id.data) ?? null, line: result.line };
  });

  // Send now, step 1: the real recipients from Outlook, or why sending is blocked.
  app.get("/api/mail/items/:id/send-check", async (request, reply) => {
    const id = itemId(request);
    if (!id.success) return reply.code(400).send({ error: "That item id is not valid." });
    const check = await deps.mail.sendCheck(id.data);
    // A draft deleted in Outlook was marked failed, so the page shows Make the draft again.
    if (!check.ok)
      await deps.store
        .reload()
        .then((state) => deps.hub.broadcast({ type: "state.snapshot", state }));
    return check;
  });

  // Send now, step 2: only the recipients you saw in the confirm dialog.
  const SendBody = z.object({ recipients: z.array(z.string()).min(1).max(50) });
  app.post("/api/mail/items/:id/send", async (request, reply) => {
    if (!fromPage(request, reply)) return reply;
    const id = itemId(request);
    const body = SendBody.safeParse(request.body);
    if (!id.success || !body.success) {
      return reply.code(400).send({ error: "Check the recipients first, then confirm." });
    }
    const result = await deps.mail.send(id.data, body.data.recipients);
    if ("error" in result) return reply.code(409).send(result);
    const state = await publish(result.line);
    return { item: state.queue.find((q) => q.id === id.data) ?? null, line: result.line };
  });

  // Send digest now: the same rules as any send.
  app.post("/api/mail/digest", async (request, reply) => {
    if (!fromPage(request, reply)) return reply;
    const result = await deps.mail.sendDigest();
    if ("error" in result) return reply.code(409).send(result);
    await publish(result.line);
    return { line: result.line, mail: await deps.mail.overview() };
  });

  app.post("/api/mail/signout", async (request, reply) => {
    if (!fromPage(request, reply)) return reply;
    await deps.mail.auth?.signOut();
    return deps.mail.overview();
  });

  // Connect Outlook. The redirect URI always uses localhost: Microsoft matches the registered
  // http://localhost/auth/callback for any port (OUTLOOK_SETUP step 3).
  const redirectUri = `http://localhost:${deps.webPort}/auth/callback`;
  const backToMail = (problem?: string) =>
    `http://localhost:${deps.webPort}/?tab=mail${problem ? `&mailProblem=${encodeURIComponent(problem)}` : ""}`;

  app.get("/auth/login", async (_request, reply) => {
    const auth = deps.mail.auth;
    if (!auth)
      return reply.redirect(backToMail("MS_CLIENT_ID is not set, so Outlook cannot connect."));
    if (deps.store.demo)
      return reply.redirect(backToMail("Turn off Demo Day before you connect Outlook."));
    return reply.redirect(await auth.loginUrl(redirectUri));
  });

  app.get("/auth/callback", async (request, reply) => {
    const auth = deps.mail.auth;
    if (!auth) return reply.redirect(backToMail());
    try {
      await auth.callback(request.query as Record<string, string | undefined>);
      return reply.redirect(backToMail());
    } catch (error) {
      const message = error instanceof SignInError ? error.message : "The sign-in did not finish.";
      return reply.redirect(backToMail(message));
    }
  });
}
