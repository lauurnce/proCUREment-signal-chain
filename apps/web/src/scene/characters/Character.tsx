import type { Track } from "@hq/shared";
import { useMemo } from "react";
import { Crowd } from "./Crowd";
import type { CrowdMember } from "./crowdPlan";
import type { Activity } from "./motion";

type Props = {
  seed: string;
  track: Track;
  activity: Activity;
  /** A fixed time for screenshots. Null means real time. */
  frozenAt: number | null;
  /** Reduced motion: hold still. */
  still: boolean;
};

/**
 * One seated AI helper, for the Lab diorama. It is a crowd of one, so the Lab and the office
 * always draw the same helper from the same recipe (recipe.ts).
 * The origin is the seat center on the floor, and the helper faces +z.
 */
export function Character({ seed, track, activity, frozenAt, still }: Props) {
  const members = useMemo<CrowdMember[]>(
    () => [{ id: seed, seed, track, activity, position: [0, 0, 0], rotation: 0 }],
    [seed, track, activity],
  );
  return <Crowd members={members} frozenAt={frozenAt} still={still} />;
}
