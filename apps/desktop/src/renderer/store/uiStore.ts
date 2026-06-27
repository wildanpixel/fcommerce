import { create } from "zustand";

export type AppView = "dashboard" | "research" | "reports" | "settings";

type UiStore = {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  activeView: "dashboard",
  setActiveView: (activeView) => set({ activeView })
}));
