import type { Seat, Task, TaskStatus, Workflow } from "@hq/shared";
import { typeStyle } from "../../theme/style";
import { TrackBadge } from "../TrackBadge";
import { helperName } from "./queue";
import { dateOnly } from "./time";

// Waiting first, because that is where the Sr. Manager can unblock work (panel spec, section 3).
const COLUMNS: { id: TaskStatus; label: string; empty: string }[] = [
  { id: "waiting", label: "Waiting", empty: "Nothing is waiting." },
  { id: "doing", label: "Doing", empty: "No task in progress." },
  { id: "todo", label: "To do", empty: "Nothing to start." },
  { id: "done", label: "Done", empty: "Finished tasks show here." },
];

/** The board tasks by status. Done starts closed. No "overdue" red, tasks belong to helpers. */
export function BoardTab({
  tasks,
  seats,
  workflows,
  today,
}: {
  tasks: Task[];
  seats: Seat[];
  workflows: Workflow[];
  today: string;
}) {
  if (tasks.length === 0) {
    return (
      <p className="m-0 px-4 py-10 text-center" style={typeStyle("body", "inkMuted")}>
        No tasks yet. Tasks appear here from the board folder in the vault.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      {COLUMNS.map((col) => {
        const list = tasks.filter((t) => t.status === col.id);
        return (
          <details
            key={col.id}
            open={col.id !== "done"}
            className="rounded-card border border-hairline"
          >
            <summary
              className="cursor-pointer px-3 py-2 focus-visible:outline-2 focus-visible:outline-accent"
              style={typeStyle("label", "navy")}
            >
              {col.label} · {list.length}
            </summary>
            {list.length === 0 ? (
              <p className="m-0 border-t border-hairline px-3 py-2" style={typeStyle("small")}>
                {col.empty}
              </p>
            ) : (
              <ul className="m-0 list-none p-0">
                {list.map((t) => {
                  const owner = seats.find((s) => s.id === t.owner);
                  const workflow = workflows.find((w) => w.id === t.workflow)?.name ?? t.workflow;
                  return (
                    <li
                      key={t.id}
                      className="flex flex-col gap-1 border-t border-hairline px-3 py-2"
                    >
                      <span
                        className="line-clamp-2"
                        style={{ ...typeStyle("body"), fontWeight: 700 }}
                      >
                        {t.title}
                      </span>
                      <span className="flex items-center gap-1.5" style={typeStyle("small", "ink")}>
                        {owner && <TrackBadge id={owner.track} size={12} />}
                        {helperName(seats, t.owner)} · {workflow}
                      </span>
                      <span style={typeStyle("small")}>
                        {t.due === today
                          ? "Due today"
                          : `Due ${dateOnly(`${t.due}T12:00:00+08:00`)}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </details>
        );
      })}
    </div>
  );
}
