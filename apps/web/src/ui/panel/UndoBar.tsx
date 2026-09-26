import { useEffect, useRef, useState } from "react";
import { typeStyle } from "../../theme/style";
import { motion } from "../../theme/tokens";

/**
 * Shows for 5 s after a decision (D-030), with a line that shrinks. The timer pauses while the
 * bar has hover or focus (WCAG 2.2.1). Email sends never get this bar.
 */
export function UndoBar({
  message,
  onUndo,
  onExpire,
}: {
  message: string;
  onUndo: () => void;
  onExpire: () => void;
}) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(motion.undoMs);
  const startedAt = useRef(0);
  const expire = useRef(onExpire);
  expire.current = onExpire;

  useEffect(() => {
    if (paused) return;
    startedAt.current = performance.now();
    const id = window.setTimeout(() => expire.current(), remaining.current);
    return () => {
      window.clearTimeout(id);
      remaining.current -= performance.now() - startedAt.current;
    };
  }, [paused]);

  return (
    <section
      aria-label="Undo the last decision"
      data-testid="undo-bar"
      className="relative flex shrink-0 items-center gap-3 overflow-hidden bg-navy px-4 py-2.5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span style={typeStyle("small", "white")}>{message}</span>
        <span style={typeStyle("small", "blueLight")}>Lab only, nothing is saved or sent.</span>
      </div>
      <button
        type="button"
        onClick={onUndo}
        className="shrink-0 rounded-button border border-white px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        style={{ ...typeStyle("small", "white"), fontWeight: 700 }}
      >
        Undo (U)
      </button>
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-[3px] w-full origin-left bg-blue-light motion-reduce:hidden"
        style={{
          animation: `undo-shrink ${motion.undoMs}ms linear forwards`,
          animationPlayState: paused ? "paused" : "running",
        }}
      />
    </section>
  );
}
