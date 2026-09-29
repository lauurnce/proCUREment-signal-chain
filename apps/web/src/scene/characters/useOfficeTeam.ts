import type { LayoutFile, Seat } from "@hq/shared";
import { useMemo } from "react";
import { useStore } from "../../state/store";
import { type Team, teamFor } from "./team";

const NO_SEATS: Seat[] = [];

/**
 * The helpers at their desks, from the live seats (/api/state and the live events).
 * Rebuilds only when who sits where, or how they look, changes. A status event never rebuilds
 * the crowd: the helper walks to its new goal instead (behavior.ts).
 */
export function useOfficeTeam(layout: LayoutFile): { team: Team | null; seats: Seat[] } {
  const seats = useStore((state) => state.data?.seats ?? null);
  const key = JSON.stringify(seats?.map((s) => [s.id, s.track, s.avatarSeed]) ?? null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the key stands for the seats we draw.
  const team = useMemo(() => (seats ? teamFor(seats, layout) : null), [key, layout]);
  return { team, seats: seats ?? NO_SEATS };
}
