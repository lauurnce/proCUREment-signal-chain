import type { LayoutFile, QueueItem } from "@hq/shared";
import { useMemo } from "react";
import { useStore } from "../../state/store";
import { color, status as statusTokens, track as trackTokens } from "../../theme/tokens";
import { NameTag } from "../../ui/NameTag";
import { StatusDot } from "../../ui/StatusDot";
import { TrackBadge } from "../../ui/TrackBadge";
import type { TagRegistry } from "../tags/TagProjector";
import { waitsFor } from "./behavior";
import { useSelectedSeat } from "./selection";
import { tagsFor } from "./tags";
import { useOfficeTeam } from "./useOfficeTeam";

const NO_QUEUE: QueueItem[] = [];

/**
 * The name tags over the helpers, in the page on top of the canvas. Each tag holds three
 * forms, and OfficeTagProjector shows one of them and moves the tag every frame:
 * - a chip (track badge and status dot), for most helpers at the Overview,
 * - a compact pill (plus the name), at the Overview for helpers that wait on you, the
 *   selected one and the one under the mouse (council, 29 Sep 2026),
 * - a full pill (plus the role), when zoomed in.
 * Waiting on you gets an amber edge. Tags stay hidden until placed, and never block a drag.
 */
export function OfficeTagLayer({
  layout,
  registry,
}: {
  layout: LayoutFile;
  registry: TagRegistry;
}) {
  const { team, seats } = useOfficeTeam(layout);
  const queue = useStore((state) => state.data?.queue ?? NO_QUEUE);
  const selected = useSelectedSeat();
  // Navy is lost on the navy night scene, so the selection outline is light blue at night.
  const night = useStore((state) => state.light === "night");
  const selectedOutline = `2px solid ${night ? color.blueLight : color.navy}`;
  const waitingOutline = `2px solid ${color.statusWaiting}`;
  const tags = useMemo(
    () => (team ? tagsFor(seats, team.members, waitsFor(seats, queue)) : []),
    [seats, team, queue],
  );

  return (
    <div
      data-testid="office-tags"
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
    >
      {tags.map(({ id, waitsOnYou, ...tag }) => {
        const outline = id === selected ? selectedOutline : waitsOnYou ? waitingOutline : "none";
        return (
          <div
            key={id}
            data-testid={`office-tag-${id}`}
            data-selected={id === selected}
            // A key tag keeps its name at the Overview.
            data-key={waitsOnYou || id === selected ? "1" : "0"}
            ref={(el) => {
              if (el) registry.set(id, el);
              else registry.delete(id);
            }}
            className="invisible absolute top-0 left-0 whitespace-nowrap will-change-transform"
          >
            <div
              data-form="chip"
              className="inline-flex items-center gap-1 rounded-pill border border-hairline bg-white px-1.5 py-1"
              style={{ display: "flex", outline, outlineOffset: 1 }}
              title={`${tag.name}, ${statusTokens[tag.status].label}`}
            >
              <TrackBadge id={tag.track} size={12} />
              <StatusDot id={tag.status} size={8} />
              <span className="sr-only">
                {tag.name}, {trackTokens[tag.track].label}, {statusTokens[tag.status].label}
              </span>
            </div>
            {[true, false].map((compact) => (
              <div
                key={String(compact)}
                data-form={compact ? "compact" : "full"}
                className="rounded-pill"
                style={{ display: "none", outline, outlineOffset: 1 }}
              >
                <NameTag {...tag} compact={compact} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
