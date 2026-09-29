import { create } from "zustand";

const KEY = "hq.sound";

function stored(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

/**
 * Sound on or off, remembered in this browser. Off by default. The office has no sounds yet,
 * so this only keeps the choice for when they come.
 */
export const useSound = create<{ on: boolean; setOn: (on: boolean) => void }>()((set) => ({
  on: stored(),
  setOn: (on) => {
    set({ on });
    try {
      window.localStorage.setItem(KEY, on ? "on" : "off");
    } catch {
      // Private windows can block storage. The choice still holds for this page.
    }
  },
}));
