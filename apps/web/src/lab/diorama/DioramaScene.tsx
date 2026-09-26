import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import { NeutralToneMapping } from "three";
import { Character } from "../../scene/characters/Character";
import { CAMERA_DISTANCE } from "../../scene/constants";
import { DeskPod, podSeats } from "../../scene/furniture/DeskPod";
import { Plant } from "../../scene/furniture/Plant";
import { SurfaceContext } from "../../scene/materials";
import { ReadySignal } from "../../scene/ReadySignal";
import { type TagAnchor, TagProjector, type TagRegistry } from "../../scene/tags/TagProjector";
import { DioramaSlab } from "../../scene/world/DioramaSlab";
import { SunStripes } from "../../scene/world/SunStripes";
import { DioramaCamera } from "./DioramaCamera";
import { DioramaLights } from "./DioramaLights";
import { HELPERS } from "./helpers";
import type { Lighting } from "./looks";

const POD_CENTER: [number, number] = [3.2, 2.6];
const SEATS = podSeats(POD_CENTER);
const TAG_HEIGHT = 2.05;

const ANCHORS: TagAnchor[] = HELPERS.flatMap((h, i) => {
  const seat = SEATS[i];
  if (!seat) return [];
  const [x, , z] = seat.position;
  return [{ id: h.id, position: [x, TAG_HEIGHT, z] }];
});

type Props = {
  lighting: Lighting;
  night: boolean;
  frozenAt: number | null;
  still: boolean;
  tags: TagRegistry;
  /** Width in px covered by a docked panel on the right. */
  rightInset?: number;
};

export function DioramaScene({ lighting, night, frozenAt, still, tags, rightInset }: Props) {
  const surface = useMemo(
    () => ({ roughnessBoost: lighting.roughnessBoost, night }),
    [lighting.roughnessBoost, night],
  );

  return (
    <Canvas
      data-testid="diorama-canvas"
      orthographic
      shadows="percentage"
      dpr={[1, 2]}
      gl={{ toneMapping: NeutralToneMapping }}
      camera={{
        position: [CAMERA_DISTANCE, CAMERA_DISTANCE, CAMERA_DISTANCE],
        zoom: 100,
        near: 0.1,
        far: 500,
      }}
    >
      <color attach="background" args={[lighting.backdrop]} />
      <SurfaceContext.Provider value={surface}>
        <DioramaLights lighting={lighting} />
        <DioramaSlab />
        {lighting.sunStripes && <SunStripes />}
        <DeskPod center={POD_CENTER} lampsOn={lighting.lamps} />
        <group position={[0.55, 0, 0.55]}>
          <Plant />
        </group>
        {HELPERS.map((h, i) => {
          const seat = SEATS[i];
          if (!seat) return null;
          return (
            <group key={h.id} position={seat.position} rotation={[0, seat.rotation, 0]}>
              <Character
                seed={h.id}
                track={h.track}
                activity={h.activity}
                frozenAt={frozenAt}
                still={still}
              />
            </group>
          );
        })}
      </SurfaceContext.Provider>
      <DioramaCamera rightInset={rightInset} />
      <TagProjector anchors={ANCHORS} registry={tags} />
      <ReadySignal />
    </Canvas>
  );
}
