import type { LayoutFile } from "@hq/shared";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { Color, MeshStandardMaterial } from "three";
import { color, world } from "../../theme/tokens";
import { InstancedBoxes } from "../batch/InstancedBoxes";
import {
  deskBoxes,
  rimBoxes,
  slabBoxes,
  tintBoxes,
  wallBoxes,
  windowSpillBoxes,
} from "../layout/boxes";
import { landmarkBoxes } from "../layout/recipes";
import { type NightMix, nightHalf } from "../lighting/blend";
import { useMaterial } from "../materials";
import { Planks } from "./Planks";
import { SignText } from "./SignText";

// Glow by day and at night (WORLD_PALETTE.md, section 2, and the isometric-office skill).
const GLOW = {
  pane: { day: 0, night: 1.2 },
  screen: { day: 0.15, night: 0.8 }, // lifted from 0.45 (council review, 27 Sep 2026)
  seam: { day: 0, night: 0.25 },
  capiz: { day: 0.2, night: 1.4 },
  dash: { day: 0.2, night: 1.0 },
  rim: { day: 0, night: 0.5 }, // a faint mid-blue edge, so the slab reads on the navy backdrop
} as const;
const GLASS_OPACITY = { day: 0.35, night: 0.2 } as const;
/** Warm window light on the floor at night: #FFE2A8 at 12 percent. */
const SPILL_OPACITY = 0.12;

function glowMaterial(hex: string, roughness: number) {
  return new MeshStandardMaterial({ color: hex, emissive: hex, roughness, metalness: 0 });
}

/**
 * The whole office from layout.json: slab, planks, zone rugs, cutaway walls, windows, the
 * 26 desks, and one landmark per zone. Everything is batched by material, so the world costs
 * about 11 draw calls. Windows, screens, glass, the bridge seam, the capiz lamps and the
 * dashboard wall follow the day and night blend in `mix`.
 */
export function OfficeWorld({ layout, mix }: { layout: LayoutFile; mix: NightMix }) {
  const boxes = useMemo(() => {
    const walls = wallBoxes(layout);
    const desks = deskBoxes(layout);
    const tints = tintBoxes(layout);
    const landmarks = landmarkBoxes(layout.landmarks);
    return {
      // Opaque parts that only receive shadows share one batch.
      plain: [
        ...slabBoxes(layout.floor),
        ...tints.filter((b) => b.color !== world.bridgeSeam),
        ...walls.solid,
        ...desks.plain,
        ...landmarks.plain,
      ],
      seam: tints.filter((b) => b.color === world.bridgeSeam),
      rim: rimBoxes(layout.floor),
      spill: windowSpillBoxes(layout),
      cast: [...desks.cast, ...landmarks.cast],
      screens: [...desks.screens, ...landmarks.screen],
      capiz: landmarks.capiz,
      dash: landmarks.dash,
      glass: walls.glass,
      panes: walls.panes,
    };
  }, [layout]);

  // White bases, so the instance colors show as they are.
  const plain = useMaterial(color.white, { roughness: 0.9 });
  const cast = useMaterial(color.white, { roughness: 0.85 });

  // The materials that change with the time of day. This office owns them, so a blend here
  // never touches the Lab. Only numbers and colors change, so no shader is rebuilt.
  const themed = useMemo(() => {
    const glass = new MeshStandardMaterial({
      color: world.glass,
      roughness: 0.2,
      metalness: 0,
      transparent: true,
      opacity: GLASS_OPACITY.day,
      depthWrite: false,
    });
    return {
      pane: glowMaterial(world.windowDay, 0.85),
      screen: glowMaterial(world.screenGlow, 0.8),
      seam: glowMaterial(world.bridgeSeam, 0.9),
      capiz: glowMaterial(world.capizGlow, 0.8),
      dash: glowMaterial(world.dashGlow, 0.8),
      glass,
      rim: new MeshStandardMaterial({
        color: world.slabEdge,
        emissive: world.bridgeSeam,
        emissiveIntensity: 0,
        roughness: 0.85,
        metalness: 0,
      }),
      spill: new MeshStandardMaterial({
        color: world.windowGlow,
        emissive: world.windowGlow,
        emissiveIntensity: 1,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
      paneDay: new Color(world.windowDay),
      paneNight: new Color(world.windowGlow),
    };
  }, []);
  useEffect(
    () => () => {
      const { pane, screen, seam, capiz, dash, glass, rim, spill } = themed;
      for (const m of [pane, screen, seam, capiz, dash, glass, rim, spill]) m.dispose();
    },
    [themed],
  );

  useFrame(() => {
    const m = mix.value;
    const late = nightHalf(m);
    const { pane, screen, seam, capiz, dash, glass, rim, spill, paneDay, paneNight } = themed;
    pane.color.lerpColors(paneDay, paneNight, late);
    pane.emissive.copy(paneNight);
    pane.emissiveIntensity = GLOW.pane.day + (GLOW.pane.night - GLOW.pane.day) * late;
    screen.emissiveIntensity = GLOW.screen.day + (GLOW.screen.night - GLOW.screen.day) * m;
    seam.emissiveIntensity = GLOW.seam.day + (GLOW.seam.night - GLOW.seam.day) * late;
    capiz.emissiveIntensity = GLOW.capiz.day + (GLOW.capiz.night - GLOW.capiz.day) * late;
    dash.emissiveIntensity = GLOW.dash.day + (GLOW.dash.night - GLOW.dash.day) * late;
    rim.emissiveIntensity = GLOW.rim.day + (GLOW.rim.night - GLOW.rim.day) * late;
    spill.opacity = SPILL_OPACITY * late;
    spill.visible = late > 0;
    glass.opacity = GLASS_OPACITY.day + (GLASS_OPACITY.night - GLASS_OPACITY.day) * m;
  });

  return (
    <group name="office-world">
      <Planks width={layout.floor.width} depth={layout.floor.depth} />
      <InstancedBoxes name="plain" boxes={boxes.plain} material={plain} />
      <InstancedBoxes name="cast" boxes={boxes.cast} material={cast} castShadow />
      <InstancedBoxes
        name="seam"
        boxes={boxes.seam}
        material={themed.seam}
        instanceColors={false}
      />
      <InstancedBoxes
        name="screens"
        boxes={boxes.screens}
        material={themed.screen}
        instanceColors={false}
      />
      <InstancedBoxes
        name="panes"
        boxes={boxes.panes}
        material={themed.pane}
        instanceColors={false}
      />
      <InstancedBoxes name="rim" boxes={boxes.rim} material={themed.rim} instanceColors={false} />
      <InstancedBoxes
        name="spill"
        boxes={boxes.spill}
        material={themed.spill}
        instanceColors={false}
        receiveShadow={false}
      />
      <InstancedBoxes
        name="capiz"
        boxes={boxes.capiz}
        material={themed.capiz}
        instanceColors={false}
      />
      <InstancedBoxes
        name="dash"
        boxes={boxes.dash}
        material={themed.dash}
        instanceColors={false}
      />
      {layout.landmarks
        .filter((landmark) => landmark.kind === "name-sign")
        .map((landmark) => (
          <SignText key={landmark.id} landmark={landmark} />
        ))}
      {/* Glass last and without shadows, so the rooms behind it read through. */}
      <InstancedBoxes
        name="glass"
        boxes={boxes.glass}
        material={themed.glass}
        instanceColors={false}
        receiveShadow={false}
      />
    </group>
  );
}
