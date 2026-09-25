import { AdaptiveDpr } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { lazy, Suspense } from "react";
import { world } from "../theme/tokens";
import { IsoCamera } from "./camera/IsoCamera";
import { CAMERA_DISTANCE, FLOOR_CENTER } from "./constants";
import { DayLights } from "./lighting/DayLights";
import { ReadySignal } from "./ReadySignal";
import { PlaceholderFloor } from "./world/PlaceholderFloor";

const params = new URLSearchParams(window.location.search);
/** ?shots=1 keeps quality fixed so screenshots look the same every run. */
const isShots = params.has("shots");
/** ?perf=1 shows a frame rate overlay in dev. */
const showPerf = import.meta.env.DEV && params.has("perf");

const PerfOverlay = lazy(() =>
  import("./debug/PerfOverlay").then((m) => ({ default: m.PerfOverlay })),
);

const [cx, , cz] = FLOOR_CENTER;

export function Scene() {
  return (
    <Canvas
      data-testid="office-canvas"
      orthographic
      shadows="percentage"
      dpr={[1, 2]}
      camera={{
        position: [cx + CAMERA_DISTANCE, CAMERA_DISTANCE, cz + CAMERA_DISTANCE],
        zoom: 30,
        near: 0.1,
        far: 500,
      }}
    >
      <color attach="background" args={[world.backdropDay]} />
      <DayLights />
      <PlaceholderFloor />
      <IsoCamera />
      {!isShots && <AdaptiveDpr pixelated={false} />}
      {showPerf && (
        <Suspense fallback={null}>
          <PerfOverlay />
        </Suspense>
      )}
      <ReadySignal />
    </Canvas>
  );
}
