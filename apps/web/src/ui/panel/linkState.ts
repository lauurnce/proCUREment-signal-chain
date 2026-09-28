import { useEffect, useState } from "react";
import type { ConnectionStatus } from "../../state/store";

/** What the header says about the link to the local server (panel spec, section 6). */
export type LinkState = "live" | "connecting" | "reconnecting" | "offline";

/** After a drop, the header says "Reconnecting" for this long, then "Offline". */
export const RECONNECT_GRACE_MS = 10_000;

export function linkState(connection: ConnectionStatus, offlineForMs: number): LinkState {
  if (connection === "live") return "live";
  if (connection === "connecting") return "connecting";
  return offlineForMs < RECONNECT_GRACE_MS ? "reconnecting" : "offline";
}

/** The link state, switching from "Reconnecting" to "Offline" by itself after 10 s. */
export function useLinkState(connection: ConnectionStatus): LinkState {
  const [late, setLate] = useState(false);
  useEffect(() => {
    setLate(false);
    if (connection !== "offline") return;
    const id = window.setTimeout(() => setLate(true), RECONNECT_GRACE_MS);
    return () => window.clearTimeout(id);
  }, [connection]);
  return linkState(connection, late ? RECONNECT_GRACE_MS : 0);
}
