import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { FLOOR, FLOOR_CENTER, ISO_AZIMUTH, ISO_POLAR, ZOOM } from "../constants";

const { ACTION } = CameraControlsImpl;

/** Zoom that fits the whole placeholder floor with a small margin. */
function overviewZoom(width: number, height: number): number {
  const isoWidth = (FLOOR.width + FLOOR.depth) * Math.SQRT1_2;
  const isoHeight = isoWidth * 0.6;
  const zoom = Math.min(width / (isoWidth * 1.15), height / (isoHeight * 1.25));
  return Math.min(Math.max(zoom, ZOOM.min), ZOOM.max);
}

/** Orthographic isometric camera. Drag to pan, wheel to zoom. The angle is fixed. */
export function IsoCamera() {
  const controls = useRef<CameraControlsImpl>(null);
  const size = useThree((state) => state.size);

  useEffect(() => {
    const cc = controls.current;
    if (!cc) return;
    const [x, y, z] = FLOOR_CENTER;
    cc.setTarget(x, y, z, false);
    cc.rotateTo(ISO_AZIMUTH, ISO_POLAR, false);
    cc.zoomTo(overviewZoom(size.width, size.height), false);
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
