import { DemoSpeed } from "@hq/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { DemoRunner } from "../sim/runner";

const StartBody = z.object({
  seed: z.number().int().min(0).max(2_147_483_647).optional(),
  speed: DemoSpeed.optional(),
});
const SpeedBody = z.object({ speed: DemoSpeed });

/** Demo Day: start a seeded day on vault-demo/, change its speed, or stop it. */
export function registerSimRoutes(app: FastifyInstance, runner: DemoRunner): void {
  app.get("/api/sim", async () => ({ demo: runner.status() }));

  app.post("/api/sim/start", async (request, reply) => {
    const body = StartBody.safeParse(request.body ?? {});
    if (!body.success) return reply.code(400).send({ error: "Pick a speed of 1x, 5x or 20x." });
    return { demo: await runner.start(body.data) };
  });

  app.post("/api/sim/speed", async (request, reply) => {
    const body = SpeedBody.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Pick a speed of 1x, 5x or 20x." });
    return { demo: await runner.setSpeed(body.data.speed) };
  });

  app.post("/api/sim/stop", async () => {
    await runner.stop();
    return { demo: null };
  });
}
