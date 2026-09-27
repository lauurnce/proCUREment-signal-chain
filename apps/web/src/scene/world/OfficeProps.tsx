import type { Accessory } from "@hq/shared";
import { useMemo } from "react";
import { color } from "../../theme/tokens";
import { InstancedBoxes } from "../batch/InstancedBoxes";
import { propBoxes } from "../layout/recipes";
import { useMaterial } from "../materials";

/**
 * The decorative props from vault/office/accessories.json: plants, the sofa, posters, the truck.
 * Separate from the world, so a live edit of that file rebuilds only these two batches.
 */
export function OfficeProps({ accessories }: { accessories: Accessory[] }) {
  const boxes = useMemo(() => propBoxes(accessories), [accessories]);
  // The same white bases as the world, so the instance colors show as they are.
  const plain = useMaterial(color.white, { roughness: 0.9 });
  const cast = useMaterial(color.white, { roughness: 0.85 });

  return (
    <group name="office-props">
      <InstancedBoxes name="props-plain" boxes={boxes.plain} material={plain} />
      <InstancedBoxes name="props-cast" boxes={boxes.cast} material={cast} castShadow />
    </group>
  );
}
