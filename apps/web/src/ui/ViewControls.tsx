import { useEffect, useRef, useState } from "react";
import { PRESETS, presetById } from "../scene/camera/presets";
import { useStore } from "../state/store";
import { typeStyle } from "../theme/style";
import { viewForKey } from "./viewKeys";

// Press to 0.97 in 80 ms (D-030), hover fill in 140 ms. Transform and colors only, no layout.
const BUTTON =
  "rounded-button border px-3 py-1.5 transition-[transform,background-color,border-color] duration-[140ms] ease-enter active:scale-[0.97] active:duration-[80ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
/** Selected is accent for every button in the card (council decision, 27 Sep 2026). */
const SELECTED = "border-accent bg-accent";
const IDLE = "border-hairline bg-white hover:bg-panel";

/**
 * The camera views and the light, at the bottom right of the office (panel spec, Office tab).
 * Keys 1 to 5 pick a view from anywhere except a text field. The panel's Office tab will use
 * the same store actions in Phase 5.
 */
export function ViewControls() {
  const view = useStore((s) => s.view);
  const viewRequest = useStore((s) => s.viewRequest);
  const light = useStore((s) => s.light);
  const goToView = useStore((s) => s.goToView);
  const setLight = useStore((s) => s.setLight);
  const [announcement, setAnnouncement] = useState("");
  const firstRequest = useRef(viewRequest);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const next = viewForKey(event);
      if (!next) return;
      event.preventDefault();
      goToView(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goToView]);

  // Tell screen readers where the camera went, but not on page load.
  useEffect(() => {
    if (viewRequest === firstRequest.current) return;
    setAnnouncement(`View: ${presetById(view).label}`);
  }, [view, viewRequest]);

  return (
    <section
      data-testid="view-controls"
      aria-label="Office view"
      className="pointer-events-auto flex flex-col gap-3 rounded-float border border-hairline bg-white p-3 shadow-float"
    >
      <div className="flex flex-col gap-2">
        <span style={typeStyle("label", "inkMuted")}>Go to</span>
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
      </div>
      <div className="flex flex-col gap-2">
        <span style={typeStyle("label", "inkMuted")}>Light</span>
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
      <p className="sr-only" aria-live="polite" data-testid="view-announcement">
        {announcement}
      </p>
    </section>
  );
}
