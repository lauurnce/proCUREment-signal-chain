import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

const FRAMES_BEFORE_READY = 2;

/** Sets window.__HQ_READY__ after the first full frames. Uses a ref, never React state. */
export function ReadySignal() {
  const frames = useRef(0);
  useFrame(() => {
    if (frames.current > FRAMES_BEFORE_READY) return;
    frames.current += 1;
    if (frames.current === FRAMES_BEFORE_READY) window.__HQ_READY__ = true;
  });
  return null;
}
