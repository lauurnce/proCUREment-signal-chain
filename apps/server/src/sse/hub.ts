import type { ServerResponse } from "node:http";
import type { ServerEvent } from "@hq/shared";

/** The browser uses this to notice a dead stream. Keep it in sync with the web client. */
export const HEARTBEAT_MS = 15_000;

/** Keeps the list of open event streams, sends events to all of them, and sends a heartbeat. */
export class SseHub {
  #clients = new Set<ServerResponse>();
  #heartbeat: NodeJS.Timeout;

  constructor(heartbeatMs = HEARTBEAT_MS) {
    // A named event, not an SSE comment, because browsers hide comments from page code.
    this.#heartbeat = setInterval(
      () => this.#writeAll("event: heartbeat\ndata: {}\n\n"),
      heartbeatMs,
    );
    this.#heartbeat.unref();
  }

  get size(): number {
    return this.#clients.size;
  }

  add(client: ServerResponse): void {
    this.#clients.add(client);
    client.on("close", () => this.#clients.delete(client));
  }

  send(client: ServerResponse, event: ServerEvent): void {
    client.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
  }

  broadcast(event: ServerEvent): void {
    for (const client of this.#clients) this.send(client, event);
  }

  close(): void {
    clearInterval(this.#heartbeat);
    for (const client of this.#clients) client.end();
    this.#clients.clear();
  }

  #writeAll(chunk: string): void {
    for (const client of this.#clients) client.write(chunk);
  }
}
