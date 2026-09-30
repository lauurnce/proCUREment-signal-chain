import type { QueueItem, Seat, Workflow } from "@hq/shared";
import { motion as m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useStore } from "../../state/store";
import { waitingItem, waitingLine } from "../../state/waiting";
import { bezier, typeStyle } from "../../theme/style";
import { status as statusTokens, motion as tokens } from "../../theme/tokens";
import { useOfficeLink } from "../officeLink";
import { StatusDot } from "../StatusDot";
import { TrackBadge } from "../TrackBadge";
import { reference } from "./itemView";
import { usePanelStore } from "./panelStore";
import { helperName } from "./queue";

type Group = { label: string; seats: Seat[]; pods?: { label: string; seats: Seat[] }[] };

function groups(seats: Seat[]): Group[] {
  const podsOf = (zone: string, name: string) => {
    const inZone = seats.filter((s) => s.zone === zone);
    const podIds = [...new Set(inZone.map((s) => s.pod ?? ""))].sort();
    return podIds.map((pod) => ({
      label: `${name} pod ${pod.split("-")[1]?.toUpperCase() ?? ""}`,
      seats: inZone.filter((s) => (s.pod ?? "") === pod),
    }));
  };
  const count = (n: number) => `${n} helper${n === 1 ? "" : "s"}`;
  const mgr = seats.filter((s) => s.track === "MGR");
  const leads = seats.filter((s) => s.track === "LEAD");
  const cm = seats.filter((s) => s.zone === "cm-wing");
  const ops = seats.filter((s) => s.zone === "ops-wing");
  return [
    { label: "Sr. Manager", seats: mgr },
    { label: `Leads · ${count(leads.length)}`, seats: leads },
    { label: `Category Managers · ${count(cm.length)}`, seats: cm, pods: podsOf("cm-wing", "CM") },
    { label: `Ops Buyers · ${count(ops.length)}`, seats: ops, pods: podsOf("ops-wing", "Ops") },
  ];
}

/**
 * One helper opened: the steps of its current workflow with where each happens, the open items
 * it sent you, and "Show in office" (selectSeat through the office link, after the merge).
 */
function HelperDetail({
  id,
  seat,
  queue,
  workflows,
}: {
  id: string;
  seat: Seat;
  queue: QueueItem[];
  workflows: Workflow[];
}) {
  const link = useOfficeLink();
  const zones = useStore((s) => s.data?.office.zones);
  const zoneName = (zoneId: string) =>
    zoneId === "own-desk" ? "At its desk" : (zones?.find((z) => z.id === zoneId)?.name ?? zoneId);
  const workflow = workflows.find((w) => w.id === seat.currentWorkflow);
  const items = queue.filter((q) => q.from === seat.id && q.status === "needs-you");

  return (
    // Fades in and lifts 4 px, 60 ms after the click (D-030), 140 ms. No height animation.
    <m.div
      id={id}
      className="flex flex-col gap-3 pb-3 pl-7"
      initial={{ opacity: 0, y: 4 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: {
          delay: 0.06,
          duration: tokens.duration.fast / 1000,
          ease: bezier(tokens.easing.enter),
        },
      }}
    >
      {seat.helper.bio && (
        <p className="m-0" style={typeStyle("small", "ink")}>
          {seat.helper.bio}
        </p>
      )}
      {workflow ? (
        <div className="flex flex-col gap-1">
          <span style={typeStyle("label", "inkMuted")}>{workflow.name}</span>
          <ol className="m-0 flex list-none flex-col gap-1 p-0">
            {workflow.steps.map((step, i) => {
              const now = step.id === seat.currentStep;
              return (
                <li
                  key={step.id}
                  aria-current={now ? "step" : undefined}
                  className={`flex gap-2 rounded-button px-2 py-1 ${now ? "bg-panel" : ""}`}
                >
                  <span className="w-4 shrink-0 text-right" style={typeStyle("small")}>
                    {i + 1}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span style={{ ...typeStyle("small", "ink"), fontWeight: now ? 700 : 400 }}>
                      {step.label}
                      {now && " (now)"}
                    </span>
                    <span style={typeStyle("small")}>{zoneName(step.zone)}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <p className="m-0" style={typeStyle("small")}>
          No step right now. It shows when this helper starts a workflow.
        </p>
      )}
      {items.length > 0 && (
        <div className="flex flex-col gap-1">
          <span style={typeStyle("label", "inkMuted")}>Sent to Needs you</span>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {items.map((q) => (
              <li key={q.id} style={typeStyle("small", "ink")}>
                {q.title}
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Hidden until the office is connected (Lawrence's choice, council 29 Sep 2026). */}
      {link && (
        <button
          type="button"
          data-testid={`show-in-office-${seat.id}`}
          onClick={() => link.selectSeat(seat.id, "api")}
          className="self-start rounded-button border border-accent bg-white px-3 py-1.5 hover:bg-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          style={{ ...typeStyle("small", "accent"), fontWeight: 700 }}
        >
          Show in office
        </button>
      )}
    </m.div>
  );
}

/**
 * The AI helpers, grouped by where they sit. Each row shows what the helper is doing, and opens
 * to show its steps. Helpers only: no counts per person, no time, no "last active".
 */
export function TeamTab({
  seats,
  queue,
  workflows,
}: {
  seats: Seat[];
  queue: QueueItem[];
  workflows: Workflow[];
}) {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const link = useOfficeLink();
  const asked = usePanelStore((s) => s.helper);
  const back = usePanelStore((s) => (s.detailOpen ? s.focusedId : null));
  const list = useRef<HTMLDivElement>(null);
  // The helper selected in the office: one row shows it (aria-current and an accent bar).
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (!link) return;
    setSelected(link.selectedSeat());
    return link.onSeatSelected((event) => setSelected(event.seatId));
  }, [link]);
  // A helper clicked in the office (or talked to in Walk around) opens here, in view. Focus
  // stays where it is, so Walk around keeps its keys, except on a narrow screen.
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new request is the only trigger.
  useEffect(() => {
    if (!asked) return;
    setOpen((was) => new Set(was).add(asked.seatId));
    usePanelStore.getState().say(`${helperName(seats, asked.seatId)} opened in Team.`);
    requestAnimationFrame(() => {
      const row = list.current?.querySelector<HTMLElement>(`[data-seat="${asked.seatId}"]`);
      row?.scrollIntoView({ block: "nearest" });
      if (asked.focus) row?.querySelector("button")?.focus({ preventScroll: true });
    });
  }, [asked]);
  const statusWord = (seat: Seat) => {
    // Breaks are scenery in the office only: a row next to a seat label must never read like
    // a log of a person's break (Lawrence's choice, council 30 Sep 2026).
    if (seat.status === "on-break") return "Between tasks";
    if (seat.status !== "waiting-on-you") return statusTokens[seat.status].label;
    // One wording with the name tags in the office (state/waiting.ts).
    return waitingLine(seats, seat.id, waitingItem(seat.id, queue));
  };
  const stepLine = (seat: Seat) => {
    const w = workflows.find((x) => x.id === seat.currentWorkflow);
    const i = w?.steps.findIndex((s) => s.id === seat.currentStep) ?? -1;
    return w && i >= 0 ? `${w.name} · Step ${i + 1} of ${w.steps.length}` : null;
  };
  const toggle = (id: string) => {
    const opening = !open.has(id);
    setOpen((was) => {
      const next = new Set(was);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Opening a row also shows that helper in the office (the office link, P45). Closing the
    // selected row clears the selection.
    if (opening) link?.selectSeat(id, "api");
    else if (id === selected) link?.selectSeat(null, "api");
  };

  const row = (seat: Seat) => {
    const expanded = open.has(seat.id);
    const detailId = `team-detail-${seat.id}`;
    return (
      // scroll-mt leaves room for the sticky group header when a row scrolls into view.
      <li
        key={seat.id}
        data-seat={seat.id}
        aria-current={seat.id === selected ? "true" : undefined}
        className={`scroll-mt-10 border-t border-hairline first:border-t-0 ${
          seat.id === selected ? "-ml-2 border-l-2 border-l-accent pl-1.5" : ""
        }`}
      >
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={detailId}
          onClick={() => toggle(seat.id)}
          className="flex w-full gap-3 py-2.5 text-left hover:bg-panel focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
        >
          <span className="pt-1">
            <TrackBadge id={seat.track} size={14} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-center justify-between gap-2">
              <span style={typeStyle("tagName")}>{helperName(seats, seat.id)}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                {seat.status !== "on-break" && <StatusDot id={seat.status} />}
                <span style={typeStyle("small", "ink")}>{statusWord(seat)}</span>
                <span
                  aria-hidden="true"
                  className={`ml-1 inline-block transition-transform duration-[140ms] ease-enter ${expanded ? "rotate-90" : ""}`}
                  style={typeStyle("small", "navy")}
                >
                  ›
                </span>
              </span>
            </span>
            {seat.workingOn && seat.status !== "on-break" && (
              <span className="truncate" style={typeStyle("small", "ink")} title={seat.workingOn}>
                {seat.workingOn}
              </span>
            )}
            {stepLine(seat) && <span style={typeStyle("small")}>{stepLine(seat)}</span>}
          </span>
        </button>
        {expanded && <HelperDetail id={detailId} seat={seat} queue={queue} workflows={workflows} />}
      </li>
    );
  };

  if (seats.length === 0) {
    return (
      <p className="m-0 px-4 py-10 text-center" style={typeStyle("body", "inkMuted")}>
        No helpers yet. They appear once the office roster loads.
      </p>
    );
  }

  return (
    <div ref={list} className="flex flex-col gap-4 px-4 py-4">
      {back && (
        // The item that was open before a helper was opened from the office.
        <button
          type="button"
          data-testid="back-to-decision"
          onClick={() => {
            const act = usePanelStore.getState();
            act.setTab("needs");
            act.requestFocus({ target: "detail", id: back });
          }}
          className="self-start rounded-button border border-accent bg-white px-3 py-1.5 hover:bg-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          style={{ ...typeStyle("small", "accent"), fontWeight: 700 }}
        >
          Back to decision
          {(() => {
            const item = queue.find((q) => q.id === back);
            const ref = item ? reference(item) : null;
            return ref ? ` on ${ref}` : "";
          })()}
        </button>
      )}
      <p className="m-0" style={typeStyle("small")}>
        Each desk has an AI helper. Here you see the helpers' work, never the people. Open a row to
        see its steps and find it in the office.
      </p>
      {groups(seats).map((g) => (
        <section key={g.label} className="flex flex-col">
          <h3
            className="sticky top-0 z-10 m-0 border-b border-hairline bg-white py-1.5"
            style={typeStyle("label", "navy")}
          >
            {g.label}
          </h3>
          {g.pods ? (
            g.pods.map((pod) => (
              <div key={pod.label} className="flex flex-col">
                <h4 className="m-0 pt-3 pl-7" style={typeStyle("label", "inkMuted")}>
                  {pod.label}
                </h4>
                <ul className="m-0 list-none p-0">{pod.seats.map(row)}</ul>
              </div>
            ))
          ) : (
            <ul className="m-0 list-none p-0">{g.seats.map(row)}</ul>
          )}
        </section>
      ))}
    </div>
  );
}
