import { create } from "zustand";
import type { Vec3 } from "./recipe";

/** Who picked the seat: a click in the office, Esc, or a call from code (the panel). */
export type SelectSource = "click" | "keyboard" | "api";
export type SeatSelected = { seatId: string | null; source: SelectSource };

type SelectionState = {
  selected: string | null;
  /** Where each drawn helper sits, by seat id. Set by the office team. */
  seats: ReadonlyMap<string, Vec3>;
  /** The camera eases to `point` each time `request` goes up. */
  focus: { seatId: string; point: Vec3; request: number } | null;
};

/**
 * Selection lives in its own small store, next to the characters, so the scene and the panel
 * can both use it without touching the app store.
 */
export const useSelection = create<SelectionState>()(() => ({
  selected: null,
  seats: new Map(),
  focus: null,
}));

const listeners = new Set<(event: SeatSelected) => void>();

/**
 * Selects a helper and eases the camera to them. `null` clears the selection and leaves the
 * camera where it is. Returns false for a seat that is not in the office.
 */
export function selectSeat(seatId: string | null, source: SelectSource = "api"): boolean {
  const state = useSelection.getState();
  if (seatId === null) {
    if (state.selected === null) return true;
    useSelection.setState({ selected: null });
    for (const listener of listeners) listener({ seatId: null, source });
    return true;
  }
  const point = state.seats.get(seatId);
  if (!point) return false;
  useSelection.setState({
    selected: seatId,
    focus: { seatId, point, request: (state.focus?.request ?? 0) + 1 },
  });
  for (const listener of listeners) listener({ seatId, source });
  return true;
}

/** Calls `listener` on every selection change. Returns a function that stops it. */
export function onSeatSelected(listener: (event: SeatSelected) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The helper under the mouse, or null. Read every frame by the tag projector, so it is a plain
 * value and never causes a render.
 */
export const hover: { seatId: string | null } = { seatId: null };

/** The selected seat id, for React components. */
export const useSelectedSeat = () => useSelection((state) => state.selected);

/**
 * Tells the selection where the helpers sit. A selected seat that is no longer in the office
 * is cleared.
 */
export function setSeatSpots(seats: ReadonlyMap<string, Vec3>): void {
  useSelection.setState({ seats });
  const { selected } = useSelection.getState();
  if (selected && !seats.has(selected)) selectSeat(null, "api");
}
