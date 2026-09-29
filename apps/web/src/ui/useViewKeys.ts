import { useEffect, useRef, useState } from "react";
import { presetById } from "../scene/camera/presets";
import { useStore } from "../state/store";
import { viewForKey } from "./viewKeys";

/**
 * Keys 1 to 5 pick a camera view from anywhere except a text field (D-031, D-059), whether or
 * not the Office tab is open. Returns a line for a screen reader live region: where the camera
 * went, never on page load.
 */
export function useViewKeys(): string {
  const goToView = useStore((s) => s.goToView);
  const view = useStore((s) => s.view);
  const viewRequest = useStore((s) => s.viewRequest);
  const [announcement, setAnnouncement] = useState("");
  const firstRequest = useRef(viewRequest);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const next = viewForKey(event);
      if (!next) return;
      event.preventDefault();
      goToView(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goToView]);

  useEffect(() => {
    if (viewRequest === firstRequest.current) return;
    setAnnouncement(`View: ${presetById(view).label}`);
  }, [view, viewRequest]);

  return announcement;
}
