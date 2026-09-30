import type { Accessory, LayoutFile } from "@hq/shared";
import { useEffect, useMemo, useRef } from "react";
import { useStore } from "../../state/store";
import { connectOffice } from "../../ui/officeLink";
import { labelPoint } from "../layout/boxes";
import type { TagRegistry } from "../tags/TagProjector";
import { Crowd } from "./Crowd";
import { navGridFor } from "./navGrid";
import { OfficeTagProjector } from "./OfficeTagProjector";
import { SeatPicker } from "./SeatPicker";
import { SeatTestHook } from "./SeatTestHook";
import { onSeatSelected, selectSeat, setSeatSpots, useSelection } from "./selection";
import { TeamDrive } from "./teamDrive";
import { useOfficeTeam } from "./useOfficeTeam";
import { leaveWalk, WalkControls } from "./WalkControls";
import { enterWalkMode, onTalk, onWalkChange } from "./walk";

const params = new URLSearchParams(window.location.search);
/** ?shots=1 poses every helper at the same moment, so screenshots match run to run. */
const isShots = params.has("shots");
const SHOTS_TIME = isShots ? 1.6 : null;
/** Screenshots start this many seconds into the day, so some helpers are on their way. */
const SHOTS_DAY = 12;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const NO_WORKFLOWS: never[] = [];
const NO_QUEUE: never[] = [];

/**
 * All 26 helpers, drawn as one crowd, with their click areas and the placement of their name
 * tags (the tags themselves are OfficeTagLayer, in the page). Each helper follows its live
 * status: it types, raises a hand, walks to the zone of its step, or takes a break. The Walk
 * around avatar is one more member of the crowd.
 */
export function OfficeTeam({
  layout,
  accessories,
  tags,
}: {
  layout: LayoutFile;
  accessories: Accessory[];
  tags: TagRegistry;
}) {
  const { team, seats } = useOfficeTeam(layout);
  const workflows = useStore((state) => state.data?.workflows ?? NO_WORKFLOWS);
  const queue = useStore((state) => state.data?.queue ?? NO_QUEUE);
  const still = useMemo(reducedMotion, []);
  const grid = useMemo(() => navGridFor(layout, accessories), [layout, accessories]);
  const keepClear = useMemo(
    () =>
      // Every zone label that shows (hidden ones are skipped each frame), council 30 Sep 2026.
      layout.zones.map((zone) => ({ id: zone.id, at: labelPoint(zone) })),
    [layout],
  );

  // A new team (or a new floor plan) gets a new driver, and everyone starts where they belong.
  const seatsRef = useRef(seats);
  seatsRef.current = seats;
  const workflowsRef = useRef(workflows);
  workflowsRef.current = workflows;
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const drive = useMemo(() => {
    if (!team) return null;
    const d = new TeamDrive(team.members, grid, layout, still);
    d.setGoals(seatsRef.current, workflowsRef.current, layout, grid, true, queueRef.current);
    if (isShots) {
      d.fastForward(SHOTS_DAY);
      d.frozen = true;
    }
    return d;
  }, [team, grid, layout, still]);

  // Later status changes walk the helpers to their new goal.
  const firstSeats = useRef(true);
  useEffect(() => {
    if (!drive) return;
    if (firstSeats.current) {
      firstSeats.current = false;
      return;
    }
    drive.setGoals(seats, workflows, layout, grid, false, queue);
  }, [drive, seats, workflows, layout, grid, queue]);

  useEffect(() => {
    if (!team || !drive) return;
    if (team.missing.length) {
      console.warn(`No desk in office/layout.json for: ${team.missing.join(", ")}`);
    }
    setSeatSpots(drive.spots);
  }, [team, drive]);

  // The helper you talk to glances toward you.
  useEffect(() => (drive ? onTalk((seatId) => drive.greet(seatId)) : undefined), [drive]);

  // Plugs the office into the HQ panel (the office link, P45) while the helpers are drawn.
  const ready = Boolean(team && drive);
  useEffect(() => {
    if (!ready) return;
    return connectOffice({
      selectSeat,
      selectedSeat: () => useSelection.getState().selected,
      onSeatSelected,
      enterWalkMode,
      exitWalkMode: leaveWalk,
      onTalk,
      onWalkChange,
    });
  }, [ready]);

  if (!team || !drive) return null;
  return (
    <>
      <Crowd members={drive.members} frozenAt={SHOTS_TIME} still={still} drive={drive} />
      <SeatPicker members={team.members} drive={drive} />
      <OfficeTagProjector anchors={drive.anchors} registry={tags} keepClear={keepClear} />
      <WalkControls drive={drive} layout={layout} seats={seats} />
      {isShots && <SeatTestHook drive={drive} />}
    </>
  );
}
