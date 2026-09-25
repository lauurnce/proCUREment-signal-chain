import type { FastifyInstance } from "fastify";

/** Hosts a local browser can use: 127.0.0.1 or localhost, on the web port (via the proxy) or the API port. */
export function allowedHosts(ports: number[]): Set<string> {
  return new Set(ports.flatMap((port) => [`127.0.0.1:${port}`, `localhost:${port}`]));
}

/**
 * Refuses requests whose Host header is not local. This blocks DNS rebinding,
 * where a web page on another site tricks the browser into calling this server.
 */
export function registerHostCheck(app: FastifyInstance, ports: number[]): void {
  const allowed = allowedHosts(ports);
  app.addHook("onRequest", async (request, reply) => {
    if (!allowed.has(request.headers.host ?? "")) {
      await reply.code(403).send({ error: "This server only answers local requests." });
    }
  });
}
