import { create } from "zustand";

export type AppView = "research" | "projects" | "keyStores" | "reports" | "settings";

type UiStore = {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  activeView: "research",
  setActiveView: (activeView) => set({ activeView })
}));
