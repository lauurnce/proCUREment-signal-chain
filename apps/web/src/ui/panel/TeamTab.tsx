import type { QueueItem, Seat, Workflow } from "@hq/shared";
import { typeStyle } from "../../theme/style";
import { status as statusTokens } from "../../theme/tokens";
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
 * The AI helpers, grouped by where they sit. Each row shows what the helper is doing.
 * Helpers only: no counts per person, no time, no "last active".
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
  const row = (seat: Seat) => (
    <li key={seat.id} className="flex gap-3 border-t border-hairline py-2.5 first:border-t-0">
      <span className="pt-1">
        <TrackBadge id={seat.track} size={14} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span style={typeStyle("tagName")}>{helperName(seats, seat.id)}</span>
          <span className="flex shrink-0 items-center gap-1.5">
            <StatusDot id={seat.status} />
            <span style={typeStyle("small", "ink")}>{statusWord(seat)}</span>
          </span>
        </div>
        {seat.workingOn && (
          <span className="truncate" style={typeStyle("small", "ink")} title={seat.workingOn}>
            {seat.workingOn}
          </span>
        )}
        {stepLine(seat) && <span style={typeStyle("small")}>{stepLine(seat)}</span>}
      </div>
    </li>
  );

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <p className="m-0" style={typeStyle("small")}>
        Each seat has an AI helper. This page shows the helpers' work, not the people.
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
