import type { QueueItem, Seat, Workflow } from "@hq/shared";
import { typeStyle } from "../../theme/style";
import { type Decision, DecisionButton } from "../DecisionButton";
import { PanelTitle } from "../PanelTitle";
import { TrackBadge } from "../TrackBadge";
import { BodySection } from "./BodySection";
import { Chip } from "./Chip";
import { EmailPreview } from "./EmailPreview";
import { reference, stepInfo, whyText } from "./itemView";
import { sections } from "./markdown";
import { decidingAs, helperName } from "./queue";
import { fullTime } from "./time";

type Props = {
  item: QueueItem;
  seats: Seat[];
  workflows: Workflow[];
  position: string;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  onDecide: (d: Decision) => void;
};

// Headings shown with a clearer name, and the ones handled elsewhere.
const TITLES: Record<string, string> = { "Recommendation from the helper": "Helper suggests" };
const SKIP = new Set(["Draft email"]);

const LINK =
  "rounded-button px-2 py-1 hover:bg-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** One item in full: facts, why it came to you, the body, the email draft, and the decisions. */
export function ItemDetail({
  item,
  seats,
  workflows,
  position,
  onBack,
  onPrev,
  onNext,
  onDecide,
}: Props) {
  const info = stepInfo(workflows, item);
  const body = sections(item.body);
  const as = decidingAs(seats, item);
  const fromSeat = seats.find((s) => s.id === item.from);
  const ref = reference(item);
  const helper = helperName(seats, item.from);
  const facts = [
    { label: "From", value: helper, badge: true },
    ...(item.supplier ? [{ label: "Supplier", value: item.supplier }] : []),
    { label: "Decides", value: as ? `${as} (you decide for the seat in this demo)` : "You" },
    { label: "Received", value: fullTime(item.created) },
    ...(ref ? [{ label: "Reference", value: ref }] : []),
  ];

  return (
    <div data-testid="item-detail" className="flex min-h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-2">
        <button
          type="button"
          onClick={onBack}
          className={LINK}
          style={typeStyle("small", "accent")}
        >
          Back to Needs you (Esc)
        </button>
        <div className="flex items-center gap-1">
          <span style={typeStyle("small")}>{position}</span>
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous item (K)"
            className={LINK}
            style={typeStyle("small", "navy")}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next item (J)"
            className={LINK}
            style={typeStyle("small", "navy")}
          >
            ›
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span style={typeStyle("small")}>
            {info.workflow} · {info.step}
          </span>
          {item.kind === "email-draft" && <Chip text="Email draft" />}
          {as && <Chip text={`Deciding as ${as} (demo)`} />}
        </div>
        <PanelTitle as="h3">{item.title}</PanelTitle>
        {info.stepLabel && (
          <p className="m-0 -mt-2" style={typeStyle("small")}>
            {info.stepLabel}
          </p>
        )}
        <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
          {facts.map((f) => (
            <div key={f.label} className="contents">
              <dt style={typeStyle("small")}>{f.label}</dt>
              <dd className="m-0 flex items-center gap-1.5" style={typeStyle("small", "ink")}>
                {"badge" in f && fromSeat && <TrackBadge id={fromSeat.track} size={12} />}
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-1 rounded-button bg-panel p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span style={typeStyle("label")}>Why this came to you</span>
            {item.rule && (
              <span
                className="rounded-chip border border-status-waiting px-1.5"
                style={typeStyle("label", "statusWaiting")}
                title="The 5 percent and 2K limits are still being confirmed with the team."
              >
                Rule not confirmed yet
              </span>
            )}
          </div>
          <p className="m-0" style={typeStyle("body")}>
            {whyText(seats, item)}
          </p>
        </div>
        {body
          .filter((s) => !SKIP.has(s.heading))
          .map((s) => (
            <BodySection key={s.heading} section={s} title={TITLES[s.heading]} />
          ))}
        {item.email && (
          <EmailPreview email={item.email} draft={body.find((s) => s.heading === "Draft email")} />
        )}
      </div>

      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-hairline bg-white px-5 py-3">
        <span style={typeStyle("label", "inkMuted")}>Your decision</span>
        <div className="grid grid-cols-2 gap-2">
          <DecisionButton
            decision="approve"
            label="Approve"
            shortcut="A"
            onClick={() => onDecide("approve")}
          />
          <DecisionButton
            decision="hold"
            label="Hold"
            shortcut="H"
            onClick={() => onDecide("hold")}
          />
          <DecisionButton
            decision="send-back"
            label={`Send back to ${helper}`}
            shortcut="S"
            onClick={() => onDecide("send-back")}
          />
          <DecisionButton
            decision="instruct"
            label="Instruct"
            shortcut="I"
            onClick={() => onDecide("instruct")}
          />
        </div>
      </div>
    </div>
  );
}
