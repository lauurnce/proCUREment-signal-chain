import type { QueueItem, Seat, Workflow } from "@hq/shared";
import { useState } from "react";
import { useStore } from "../../state/store";
import { typeStyle } from "../../theme/style";
import { status as statusTokens } from "../../theme/tokens";
import { useOfficeLink } from "../officeLink";
import { StatusDot } from "../StatusDot";
import { TrackBadge } from "../TrackBadge";
import { helperName, PLAYER_SEAT } from "./queue";

// Who decides, by track, without naming a seat (a seat maps to a real person).
const DECISION_BY: Record<string, string> = {
  CM: "a CM decision",
  OPS: "an Ops decision",
  LEAD: "a Lead decision",
  MGR: "your decision",
};

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
    <div id={id} className="flex flex-col gap-3 pb-3 pl-7">
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
          No workflow step right now. The step comes from vault/team/{seat.id}/profile.md.
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
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid={`show-in-office-${seat.id}`}
          aria-disabled={!link || undefined}
          onClick={() => link?.selectSeat(seat.id, "api")}
          className={`rounded-button border px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${link ? "border-accent bg-white hover:bg-panel" : "border-hairline bg-panel"}`}
          style={{ ...typeStyle("small", link ? "accent" : "inkMuted"), fontWeight: 700 }}
        >
          Show in office
        </button>
        {!link && (
          <span style={typeStyle("small")}>Works once the office and the panel are joined.</span>
        )}
      </div>
    </div>
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
  const statusWord = (seat: Seat) => {
    if (seat.status !== "waiting-on-you") return statusTokens[seat.status].label;
    // The open item this helper sent, or one that waits on this seat's own decision.
    const waiting =
      queue.find((q) => q.from === seat.id && q.status === "needs-you") ??
      queue.find((q) => q.approver === seat.id && q.status === "needs-you");
    if (!waiting || waiting.approver === PLAYER_SEAT) return "Waiting on you";
    const track = seats.find((s) => s.id === waiting.approver)?.track;
    return `Waiting for ${DECISION_BY[track ?? ""] ?? "a team decision"}`;
  };
  const stepLine = (seat: Seat) => {
    const w = workflows.find((x) => x.id === seat.currentWorkflow);
    const i = w?.steps.findIndex((s) => s.id === seat.currentStep) ?? -1;
    return w && i >= 0 ? `${w.name} · Step ${i + 1} of ${w.steps.length}` : null;
  };
  const toggle = (id: string) =>
    setOpen((was) => {
      const next = new Set(was);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const row = (seat: Seat) => {
    const expanded = open.has(seat.id);
    const detailId = `team-detail-${seat.id}`;
    return (
      <li key={seat.id} data-seat={seat.id} className="border-t border-hairline first:border-t-0">
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
                <StatusDot id={seat.status} />
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
            {seat.workingOn && (
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
        No helpers yet. Seats come from data/roster.template.json, and their status from the files
        in vault/team.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <p className="m-0" style={typeStyle("small")}>
        Each seat has an AI helper. This page shows the helpers' work, not the people. Open a row to
        see the steps.
      </p>
      {groups(seats).map((g) => (
        <section key={g.label} className="flex flex-col">
          <h3 className="sticky top-0 z-10 m-0 bg-white py-1" style={typeStyle("label", "navy")}>
            {g.label}
          </h3>
          {g.pods ? (
            g.pods.map((pod) => (
              <div key={pod.label} className="flex flex-col">
                <h4 className="m-0 pt-2" style={typeStyle("label", "inkMuted")}>
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
