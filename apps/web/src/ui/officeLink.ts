import type { OfficeLink } from "@hq/shared";
import { create } from "zustand";

/**
 * The panel's side of the office link (packages/shared, office-link.ts). The 3D office plugs
 * in with `connectOffice` at the P4 and P5 merge. Until then nothing is connected, and the
 * panel says so instead of pretending (for example "Show in office" is off).
 */
const useLink = create<{ link: OfficeLink | null }>()(() => ({ link: null }));

/** Plugs the office scene in. Returns a function that unplugs it. */
export function connectOffice(link: OfficeLink): () => void {
  useLink.setState({ link });
  return () => {
    if (useLink.getState().link === link) useLink.setState({ link: null });
  };
}

/** The connected office, or null before the merge. For React components. */
export const useOfficeLink = () => useLink((s) => s.link);

/** The connected office, or null. For event handlers. */
export const officeLink = () => useLink.getState().link;
