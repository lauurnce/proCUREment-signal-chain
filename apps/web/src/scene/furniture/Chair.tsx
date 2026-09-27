import { PartMesh } from "./PartMesh";
import { CHAIR_PARTS, type Part } from "./parts";

export { SEAT_HEIGHT } from "./parts";

/** The two base bars share a center, so the size is part of the key. */
const keyOf = (part: Part) => `${part.pos.join()}|${part.size.join()}`;

/** Office chair. The origin is the seat center on the floor, the sitter faces +z. Same recipe as the office chairs (parts.ts). */
export function Chair() {
  return (
    <group>
      {CHAIR_PARTS.cast.map((part) => (
        <PartMesh key={keyOf(part)} part={part} castShadow />
      ))}
      {CHAIR_PARTS.plain.map((part) => (
        <PartMesh key={keyOf(part)} part={part} />
      ))}
    </group>
  );
}
