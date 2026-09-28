import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { Vector3 } from "three";
import { onSeatSelected, type SeatSelected, selectSeat, useSelection } from "./selection";

/** What Playwright can reach in ?shots=1 mode. */
type SeatTestApi = {
  /** Where a seated helper's chest is on screen, in CSS pixels from the canvas top left. */
  seatPoint: (seatId: string) => { x: number; y: number } | null;
  selectSeat: typeof selectSeat;
  /** Every selection event since the page loaded. */
  events: SeatSelected[];
};

declare global {
  interface Window {
    __HQ_SEATS__?: SeatTestApi;
  }
}

/** Shares seat positions and the selection API with Playwright. Mounted with ?shots=1 only. */
export function SeatTestHook() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  useEffect(() => {
    const events: SeatSelected[] = [];
    const stop = onSeatSelected((event) => events.push(event));
    window.__HQ_SEATS__ = {
      seatPoint: (seatId) => {
        const spot = useSelection.getState().seats.get(seatId);
        if (!spot) return null;
        const p = new Vector3(spot[0], 0.9, spot[2]).project(camera);
        return { x: ((p.x + 1) / 2) * size.width, y: ((1 - p.y) / 2) * size.height };
      },
      selectSeat,
      events,
    };
    return () => {
      stop();
      window.__HQ_SEATS__ = undefined;
    };
  }, [camera, size]);

  return null;
}
