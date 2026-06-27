import { create } from "zustand";

export type AppView = "home" | "research" | "projects" | "keyStores" | "reports" | "settings";

type UiStore = {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  activeView: "home",
  setActiveView: (activeView) => set({ activeView })
}));
