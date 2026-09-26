import type { Track } from "@hq/shared";
import { typeStyle } from "../../theme/style";
import { TrackBadge } from "../TrackBadge";

type Props = {
  workflowLine: string;
  title: string;
  from: string;
  fromTrack: Track;
  supplier?: string;
  age: string;
  ageTip: string;
  chips: string[];
  onDecide: () => void;
};

/** A Needs you card that is not focused. One "Decide" button makes it the focused card. */
export function QueueCard(p: Props) {
  return (
    <article
      data-testid="queue-card"
      className="flex flex-col gap-1.5 rounded-card border border-hairline bg-panel px-4 py-3"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate" style={typeStyle("small")}>
          {p.workflowLine}
        </span>
        <span className="shrink-0" title={p.ageTip} style={typeStyle("small")}>
          {p.age}
        </span>
      </div>
      <h3 className="m-0 line-clamp-2" style={typeStyle("sectionTitle")}>
        {p.title}
      </h3>
      <div className="flex items-center gap-3">
        <span
          className="flex min-w-0 flex-1 items-center gap-1.5"
          title={p.supplier ? `From ${p.from} · ${p.supplier}` : `From ${p.from}`}
        >
          <TrackBadge id={p.fromTrack} size={12} />
          <span className="truncate" style={typeStyle("small", "ink")}>
            From {p.from}
            {p.supplier && ` · ${p.supplier}`}
          </span>
        </span>
        <button
          type="button"
          tabIndex={-1}
          onClick={p.onDecide}
          aria-label={`Decide on ${p.title}`}
          className="h-8 shrink-0 rounded-button border border-accent bg-white px-3 hover:bg-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          style={{ ...typeStyle("small", "accent"), fontWeight: 700 }}
        >
          Decide
        </button>
      </div>
      {p.chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {p.chips.map((c) => (
            <span
              key={c}
              className="rounded-chip border border-hairline bg-white px-1.5 py-0.5"
              style={typeStyle("label")}
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
