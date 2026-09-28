import { AppState, Health, ServerEvent } from "@hq/shared";
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

/** Set while connected: skips the wait and tries the server now ("Try again" in the panel). */
let retryImmediately: (() => void) | null = null;

export function retryNow(): void {
  retryImmediately?.();
}

/** Counts live snapshots, so a slow GET never overwrites a newer snapshot. */
let snapshots = 0;

/**
 * Loads the whole state on every (re)connect, so the panel has data even before the first
 * live event. A failed load changes nothing: the last data stays on screen.
 */
async function fetchState(): Promise<void> {
  const before = snapshots;
  try {
    const response = await fetch("/api/state");
    if (!response.ok) return;
    const parsed = AppState.safeParse(await response.json());
    if (parsed.success && snapshots === before) useStore.getState().setData(parsed.data);
  } catch {
    // Offline: the stream's own retry shows that in the header.
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
      void fetchState();
      heardFromServer();
    });
    source.addEventListener("error", reconnectLater);
    source.addEventListener("heartbeat", heardFromServer);
    source.addEventListener("state.snapshot", (message) => {
      heardFromServer();
      const parsed = ServerEvent.safeParse(JSON.parse(message.data));
      if (parsed.success && parsed.data.type === "state.snapshot") {
        snapshots += 1;
        setData(parsed.data.state);
      }
    });
    // An edit to an office file (like accessories.json) changes only the office, live.
    source.addEventListener("office.updated", (message) => {
      heardFromServer();
      const parsed = ServerEvent.safeParse(JSON.parse(message.data));
      if (parsed.success && parsed.data.type === "office.updated") {
        useStore.getState().setOffice(parsed.data.office);
      }
    });
  }

  retryImmediately = () => {
    if (stopped || source) return;
    clearTimeout(retryTimer);
    retryMs = RETRY_MIN_MS;
    open();
  };

  open();
  return () => {
    stopped = true;
    retryImmediately = null;
    clearTimeout(retryTimer);
    clearTimeout(silenceTimer);
    source?.close();
  };
}
