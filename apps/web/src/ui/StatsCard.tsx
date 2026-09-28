import { typeStyle } from "../theme/style";

export type Stat = {
  label: string;
  value: string;
  note?: string;
  tip?: string;
  /** Makes the tile a button, like "Needs you" opening that tab. */
  onClick?: () => void;
};

/** Up to 999, then "999+" (panel spec, section 6). */
export function hudNumber(n: number): string {
  return n > 999 ? "999+" : String(n);
}

const CELL = "flex min-w-32 flex-col items-start gap-1 px-5 py-4 text-left";

/**
 * The stats HUD: big numbers over small mono labels. Team level only, never per person.
 * While loading, each number is a gray bar, never a fake 0, and the card keeps its size.
 */
export function StatsCard({ stats, loading = false }: { stats: Stat[]; loading?: boolean }) {
  return (
    <section
      data-testid="stats-card"
      aria-label="Office stats"
      aria-busy={loading || undefined}
      className="inline-flex divide-x divide-hairline overflow-hidden rounded-float border border-hairline bg-white shadow-float"
    >
      {stats.map((s) => {
        const content = (
          <>
            {loading ? (
              <span
                aria-hidden="true"
                className="my-1 block h-6 w-10 rounded-chip bg-panel"
                data-testid="stats-skeleton"
              />
            ) : (
              <span style={typeStyle("bigNumber")} className="tabular-nums">
                {s.value}
              </span>
            )}
            <span style={typeStyle("label", "inkMuted")}>{s.label}</span>
            {s.note && <span style={typeStyle("small")}>{s.note}</span>}
          </>
        );
        return s.onClick && !loading ? (
          <button
            key={s.label}
            type="button"
            title={s.tip}
            onClick={s.onClick}
            className={`${CELL} transition-colors duration-[140ms] ease-enter hover:bg-panel focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-accent`}
          >
            {content}
          </button>
        ) : (
          <div key={s.label} className={CELL} title={s.tip}>
            {content}
          </div>
        );
      })}
      {loading && <span className="sr-only">Loading stats</span>}
    </section>
  );
}
