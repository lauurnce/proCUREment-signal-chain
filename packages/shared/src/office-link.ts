/**
 * The contract between the HQ panel and the 3D office (P5.3). The panel calls these, the
 * office scene implements them. Phase 4 built the scene side in `scene/characters/selection.ts`
 * and `scene/characters/walk.ts`, and the P4 and P5 merge plugs it in with `connectOffice`
 * (apps/web/src/ui/officeLink.ts). Types only, so both sides agree without importing each other.
 */

/** Who picked a seat: a click in the office, Esc, or a call from code (the panel). */
export type SeatSelectSource = "click" | "keyboard" | "api";

export type SeatSelected = { seatId: string | null; source: SeatSelectSource };

export type OfficeLink = {
  /**
   * Selects a helper in the office and eases the camera to them. `null` clears the
   * selection. Returns false for a seat that is not drawn in the office.
   */
  selectSeat: (seatId: string | null, source?: SeatSelectSource) => boolean;
  /** The helper selected in the office now, or null. */
  selectedSeat: () => string | null;
  /** Calls `listener` on every selection change. Returns a function that stops it. */
  onSeatSelected: (listener: (event: SeatSelected) => void) => () => void;
  /** Starts Walk around mode (the panel's Walk around pill). */
  enterWalkMode: () => void;
  /** Stops Walk around mode and goes back to the Overview (the pill, or Esc in the panel). */
  exitWalkMode: () => void;
  /** Calls `listener` with true or false whenever Walk around starts or stops. Returns a stop function. */
  onWalkChange: (listener: (walking: boolean) => void) => () => void;
  /** Calls `listener` when you talk to a helper in Walk around mode (E). Returns a stop function. */
  onTalk: (listener: (seatId: string) => void) => () => void;
};
