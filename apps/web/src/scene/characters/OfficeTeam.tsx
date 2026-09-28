import type { LayoutFile } from "@hq/shared";
import { useEffect, useMemo } from "react";
import { ALWAYS_LABELED } from "../labels/fade";
import { labelPoint } from "../layout/boxes";
import type { TagRegistry } from "../tags/TagProjector";
import { Crowd } from "./Crowd";
import { OfficeTagProjector } from "./OfficeTagProjector";
import type { Vec3 } from "./recipe";
import { SeatPicker } from "./SeatPicker";
import { SeatTestHook } from "./SeatTestHook";
import { setSeatSpots } from "./selection";
import { tagAnchors } from "./tags";
import { useOfficeTeam } from "./useOfficeTeam";

const params = new URLSearchParams(window.location.search);
/** ?shots=1 poses every helper at the same moment, so screenshots match run to run. */
const isShots = params.has("shots");
const SHOTS_TIME = isShots ? 1.6 : null;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * All 26 helpers at their desks, drawn as one crowd, with their click areas and the placement
 * of their name tags (the tags themselves are OfficeTagLayer, in the page).
 */
export function OfficeTeam({ layout, tags }: { layout: LayoutFile; tags: TagRegistry }) {
  const { team } = useOfficeTeam(layout);
  const still = useMemo(reducedMotion, []);
  const anchors = useMemo(() => (team ? tagAnchors(team.members) : []), [team]);
  const keepClear = useMemo(
    () =>
      layout.zones
        .filter((zone) => ALWAYS_LABELED.includes(zone.id))
        .map((zone) => ({ id: zone.id, at: labelPoint(zone) })),
    [layout],
  );

  useEffect(() => {
    if (!team) return;
    if (team.missing.length) {
      console.warn(`No desk in office/layout.json for: ${team.missing.join(", ")}`);
    }
    setSeatSpots(new Map(team.members.map((m) => [m.id, m.position as Vec3])));
  }, [team]);

  if (!team) return null;
  return (
    <>
      <Crowd members={team.members} frozenAt={SHOTS_TIME} still={still} />
      <SeatPicker members={team.members} />
      <OfficeTagProjector anchors={anchors} registry={tags} keepClear={keepClear} />
      {isShots && <SeatTestHook />}
    </>
  );
}
