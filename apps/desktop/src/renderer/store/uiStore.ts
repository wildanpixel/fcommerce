import { create } from "zustand";
import { isAppLanguage, type AppLanguage } from "../app/languages.js";

export type AppView = "research" | "projects" | "reports" | "settings";

type UiStore = {
  activeView: AppView;
  language: AppLanguage;
  projectInspectorRequestId: string;
  researchSetupRequestId: number;
  setActiveView: (view: AppView) => void;
  setLanguage: (language: AppLanguage) => void;
  requestNewResearch: () => void;
  openProjectInspector: (projectId: string) => void;
  clearProjectInspectorRequest: () => void;
  clearResearchSetupRequest: () => void;
};

function storedLanguage(): AppLanguage {
  if (typeof window === "undefined") {
    return "en-US";
  }
  const value = window.localStorage.getItem("mio-language");
  return isAppLanguage(value) ? value : "en-US";
}

export const useUiStore = create<UiStore>((set) => ({
  activeView: "research",
  language: storedLanguage(),
  projectInspectorRequestId: "",
  researchSetupRequestId: 0,
  setActiveView: (activeView) => set({ activeView }),
  setLanguage: (language) => {
    window.localStorage.setItem("mio-language", language);
    document.documentElement.lang = language;
    set({ language });
  },
  requestNewResearch: () => set((state) => ({
    activeView: "research",
    researchSetupRequestId: state.researchSetupRequestId + 1
  })),
  openProjectInspector: (projectInspectorRequestId) => set({ activeView: "projects", projectInspectorRequestId }),
  clearProjectInspectorRequest: () => set({ projectInspectorRequestId: "" }),
  clearResearchSetupRequest: () => set({ researchSetupRequestId: 0 })
}));
