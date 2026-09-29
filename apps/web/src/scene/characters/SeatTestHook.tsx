import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { Vector3 } from "three";
import { onSeatSelected, type SeatSelected, selectSeat, useSelection } from "./selection";
import type { TeamDrive } from "./teamDrive";
import { enterWalkMode, isWalking, onTalk, talk } from "./walk";

/** What Playwright can reach in ?shots=1 mode. */
type SeatTestApi = {
  /** Where a helper's chest is on screen, in CSS pixels from the canvas top left. */
  seatPoint: (seatId: string) => { x: number; y: number } | null;
  selectSeat: typeof selectSeat;
  /** Every selection event since the page loaded. */
  events: SeatSelected[];
  /** What each helper is doing: its legs and its body activity. */
  motions: () => Record<string, { motion: string; activity: string; visible: boolean }>;
  /** Walk around mode. */
  walk: {
    enter: () => void;
    active: () => boolean;
    /** Where the avatar stands. */
    avatar: () => { x: number; z: number };
    /** Puts the avatar a meter from a helper, facing them. */
    placeNear: (seatId: string) => boolean;
    /** Who E would talk to now. */
    near: () => string | null;
    /** Every talk since the page loaded. */
    talks: string[];
  };
};

declare global {
  interface Window {
    __HQ_SEATS__?: SeatTestApi;
  }
}

/** Shares seat positions, selection and Walk around mode with Playwright. ?shots=1 only. */
export function SeatTestHook({ drive }: { drive: TeamDrive }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  useEffect(() => {
    const events: SeatSelected[] = [];
    const talks: string[] = [];
    const stopSelect = onSeatSelected((event) => events.push(event));
    const stopTalk = onTalk((seatId) => talks.push(seatId));
    window.__HQ_SEATS__ = {
      seatPoint: (seatId) => {
        const spot = useSelection.getState().seats.get(seatId);
        if (!spot) return null;
        const p = new Vector3(spot[0], 0.9, spot[2]).project(camera);
        return { x: ((p.x + 1) / 2) * size.width, y: ((1 - p.y) / 2) * size.height };
      },
      selectSeat,
      events,
      motions: () =>
        Object.fromEntries(
          drive.agents.map((a) => [
            a.id,
            { motion: a.motion, activity: a.poseInput().activity, visible: a.visible },
          ]),
        ),
      walk: {
        enter: enterWalkMode,
        active: isWalking,
        avatar: () => ({ x: drive.avatar.x, z: drive.avatar.z }),
        placeNear: (seatId) => {
          const agent = drive.agents.find((a) => a.id === seatId);
          if (!agent) return false;
          // One meter behind the helper, in the aisle (helpers face their desks), facing them.
          const x = agent.x - Math.sin(agent.heading) * 1.0;
          const z = agent.z - Math.cos(agent.heading) * 1.0;
          drive.avatar.place([x, z], agent.heading);
          return true;
        },
        near: () => talk.near,
        talks,
      },
    };
    return () => {
      stopSelect();
      stopTalk();
      window.__HQ_SEATS__ = undefined;
    };
  }, [camera, size, drive]);

  return null;
}
