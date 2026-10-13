import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * True when a request that changes something comes from the SignalChain HQ page itself. A browser
 * always sends Origin on a POST, so another website is refused. A local tool without Origin (curl,
 * the tests) is allowed: the Host check already keeps the server local.
 */
export function fromPage(webPort: number) {
  const origins = new Set([`http://127.0.0.1:${webPort}`, `http://localhost:${webPort}`]);
  return (request: FastifyRequest, reply: FastifyReply): boolean => {
    const origin = request.headers.origin;
    if (origin && !origins.has(origin)) {
      reply.code(403).send({ error: "This request did not come from the SignalChain HQ page." });
      return false;
    }
    return true;
  };
}
