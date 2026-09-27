import type { AppState, Health, OfficeState } from "@hq/shared";
import { create } from "zustand";

export type ConnectionStatus = "connecting" | "live" | "offline";
export type Light = "day" | "night";
export type ViewId = "overview" | "cm" | "ops" | "mgr" | "bridge";

interface ConnectionSlice {
  connection: ConnectionStatus;
  health: Health | null;
  setConnection: (connection: ConnectionStatus) => void;
  setHealth: (health: Health | null) => void;
}

interface DataSlice {
  data: AppState | null;
  setData: (data: AppState) => void;
  /** Replaces only the office part (office.updated), so nothing else re-renders. */
  setOffice: (office: OfficeState) => void;
}

/** How the office looks right now: light and camera view. Used by the scene, and later the panel. */
interface ViewSlice {
  light: Light;
  setLight: (light: Light) => void;
  view: ViewId;
  /** Goes up on every request, so picking the same view again still moves the camera back. */
  viewRequest: number;
  goToView: (view: ViewId) => void;
}

export type Store = ConnectionSlice & DataSlice & ViewSlice;

const params = new URLSearchParams(window.location.search);
/** ?time=night opens at night, ?view=cm opens on a camera preset. For screenshots and links. */
const startLight: Light = params.get("time") === "night" ? "night" : "day";
const VIEWS: ViewId[] = ["overview", "cm", "ops", "mgr", "bridge"];
const startView: ViewId = VIEWS.find((v) => v === params.get("view")) ?? "overview";

export const useStore = create<Store>()((set) => ({
  connection: "connecting",
  health: null,
  setConnection: (connection) => set({ connection }),
  setHealth: (health) => set({ health }),
  data: null,
  setData: (data) => set({ data }),
  setOffice: (office) => set((state) => (state.data ? { data: { ...state.data, office } } : {})),
  light: startLight,
  setLight: (light) => set({ light }),
  view: startView,
  viewRequest: 0,
  goToView: (view) => set((state) => ({ view, viewRequest: state.viewRequest + 1 })),
}));
