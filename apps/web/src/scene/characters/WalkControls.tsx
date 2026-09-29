import type { LayoutFile, Seat } from "@hq/shared";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { Vector3 } from "three";
import { useStore } from "../../state/store";
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
/** How long "Card coming soon" shows after E, in ms. */
const TALK_NOTE_MS = 1600;
const point = new Vector3();
/** The "You" marker's bottom edge, in meters: the standing head top is about 1.9 m. */
const YOU_HEIGHT = 2.0;

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

  useEffect(() => {
    if (START_WALKING) enterWalkMode();
  }, []);

  // Each walk starts at the Sr. Manager's door, with nothing selected.
  useEffect(() => {
    if (active) {
      drive.avatar.reset(0);
      selectSeat(null, "api");
    } else {
      held.clear();
    }
  }, [active, drive]);

  useEffect(() => {
    let noteTimer: ReturnType<typeof setTimeout> | undefined;
    const onDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (!canSteer(event.target)) return;
      if (event.code === "KeyG" && !event.repeat) {
        toggleWalkMode();
        return;
      }
      if (!isWalking()) return;
      if (event.key === "Escape") {
        exitWalkMode();
        useStore.getState().goToView("overview");
        return;
      }
      if (event.code === "KeyE" && !event.repeat) {
        if (talkNow()) {
          hint.noteUntil = performance.now() + TALK_NOTE_MS;
          clearTimeout(noteTimer);
          noteTimer = setTimeout(() => {
            hint.noteUntil = 0;
          }, TALK_NOTE_MS);
        }
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
      clearTimeout(noteTimer);
    };
  }, []);

  // The "You" marker and the Talk hint, placed through the DOM every frame (no React state).
  useFrame(({ camera, size }) => {
    const walking = isWalking();
    const a = drive.avatar;
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
    };
    // Just over the avatar's head, below the helpers' name tags.
    place(hint.you, YOU_HEIGHT, walking);
    const near = walking ? talk.near : null;
    const agent = near ? drive.agents.find((x) => x.id === near) : undefined;
    if (hint.talk && agent) {
      const noting = performance.now() < hint.noteUntil;
      const text = noting ? "Card coming soon" : `Talk to ${names.get(agent.id) ?? agent.id}`;
      if (hint.talkText && hint.talkText.textContent !== text) hint.talkText.textContent = text;
      if (hint.talkKey) hint.talkKey.style.display = noting ? "none" : "";
      hint.talk.dataset.seat = agent.id;
    }
    // Under your feet: you look at the avatar, and the name tags above the heads stay clear.
    place(hint.talk, 0, Boolean(agent), true);
  });

  // Click to move: an invisible floor that only answers in Walk around mode.
  const onFloorClick = (event: ThreeEvent<MouseEvent>) => {
    if (!isWalking() || event.delta > DRAG_PX) return;
    drive.avatar.goTo([event.point.x, event.point.z]);
  };

  const { width, depth } = layout.floor;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a 3D floor, not a page element. The keys steer too.
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
  );
}
