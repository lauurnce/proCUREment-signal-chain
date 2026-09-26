import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { ISO_AZIMUTH, ISO_POLAR } from "../../scene/constants";
import { SLAB } from "../../scene/world/diorama";
import { motion } from "../../theme/tokens";

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
 * The camera fits the scene once, and again only when the panel space changes. A window resize
 * keeps the user's pan and zoom. The shift eases over the slow motion time (360 ms), never jumps.
 */
export function DioramaCamera({ rightInset = 0 }: { rightInset?: number }) {
  const controls = useRef<CameraControlsImpl>(null);
  const size = useThree((state) => state.size);
  const camera = useThree((state) => state.camera);
  const offset = useRef<number | null>(null);
  const target = rightInset / 2;
  const sizeRef = useRef(size);
  sizeRef.current = size;

  // Fit on first load and whenever the panel space changes. Not on a plain resize.
  useEffect(() => {
    const cc = controls.current;
    if (!cc) return;
    const first = offset.current === null;
    const { width, height } = sizeRef.current;
    if (first) {
      offset.current = rightInset / 2;
      cc.setTarget(...TARGET, false);
      cc.rotateTo(ISO_AZIMUTH, ISO_POLAR, false);
    }
    cc.zoomTo(fitZoom(width - rightInset, height), !first);
  }, [rightInset]);

  // Ease the view offset toward the target, and keep it valid when the window size changes.
  useFrame((_, delta) => {
    const current = offset.current ?? target;
    const time = motion.duration.slow / 1000;
    // About 98 percent of the way in the slow motion time.
    const next = current + (target - current) * Math.min(1, (delta * 4) / time);
    offset.current = Math.abs(target - next) < 0.5 ? target : next;
    if (offset.current === 0) {
      if (camera.view?.enabled) camera.clearViewOffset();
      return;
    }
    const view = camera.view;
    if (
      view?.enabled &&
      view.offsetX === offset.current &&
      view.fullWidth === size.width &&
      view.fullHeight === size.height
    ) {
      return;
    }
    camera.setViewOffset(size.width, size.height, offset.current, 0, size.width, size.height);
  });

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
