import { DecisionRequest, Id, InstructionRequest } from "@hq/shared";
import type { FastifyInstance } from "fastify";
import type { SseHub } from "../sse/hub";
import { applyDecision, DecisionError, saveInstruction } from "../vault/decide";
import type { VaultStore } from "../vault/store";

/**
 * Your decisions and instructions, written to the vault. Each write reloads the vault once and
 * sends a snapshot, so every open page updates. The watcher skips these files (our own writes).
 */
export function registerQueueRoutes(
  app: FastifyInstance,
  deps: { store: VaultStore; hub: SseHub },
): void {
  const afterWrite = async (line: string) => {
    const state = await deps.store.reload();
    deps.hub.broadcast({ type: "state.snapshot", state });
    deps.hub.broadcast({ type: "log.appended", line });
    return state;
  };

  app.post("/api/queue/:id/decision", async (request, reply) => {
    const id = Id.safeParse((request.params as { id?: string }).id);
    const body = DecisionRequest.safeParse(request.body);
    if (!id.success || !body.success) {
      return reply.code(400).send({
        error: "That decision is not valid. Pick an action, and add a note where it asks for one.",
      });
    }
    try {
      const { line } = await applyDecision(
        deps.store.vaultDir,
        deps.store.state,
        id.data,
        body.data,
      );
      const state = await afterWrite(line);
      return { item: state.queue.find((q) => q.id === id.data) ?? null, line };
    } catch (error) {
      if (error instanceof DecisionError)
        return reply.code(error.status).send({ error: error.message });
      throw error;
    }
  });

  app.post("/api/instructions", async (request, reply) => {
    const body = InstructionRequest.safeParse(request.body);
    if (!body.success) {
      return reply
        .code(400)
        .send({ error: "That instruction is not valid. Pick who gets it and write what to do." });
    }
    const { file, line } = await saveInstruction(deps.store.vaultDir, body.data);
    await afterWrite(line);
    return reply.code(201).send({ file, line });
  });
}
