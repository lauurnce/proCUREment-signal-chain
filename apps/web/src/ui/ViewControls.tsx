import { PRESETS } from "../scene/camera/presets";
import { useStore } from "../state/store";
import { typeStyle } from "../theme/style";

// Press to 0.97 in 80 ms (D-030), hover fill in 140 ms. Transform and colors only, no layout.
const BUTTON =
  "rounded-button border px-3 py-1.5 transition-[transform,background-color,border-color] duration-[140ms] ease-enter active:scale-[0.97] active:duration-[80ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
/** Selected is accent for every view and light button (council decision, 27 Sep 2026). */
const SELECTED = "border-accent bg-accent";
const IDLE = "border-hairline bg-white hover:bg-panel";

/**
 * The camera views and the light, in the panel's Office tab (Lawrence's choice, P5.3: the card
 * used to float over the office and made it small at 1280 and 1440). Keys 1 to 5 still pick a
 * view from anywhere (useViewKeys).
 */
export function ViewControls() {
  const view = useStore((s) => s.view);
  const light = useStore((s) => s.light);
  const goToView = useStore((s) => s.goToView);
  const setLight = useStore((s) => s.setLight);

  return (
    <section data-testid="view-controls" aria-label="Office view" className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <h3 className="m-0" style={typeStyle("label", "navy")}>
          Go to
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => {
            const active = preset.id === view;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={active}
                aria-keyshortcuts={preset.key}
                onClick={() => goToView(preset.id)}
                className={`${BUTTON} flex items-center gap-2 ${active ? SELECTED : IDLE}`}
                style={{ ...typeStyle("small", active ? "white" : "navy"), fontWeight: 700 }}
              >
                <span
                  aria-hidden="true"
                  className={`rounded-chip border px-1 font-mono text-[11px] leading-[14px] ${active ? "border-white/60" : "border-hairline text-ink-muted"}`}
                >
                  {preset.key}
                </span>
                {preset.label}
              </button>
            );
          })}
        </div>
        <p className="m-0" style={typeStyle("small")}>
          Keys 1 to 5 work from anywhere. Drag to pan, scroll to zoom.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="m-0" style={typeStyle("label", "navy")}>
          Light
        </h3>
        <div className="flex gap-2">
          {(["day", "night"] as const).map((option) => {
            const active = option === light;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => setLight(option)}
                className={`${BUTTON} ${active ? SELECTED : IDLE}`}
                style={{ ...typeStyle("small", active ? "white" : "navy"), fontWeight: 700 }}
              >
                {option === "day" ? "Day" : "Night"}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
