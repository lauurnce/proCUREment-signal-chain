import { typeStyle } from "../../theme/style";
import type { LabelRegistry, ZoneLabel } from "./ZoneLabelProjector";

/** The zone names, drawn in the page on top of the canvas. Hidden until placed. Never block drags. */
export function ZoneLabelLayer({
  labels,
  registry,
}: {
  labels: ZoneLabel[];
  registry: LabelRegistry;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {labels.map((label) => (
        <div
          key={label.id}
          data-testid={`zone-label-${label.id}`}
          ref={(el) => {
            if (el) registry.set(label.id, el);
            else registry.delete(label.id);
          }}
          className="invisible absolute top-0 left-0 rounded-pill border border-hairline bg-panel px-2 py-0.5 whitespace-nowrap will-change-transform"
          style={typeStyle("label")}
        >
          {label.name}
        </div>
      ))}
    </div>
  );
}
