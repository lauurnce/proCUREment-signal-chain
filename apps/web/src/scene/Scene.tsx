import type { Accessory, LayoutFile } from "@hq/shared";
import { AdaptiveDpr } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { lazy, Suspense, useMemo, useRef } from "react";
import { NeutralToneMapping } from "three";
import { useStore } from "../state/store";
import { world } from "../theme/tokens";
import { OfficeCamera } from "./camera/OfficeCamera";
import { OfficeTagLayer } from "./characters/OfficeTagLayer";
import { OfficeTeam } from "./characters/OfficeTeam";
import { TalkHintLayer } from "./characters/TalkHintLayer";
import { CAMERA_DISTANCE, PLACEHOLDER_LAYOUT } from "./constants";
import { RenderInfo } from "./debug/RenderInfo";
import { ALWAYS_LABELED } from "./labels/fade";
import { ZoneLabelLayer } from "./labels/ZoneLabelLayer";
import {
  type LabelRegistry,
  type ZoneLabel,
  ZoneLabelProjector,
} from "./labels/ZoneLabelProjector";
import { labelPoint } from "./layout/boxes";
import type { NightMix } from "./lighting/blend";
import { OfficeLights } from "./lighting/OfficeLights";
import { ReadySignal } from "./ReadySignal";
import type { TagRegistry } from "./tags/TagProjector";
import { OfficeProps } from "./world/OfficeProps";
import { OfficeWorld } from "./world/OfficeWorld";
import { PlaceholderFloor } from "./world/PlaceholderFloor";

const params = new URLSearchParams(window.location.search);
/** ?shots=1 keeps quality fixed so screenshots look the same every run. */
const isShots = params.has("shots");
/** The r3f-perf overlay shows in dev only, never in screenshots. ?perf=0 hides it. */
const showPerf = import.meta.env.DEV && !isShots && params.get("perf") !== "0";

const PerfOverlay = lazy(() =>
  import("./debug/PerfOverlay").then((m) => ({ default: m.PerfOverlay })),
);

/**
 * The office: the canvas plus the zone labels on top. Waits for the first state from the
 * server, so the floor never flashes from a placeholder to the real plan. When layout.json
 * cannot be read, it shows the plain placeholder floor (the warning shows in the badge).
 */
/**
 * The same object for as long as its content is the same. Every server event parses fresh
 * JSON, and a new object would rebuild the whole world for an edit that did not touch it.
 */
function useSameContent<T>(value: T): T {
  const json = JSON.stringify(value);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the JSON text is the identity.
  return useMemo(() => value, [json]);
}

const NO_ACCESSORIES: Accessory[] = [];

export function Scene() {
  const office = useStore((state) => state.data?.office ?? null);
  const light = useStore((state) => state.light);
  const officeLayout = useSameContent(office?.layout ?? null);
  const accessories = useSameContent(office?.accessories ?? NO_ACCESSORIES);
  const layout: LayoutFile | null = office ? (officeLayout ?? PLACEHOLDER_LAYOUT) : null;
  const registry = useMemo<LabelRegistry>(() => new Map(), []);
  const tags = useMemo<TagRegistry>(() => new Map(), []);
  const fade = useRef<HTMLDivElement>(null);
  // The day and night blend, shared by the lights and the glowing materials. Starts where the
  // page opens (?time=night), so there is no blend on load.
  const mix = useMemo<NightMix>(
    () => ({ value: useStore.getState().light === "night" ? 1 : 0 }),
    [],
  );
  const startBackdrop = mix.value === 1 ? world.backdropNight : world.backdropDay;

  const zones = useSameContent(office?.zones ?? null);
  const labels = useMemo<ZoneLabel[]>(() => {
    if (!officeLayout || !zones) return [];
    const names = new Map(zones.map((zone) => [zone.id, zone.name]));
    return officeLayout.zones.map((zone) => ({
      id: zone.id,
      name: names.get(zone.id) ?? zone.id,
      at: labelPoint(zone),
      always: ALWAYS_LABELED.includes(zone.id),
    }));
  }, [officeLayout, zones]);

  return (
    <>
      <Canvas
        data-testid="office-canvas"
        orthographic
        shadows="percentage"
        dpr={[1, 2]}
        gl={{ toneMapping: NeutralToneMapping }}
        camera={{
          position: [CAMERA_DISTANCE, CAMERA_DISTANCE, CAMERA_DISTANCE],
          zoom: 30,
          near: 0.1,
          far: 500,
        }}
      >
        <color attach="background" args={[startBackdrop]} />
        {layout && (
          <>
            <OfficeLights layout={layout} light={light} mix={mix} props={accessories} />
            {officeLayout ? (
              <>
                <OfficeWorld layout={officeLayout} mix={mix} />
                <OfficeProps accessories={accessories} />
                <OfficeTeam layout={officeLayout} accessories={accessories} tags={tags} />
              </>
            ) : (
              <PlaceholderFloor />
            )}
            <OfficeCamera layout={layout} fade={fade} />
            <ZoneLabelProjector labels={labels} registry={registry} />
            <ReadySignal />
          </>
        )}
        {!isShots && <AdaptiveDpr pixelated={false} />}
        {isShots && <RenderInfo />}
        {showPerf && (
          <Suspense fallback={null}>
            <PerfOverlay />
          </Suspense>
        )}
      </Canvas>
      <ZoneLabelLayer labels={labels} registry={registry} />
      {officeLayout && <OfficeTagLayer layout={officeLayout} registry={tags} />}
      {officeLayout && <TalkHintLayer />}
      {/* Covers the view for a moment when reduced motion swaps a camera move for a cut. */}
      <div
        ref={fade}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ opacity: 0 }}
      />
    </>
  );
}
