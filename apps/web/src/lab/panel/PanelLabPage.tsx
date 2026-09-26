import { useCallback, useEffect, useMemo, useState } from "react";
import { TagLayer } from "../../scene/tags/TagLayer";
import type { TagRegistry } from "../../scene/tags/TagProjector";
import { useStore } from "../../state/store";
import { typeStyle } from "../../theme/style";
import { AboutNote } from "../../ui/AboutNote";
import { Panel } from "../../ui/panel/Panel";
import type { TabId } from "../../ui/panel/PanelTabs";
import { StatsCard } from "../../ui/StatsCard";
import { DioramaScene } from "../diorama/DioramaScene";
import { HELPERS } from "../diorama/helpers";
import { LOOKS, lightingFor } from "../diorama/looks";

const params = new URLSearchParams(window.location.search);
const SHOTS = params.has("shots");
/** Screenshots use a fixed clock and pose, the morning of the sample data. */
const NOW = SHOTS ? new Date("2026-09-25T09:35:00+08:00") : null;
const TAB = (["needs", "team", "board", "office"] as const).find((t) => t === params.get("tab"));
const OPEN_FIRST = params.get("open") === "1";
const prefersStill = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const EDGE = 12;

/** Panel width from the spec: clamp(440px, 36vw, 600px). */
const panelWidth = (w: number) => Math.min(600, Math.max(440, Math.round(w * 0.36)));

/** P2.5: the HQ panel, docked next to the P2.3 diorama, with sample data from vault.sample. */
export function PanelLabPage() {
  const data = useStore((s) => s.data);
  const connection = useStore((s) => s.connection);
  const [width, setWidth] = useState(() => panelWidth(window.innerWidth));
  const [needs, setNeeds] = useState(0);
  const [walkNote, setWalkNote] = useState(false);
  const tags = useMemo<TagRegistry>(() => new Map(), []);
  const onNeedsCount = useCallback((n: number) => setNeeds(n), []);

  useEffect(() => {
    const onResize = () => setWidth(panelWidth(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const previous = document.title;
    document.title = `Needs you (${needs}) · SignalChain HQ`;
    return () => {
      document.title = previous;
    };
  }, [needs]);

  const covered = width + EDGE * 2;
  const stats = data
    ? [
        { label: "Needs you", value: String(needs) },
        { label: "Helpers working", value: String(data.stats.working) },
        { label: "Open tasks", value: String(data.stats.openTasks) },
      ]
    : [];

  return (
    <main data-testid="panel-lab" className="relative h-full overflow-hidden">
      {data ? (
        <>
          <section
            className="absolute inset-0"
            aria-label="Office view. The same facts are in the panel."
          >
            <DioramaScene
              lighting={lightingFor(LOOKS.a, "day")}
              night={false}
              frozenAt={SHOTS ? 1.3 : null}
              still={prefersStill}
              tags={tags}
              rightInset={covered}
            />
            <TagLayer tags={HELPERS} registry={tags} />
          </section>

          {/* Over the scene, inside the free area */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 left-0 z-20 p-6"
            style={{ right: covered }}
          >
            <div className="pointer-events-auto flex flex-col items-start gap-2">
              <StatsCard stats={stats} />
              <span className="rounded-chip bg-white px-2 py-1" style={typeStyle("small")}>
                Lab only, nothing is saved or sent. Sample data from vault.sample.
              </span>
            </div>
            <div className="pointer-events-auto absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
              {walkNote && (
                <p
                  role="status"
                  className="m-0 rounded-card border border-hairline bg-white px-3 py-2 shadow-float"
                  style={typeStyle("small", "ink")}
                >
                  Walk mode comes in Phase 4. In the Lab, this button only shows this note.
                </p>
              )}
              <button
                type="button"
                aria-expanded={walkNote}
                onClick={() => setWalkNote((v) => !v)}
                onKeyDown={(e) => e.key === "Escape" && setWalkNote(false)}
                title="Walk the office with W, A, S, D. Press Esc to stop."
                className="rounded-pill border border-hairline bg-white px-4 py-2 shadow-float hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                style={{ ...typeStyle("small", "navy"), fontWeight: 700 }}
              >
                Walk around
              </button>
            </div>
            <div className="pointer-events-auto absolute bottom-6 left-6 rounded-chip bg-white px-2 py-1">
              <AboutNote />
            </div>
          </div>

          {/* The docked panel: 12 px from the edges, no shadow (D-025, D-033) */}
          <div className="absolute z-20" style={{ top: EDGE, right: EDGE, bottom: EDGE, width }}>
            <Panel
              data={data}
              connection={connection}
              now={NOW ?? new Date()}
              onNeedsCount={onNeedsCount}
              initial={{ tab: TAB as TabId | undefined, openFirst: OPEN_FIRST }}
            />
          </div>
        </>
      ) : (
        <p className="m-0 p-10" style={typeStyle("body", "inkMuted")}>
          {connection === "offline"
            ? "Cannot reach the local server. Start it with pnpm dev, then reload."
            : "Loading the sample data from the local server."}
        </p>
      )}
    </main>
  );
}
