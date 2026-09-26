import type { SeatStatus, Track } from "@hq/shared";
import { NameTag } from "../../ui/NameTag";
import type { TagRegistry } from "./TagProjector";

export type TagData = { id: string; track: Track; name: string; role: string; status: SeatStatus };

/**
 * The name tag pills, drawn in the page on top of the canvas. They stay hidden until
 * TagProjector places them, so they never flash in the corner. They never block drags.
 */
export function TagLayer({
  tags,
  registry,
  compact = false,
}: {
  tags: TagData[];
  registry: TagRegistry;
  /** Overview size: dot and name only. */
  compact?: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {tags.map(({ id, ...tag }) => (
        <div
          key={id}
          data-testid={`head-tag-${id}`}
          ref={(el) => {
            if (el) registry.set(id, el);
            else registry.delete(id);
          }}
          className="invisible absolute top-0 left-0 whitespace-nowrap will-change-transform"
        >
          <NameTag {...tag} compact={compact} />
        </div>
      ))}
    </div>
  );
}
