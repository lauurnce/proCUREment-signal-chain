import type { LayoutFile, Seat } from "@hq/shared";
import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { type Mesh, RingGeometry, Vector3 } from "three";
import { useStore } from "../../state/store";
import { color } from "../../theme/tokens";
import { useMaterial } from "../materials";
import { selectSeat } from "./selection";
import { hint } from "./TalkHintLayer";
import type { TeamDrive } from "./teamDrive";
import {
  canSteer,
  enterWalkMode,
  exitWalkMode,
  held,
  isWalking,
  STEER_KEYS,
  talk,
  talkNow,
  toggleWalkMode,
  useWalk,
} from "./walk";

const params = new URLSearchParams(window.location.search);
/** ?walk=1 opens in Walk around mode (screenshots and links). */
const START_WALKING = params.get("walk") === "1";
const DRAG_PX = 5;
const point = new Vector3();
/** The "You" marker's bottom edge, in meters: the standing head top is about 1.9 m. */
const YOU_HEIGHT = 2.0;

/** The ring under your feet: 0.9 m across, so you find yourself in the crowd (council). */
const YOU_RING = new RingGeometry(0.36, 0.45, 40);

const helperName = (seat: Seat) => seat.helper.name ?? `${seat.displayName} helper`;

/**
 * Walk around mode's keys and clicks, inside the canvas:
 * - G starts and stops it (until the panel's Walk around pill takes over at the merge).
 * - WASD or the arrow keys steer, a click on the floor walks there, a click on a helper walks
 *   up to them.
 * - E talks to the helper in reach. Esc goes back to the Overview.
 * It also places the "You" marker and the Talk hint (TalkHintLayer) every frame.
 */
export function WalkControls({
  drive,
  layout,
  seats,
}: {
  drive: TeamDrive;
  layout: LayoutFile;
  seats: Seat[];
}) {
  const active = useWalk((s) => s.active);
  const names = useMemo(() => new Map(seats.map((s) => [s.id, helperName(s)])), [seats]);
  const canvas = useThree((state) => state.gl.domElement);
  const night = useStore((state) => state.light === "night");
  const ringMaterial = useMaterial(night ? color.blueLight : color.accent, { opacity: 0.6 });
  const ring = useRef<Mesh>(null);
  /** The helper last read out, so the live region speaks only when it changes. */
  const spoken = useRef<string | null>(null);

  useEffect(() => {
    if (START_WALKING) enterWalkMode();
  }, []);

  // Each walk starts at the Sr. Manager's door, with nothing selected.
  useEffect(() => {
    if (active) {
      drive.avatar.reset(0);
      selectSeat(null, "api");
      // The keys steer at once, even after a click on the panel's Walk around pill.
      if (canvas.tabIndex < 0) canvas.tabIndex = -1;
      canvas.focus({ preventScroll: true });
    } else {
      held.clear();
    }
  }, [active, drive, canvas]);

  useEffect(() => {
    const onDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (!canSteer(event.target)) return;
      if (event.code === "KeyG" && !event.repeat) {
        toggleWalkMode();
        return;
      }
      if (!isWalking()) return;
      if (event.key === "Escape") {
        // One Esc, one step back: leaving Walk around does not also clear a selection.
        event.preventDefault();
        exitWalkMode();
        useStore.getState().goToView("overview");
        return;
      }
      if (event.code === "KeyE" && !event.repeat) {
        // The panel opens the helper's card (the office link, P45).
        talkNow();
        return;
      }
      if (STEER_KEYS.includes(event.code)) {
        held.add(event.code);
        // Arrow keys would scroll the page.
        event.preventDefault();
      }
    };
    const onUp = (event: KeyboardEvent) => held.delete(event.code);
    const onBlur = () => held.clear();
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // The "You" marker and the Talk hint, placed through the DOM every frame (no React state).
  useFrame(({ camera, size }) => {
    const walking = isWalking();
    const a = drive.avatar;
    hint.boxes.length = 0;
    /** Over the avatar at height `y`. `below` hangs the element under the point instead. */
    const place = (el: HTMLElement | null, y: number, show: boolean, below = false) => {
      if (!el) return;
      if (!show) {
        if (el.style.visibility !== "hidden") el.style.visibility = "hidden";
        return;
      }
      point.set(a.x, y, a.z).project(camera);
      const sx = Math.round(((point.x + 1) / 2) * size.width);
      const sy = Math.round(((1 - point.y) / 2) * size.height);
      el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, ${below ? "8px" : "-100%"})`;
      el.style.visibility = "visible";
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      hint.boxes.push({
        id: el.dataset.testid ?? "",
        x: sx,
        y: below ? sy + 8 + h / 2 : sy - h / 2,
        w,
        h,
      });
    };
    if (ring.current) {
      ring.current.visible = walking;
      ring.current.position.set(a.x, 0.014, a.z);
    }
    // Just over the avatar's head, below the helpers' name tags.
    place(hint.you, YOU_HEIGHT, walking);
    const near = walking ? talk.near : null;
    const agent = near ? drive.agents.find((x) => x.id === near) : undefined;
    if (hint.talk && agent) {
      const text = `Talk to ${names.get(agent.id) ?? agent.id}`;
      if (hint.talkText && hint.talkText.textContent !== text) hint.talkText.textContent = text;
      hint.talk.dataset.seat = agent.id;
    }
    // Under your feet: you look at the avatar, and the name tags above the heads stay clear.
    place(hint.talk, 0, Boolean(agent), true);
    // Screen readers hear who is in reach, once per change.
    const heard = agent?.id ?? null;
    if (hint.live && heard !== spoken.current) {
      spoken.current = heard;
      hint.live.textContent = agent
        ? `Near ${names.get(agent.id) ?? agent.id}. Press E to talk.`
        : "";
    }
  });

  // Click to move: an invisible floor that only answers in Walk around mode.
  const onFloorClick = (event: ThreeEvent<MouseEvent>) => {
    if (!isWalking() || event.delta > DRAG_PX) return;
    drive.avatar.goTo([event.point.x, event.point.z]);
  };

  const { width, depth } = layout.floor;
  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a 3D floor, not a page element. The keys steer too. */}
      <mesh
        name="walk-floor"
        visible={false}
        position={[width / 2, 0.001, depth / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={onFloorClick}
      >
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial />
      </mesh>
      <mesh
        ref={ring}
        name="walk-you-ring"
        visible={false}
        geometry={YOU_RING}
        material={ringMaterial}
        rotation={[-Math.PI / 2, 0, 0]}
      />
    </>
  );
}
