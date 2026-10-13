import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { composeEmail, Id } from "@hq/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
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
    const state = await deps.store.reload();
    deps.hub.broadcast({ type: "state.snapshot", state });
    deps.hub.broadcast({ type: "log.appended", line: result.line });
    return { item: state.queue.find((q) => q.id === id.data) ?? null, line: result.line };
  });
}
