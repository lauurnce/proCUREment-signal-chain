import type { FastifyInstance } from "fastify";
import type { SseHub } from "../sse/hub";
import type { VaultStore } from "../vault/store";

/** One Server-Sent Events stream. The first event is always a full state snapshot. */
export function registerEventRoutes(
  app: FastifyInstance,
  deps: { store: VaultStore; hub: SseHub },
): void {
  app.get("/api/events", (request, reply) => {
    reply.hijack();
    // Hijacking skips Fastify's own header writing, so copy the CORS headers set by plugins.
    const pluginHeaders = Object.entries(reply.getHeaders()).filter(
      (entry): entry is [string, string | number | string[]] => entry[1] !== undefined,
    );
    reply.raw.writeHead(200, {
      ...Object.fromEntries(pluginHeaders),
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    });
    reply.raw.write("retry: 2000\n\n");
    deps.hub.send(reply.raw, { type: "state.snapshot", state: deps.store.state });
    deps.hub.add(reply.raw);
    request.raw.on("close", () => reply.raw.end());
  });
}
