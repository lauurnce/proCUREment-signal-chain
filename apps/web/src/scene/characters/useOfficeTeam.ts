import type { LayoutFile, Seat } from "@hq/shared";
import { useMemo } from "react";
import { useStore } from "../../state/store";
import { type Team, teamFor } from "./team";

const NO_SEATS: Seat[] = [];

/**
 * The helpers at their desks, from the live seats (/api/state and the live events).
 * Rebuilds only when something the 3D office draws changes, so a status event does not
 * rebuild the crowd unless a helper starts or stops working.
 */
export function useOfficeTeam(layout: LayoutFile): { team: Team | null; seats: Seat[] } {
  const seats = useStore((state) => state.data?.seats ?? null);
  const key = JSON.stringify(
    seats?.map((s) => [s.id, s.track, s.avatarSeed, s.status === "working"]) ?? null,
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: the key stands for the seats we draw.
  const team = useMemo(() => (seats ? teamFor(seats, layout) : null), [key, layout]);
  return { team, seats: seats ?? NO_SEATS };
}
