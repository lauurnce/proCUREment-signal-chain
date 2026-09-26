import type { Workflow } from "@hq/shared";
import { typeStyle } from "../../theme/style";
import { TrackBadge } from "../../ui/TrackBadge";
import { routeFor } from "./routes";
import { ROUTE_STYLE } from "./style";
import type { FloorPlan } from "./types";

type Props = {
  plan: FloorPlan;
  workflows: Workflow[];
  visible: Set<string>;
  onToggle: (id: string) => void;
};

/** The six routes with their walk length. Each one can be shown or hidden. */
export function RouteLegend({ plan, workflows, visible, onToggle }: Props) {
  const rows = workflows.flatMap((w) => {
    const style = ROUTE_STYLE[w.id];
    if (!style || (w.track !== "CM" && w.track !== "OPS")) return [];
    const meters = routeFor(
      plan,
      w.steps.map((s) => s.zone),
      w.track,
    ).meters;
    return [{ w, style, meters, track: w.track }];
  });
  const total = rows.reduce((sum, r) => sum + r.meters, 0);

  return (
    <aside
      data-testid="route-legend"
      className="flex flex-col gap-3 rounded-card border border-hairline bg-white p-4"
    >
      <span style={typeStyle("label", "inkMuted")}>Workflow routes</span>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {rows.map(({ w, style, meters, track }) => (
          <li key={w.id}>
            <label className="flex cursor-pointer items-center gap-2 rounded-chip px-1 py-1 hover:bg-panel">
              <input
                type="checkbox"
                checked={visible.has(w.id)}
                onChange={() => onToggle(w.id)}
                className="accent-accent"
              />
              <svg width="34" height="10" aria-hidden="true" className="shrink-0">
                <line
                  x1="2"
                  y1="5"
                  x2="32"
                  y2="5"
                  stroke={style.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={
                    style.dash
                      ? style.dash
                          .split(" ")
                          .map((n) => Number(n) * 8)
                          .join(" ")
                      : undefined
                  }
                />
              </svg>
              <TrackBadge id={track} size={12} />
              <span className="flex-1" style={typeStyle("small", "ink")}>
                {style.number}. {w.name}
              </span>
              {/* Numbers keep their lowercase unit: "16.9 m", never "16.9 M" (mega). */}
              <span
                className="tabular-nums"
                style={{ ...typeStyle("label", "inkMuted"), textTransform: "none" }}
              >
                {meters} m
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between border-t border-hairline pt-2">
        <span style={typeStyle("small", "ink")}>One walk of each route</span>
        <span className="tabular-nums" style={typeStyle("sectionTitle")}>
          {Math.round(total)} m
        </span>
      </div>
      <p className="m-0" style={typeStyle("small")}>
        Own desk means the middle of that track's wing. Lines follow the walkways and are shifted a
        little so they do not hide each other.
      </p>
    </aside>
  );
}
