import { useStore } from "../state/store";

const LABEL = {
  live: "Connected",
  connecting: "Connecting",
  offline: "Server offline",
} as const;

const DOT = {
  ok: "size-2 rounded-full bg-status-working",
  warn: "size-2 rounded-full bg-status-waiting",
  down: "size-2 rounded-full border-2 border-status-waiting bg-white",
} as const;

const NO_WARNINGS: string[] = [];

/**
 * Small dev badge with the server connection. Shape and text carry the meaning, not color alone.
 * The warnings come from each live snapshot, so the count clears as soon as the files are fixed.
 * Hover the badge to read the warnings.
 */
export function HealthBadge() {
  const connection = useStore((s) => s.connection);
  const seatCount = useStore((s) => s.data?.seats.length ?? 0);
  const warnings = useStore((s) => s.data?.warnings ?? NO_WARNINGS);
  const live = connection === "live";
  const dot = !live ? DOT.down : warnings.length > 0 ? DOT.warn : DOT.ok;

  return (
    <output
      data-testid="health-badge"
      data-status={connection}
      title={live && warnings.length > 0 ? warnings.join("\n") : undefined}
      className="flex items-center gap-2 rounded-full border border-hairline bg-white px-3 py-1.5 font-mono text-[11px] uppercase leading-[14px] tracking-[0.08em] text-navy shadow-float"
    >
      <span aria-hidden="true" className={dot} />
      <span>{LABEL[connection]}</span>
      {live && <span className="text-ink-muted">· {seatCount} helpers</span>}
      {live && warnings.length > 0 && (
        <span className="text-status-waiting">
          · {warnings.length} {warnings.length === 1 ? "file warning" : "file warnings"}
        </span>
      )}
    </output>
  );
}
