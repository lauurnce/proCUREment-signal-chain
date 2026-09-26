import type { Seat } from "@hq/shared";
import { helperName } from "./queue";

/** Who an instruction goes to. The send button always names it (copy deck, section 11). */
export type Audience = { id: string; label: string; group: string; seats: string[] };

const plural = (n: number) => `${n} helper${n === 1 ? "" : "s"}`;

/** Every audience for the "To" picker: one helper, a pod, a wing or row, or everyone. */
export function audiences(seats: Seat[]): Audience[] {
  const helpers = seats.map((s) => ({
    id: `seat:${s.id}`,
    label: helperName(seats, s.id),
    group: "One helper",
    seats: [s.id],
  }));
  const podIds = [...new Set(seats.flatMap((s) => (s.pod ? [s.pod] : [])))].sort();
  const pods = podIds.map((pod) => {
    const members = seats.filter((s) => s.pod === pod).map((s) => s.id);
    const [track = "", letter = ""] = pod.split("-");
    const trackName = track === "cm" ? "CM" : track === "ops" ? "Ops" : track;
    return {
      id: `pod:${pod}`,
      label: `${trackName} pod ${letter.toUpperCase()} (${plural(members.length)})`,
      group: "A pod",
      seats: members,
    };
  });
  const byZone = (zone: string, name: string) => {
    const members = seats.filter((s) => s.zone === zone).map((s) => s.id);
    return {
      id: `zone:${zone}`,
      label: `${name} (${plural(members.length)})`,
      group: "A wing",
      seats: members,
    };
  };
  const wings = [
    byZone("cm-wing", "CM Wing"),
    byZone("ops-wing", "Ops Wing"),
    byZone("leads-row", "Leads' Row"),
  ].filter((a) => a.seats.length > 0);
  const everyone = {
    id: "all",
    label: `everyone (${plural(seats.length)})`,
    group: "Everyone",
    seats: seats.map((s) => s.id),
  };
  return [...helpers, ...pods, ...wings, everyone];
}
