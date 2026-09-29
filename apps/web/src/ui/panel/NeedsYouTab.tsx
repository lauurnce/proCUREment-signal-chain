import type { AuthorityRule, QueueItem, Seat, Workflow } from "@hq/shared";
import { useEffect, useRef, useState } from "react";
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
  rules: AuthorityRule[];
  now: Date;
  onFilter: (f: QueueFilter) => void;
  onFocus: (id: string) => void;
  onOpen: (id: string) => void;
  onDecide: (d: Decision) => void;
  paused?: boolean;
};

const FILTERS: { id: QueueFilter; label: string; tip?: string }[] = [
  { id: "mine", label: "For you" },
  {
    id: "team",
    label: "Team items (demo)",
    tip: "In real life, these go to a CM or an Ops Buyer. In this demo, you decide them.",
  },
];

/** The Needs you list: a filter, one focused card with the four decisions, and compact cards. */
export function NeedsYouTab(p: Props) {
  const list = useRef<HTMLUListElement>(null);
  const below = useItemsBelow(list, p.items.length);
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
        <ul
          ref={list}
          className="m-0 flex list-none flex-col gap-2 p-0"
          aria-label="Items that need you"
        >
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
                    item={toDecisionItem(p.seats, p.workflows, item, p.rules)}
                    onDecide={p.onDecide}
                    onOpen={() => p.onOpen(item.id)}
                    focusId={`card-${item.id}`}
                    paused={p.paused}
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
      {below > 0 && (
        <button
          type="button"
          data-testid="more-below"
          onClick={() =>
            list.current?.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "end" })
          }
          className="sticky bottom-2 self-center rounded-pill border border-hairline bg-white px-3 py-1 shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          style={{ ...typeStyle("small", "navy"), fontWeight: 700 }}
        >
          {below} more below
        </button>
      )}
    </div>
  );
}

/**
 * How many item cards sit fully below the visible part of the panel, so a card never hides
 * without a hint (council, 29 Sep 2026). Counts on scroll and resize, never per frame.
 */
function useItemsBelow(list: React.RefObject<HTMLUListElement | null>, count: number): number {
  const [below, setBelow] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new item count means new cards to measure
  useEffect(() => {
    const ul = list.current;
    const box = ul?.closest<HTMLElement>("[role=tabpanel]");
    if (!ul || !box) {
      setBelow(0);
      return;
    }
    const measure = () => {
      const bottom = box.getBoundingClientRect().bottom;
      const hidden = [...ul.children].filter((li) => li.getBoundingClientRect().top >= bottom - 24);
      setBelow(hidden.length);
    };
    measure();
    box.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(ul);
    return () => {
      box.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [list, count]);
  return below;
}
