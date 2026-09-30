import { MotionConfig } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Scene } from "../scene/Scene";
import { useOverlayRect } from "../state/overlays";
import { useStore } from "../state/store";
import { typeStyle } from "../theme/style";
import { AboutNote } from "./AboutNote";
import { HealthBadge } from "./HealthBadge";
import { useOfficeLink } from "./officeLink";
import { OfficePanel } from "./panel/OfficePanel";
import { usePanelStore } from "./panel/panelStore";
import { useLiveCounts } from "./panel/useLiveCounts";
import { StatsHud } from "./StatsHud";
import { useMediaQuery } from "./useMediaQuery";
import { useViewKeys } from "./useViewKeys";
import { WalkPill } from "./WalkPill";

/** Panel width from the spec: clamp(440px, 36vw, 600px), 12 px from the edges (D-033). */
const PANEL_WIDTH = "clamp(440px, 36vw, 600px)";
const EDGE = 12;

/** A small backing pill, so text on top of the scene is always readable (council review). */
function pill(night: boolean) {
  return `rounded-pill border px-2.5 py-1 transition-colors duration-[1200ms] ease-move ${
    night ? "border-navy bg-navy" : "border-hairline bg-panel"
  }`;
}

const BUTTON =
  "rounded-pill border border-hairline bg-white px-4 py-2 shadow-float hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/**
 * The main screen: the full-screen office, the HQ panel docked on the right, and over the free
 * area the stats HUD, the Walk around pill and the About note. Views and light are in the
 * panel's Office tab. Each of them
 * registers as an overlay, so the camera frames the office around them.
 * Under 960 px (for example at 200 percent zoom) the panel goes full width, and "Show office"
 * swaps to the office (panel spec, WCAG 1.4.10).
 */
export function OfficeScreen() {
  const night = useStore((s) => s.light === "night");
  const wide = useMediaQuery("(min-width: 960px)");
  const [officeShown, setOfficeShown] = useState(false);
  const showNeedsYou = usePanelStore((s) => s.showNeedsYou);
  const showHelper = usePanelStore((s) => s.showHelper);
  const link = useOfficeLink();
  const counts = useLiveCounts();
  const note = useRef<HTMLDivElement>(null);
  const controls = useRef<HTMLDivElement>(null);
  useOverlayRect("note", note);
  useOverlayRect("controls", controls);
  const viewAnnouncement = useViewKeys();

  // Page title (WCAG 2.4.2): "Needs you (3) · SignalChain HQ".
  useEffect(() => {
    document.title = counts ? `Needs you (${counts.needsYou}) · SignalChain HQ` : "SignalChain HQ";
  }, [counts]);

  // The office opens a helper's card in the panel: a click on the helper, or E next to them in
  // Walk around (P45). A narrow screen swaps back to the panel to show it.
  useEffect(() => {
    if (!link) return;
    const open = (seatId: string) => {
      showHelper(seatId);
      if (!wide) setOfficeShown(false);
    };
    const stopSelect = link.onSeatSelected((event) => {
      if (event.source === "click" && event.seatId) open(event.seatId);
    });
    const stopTalk = link.onTalk(open);
    return () => {
      stopSelect();
      stopTalk();
    };
  }, [link, showHelper, wide]);

  const panelShown = wide || !officeShown;
  const sceneShown = wide || officeShown;
  const freeRight = wide ? `calc(${PANEL_WIDTH} + ${EDGE}px)` : "0px";

  return (
    // Every motion on the screen (the Walk around note too) follows the reduced motion setting.
    <MotionConfig reducedMotion="user">
      <main className="relative h-full w-full overflow-hidden">
        <button
          type="button"
          onClick={() => {
            setOfficeShown(false);
            showNeedsYou();
          }}
          className="sr-only z-40 rounded-button border border-hairline bg-white px-3 py-2 focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          style={{ ...typeStyle("small", "navy"), fontWeight: 700 }}
        >
          Skip to Needs you
        </button>

        <section
          className="absolute inset-0"
          aria-label="Office view. The same facts are in the panel."
          aria-hidden={!sceneShown || undefined}
        >
          <Scene />
        </section>

        {panelShown && (
          <div
            id="hq-panel"
            className="absolute z-20"
            style={
              wide ? { top: EDGE, right: EDGE, bottom: EDGE, width: PANEL_WIDTH } : { inset: 0 }
            }
          >
            <OfficePanel
              key={wide ? "docked" : "full"}
              docked={wide}
              onShowOffice={wide ? undefined : () => setOfficeShown(true)}
            />
          </div>
        )}

        {/* Always rendered, so each overlay box stays registered for the camera. */}
        <div
          className={`pointer-events-none absolute top-0 bottom-0 left-0 z-10 p-6 ${sceneShown ? "" : "invisible"}`}
          style={{ right: freeRight }}
        >
          <div className="flex items-start justify-between gap-4">
            <StatsHud />
            {!wide && (
              <button
                type="button"
                onClick={() => setOfficeShown(false)}
                className={`pointer-events-auto ${BUTTON}`}
                style={{ ...typeStyle("small", "navy"), fontWeight: 700 }}
              >
                Show panel
              </button>
            )}
          </div>
          <div className="absolute right-6 bottom-6 left-6 grid grid-cols-[1fr_auto_1fr] items-end gap-4">
            <div className="justify-self-start">
              <div ref={note} className={pill(night)}>
                <AboutNote onDark={night} />
              </div>
            </div>
            <WalkPill />
            {/* Views and light live in the panel's Office tab now (P5.3). */}
            <div ref={controls} className="flex flex-col items-end gap-3 justify-self-end">
              {import.meta.env.DEV && <HealthBadge />}
            </div>
          </div>
        </div>
        <p className="sr-only" aria-live="polite" data-testid="view-announcement">
          {viewAnnouncement}
        </p>
      </main>
    </MotionConfig>
  );
}
