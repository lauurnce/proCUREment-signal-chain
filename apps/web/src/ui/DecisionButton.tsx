import { motion as m } from "motion/react";
import type { CSSProperties } from "react";
import { cssColor, typeStyle } from "../theme/style";
import { motion } from "../theme/tokens";

export type Decision = "approve" | "hold" | "send-back" | "instruct";

const LOOK: Record<Decision, CSSProperties> = {
  approve: {
    background: cssColor("statusWorking"),
    color: cssColor("white"),
    borderColor: cssColor("statusWorking"),
  },
  hold: { background: cssColor("panel"), color: cssColor("navy"), borderColor: cssColor("panel") },
  "send-back": {
    background: cssColor("white"),
    color: cssColor("navy"),
    borderColor: cssColor("hairline"),
  },
  instruct: {
    background: cssColor("white"),
    color: cssColor("accent"),
    borderColor: cssColor("accent"),
  },
};

type Props = {
  decision: Decision;
  label: string;
  shortcut: string;
  onClick: () => void;
};

/** One of the four decisions. Shrinks slightly when pressed (D-030). */
export function DecisionButton({ decision, label, shortcut, onClick }: Props) {
  return (
    <m.button
      type="button"
      data-testid={`decide-${decision}`}
      aria-keyshortcuts={shortcut}
      onClick={onClick}
      whileTap={{ scale: motion.pressScale }}
      transition={{ duration: motion.pressMs / 1000 }}
      style={{ ...typeStyle("body"), fontWeight: 700, ...LOOK[decision] }}
      className="flex min-h-10 w-full items-center justify-between gap-2 rounded-button border px-4 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {label}
      <span
        aria-hidden="true"
        style={{ ...typeStyle("label"), color: "inherit" }}
        className="rounded-chip border border-current px-1"
      >
        {shortcut}
      </span>
    </m.button>
  );
}
