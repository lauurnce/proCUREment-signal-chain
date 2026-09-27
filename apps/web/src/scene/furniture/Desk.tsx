import { PartMesh } from "./PartMesh";
import { DESK_PARTS } from "./parts";

export { DESK } from "./parts";

const SCREEN_GLOW = { day: 0.15, night: 0.45 };

/**
 * One desk with a keyboard and a monitor. The origin is the desk center on the floor.
 * The seat side is +z, the monitor sits at the back (-z) and faces the seat.
 * Same recipe as the office desks (parts.ts).
 */
export function Desk() {
  return (
    <group>
      {DESK_PARTS.cast.map((part) => (
        <PartMesh key={part.pos.join()} part={part} castShadow />
      ))}
      {DESK_PARTS.plain.map((part) => (
        <PartMesh key={part.pos.join()} part={part} />
      ))}
      {DESK_PARTS.screen.map((part) => (
        <PartMesh key={part.pos.join()} part={part} glow={SCREEN_GLOW} />
      ))}
    </group>
  );
}
