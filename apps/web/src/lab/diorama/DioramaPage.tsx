import { useEffect, useMemo, useState } from "react";
import { TagLayer } from "../../scene/tags/TagLayer";
import type { TagRegistry } from "../../scene/tags/TagProjector";
import { useStore } from "../../state/store";
import { typeStyle } from "../../theme/style";
import { AboutNote } from "../../ui/AboutNote";
import { PanelTitle } from "../../ui/PanelTitle";
import { DioramaScene } from "./DioramaScene";
import { HELPERS, withLiveStatus } from "./helpers";
import { LookToggle } from "./LookToggle";
import { LOOKS, type LookId, lightingFor, readParams, type TimeOfDay } from "./looks";

const params = new URLSearchParams(window.location.search);
/** ?shots=1 freezes time, so every screenshot shows the same pose. */
const FROZEN_AT = params.has("shots") ? 1.3 : null;
const prefersStill = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** P2.3: one desk pod and 4 helpers, to judge light and materials before Phase 3. */
export function DioramaPage() {
  const [choice, setChoice] = useState(() => readParams(window.location.search));
  const seats = useStore((s) => s.data?.seats);
  const tags = useMemo<TagRegistry>(() => new Map(), []);

  useEffect(() => {
    const previous = document.title;
    document.title = "Diorama study · SignalChain HQ";
    return () => {
      document.title = previous;
    };
  }, []);

  function change(next: { look: LookId; time: TimeOfDay }) {
    setChoice(next);
    const url = new URL(window.location.href);
    url.searchParams.set("look", next.look);
    url.searchParams.set("time", next.time);
    window.history.replaceState(null, "", url);
  }

  const look = LOOKS[choice.look];
  const night = choice.time === "night";

  return (
    <main data-testid="diorama-page" className="relative h-full overflow-hidden">
      <div className="absolute inset-0">
        <DioramaScene
          lighting={lightingFor(look, choice.time)}
          night={night}
          frozenAt={FROZEN_AT}
          still={prefersStill}
          tags={tags}
        />
        <TagLayer tags={withLiveStatus(HELPERS, seats)} registry={tags} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 p-6">
        <div className="pointer-events-auto flex flex-col gap-2 rounded-card border border-hairline bg-white p-4 shadow-float">
          <PanelTitle as="h1">Diorama study</PanelTitle>
          <p className="m-0" style={typeStyle("small")}>
            One desk pod, one helper per track. Direction A.
          </p>
          <a href="/lab" style={typeStyle("small", "accent")} className="hover:underline">
            Back to the Lab
          </a>
        </div>
        <div className="pointer-events-auto">
          <LookToggle look={choice.look} time={choice.time} onChange={change} />
        </div>
      </div>
      <div className="absolute bottom-4 left-6 z-20 rounded-chip bg-white px-2 py-1">
        <AboutNote />
      </div>
    </main>
  );
}
