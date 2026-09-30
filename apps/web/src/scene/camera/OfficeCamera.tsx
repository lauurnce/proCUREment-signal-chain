import type { LayoutFile } from "@hq/shared";
import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { type RefObject, useEffect, useRef } from "react";
import { Box3, Vector3 } from "three";
import { dockedPanelInset, floatingOverlayRects } from "../../state/overlays";
import { useStore, type ViewId } from "../../state/store";
import { motion, world } from "../../theme/tokens";
import { useSelection } from "../characters/selection";
import { frameSeat } from "../characters/tags";
import { exitWalkMode, isWalking, useWalk, walker } from "../characters/walk";
import { ISO_AZIMUTH, ISO_POLAR } from "../constants";
import {
  type Framing,
  framePreset,
  MAX_ZOOM,
  PRESETS,
  type Preset,
  presetById,
  zoomLimits,
} from "./presets";
import { easingFromCss, mixFraming } from "./tween";

const { ACTION } = CameraControlsImpl;
/** Pan stays over the floor plus this margin, in meters. */
const PAN_MARGIN = 2;
/** Walk around mode frames you this much closer than the Overview. */
const WALK_ZOOM = 2.4;
/**
 * The follow camera aims at the avatar's chest (0.8 m up), moved down the view line to the
 * floor: on a true isometric view, (x, 0.8, z) and (x - 0.8, 0, z - 0.8) are the same pixel.
 */
const CHEST = 0.8;
/** How quickly the follow camera catches up, per second. Higher is tighter. */
const FOLLOW = 5;

const walkFraming = (overviewZoom: number): Framing => ({
  target: [walker.x - CHEST, 0, walker.z - CHEST],
  zoom: Math.min(MAX_ZOOM, overviewZoom * WALK_ZOOM),
});
const easeMove = easingFromCss(motion.easing.move);
/** For a move that takes over from another one: it starts fast, so there is no stop. */
const easeTakeOver = easingFromCss(motion.easing.enter);

/** A camera move in progress. `elapsed` adds up frame times, in ms. */
type Tween = {
  /** The view it moves to, or null for a move to a selected helper. */
  view: ViewId | null;
  from: Framing;
  to: Framing;
  elapsed: number;
  ease: (t: number) => number;
};

/**
 * The free space for framing: left of the docked HQ panel (a right inset), and around the
 * floating overlays (the stats HUD, view card, Walk pill and note).
 */
function around(size: { width: number }) {
  return { rightInset: dockedPanelInset(size.width), obstacles: floatingOverlayRects() };
}

/** Frames a view in the free space around the page overlays. */
function frame(view: ViewId, layout: LayoutFile, size: { width: number; height: number }) {
  return framePreset(presetById(view), layout, size, around(size));
}

/**
 * Where the camera target may pan: the floor plus a margin, grown to hold every preset's
 * framed target. With the panel docked, the target (the screen center) sits right of the
 * floor, and a tighter box would clamp it and throw the picture off.
 */
function panBoundary(layout: LayoutFile, size: { width: number; height: number }): Box3 {
  const box = new Box3(
    new Vector3(-PAN_MARGIN, 0, -PAN_MARGIN),
    new Vector3(layout.floor.width + PAN_MARGIN, 3, layout.floor.depth + PAN_MARGIN),
  );
  for (const preset of PRESETS) {
    const [x, , z] = framePreset(preset, layout, size, around(size)).target;
    box.expandByPoint(new Vector3(x + PAN_MARGIN, 0, z + PAN_MARGIN));
    box.expandByPoint(new Vector3(x - PAN_MARGIN, 0, z - PAN_MARGIN));
  }
  return box;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The office camera: fixed isometric angle, drag to pan, wheel to zoom toward the cursor.
 * - Opens on the view from the store (?view=), once the floor plan arrives.
 * - A new view request eases there in 800 ms with the move easing. A drag stops the move.
 *   A request for the view it is already moving to is ignored. A different view that
 *   interrupts a move takes over with the enter easing, so the camera never stops dead.
 * - With reduced motion, it fades to the backdrop, cuts, and fades back (140 ms each way).
 *   A drag during the fade cancels the cut.
 * - Every view is framed around the page overlays, so nothing important hides under them.
 * - A window resize keeps the user's pan and zoom (D-047). Only until the user first moves the
 *   camera does a resize refit the view, because the canvas can get its real size after the
 *   first framing.
 * - A new server snapshot or a live layout edit never moves the camera.
 * Everything per frame goes through refs, never React state.
 */
export function OfficeCamera({
  layout,
  fade,
}: {
  layout: LayoutFile;
  /** A full-size element over the canvas, used for the reduced-motion fade. */
  fade: RefObject<HTMLDivElement | null>;
}) {
  const controls = useRef<CameraControlsImpl>(null);
  const size = useThree((state) => state.size);
  const camera = useThree((state) => state.camera);
  const view = useStore((state) => state.view);
  const viewRequest = useStore((state) => state.viewRequest);
  const focus = useSelection((state) => state.focus);
  const walking = useWalk((state) => state.active);
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const framed = useRef(false);
  /** The last view request acted on. */
  const handled = useRef(-1);
  const userMoved = useRef(false);
  const tween = useRef<Tween | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Zoom limits follow the window size, so the whole floor always fits at the widest.
  useEffect(() => {
    const cc = controls.current;
    if (!cc) return;
    const overview = framePreset(PRESETS[0] as Preset, layout, size, around(size));
    const limits = zoomLimits(overview.zoom);
    cc.minZoom = limits.min;
    cc.maxZoom = limits.max;
    // Labels fade in relative to the overview zoom (scene/labels).
    camera.userData.overviewZoom = overview.zoom;
    cc.setBoundary(panBoundary(layout, size));
  }, [layout, size, camera]);

  // A drag or a wheel turn by the user stops any move in progress.
  useEffect(() => {
    const cc = controls.current;
    if (!cc) return;
    const stop = () => {
      tween.current = null;
      userMoved.current = true;
      // A drag during the reduced-motion fade wins: no cut under the user's hand.
      if (fadeTimer.current !== undefined) {
        clearTimeout(fadeTimer.current);
        fadeTimer.current = undefined;
        if (fade.current) fade.current.style.opacity = "0";
      }
    };
    cc.addEventListener("controlstart", stop);
    return () => cc.removeEventListener("controlstart", stop);
  }, [fade]);

  useEffect(() => () => clearTimeout(fadeTimer.current), []);

  // First framing: cut straight to the view. Later requests move there.
  // biome-ignore lint/correctness/useExhaustiveDependencies: viewRequest is the trigger, even for the same view.
  useEffect(() => {
    const cc = controls.current;
    if (!cc) return;
    // Only a new request moves the camera. A second run for the same request (React runs
    // effects twice in dev) would start a move from the default zoom, before the cut lands.
    if (framed.current && handled.current === viewRequest) return;
    handled.current = viewRequest;
    // Already on the way there: keep going.
    if (framed.current && tween.current?.view === view) return;
    const to = frame(view, layoutRef.current, sizeRef.current);
    if (!framed.current) {
      framed.current = true;
      cc.rotateTo(ISO_AZIMUTH, ISO_POLAR, false);
      jump(cc, to);
      return;
    }
    // A view key leaves Walk around mode.
    if (isWalking()) exitWalkMode();
    moveTo(cc, to, view);
  }, [view, viewRequest, camera]);

  // A selected helper (a click, or selectSeat from the panel): ease to their desk.
  // In Walk around mode the camera stays with you.
  // biome-ignore lint/correctness/useExhaustiveDependencies: moveTo reads only refs and the camera. A new focus request is the trigger.
  useEffect(() => {
    const cc = controls.current;
    if (!cc || !focus || !framed.current || isWalking()) return;
    userMoved.current = true;
    moveTo(cc, frameSeat(focus.point, sizeRef.current, around(sizeRef.current)), null);
  }, [focus]);

  // Walk around mode: ease in close to the avatar, then follow it (useFrame below).
  // biome-ignore lint/correctness/useExhaustiveDependencies: moveTo reads only refs and the camera.
  useEffect(() => {
    const cc = controls.current;
    if (!cc || !walking || !framed.current) return;
    userMoved.current = true;
    moveTo(cc, walkFraming(camera.userData.overviewZoom ?? cc.minZoom), null);
  }, [walking]);

  function jump(cc: CameraControlsImpl, framing: Framing) {
    tween.current = null;
    cc.setTarget(...framing.target, false);
    cc.zoomTo(framing.zoom, false);
  }

  /** Eases to a framing, or with reduced motion fades, cuts and fades back. */
  function moveTo(cc: CameraControlsImpl, to: Framing, toView: ViewId | null) {
    if (prefersReducedMotion()) {
      const el = fade.current;
      if (!el) return jump(cc, to);
      el.style.background =
        useStore.getState().light === "night" ? world.backdropNight : world.backdropDay;
      el.style.transition = `opacity ${motion.duration.fast}ms linear`;
      el.style.opacity = "1";
      clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => {
        fadeTimer.current = undefined;
        jump(cc, to);
        el.style.opacity = "0";
      }, motion.duration.fast);
      return;
    }
    const target = new Vector3();
    cc.getTarget(target);
    tween.current = {
      view: toView,
      from: { target: [target.x, target.y, target.z], zoom: camera.zoom },
      to,
      elapsed: 0,
      ease: tween.current ? easeTakeOver : easeMove,
    };
  }

  // Until the user moves the camera, keep the view fitted to the canvas size.
  useEffect(() => {
    const cc = controls.current;
    if (!cc || !framed.current || userMoved.current || tween.current) return;
    const framing = frame(useStore.getState().view, layout, size);
    cc.setTarget(...framing.target, false);
    cc.zoomTo(framing.zoom, false);
  }, [size, layout]);

  const follow = useRef(new Vector3());
  useFrame((_, delta) => {
    const move = tween.current;
    const cc = controls.current;
    if (!cc) return;
    if (!move) {
      if (!isWalking()) return;
      // Follow the avatar with a soft lag, the same on any frame rate.
      const k = 1 - Math.exp(-FOLLOW * Math.min(delta, 0.05));
      const t = cc.getTarget(follow.current);
      cc.setTarget(
        t.x + (walker.x - CHEST - t.x) * k,
        0,
        t.z + (walker.z - CHEST - t.z) * k,
        false,
      );
      return;
    }
    // Cap one frame at 1/20 s, so a stall (like a tab switch) does not end the move in one jump.
    move.elapsed += Math.min(delta, 0.05) * 1000;
    const t = Math.min(1, move.elapsed / motion.duration.camera);
    const { target, zoom } = mixFraming(move.from, move.to, move.ease(t));
    cc.setTarget(...target, false);
    cc.zoomTo(zoom, false);
    if (t >= 1) tween.current = null;
  });

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minPolarAngle={ISO_POLAR}
      maxPolarAngle={ISO_POLAR}
      minAzimuthAngle={ISO_AZIMUTH}
      maxAzimuthAngle={ISO_AZIMUTH}
      dollyToCursor
      // In Walk around mode a click walks, so drags do not pan. The wheel still zooms.
      mouseButtons={{
        left: walking ? ACTION.NONE : ACTION.TRUCK,
        middle: ACTION.NONE,
        right: walking ? ACTION.NONE : ACTION.TRUCK,
        wheel: ACTION.ZOOM,
      }}
      touches={{
        one: walking ? ACTION.NONE : ACTION.TOUCH_TRUCK,
        two: ACTION.TOUCH_ZOOM,
        three: ACTION.NONE,
      }}
    />
  );
}
