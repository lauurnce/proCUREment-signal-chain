import { Health, ServerEvent } from "@hq/shared";
import { useStore } from "./store";

/** The server sends a heartbeat every 15 s. No message for this long means the stream is dead. */
const SILENCE_LIMIT_MS = 20_000;
const RETRY_MIN_MS = 1_000;
const RETRY_MAX_MS = 10_000;

async function fetchHealth(): Promise<void> {
  try {
    const response = await fetch("/api/health");
    useStore.getState().setHealth(Health.parse(await response.json()));
  } catch {
    useStore.getState().setHealth(null);
  }
}

/**
 * Keeps one live event stream open. The browser's own retry is not enough:
 * it gives up for good after an error status (like 502 while the server starts),
 * and it cannot see a stream that stays open but silent after a server restart.
 * So we close and reopen ourselves, with a growing wait between tries.
 * Returns a function that closes everything.
 */
export function connectToServer(): () => void {
  const { setConnection, setData, setHealth } = useStore.getState();
  let source: EventSource | null = null;
  let retryMs = RETRY_MIN_MS;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let silenceTimer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const reconnectLater = () => {
    source?.close();
    source = null;
    setConnection("offline");
    setHealth(null);
    clearTimeout(silenceTimer);
    clearTimeout(retryTimer);
    if (stopped) return;
    retryTimer = setTimeout(open, retryMs);
    retryMs = Math.min(retryMs * 2, RETRY_MAX_MS);
  };

  const heardFromServer = () => {
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(reconnectLater, SILENCE_LIMIT_MS);
  };

  function open() {
    source = new EventSource("/api/events");
    heardFromServer();
    source.addEventListener("open", () => {
      retryMs = RETRY_MIN_MS;
      setConnection("live");
      void fetchHealth();
      heardFromServer();
    });
    source.addEventListener("error", reconnectLater);
    source.addEventListener("heartbeat", heardFromServer);
    source.addEventListener("state.snapshot", (message) => {
      heardFromServer();
      const parsed = ServerEvent.safeParse(JSON.parse(message.data));
      if (parsed.success && parsed.data.type === "state.snapshot") setData(parsed.data.state);
    });
  }

  open();
  return () => {
    stopped = true;
    clearTimeout(retryTimer);
    clearTimeout(silenceTimer);
    source?.close();
  };
}
