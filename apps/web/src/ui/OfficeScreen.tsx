import { useRef } from "react";
import { Scene } from "../scene/Scene";
import { useOverlayRect } from "../state/overlays";
import { useStore } from "../state/store";
import { AboutNote } from "./AboutNote";
import { HealthBadge } from "./HealthBadge";
import { ViewControls } from "./ViewControls";

/** A small backing pill, so text on top of the scene is always readable (council review). */
function pill(night: boolean) {
  return `rounded-pill border px-2.5 py-1 transition-colors duration-[1200ms] ease-move ${
    night ? "border-navy bg-navy" : "border-hairline bg-panel"
  }`;
}

/**
 * The main screen: the full-screen office with the title, the About note and the view card.
 * Each of them registers as an overlay, so the camera frames the office around them and zone
 * labels never hide under them.
 */
export function OfficeScreen() {
  const night = useStore((s) => s.light === "night");
  const title = useRef<HTMLDivElement>(null);
  const note = useRef<HTMLDivElement>(null);
  const controls = useRef<HTMLDivElement>(null);
  useOverlayRect("title", title);
  useOverlayRect("note", note);
  useOverlayRect("controls", controls);

  return (
    <main className="relative h-full w-full overflow-hidden">
      <Scene />
      <header className="pointer-events-none absolute top-4 left-4">
        <div ref={title} className={pill(night)}>
          <h1
            className={`m-0 font-sans text-[20px] leading-[28px] font-bold transition-colors duration-[1200ms] ease-move ${night ? "text-white" : "text-navy"}`}
          >
            SignalChain HQ
          </h1>
        </div>
      </header>
      <footer className="pointer-events-none absolute right-4 bottom-4 left-4 flex items-end justify-between gap-4">
        <div ref={note} className={pill(night)}>
          <AboutNote onDark={night} />
        </div>
        <div ref={controls} className="flex flex-col items-end gap-3">
          <ViewControls />
          {import.meta.env.DEV && <HealthBadge />}
        </div>
      </footer>
    </main>
  );
}
