import { typeStyle } from "../theme/style";

export type Stat = { label: string; value: string; note?: string };

/** The stats HUD: big numbers over small mono labels. Team level only, never per person. */
export function StatsCard({ stats }: { stats: Stat[] }) {
  return (
    <section
      data-testid="stats-card"
      aria-label="Team stats"
      className="inline-flex divide-x divide-hairline rounded-float border border-hairline bg-white shadow-float"
    >
      {stats.map((s) => (
        <div key={s.label} className="flex min-w-32 flex-col gap-1 px-5 py-4">
          <span style={typeStyle("bigNumber")} className="tabular-nums">
            {s.value}
          </span>
          <span style={typeStyle("label", "inkMuted")}>{s.label}</span>
          {s.note && <span style={typeStyle("small")}>{s.note}</span>}
        </div>
      ))}
    </section>
  );
}
