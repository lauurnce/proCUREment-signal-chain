import { AnimatePresence, motion as m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useOverlayRect } from "../state/overlays";
import { bezier, typeStyle } from "../theme/style";
import { motion } from "../theme/tokens";
import { useOfficeLink } from "./officeLink";

/**
 * Bottom center of the office. Starts Walk around mode through the office link once the office
 * is connected (the P4 and P5 merge). Until then it shows a short note, which closes on Esc or
 * a click outside (copy deck, walk.*).
 */
export function WalkPill() {
  const link = useOfficeLink();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useOverlayRect("walk", ref);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="pointer-events-auto relative">
      {/* The note floats above the pill, so the pill's box (an overlay for the camera) never changes. */}
      <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-80 -translate-x-1/2">
        <AnimatePresence>
          {open && (
            <m.p
              id="walk-note"
              role="status"
              data-testid="walk-note"
              initial={{ opacity: 0, y: 4 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: {
                  duration: motion.duration.fast / 1000,
                  ease: bezier(motion.easing.enter),
                },
              }}
              exit={{
                opacity: 0,
                transition: {
                  duration: motion.duration.fast / 1000,
                  ease: bezier(motion.easing.exit),
                },
              }}
              className="pointer-events-auto m-0 rounded-card border border-hairline bg-white px-3 py-2 text-center shadow-float"
              style={typeStyle("small", "ink")}
            >
              Walk around comes with the team update. Press Esc to close.
            </m.p>
          )}
        </AnimatePresence>
      </div>
      <button
        ref={button}
        type="button"
        data-testid="walk-pill"
        aria-expanded={open}
        aria-controls={open ? "walk-note" : undefined}
        onClick={() => (link ? link.enterWalkMode() : setOpen((v) => !v))}
        title="Walk the office with W, A, S, D. Press Esc to stop."
        className="rounded-pill border border-hairline bg-white px-4 py-2 shadow-float transition-[transform,border-color] duration-[140ms] ease-enter hover:border-accent active:scale-[0.97] active:duration-[80ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        style={{ ...typeStyle("small", "navy"), fontWeight: 700 }}
      >
        Walk around
      </button>
    </div>
  );
}
