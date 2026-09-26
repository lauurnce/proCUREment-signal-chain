import type { QueueItem, Seat, Workflow } from "@hq/shared";
import { typeStyle } from "../../theme/style";
import type { Decision } from "../DecisionButton";
import { DecisionCard } from "../DecisionCard";
import { stepInfo, toDecisionItem } from "./itemView";
import { QueueCard } from "./QueueCard";
import { decidingAs, helperName, type QueueFilter } from "./queue";
import { ago, fullTime } from "./time";

type Props = {
  items: QueueItem[];
  counts: { mine: number; team: number };
  filter: QueueFilter;
  focusedId: string | null;
  seats: Seat[];
  workflows: Workflow[];
  now: Date;
  onFilter: (f: QueueFilter) => void;
  onFocus: (id: string) => void;
  onOpen: (id: string) => void;
  onDecide: (d: Decision) => void;
};

const FILTERS: { id: QueueFilter; label: string; tip?: string }[] = [
  { id: "mine", label: "For you" },
  {
    id: "team",
    label: "Team items (demo)",
    tip: "In real life, these go to the CM or Ops Buyer. In this demo, you can decide them for the seat.",
  },
];

/** The Needs you list: a filter, one focused card with the four decisions, and compact cards. */
export function NeedsYouTab(p: Props) {
  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      <fieldset className="m-0 flex gap-1 rounded-button border-0 bg-panel p-1">
        <legend className="sr-only">Show</legend>
        {FILTERS.map((f) => {
          const active = f.id === p.filter;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={active}
              title={f.tip}
              onClick={() => p.onFilter(f.id)}
              className={`flex-1 rounded-chip px-2 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${active ? "bg-white" : ""}`}
              style={{
                ...typeStyle("small", active ? "navy" : "inkMuted"),
                fontWeight: active ? 700 : 400,
              }}
            >
              {f.label} · {f.id === "mine" ? p.counts.mine : p.counts.team}
            </button>
          );
        })}
      </fieldset>

      {p.items.length === 0 ? (
        <p className="m-0 py-10 text-center" style={typeStyle("body", "inkMuted")}>
          {p.filter === "mine"
            ? "All clear. Nothing waiting on you. New items appear here when a helper needs your decision."
            : "All clear for you and the team. Helpers are still working. New items appear here as they come in."}
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Items that need you">
          {p.items.map((item) => {
            const info = stepInfo(p.workflows, item);
            const as = decidingAs(p.seats, item);
            const fromSeat = p.seats.find((s) => s.id === item.from);
            return (
              <li
                key={item.id}
                data-item={item.id}
                aria-current={item.id === p.focusedId || undefined}
              >
                {item.id === p.focusedId ? (
                  <DecisionCard
                    item={toDecisionItem(p.seats, p.workflows, item)}
                    onDecide={p.onDecide}
                    onOpen={() => p.onOpen(item.id)}
                    focusId={`card-${item.id}`}
                  />
                ) : (
                  <QueueCard
                    workflowLine={`${info.workflow} · ${info.step}`}
                    title={item.title}
                    from={helperName(p.seats, item.from)}
                    fromTrack={fromSeat?.track ?? item.track}
                    supplier={item.supplier}
                    age={ago(item.created, p.now)}
                    ageTip={fullTime(item.created)}
                    chips={[
                      ...(item.kind === "email-draft" ? ["Email draft"] : []),
                      ...(item.rule ? ["Rule not confirmed yet"] : []),
                      ...(as ? [`Deciding as ${as} (demo)`] : []),
                    ]}
                    onDecide={() => p.onFocus(item.id)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
