import { MotionConfig } from "motion/react";
import { useEffect } from "react";
import { typeStyle } from "../theme/style";
import { AboutNote } from "../ui/AboutNote";
import { PanelTitle } from "../ui/PanelTitle";
import { DecisionSection } from "./sections/DecisionSection";
import { HudSection } from "./sections/HudSection";
import { LabSection } from "./sections/LabSection";
import { NameTagSection } from "./sections/NameTagSection";
import { StatusSection } from "./sections/StatusSection";
import { SwatchesSection } from "./sections/SwatchesSection";
import { TypeSection } from "./sections/TypeSection";

const SECTIONS = [
  {
    id: "colors",
    title: "Colors and contrast",
    intro:
      "Every UI color with its job and its WCAG contrast. Screen-only colors are marked, because you approve them in D-011.",
    body: <SwatchesSection />,
  },
  {
    id: "type",
    title: "Type",
    intro: "Quattrocento Sans for reading. IBM Plex Mono only for small uppercase labels.",
    body: <TypeSection />,
  },
  {
    id: "status",
    title: "Status and track",
    intro: "How a helper shows what it is doing and which track it belongs to.",
    body: <StatusSection />,
  },
  {
    id: "name-tags",
    title: "Name tags",
    intro: "The pill that floats above each helper in the office.",
    body: <NameTagSection />,
  },
  {
    id: "stats",
    title: "Stats",
    intro: "The small card at the top of the office with the team numbers.",
    body: <HudSection />,
  },
  {
    id: "decisions",
    title: "Decision card",
    intro: "One item from Needs you, with the four decisions. Fictional data.",
    body: <DecisionSection />,
  },
];

/** The Lab: Phase 2 design pieces, judged on screen. */
export function LabPage() {
  // No 3D scene here, so the page is ready as soon as it mounts.
  useEffect(() => {
    const previous = document.title;
    document.title = "Lab · SignalChain HQ";
    window.__HQ_READY__ = true;
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <main
        data-testid="lab-page"
        className="mx-auto flex max-w-[1120px] flex-col gap-6 px-6 py-12"
      >
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <PanelTitle as="h1">Lab</PanelTitle>
            <a
              href="/"
              className="text-accent underline-offset-4 hover:underline"
              style={typeStyle("body", "accent")}
            >
              Back to the office
            </a>
          </div>
          <p className="m-0" style={typeStyle("body")}>
            Direction A, Warm Diorama with B's rules (D-025). Tokens and UI pieces for Phase 2.
          </p>
          <nav aria-label="Lab sections" className="flex flex-wrap gap-2">
            {SECTIONS.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-pill border border-hairline bg-white px-3 py-1 hover:border-accent"
                style={typeStyle("label")}
              >
                {i + 1}. {s.title}
              </a>
            ))}
          </nav>
        </header>
        {SECTIONS.map((s, i) => (
          <LabSection key={s.id} id={s.id} number={i + 1} title={s.title} intro={s.intro}>
            {s.body}
          </LabSection>
        ))}
        <footer className="pt-2">
          <AboutNote />
        </footer>
      </main>
    </MotionConfig>
  );
}
