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

/**
 * The same fixed isometric angle as the office. Drag to pan, wheel to zoom.
 * `rightInset` is the width a docked panel covers. The view shifts so the scene centers in the
 * free space, and the canvas itself never changes size (panel spec, section 1).
 */
export function DioramaCamera({ rightInset = 0 }: { rightInset?: number }) {
  const controls = useRef<CameraControlsImpl>(null);
  const size = useThree((state) => state.size);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    const cc = controls.current;
    if (!cc) return;
    if (rightInset > 0) {
      camera.setViewOffset(size.width, size.height, rightInset / 2, 0, size.width, size.height);
    } else {
      camera.clearViewOffset();
    }
    cc.setTarget(...TARGET, false);
    cc.rotateTo(ISO_AZIMUTH, ISO_POLAR, false);
    cc.zoomTo(fitZoom(size.width - rightInset, size.height), false);
  }, [camera, rightInset, size.width, size.height]);

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
