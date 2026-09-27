import type { Accessory, LayoutFile } from "@hq/shared";
import { ContactShadows } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  Color,
  type DirectionalLight,
  type Group,
  type HemisphereLight,
  type Mesh,
  type MeshBasicMaterial,
  type PointLight,
} from "three";
import type { Light } from "../../state/store";
import { world, worldLight } from "../../theme/tokens";
import {
  colorThroughDusk,
  type NightMix,
  nightHalf,
  smooth,
  stepToward,
  throughDusk,
} from "./blend";

/** Key light direction from look A, Soft daylight (D-034): high, from the front right of the view. */
const KEY_DIRECTION: [number, number, number] = [2, 10, 7];
const KEY_DISTANCE = 30;
/** Landmarks that get a warm lamp at night. No more than 4 real point lights (skill). */
const LAMP_SPOTS = ["needs-you-tray", "review-board", "handoff-bridge", "coffee-cart"];
const LAMP_HEIGHT = 1.6;
/** Contact shadows sit just above the rugs (0.006 m) and the bridge seam. */
const CONTACT_Y = 0.009;

const c = (hex: string) => new Color(hex);
const PALETTE = {
  backdrop: [c(world.backdropDay), c(world.backdropDusk), c(world.backdropNight)],
  sky: [c(world.skyLight), c(world.skyLightDusk), c(world.skyLightNight)],
  ground: [c(world.groundLight), c(world.groundLightDusk), c(world.groundLightNight)],
  key: [c(world.keyLight), c(world.keyLightDusk), c(world.keyLightNight)],
} as const;

/**
 * Look A by day, the navy night with a cool moon and warm lamps, and a blend between them
 * through a short dusk, about 1.2 s. One key light casts the shadows. Soft contact shadows
 * render once (the world does not move yet), and again when the floor plan or the props
 * change: drei draws them again on every re-render, with no blink.
 * Writes the blend to `mix`, so materials can follow it. Refs only, no React state per frame.
 */
export function OfficeLights({
  layout,
  light,
  mix,
  props,
}: {
  layout: LayoutFile;
  light: Light;
  mix: NightMix;
  /** The props, so a live edit of accessories.json draws the contact shadows again. */
  props: Accessory[];
}) {
  const scene = useThree((state) => state.scene);
  const hemi = useRef<HemisphereLight>(null);
  const key = useRef<DirectionalLight>(null);
  const lamps = useRef<(PointLight | null)[]>([]);
  const contact = useRef<Group>(null);
  // The linear progress; mix.value is its smoothed form.
  const progress = useRef(mix.value);
  const backdrop = useMemo(() => new Color(), []);

  const { width, depth } = layout.floor;
  const cx = width / 2;
  const cz = depth / 2;
  const [dx, dy, dz] = KEY_DIRECTION;
  const scale = KEY_DISTANCE / Math.hypot(dx, dy, dz);
  // Half the floor diagonal, plus room for tall things near the edges.
  const half = Math.hypot(width, depth) / 2 + 1;
  const lampSpots = LAMP_SPOTS.flatMap((id) => {
    const landmark = layout.landmarks.find((l) => l.id === id);
    return landmark ? [landmark.pos] : [];
  });

  useFrame((_, delta) => {
    progress.current = stepToward(progress.current, light === "night" ? 1 : 0, delta * 1000);
    const m = smooth(progress.current);
    mix.value = m;
    const late = nightHalf(m);

    if (!(scene.background instanceof Color)) scene.background = backdrop;
    colorThroughDusk(scene.background, ...PALETTE.backdrop, m);

    const h = hemi.current;
    if (h) {
      colorThroughDusk(h.color, ...PALETTE.sky, m);
      colorThroughDusk(h.groundColor, ...PALETTE.ground, m);
      h.intensity = throughDusk(worldLight.skyDay, worldLight.skyDusk, worldLight.skyNight, m);
    }
    const k = key.current;
    if (k) {
      colorThroughDusk(k.color, ...PALETTE.key, m);
      k.intensity = throughDusk(worldLight.keyDay, worldLight.keyDusk, worldLight.keyNight, m);
    }
    for (const lamp of lamps.current) {
      if (lamp) lamp.intensity = worldLight.lamp.intensity * late;
    }
    const shadow = contact.current?.children[0] as Mesh<never, MeshBasicMaterial> | undefined;
    if (shadow) {
      const { day, night } = worldLight.contactShadowOpacity;
      shadow.material.opacity = day + (night - day) * m;
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={[world.skyLight, world.groundLight, worldLight.skyDay]} />
      <directionalLight
        ref={key}
        color={world.keyLight}
        intensity={worldLight.keyDay}
        position={[cx + dx * scale, dy * scale, cz + dz * scale]}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-radius={4}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-half}
        shadow-camera-right={half}
        shadow-camera-top={half}
        shadow-camera-bottom={-half}
        shadow-camera-near={1}
        shadow-camera-far={KEY_DISTANCE * 2}
      >
        <object3D attach="target" position={[cx, 0, cz]} />
      </directionalLight>
      {/* Always mounted, off by day, so turning them on never rebuilds the shaders. */}
      {lampSpots.map(([x, z], i) => (
        <pointLight
          key={`${x}-${z}`}
          ref={(el) => {
            lamps.current[i] = el;
          }}
          position={[x, LAMP_HEIGHT, z]}
          color={world.lampLight}
          intensity={0}
          distance={worldLight.lamp.distance}
          decay={worldLight.lamp.decay}
        />
      ))}
      <ContactShadows
        // This component re-renders when the layout or the props change, and drei then draws
        // the shadows again. The name only makes that link easy to see.
        name={`contact-shadows-${props.length}`}
        ref={contact}
        position={[cx, CONTACT_Y, cz]}
        scale={[width, depth]}
        resolution={2048}
        far={2.5}
        blur={2}
        frames={1}
        color={world.contactShadow}
        opacity={worldLight.contactShadowOpacity.day}
      />
    </>
  );
}
