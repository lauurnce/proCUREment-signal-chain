import { useEffect } from "react";
import { AboutNote } from "../ui/AboutNote";

/** The Lab: design experiments from Phase 2 live here. Empty for now. */
export function LabPage() {
  // No 3D scene here yet, so the page is ready as soon as it mounts.
  useEffect(() => {
    const previous = document.title;
    document.title = "Lab · SignalChain HQ";
    window.__HQ_READY__ = true;
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <main
      data-testid="lab-page"
      className="mx-auto flex h-full max-w-3xl flex-col gap-4 px-6 py-12"
    >
      <div>
        <h1 className="m-0 font-sans text-[22px] leading-[28px] font-bold text-navy">Lab</h1>
        <div aria-hidden="true" className="mt-2 h-[3px] w-7 bg-accent" />
      </div>
      <p className="m-0 text-[15px] leading-[22px] text-ink">
        Design experiments go here, starting in Phase 2. Nothing to see yet.
      </p>
      <a
        href="/"
        className="text-[15px] leading-[22px] text-accent underline-offset-4 hover:underline"
      >
        Back to the office
      </a>
      <div className="mt-auto">
        <AboutNote />
      </div>
    </main>
  );
}
