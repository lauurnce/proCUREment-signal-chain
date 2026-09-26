import type { Track } from "@hq/shared";
import { cssColor } from "../theme/style";
import { track } from "../theme/tokens";

/**
 * The track badge: a shape and a color, so it never relies on color alone.
 * The Leads triangle is an outline with nothing behind it (logo safety).
 */
export function TrackBadge({ id, size = 14 }: { id: Track; size?: number }) {
  const t = track[id];
  const fill = cssColor(t.colorKey);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      role="img"
      aria-label={t.label}
      className="shrink-0"
    >
      {t.shape === "star" && (
        <path
          d="M7 1l1.76 3.8 4.14.45-3.08 2.8.86 4.08L7 10.07 3.32 12.13l.86-4.08L1.1 5.25l4.14-.45z"
          fill={fill}
        />
      )}
      {t.shape === "triangle-outline" && (
        <path d="M7 2.2L12.3 11.8H1.7z" fill="none" stroke={fill} strokeWidth="1.8" />
      )}
      {t.shape === "diamond" && <path d="M7 1.2L12.8 7 7 12.8 1.2 7z" fill={fill} />}
      {t.shape === "square" && <rect x="2" y="2" width="10" height="10" rx="1.5" fill={fill} />}
    </svg>
  );
}
