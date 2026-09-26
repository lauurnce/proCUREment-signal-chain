import { typeStyle } from "../../theme/style";
import { FAVORITE, LOOKS, type LookId, type TimeOfDay } from "./looks";

type Props = {
  look: LookId;
  time: TimeOfDay;
  onChange: (next: { look: LookId; time: TimeOfDay }) => void;
};

const BUTTON =
  "rounded-button border px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Dev toggle for the diorama study: pick a look and the time of day. */
export function LookToggle({ look, time, onChange }: Props) {
  return (
    <section
      data-testid="look-toggle"
      aria-label="Diorama look"
      className="flex flex-col gap-3 rounded-card border border-hairline bg-white p-4 shadow-float"
    >
      <div className="flex flex-col gap-2">
        <span style={typeStyle("label", "inkMuted")}>Look</span>
        <div className="flex gap-2">
          {Object.values(LOOKS).map((l) => {
            const active = l.id === look;
            return (
              <button
                key={l.id}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ look: l.id, time })}
                className={`${BUTTON} ${active ? "border-accent bg-accent text-white" : "border-hairline bg-white text-navy"}`}
                style={{ ...typeStyle("small", active ? "white" : "navy"), fontWeight: 700 }}
              >
                {l.id.toUpperCase()}. {l.name}
                {FAVORITE === l.id && " ★"}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span style={typeStyle("label", "inkMuted")}>Time</span>
        <div className="flex gap-2">
          {(["day", "night"] as const).map((t) => {
            const active = t === time;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ look, time: t })}
                className={`${BUTTON} ${active ? "border-navy bg-navy" : "border-hairline bg-white"}`}
                style={{ ...typeStyle("small", active ? "white" : "navy"), fontWeight: 700 }}
              >
                {t === "day" ? "Day" : "Night"}
              </button>
            );
          })}
        </div>
      </div>
      <p className="m-0 max-w-80" style={typeStyle("small")}>
        {LOOKS[look].idea}
      </p>
    </section>
  );
}
