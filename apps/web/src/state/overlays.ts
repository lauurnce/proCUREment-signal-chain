import { type RefObject, useLayoutEffect } from "react";

/** A box on screen in CSS pixels, measured from the top left of the office screen. */
export type ScreenRect = { left: number; top: number; right: number; bottom: number };

/**
 * Page elements that float over the office (the view card, the title, the About note).
 * The camera fits the scene around them, and zone labels hide under them. A plain mutable
 * map, read inside useFrame and camera effects, so a measure never causes a React render.
 */
const rects = new Map<string, ScreenRect>();

export function overlayRects(): ScreenRect[] {
  return [...rects.values()];
}

/**
 * Keeps the rect of one overlay element up to date, relative to the office screen (the
 * closest <main>), which is where the canvas sits. Not the offsetParent: for a card inside
 * the footer that would be the footer, and the rect would land in the wrong place.
 */
export function useOverlayRect(id: string, ref: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      const parent = (el.closest("main") ?? document.body).getBoundingClientRect();
      rects.set(id, {
        left: box.left - parent.left,
        top: box.top - parent.top,
        right: box.right - parent.left,
        bottom: box.bottom - parent.top,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      rects.delete(id);
    };
  }, [id, ref]);
}
