import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { ISO_AZIMUTH, ISO_POLAR } from "../../scene/constants";
import { SLAB } from "../../scene/world/diorama";

const { ACTION } = CameraControlsImpl;
const TARGET: [number, number, number] = [SLAB.width / 2 - 0.2, 0.7, SLAB.depth / 2 - 0.2];
const ZOOM = { min: 40, max: 260 } as const;

/** Fits the whole diorama, with room for the name tags and the toggle. */
function fitZoom(width: number, height: number) {
  const isoWidth = (SLAB.width + SLAB.depth) * Math.SQRT1_2;
  return Math.min(Math.max(Math.min(width / (isoWidth * 1.7), height / 5.4), ZOOM.min), ZOOM.max);
}

/** The same fixed isometric angle as the office. Drag to pan, wheel to zoom. */
export function DioramaCamera() {
  const controls = useRef<CameraControlsImpl>(null);
  const size = useThree((state) => state.size);

  useEffect(() => {
    const cc = controls.current;
    if (!cc) return;
    cc.setTarget(...TARGET, false);
    cc.rotateTo(ISO_AZIMUTH, ISO_POLAR, false);
    cc.zoomTo(fitZoom(size.width, size.height), false);
  }, [size.width, size.height]);

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minPolarAngle={ISO_POLAR}
      maxPolarAngle={ISO_POLAR}
      minAzimuthAngle={ISO_AZIMUTH}
      maxAzimuthAngle={ISO_AZIMUTH}
      minZoom={ZOOM.min}
      maxZoom={ZOOM.max}
      dollyToCursor
      mouseButtons={{
        left: ACTION.TRUCK,
        middle: ACTION.NONE,
        right: ACTION.TRUCK,
        wheel: ACTION.ZOOM,
      }}
      touches={{ one: ACTION.TOUCH_TRUCK, two: ACTION.TOUCH_ZOOM, three: ACTION.NONE }}
    />
  );
}
