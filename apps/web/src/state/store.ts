import type { AppState, Health } from "@hq/shared";
import { create } from "zustand";

export type ConnectionStatus = "connecting" | "live" | "offline";

interface ConnectionSlice {
  connection: ConnectionStatus;
  health: Health | null;
  setConnection: (connection: ConnectionStatus) => void;
  setHealth: (health: Health | null) => void;
}

interface DataSlice {
  data: AppState | null;
  setData: (data: AppState) => void;
}

export type Store = ConnectionSlice & DataSlice;

export const useStore = create<Store>()((set) => ({
  connection: "connecting",
  health: null,
  setConnection: (connection) => set({ connection }),
  setHealth: (health) => set({ health }),
  data: null,
  setData: (data) => set({ data }),
}));
