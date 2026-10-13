import type { DecisionRequest, InstructionRequest } from "@hq/shared";

/** A decision or an instruction waiting for its undo window to close before it is saved. */
export type PendingWrite =
  | { kind: "decision"; id: string; request: DecisionRequest }
  | { kind: "instruction"; request: InstructionRequest };

/**
 * Saves a decision or an instruction to the vault through the local server. The server answers
 * with an event, so the page updates from the live stream. Throws a plain-English message.
 */
export async function saveToVault(write: PendingWrite): Promise<void> {
  const url =
    write.kind === "decision"
      ? `/api/queue/${encodeURIComponent(write.id)}/decision`
      : "/api/instructions";
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(write.request),
    });
  } catch {
    throw new Error("Could not reach the local server.");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "The server could not save it.");
  }
}
