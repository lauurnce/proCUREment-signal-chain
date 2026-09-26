import { useEffect, useMemo, useState } from "react";
import { useStore } from "../../state/store";
import { typeStyle } from "../../theme/style";
import { AboutNote } from "../../ui/AboutNote";
import { PanelTitle } from "../../ui/PanelTitle";
import { PlanDrawing } from "./PlanDrawing";
import { PLANS } from "./plans";
import { RouteLegend } from "./RouteLegend";
import { REAL_WORKFLOWS } from "./style";

function readPlan(search: string): "1" | "2" {
  return new URLSearchParams(search).get("plan") === "2" ? "2" : "1";
}

/** P2.4: two floor plan options with the six real workflow routes, to pick one before Phase 3. */
export function FloorPlanPage() {
  const data = useStore((s) => s.data);
  const connection = useStore((s) => s.connection);
  const [planId, setPlanId] = useState(() => readPlan(window.location.search));
  const [visible, setVisible] = useState(() => new Set(REAL_WORKFLOWS));
  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[0];
  const workflows = useMemo(
    () => (data?.workflows ?? []).filter((w) => REAL_WORKFLOWS.includes(w.id)),
    [data],
  );

  useEffect(() => {
    const previous = document.title;
    document.title = "Floor plan · SignalChain HQ";
    return () => {
      document.title = previous;
    };
  }, []);

  // Ready for screenshots once the routes can be drawn.
  useEffect(() => {
    if (workflows.length > 0) window.__HQ_READY__ = true;
  }, [workflows.length]);

  function choose(id: "1" | "2") {
    setPlanId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("plan", id);
    window.history.replaceState(null, "", url);
  }

  function toggle(id: string) {
    setVisible((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <main
      data-testid="floorplan-page"
      className="mx-auto flex max-w-[1440px] flex-col gap-5 px-6 py-8"
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <PanelTitle as="h1">Floor plan</PanelTitle>
          <p className="m-0" style={typeStyle("body")}>
            26 seats, every zone, and the six real workflow routes. Top-down, in meters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <fieldset className="m-0 flex items-center gap-2 border-0 p-0">
            <legend className="sr-only">Floor plan option</legend>
            {(["1", "2"] as const).map((id) => {
              const p = PLANS.find((x) => x.id === id);
              const active = id === planId;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => choose(id)}
                  className={`rounded-button border px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${active ? "border-accent bg-accent" : "border-hairline bg-white"}`}
                  style={{ ...typeStyle("small", active ? "white" : "navy"), fontWeight: 700 }}
                >
                  Option {id}. {p?.name}
                </button>
              );
            })}
          </fieldset>
          <a href="/lab" className="ml-2 hover:underline" style={typeStyle("small", "accent")}>
            Back to the Lab
          </a>
        </div>
      </header>

      {plan && (
        <div className="grid grid-cols-[1fr_320px] items-start gap-5">
          <section className="rounded-card border border-hairline bg-white p-4">
            <p className="m-0 mb-3" style={typeStyle("small")}>
              {plan.idea}
            </p>
            {workflows.length > 0 ? (
              <PlanDrawing
                plan={plan}
                zones={data?.office.zones ?? []}
                workflows={workflows}
                visibleRoutes={visible}
              />
            ) : (
              <p className="m-0 py-24 text-center" style={typeStyle("body", "inkMuted")}>
                {connection === "offline"
                  ? "The local server is offline. Start it with pnpm dev to load the workflows."
                  : "Loading the workflows from the local server."}
              </p>
            )}
          </section>
          <RouteLegend plan={plan} workflows={workflows} visible={visible} onToggle={toggle} />
        </div>
      )}
      <AboutNote />
    </main>
  );
}
