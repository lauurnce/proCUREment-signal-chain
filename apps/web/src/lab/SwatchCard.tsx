import { contrast, formatRatio, passesAA } from "../theme/contrast";
import { cssColor, typeStyle } from "../theme/style";
import { color } from "../theme/tokens";
import type { Check, Swatch } from "./swatches";

function describe(check: Check): string {
  if (check.fg === "white") return "White text on it";
  return `${check.use === "text" ? "Text" : "Shape"} on ${check.bg}`;
}

/** One color: the sample, its role, and each contrast check with a pass or a note. */
export function SwatchCard({ swatch, screenOnly }: { swatch: Swatch; screenOnly: boolean }) {
  const notes = swatch.checks.flatMap((c) => (c.note ? [c.note] : []));
  return (
    <div
      data-testid={`swatch-${swatch.key}`}
      className="flex flex-col overflow-hidden rounded-card border border-hairline"
    >
      <div className="h-16 border-b border-hairline" style={{ background: cssColor(swatch.key) }} />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span style={typeStyle("tagName")}>{swatch.key}</span>
          <span style={typeStyle("label", "inkMuted")}>{color[swatch.key]}</span>
        </div>
        <span style={typeStyle("small")}>{swatch.role}</span>
        {swatch.checks.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-0.5 border-t border-hairline p-0 pt-2">
            {swatch.checks.map((c) => {
              const ratio = contrast(color[c.fg], color[c.bg]);
              const pass = passesAA(ratio, c.use);
              return (
                <li
                  key={`${c.fg}-${c.bg}-${c.use}`}
                  className="flex items-center justify-between gap-2"
                >
                  <span style={typeStyle("small")}>{describe(c)}</span>
                  <span className="flex items-center gap-1.5" style={typeStyle("small", "ink")}>
                    <span className="tabular-nums">{formatRatio(ratio)}</span>
                    <span style={typeStyle("label", pass ? "statusWorking" : "statusWaiting")}>
                      {pass ? "✓ AA" : "✗ Low"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <span className="border-t border-hairline pt-2" style={typeStyle("small")}>
            Fill only, no text check
          </span>
        )}
        {notes.map((n) => (
          <span key={n} style={typeStyle("small", "statusWaiting")}>
            {n}
          </span>
        ))}
        {screenOnly && (
          <span
            className="mt-auto self-start rounded-chip bg-panel px-1.5 py-0.5"
            style={typeStyle("label")}
          >
            Screen only, approved (D-011)
          </span>
        )}
      </div>
    </div>
  );
}
