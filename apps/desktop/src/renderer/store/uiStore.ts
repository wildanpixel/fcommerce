import { create } from "zustand";

export type AppView = "research" | "projects" | "reports" | "settings";

type UiStore = {
  activeView: AppView;
  projectInspectorRequestId: string;
  setActiveView: (view: AppView) => void;
  openProjectInspector: (projectId: string) => void;
  clearProjectInspectorRequest: () => void;
};

export const useUiStore = create<UiStore>((set) => ({
  activeView: "research",
  projectInspectorRequestId: "",
  setActiveView: (activeView) => set({ activeView }),
  openProjectInspector: (projectInspectorRequestId) => set({ activeView: "projects", projectInspectorRequestId }),
  clearProjectInspectorRequest: () => set({ projectInspectorRequestId: "" })
}));
