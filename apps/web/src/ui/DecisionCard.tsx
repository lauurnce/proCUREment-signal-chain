import type { Track } from "@hq/shared";
import { typeStyle } from "../theme/style";
import { type Decision, DecisionButton } from "./DecisionButton";
import { keepCodesTogether } from "./panel/itemView";
import { TrackBadge } from "./TrackBadge";

export type DecisionItem = {
  workflow: string;
  step: string;
  title: string;
  facts: { label: string; value: string }[];
  fromTrack: Track;
  why: string;
  ruleConfirmed: boolean;
  /** Set when the Sr. Manager decides an item that belongs to another seat (D-027). */
  decidingAs?: string;
  /** The helper's suggestion, when it made one. */
  suggestion?: string;
  sendBackTo: string;
};

const BUTTONS: { decision: Decision; label: (item: DecisionItem) => string; key: string }[] = [
  { decision: "approve", label: () => "Approve", key: "A" },
  { decision: "hold", label: () => "Hold", key: "H" },
  { decision: "send-back", label: (i) => `Send back to ${i.sendBackTo}`, key: "S" },
  { decision: "instruct", label: () => "Instruct", key: "I" },
];

/** The focused Needs you card: the facts, why it came to you, and the four decisions. */
export function DecisionCard({
  item,
  onDecide,
  onOpen,
  focusId,
  paused,
}: {
  item: DecisionItem;
  onDecide: (d: Decision) => void;
  /** Opens the item detail. Shown as a small link under the title. */
  onOpen?: () => void;
  /** Makes the card a keyboard focus stop, found by this id (the panel's roving focus). */
  focusId?: string;
  /** Offline: decisions pause (panel spec, section 6). */
  paused?: boolean;
}) {
  return (
    <article
      data-testid="decision-card"
      data-focus-id={focusId}
      tabIndex={focusId ? 0 : undefined}
      aria-label={item.title}
      // One signal for the focused card: a 2 px accent border on white (council, 29 Sep 2026).
      // Keyboard focus turns the same border navy, so there is only one ring (council, 30 Sep 2026).
      className="overflow-hidden rounded-card border-2 border-accent bg-white focus-visible:border-navy focus-visible:outline-none"
    >
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span style={typeStyle("small")}>
            {item.workflow} · {item.step}
          </span>
          {item.decidingAs && (
            <span
              style={typeStyle("label")}
              className="rounded-chip border border-hairline bg-panel px-1.5 py-0.5"
            >
              Deciding as {item.decidingAs} (demo)
            </span>
          )}
        </div>
        <h3 className="m-0" style={typeStyle("sectionTitle")}>
          {keepCodesTogether(item.title)}
        </h3>
        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            className="-mt-2 self-start underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            style={typeStyle("small", "accent")}
          >
            Open item (Enter)
          </button>
        )}
        <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
          {item.facts.map((f) => (
            <div key={f.label} className="contents">
              <dt style={typeStyle("small")}>{f.label}</dt>
              <dd className="m-0 flex items-center gap-1.5" style={typeStyle("small", "ink")}>
                {f.label === "From" && <TrackBadge id={item.fromTrack} size={12} />}
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-1 rounded-button bg-panel p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span style={typeStyle("label")}>Why this came to you</span>
            {!item.ruleConfirmed && (
              <span
                style={typeStyle("label", "statusWaiting")}
                className="rounded-chip border border-status-waiting px-1.5"
              >
                Rule not confirmed yet
              </span>
            )}
          </div>
          <p className="m-0" style={typeStyle("body")}>
            {item.why}
          </p>
        </div>
        {item.suggestion && (
          <p className="m-0" style={typeStyle("body")}>
            <span style={{ fontWeight: 700 }}>Helper suggests:</span> {item.suggestion}
          </p>
        )}
      </div>
      <div className="grid grid-cols-[3fr_2fr] gap-2 border-t border-hairline bg-white px-5 py-4">
        {BUTTONS.map((b) => (
          <DecisionButton
            key={b.decision}
            decision={b.decision}
            label={b.label(item)}
            shortcut={b.key}
            onClick={() => onDecide(b.decision)}
            paused={paused}
          />
        ))}
      </div>
    </article>
  );
}
