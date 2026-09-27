import { useMaterial } from "../materials";
import type { Part } from "./parts";

type Props = {
  part: Part;
  castShadow?: boolean;
  /** Glow strength by day and at night, for screens. */
  glow?: { day: number; night: number };
};

/** One furniture part from parts.ts as a single mesh, for the Lab diorama. */
export function PartMesh({ part, castShadow = false, glow }: Props) {
  const material = useMaterial(part.color, glow ? { roughness: 0.8, glow } : undefined);
  return (
    <mesh material={material} position={part.pos} castShadow={castShadow} receiveShadow>
      <boxGeometry args={part.size} />
    </mesh>
  );
}
