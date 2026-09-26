import { ContactShadows } from "@react-three/drei";
import { world } from "../../theme/tokens";
import type { Lighting } from "./looks";

const TARGET: [number, number, number] = [3, 0, 2.5];
const SHADOW_HALF = 6;

/** Sky light, one key light (the only shadow caster), and optional contact shadows. */
export function DioramaLights({ lighting }: { lighting: Lighting }) {
  const { sky, key, contactShadow } = lighting;
  const [tx, ty, tz] = TARGET;
  const [ox, oy, oz] = key.offset;

  return (
    <>
      <hemisphereLight args={[sky.color, sky.ground, sky.intensity]} />
      <directionalLight
        color={key.color}
        intensity={key.intensity}
        position={[tx + ox, ty + oy, tz + oz]}
        castShadow={key.shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-radius={key.shadowRadius}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-SHADOW_HALF}
        shadow-camera-right={SHADOW_HALF}
        shadow-camera-top={SHADOW_HALF}
        shadow-camera-bottom={-SHADOW_HALF}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
      >
        <object3D attach="target" position={TARGET} />
      </directionalLight>
      {contactShadow && (
        <ContactShadows
          position={[tx, 0.006, tz]}
          scale={[6, 5]}
          resolution={1024}
          far={2}
          frames={1}
          color={world.contactShadow}
          opacity={contactShadow.opacity}
          blur={contactShadow.blur}
        />
      )}
    </>
  );
}
