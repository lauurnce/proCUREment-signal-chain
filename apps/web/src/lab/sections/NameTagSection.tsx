import type { SeatStatus, Track } from "@hq/shared";
import { typeStyle } from "../../theme/style";
import { world } from "../../theme/tokens";
import { NameTag } from "../../ui/NameTag";

type Tag = { track: Track; name: string; role: string; status: SeatStatus };

const DAY: Tag[] = [
  { track: "MGR", name: "Sr. Manager helper", role: "Sr. Manager", status: "working" },
  { track: "LEAD", name: "Lead 01 helper", role: "Lead", status: "in-meeting" },
  { track: "CM", name: "CM 03 helper", role: "Quote table", status: "waiting-on-you" },
  { track: "OPS", name: "Ops 07 helper", role: "Ops buyer", status: "on-break" },
];
const NIGHT: Tag[] = [
  ...DAY,
  { track: "CM", name: "CM 05 helper", role: "Category manager", status: "off-duty" },
];

const BACKDROPS = [
  { label: "Day, over the oak floor", bg: world.floorWood, tags: DAY },
  { label: "Night, over the navy backdrop", bg: world.backdropNight, tags: NIGHT },
];

export function NameTagSection() {
  return (
    <div className="flex flex-col gap-4">
      {BACKDROPS.map((b) => (
        <div key={b.label} className="flex flex-col gap-2">
          <span style={typeStyle("label", "inkMuted")}>{b.label}</span>
          <div className="flex flex-wrap gap-3 rounded-card p-6" style={{ background: b.bg }}>
            {b.tags.map((t) => (
              <NameTag key={t.name} {...t} />
            ))}
          </div>
        </div>
      ))}
      <p className="m-0" style={typeStyle("small")}>
        The pill is always white, so status colors keep their contrast by day and at night. Break
        and off duty are both rings, so an off-duty tag also says Off duty. Only a few tags show at
        once in the office (tag budget, D-025).
      </p>
    </div>
  );
}
