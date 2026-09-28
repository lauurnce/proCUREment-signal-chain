import type { LayoutFile } from "@hq/shared";
import { useMemo } from "react";
import { useStore } from "../../state/store";
import { color } from "../../theme/tokens";
import { NameTag } from "../../ui/NameTag";
import type { TagRegistry } from "../tags/TagProjector";
import { useSelectedSeat } from "./selection";
import { tagsFor } from "./tags";
import { useOfficeTeam } from "./useOfficeTeam";

/**
 * The name tags over the helpers, in the page on top of the canvas. Each tag holds a compact
 * pill (dot and name) and a full pill (plus the role). OfficeTagProjector shows one of them
 * for the zoom and moves the tag every frame. Tags stay hidden until placed, and never block
 * a drag.
 */
export function OfficeTagLayer({
  layout,
  registry,
}: {
  layout: LayoutFile;
  registry: TagRegistry;
}) {
  const { team, seats } = useOfficeTeam(layout);
  const selected = useSelectedSeat();
  // Navy is lost on the navy night scene, so the selection outline is light blue at night.
  const night = useStore((state) => state.light === "night");
  const outline = `2px solid ${night ? color.blueLight : color.navy}`;
  const tags = useMemo(() => (team ? tagsFor(seats, team.members) : []), [seats, team]);

  return (
    <div
      data-testid="office-tags"
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
    >
      {tags.map(({ id, ...tag }) => (
        <div
          key={id}
          data-testid={`office-tag-${id}`}
          data-selected={id === selected}
          ref={(el) => {
            if (el) registry.set(id, el);
            else registry.delete(id);
          }}
          className="invisible absolute top-0 left-0 whitespace-nowrap will-change-transform"
        >
          {[true, false].map((compact) => (
            <div
              key={String(compact)}
              className="rounded-pill"
              style={{
                display: compact ? "block" : "none",
                outline: id === selected ? outline : "none",
                outlineOffset: 1,
              }}
            >
              <NameTag {...tag} compact={compact} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
