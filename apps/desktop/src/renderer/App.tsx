import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  BadgeCheck,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardCheck,
  ExternalLink,
  FileDown,
  Gauge,
  Globe2,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  Maximize2,
  Minimize2,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  Sun,
  Table2,
  TerminalSquare
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  DashboardSnapshot,
  ManualEvidenceKind,
  MarketplaceId,
  NewProjectInput,
  SaveSettingsPayload,
  SettingsPayload
} from "../shared/contracts.js";
import { DEFAULT_REPORT_SECTIONS, type ReportSectionConfig } from "../shared/reportSections.js";
import { apiClient } from "./api/client.js";
import { type AppView, useUiStore } from "./store/uiStore.js";

const SHOPEE_HOME_URL = "https://shopee.co.id/";
const TIKTOK_SHOP_URL = "https://www.tiktok.com/shop";

const navItems: Array<{ id: AppView; label: string; icon: LucideIcon }> = [
  { id: "home", label: "Home", icon: LayoutDashboard },
  { id: "research", label: "New Research", icon: Search },
  { id: "projects", label: "Projects", icon: Table2 },
  { id: "keyStores", label: "Key Stores", icon: Store },
  { id: "reports", label: "Reports", icon: FileDown },
  { id: "settings", label: "Settings", icon: Settings }
];

type ResearchPlatform = Extract<MarketplaceId, "SHOPEE_ID" | "TIKTOK_SHOP">;
type PlatformViewMode = "desktop" | "mobile";
type ThemeMode = "dark" | "light";
type ResearchMode = "home" | "setup" | "collect";
type ProjectSummary = DashboardSnapshot["projects"][number];

type AnalysisFormState = {
  keyword: string;
  productCategory: string;
  marketplace: ResearchPlatform;
  createdAt: string;
};

type CollectionStep = {
  id: string;
  section: string;
  label: string;
  kind: ManualEvidenceKind;
  instruction: string;
  targetUrl?: string;
  ready: boolean;
};

type CapturedPageImage = {
  toDataURL: () => string;
  getSize?: () => { width: number; height: number };
};

type WebviewElement = HTMLElement & {
  capturePage?: () => Promise<CapturedPageImage>;
  getURL?: () => string;
  loadURL?: (url: string) => Promise<void>;
  reload?: () => void;
};

type WebviewNavigationEvent = Event & {
  url?: string;
  validatedURL?: string;
  errorCode?: number;
};

export default function App() {
  const activeView = useUiStore((state) => state.activeView);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");

  return (
    <div className={`mio-app ${themeMode === "light" ? "mio-light" : "mio-dark"} min-h-screen bg-ink-950 text-ink-100`}>
      <div className={["grid min-h-screen transition-[grid-template-columns] duration-300 ease-out", sidebarCollapsed ? "grid-cols-[84px_minmax(0,1fr)]" : "grid-cols-[264px_minmax(0,1fr)]"].join(" ")}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} />
        <main className="mio-main min-w-0 border-l border-white/8 bg-[linear-gradient(180deg,#10141d,#090b10_48%)]">
          <TopBar themeMode={themeMode} onThemeToggle={() => setThemeMode((value) => (value === "dark" ? "light" : "dark"))} />
          <div className="relative px-8 pb-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                {(activeView === "home" || activeView === "research") && <ManualResearchExperience />}
                {activeView === "projects" && <ProjectsView />}
                {activeView === "keyStores" && <KeyStoresView />}
                {activeView === "reports" && <ReportsView />}
                {activeView === "settings" && <SettingsView />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const activeView = useUiStore((state) => state.activeView);
  const setActiveView = useUiStore((state) => state.setActiveView);

  return (
    <aside className="mio-sidebar flex min-h-screen flex-col bg-ink-900 px-4 py-5 transition-all duration-300 ease-out">
      <div className={["mb-8 flex items-center gap-3 px-2", collapsed ? "justify-center px-0" : ""].join(" ")}>
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-signal-blue/15 text-signal-blue">
          <Brain size={20} />
        </div>
        <div className={collapsed ? "hidden" : ""}>
          <div className="text-sm font-semibold">Marketplace Intelligence OS</div>
          <div className="text-xs text-ink-500">Guided Marketplace Evidence</div>
        </div>
      </div>

      <button
        type="button"
        className="secondary-button mb-4 h-9"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        onClick={onToggle}
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        {!collapsed && "Collapse"}
      </button>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={[
                "flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition",
                collapsed ? "justify-center px-0" : "",
                active ? "bg-white/9 text-white shadow-glow" : "text-ink-300 hover:bg-white/6 hover:text-white"
              ].join(" ")}
              onClick={() => setActiveView(item.id)}
            >
              <Icon size={17} />
              {!collapsed && item.label}
            </button>
          );
        })}
      </nav>

      <div className={["mt-auto rounded-md border border-white/8 bg-white/5 p-3 transition-opacity duration-300", collapsed ? "hidden" : ""].join(" ")}>
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-ink-300">
          <ShieldCheck size={14} />
          Local Evidence Vault
        </div>
        <div className="text-xs leading-5 text-ink-500">
          Projects, screenshots, reports, browser sessions, and keys stay on this machine.
        </div>
      </div>
    </aside>
  );
}

function TopBar({ themeMode, onThemeToggle }: { themeMode: ThemeMode; onThemeToggle: () => void }) {
  return (
    <header className="flex h-16 items-center justify-between px-8">
      <div>
        <div className="text-xs uppercase tracking-[0.16em] text-ink-500">Marketplace Research Operating System</div>
        <h1 className="text-lg font-semibold text-white">Manual Evidence Collection</h1>
      </div>
      <button className="secondary-button h-9 w-auto px-3" type="button" onClick={onThemeToggle}>
        {themeMode === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        {themeMode === "dark" ? "Light" : "Dark"}
      </button>
    </header>
  );
}

function ManualResearchExperience() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<ResearchMode>("home");
  const [activeProject, setActiveProject] = useState<ProjectSummary | null>(null);
  const [form, setForm] = useState<AnalysisFormState>({
    keyword: "",
    productCategory: "",
    marketplace: "SHOPEE_ID",
    createdAt: new Date().toISOString()
  });
  const [browserUrl, setBrowserUrl] = useState(SHOPEE_HOME_URL);

  const createProject = useMutation({
    mutationFn: (payload: NewProjectInput) => apiClient.createProject(payload),
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setActiveProject(project);
      setBrowserUrl(initialPlatformUrl(project.marketplace as ResearchPlatform, project.keyword));
      setMode("collect");
    }
  });

  function proceed(event: FormEvent) {
    event.preventDefault();
    const keyword = form.keyword.trim();
    if (keyword.length < 2 || form.productCategory.trim().length < 2) {
      return;
    }
    createProject.mutate({
      name: keyword,
      keyword,
      marketplace: form.marketplace,
      language: "manual-guided",
      productCategory: form.productCategory.trim()
    });
  }

  if (mode === "home") {
    return <CreateAnalysisHome onCreate={() => setMode("setup")} />;
  }

  if (mode === "setup") {
    return (
      <AnalysisSetupForm
        form={form}
        isSaving={createProject.isPending}
        error={createProject.error instanceof Error ? createProject.error.message : undefined}
        onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        onBack={() => setMode("home")}
        onSubmit={proceed}
      />
    );
  }

  if (!activeProject) {
    return <CreateAnalysisHome onCreate={() => setMode("setup")} />;
  }

  return (
    <GuidedBrowserCollector
      project={activeProject}
      productCategory={form.productCategory}
      browserUrl={browserUrl}
      onBrowserUrlChange={setBrowserUrl}
      onNewAnalysis={() => {
        setActiveProject(null);
        setForm({
          keyword: "",
          productCategory: "",
          marketplace: "SHOPEE_ID",
          createdAt: new Date().toISOString()
        });
        setBrowserUrl(SHOPEE_HOME_URL);
        setMode("setup");
      }}
    />
  );
}

function CreateAnalysisHome({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="flex min-h-[calc(100vh-120px)] items-center justify-center">
      <motion.button
        type="button"
        className="mio-create-button group flex min-h-[168px] w-full max-w-[520px] flex-col items-start justify-between rounded-[26px] border border-white/16 bg-white/8 p-8 text-left shadow-glow backdrop-blur-2xl transition"
        whileHover={{ y: -4, scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={onCreate}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-signal-blue/18 text-signal-blue">
          <ShoppingBag size={24} />
        </span>
        <span>
          <span className="block text-3xl font-semibold text-white">Create Analysis</span>
          <span className="mt-3 block max-w-[420px] text-sm leading-6 text-ink-300">
            Start a guided marketplace evidence session. You control the browser, the app captures each required report step.
          </span>
        </span>
        <span className="inline-flex items-center gap-2 text-sm font-medium text-signal-blue">
          Open setup
          <ChevronRight size={16} />
        </span>
      </motion.button>
    </section>
  );
}

function AnalysisSetupForm({
  form,
  isSaving,
  error,
  onChange,
  onBack,
  onSubmit
}: {
  form: AnalysisFormState;
  isSaving: boolean;
  error?: string;
  onChange: (patch: Partial<AnalysisFormState>) => void;
  onBack: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const canProceed = form.keyword.trim().length >= 2 && form.productCategory.trim().length >= 2 && !isSaving;

  return (
    <section className="mx-auto max-w-4xl">
      <Panel title="Create Analysis" icon={ClipboardCheck}>
        <form className="grid grid-cols-2 gap-5" onSubmit={onSubmit}>
          <Field label="Desired Keyword">
            <input
              aria-label="Desired Keyword"
              className="input"
              value={form.keyword}
              onChange={(event) => onChange({ keyword: event.target.value })}
              placeholder="Example: bulu mata palsu"
            />
          </Field>
          <Field label="Product Category">
            <input
              aria-label="Product Category"
              className="input"
              value={form.productCategory}
              onChange={(event) => onChange({ productCategory: event.target.value })}
              placeholder="Example: false eyelashes"
            />
          </Field>
          <Field label="Date Created">
            <input aria-label="Date Created" className="input" value={formatDateTime(form.createdAt)} readOnly />
          </Field>
          <Field label="Collection Platform">
            <div className="grid grid-cols-2 gap-2">
              <PlatformButton
                active={form.marketplace === "SHOPEE_ID"}
                icon={ShoppingBag}
                label="SHOPEE"
                onClick={() => onChange({ marketplace: "SHOPEE_ID" })}
              />
              <PlatformButton
                active={form.marketplace === "TIKTOK_SHOP"}
                icon={Smartphone}
                label="TIKTOK SHOP"
                onClick={() => onChange({ marketplace: "TIKTOK_SHOP" })}
              />
            </div>
          </Field>
          <div className="col-span-2 grid grid-cols-[180px_minmax(0,1fr)] gap-3">
            <button className="secondary-button" type="button" onClick={onBack}>
              <ChevronLeft size={16} />
              Back
            </button>
            <button className="primary-button" type="submit" disabled={!canProceed}>
              <ChevronRight size={16} />
              Proceed to Browser
            </button>
          </div>
          {error && (
            <div className="col-span-2 rounded-md border border-signal-rose/30 bg-signal-rose/10 p-3 text-sm text-signal-rose">
              {error}
            </div>
          )}
        </form>
      </Panel>
    </section>
  );
}

function GuidedBrowserCollector({
  project,
  productCategory,
  browserUrl,
  onBrowserUrlChange,
  onNewAnalysis
}: {
  project: ProjectSummary;
  productCategory: string;
  browserUrl: string;
  onBrowserUrlChange: (url: string) => void;
  onNewAnalysis: () => void;
}) {
  const webviewRef = useRef<WebviewElement | null>(null);
  const queryClient = useQueryClient();
  const platform = project.marketplace as ResearchPlatform;
  const [viewMode, setViewMode] = useState<PlatformViewMode>(platform === "TIKTOK_SHOP" ? "mobile" : "desktop");
  const [expanded, setExpanded] = useState(false);
  const [address, setAddress] = useState(browserUrl);
  const [currentUrl, setCurrentUrl] = useState(browserUrl);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [collectedSteps, setCollectedSteps] = useState<Record<string, string>>({});
  const [activityLog, setActivityLog] = useState<string[]>([
    "Open each target page manually, then capture the matching report step."
  ]);

  const steps = useMemo(
    () => buildCollectionSteps(project, platform, currentUrl),
    [currentUrl, platform, project]
  );
  const activeStep = steps[activeStepIndex] ?? steps[0];
  const collectedCount = steps.filter((step) => collectedSteps[step.id]).length;

  const saveEvidence = useMutation({
    mutationFn: async (step: CollectionStep) => {
      const webview = webviewRef.current;
      if (!webview?.capturePage) {
        throw new Error("The embedded browser cannot capture this page in the current runtime.");
      }
      const image = await webview.capturePage();
      const size = image.getSize?.() ?? {
        width: Math.round(webview.clientWidth),
        height: Math.round(webview.clientHeight)
      };
      const sourceUrl = webview.getURL?.() ?? currentUrl;
      return apiClient.saveManualEvidence({
        projectId: project.id,
        stepId: step.id,
        label: step.label,
        kind: step.kind,
        sourceUrl: sourceUrl === "about:blank" ? undefined : sourceUrl,
        imageDataUrl: image.toDataURL(),
        width: size.width,
        height: size.height,
        note: step.instruction,
        metadata: {
          section: step.section,
          keyword: project.keyword,
          productCategory,
          marketplace: platform,
          viewMode,
          capturedAt: new Date().toISOString()
        }
      });
    },
    onSuccess: async (result, step) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setCollectedSteps((current) => ({ ...current, [step.id]: result.assetPath }));
      appendLog(setActivityLog, `Captured ${step.label}.`);
      setActiveStepIndex((current) => Math.min(current + 1, steps.length - 1));
    },
    onError: (error) => {
      appendLog(setActivityLog, error instanceof Error ? error.message : "Could not capture the current step.");
    }
  });

  useEffect(() => {
    setAddress(browserUrl);
    setCurrentUrl(browserUrl);
  }, [browserUrl]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) {
      return;
    }
    const updateUrl = (event?: WebviewNavigationEvent) => {
      const nextUrl = event?.url ?? event?.validatedURL ?? webview.getURL?.() ?? currentUrl;
      if (nextUrl) {
        setCurrentUrl(nextUrl);
        setAddress(nextUrl);
        onBrowserUrlChange(nextUrl);
      }
      setLoadState("ready");
    };
    const loading = () => setLoadState("loading");
    const failed = (event: Event) => {
      const failure = event as WebviewNavigationEvent;
      if (failure.errorCode === -3) {
        return;
      }
      setLoadState("failed");
      appendLog(setActivityLog, "The browser could not load this page. You can reload or navigate manually.");
    };
    webview.addEventListener("did-start-loading", loading);
    webview.addEventListener("dom-ready", updateUrl);
    webview.addEventListener("did-finish-load", updateUrl);
    webview.addEventListener("did-navigate", updateUrl as EventListener);
    webview.addEventListener("did-navigate-in-page", updateUrl as EventListener);
    webview.addEventListener("did-fail-load", failed);
    return () => {
      webview.removeEventListener("did-start-loading", loading);
      webview.removeEventListener("dom-ready", updateUrl);
      webview.removeEventListener("did-finish-load", updateUrl);
      webview.removeEventListener("did-navigate", updateUrl as EventListener);
      webview.removeEventListener("did-navigate-in-page", updateUrl as EventListener);
      webview.removeEventListener("did-fail-load", failed);
    };
  }, [currentUrl, onBrowserUrlChange]);

  function navigateTo(url: string) {
    const nextUrl = normalizeUrl(url);
    setAddress(nextUrl);
    setCurrentUrl(nextUrl);
    onBrowserUrlChange(nextUrl);
    void webviewRef.current?.loadURL?.(nextUrl).catch((error: unknown) => {
      appendLog(setActivityLog, error instanceof Error ? error.message : "Navigation failed.");
    });
  }

  function goToAddress() {
    if (address.trim().length === 0) {
      return;
    }
    navigateTo(address);
  }

  const userAgent =
    viewMode === "mobile"
      ? "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36"
      : undefined;

  const browserPanel = (
    <Panel
      title="Guided Platform Browser"
      icon={Globe2}
      action={
        <button className="secondary-button h-9 w-auto px-3" type="button" onClick={() => setExpanded((value) => !value)}>
          {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          {expanded ? "Exit Fullscreen" : "Expand"}
        </button>
      }
    >
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
        <input value={address} onChange={(event) => setAddress(event.target.value)} className="input" />
        <button className="secondary-button w-auto px-3" type="button" onClick={goToAddress}>
          <ChevronRight size={15} />
          Go
        </button>
        <button className="secondary-button w-auto px-3" type="button" onClick={() => webviewRef.current?.reload?.()}>
          <RefreshCcw size={15} />
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SegmentButton
            active={viewMode === "desktop"}
            icon={Monitor}
            disabled={platform !== "SHOPEE_ID"}
            onClick={() => platform === "SHOPEE_ID" && setViewMode("desktop")}
          >
            Desktop
          </SegmentButton>
          <SegmentButton active={viewMode === "mobile"} icon={Smartphone} onClick={() => setViewMode("mobile")}>
            Mobile
          </SegmentButton>
        </div>
        <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-ink-300">
          {loadState}
        </div>
      </div>

      <div className={["relative overflow-hidden rounded-[18px] border border-white/12 bg-black", viewMode === "mobile" ? "mx-auto h-[720px] max-w-[430px]" : "h-[720px] w-full"].join(" ")}>
        <webview
          key={`${project.id}-${viewMode}`}
          ref={(node) => {
            webviewRef.current = node as WebviewElement | null;
          }}
          src={browserUrl}
          partition={`persist:mio-${project.id}`}
          allowpopups
          useragent={userAgent}
          webpreferences="contextIsolation=yes, sandbox=yes"
        />
        <FloatingStepController
          step={activeStep}
          stepNumber={activeStepIndex + 1}
          stepTotal={steps.length}
          collectedCount={collectedCount}
          targetUrl={activeStep.targetUrl}
          captured={Boolean(collectedSteps[activeStep.id])}
          saving={saveEvidence.isPending}
          onOpenTarget={() => activeStep.targetUrl && navigateTo(activeStep.targetUrl)}
          onCollect={() => saveEvidence.mutate(activeStep)}
          onPrevious={() => setActiveStepIndex((current) => Math.max(0, current - 1))}
          onNext={() => setActiveStepIndex((current) => Math.min(steps.length - 1, current + 1))}
        />
      </div>
    </Panel>
  );

  return (
    <section className={expanded ? "fixed inset-0 z-50 overflow-auto bg-ink-950 p-5" : "grid grid-cols-[360px_minmax(0,1fr)] gap-5"}>
      {!expanded && (
        <aside className="space-y-5">
          <Panel title="Analysis Session" icon={ClipboardCheck}>
            <div className="space-y-3 text-sm text-ink-300">
              <InfoLine label="Keyword" value={project.keyword} />
              <InfoLine label="Category" value={project.productCategory ?? productCategory} />
              <InfoLine label="Platform" value={project.marketplace === "SHOPEE_ID" ? "Shopee" : "TikTok Shop"} />
              <InfoLine label="Created" value={formatDateTime(project.createdAt)} />
            </div>
            <button className="secondary-button mt-5" type="button" onClick={onNewAnalysis}>
              <ClipboardCheck size={16} />
              New Analysis
            </button>
          </Panel>

          <Panel title="Collection Progress" icon={ListChecks}>
            <ProgressBar value={(collectedCount / steps.length) * 100} />
            <div className="mt-4 max-h-[420px] space-y-2 overflow-auto pr-1">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  className={[
                    "w-full rounded-md border px-3 py-2 text-left text-xs transition",
                    index === activeStepIndex ? "border-signal-blue/40 bg-signal-blue/12" : "border-white/8 bg-white/5 hover:bg-white/8"
                  ].join(" ")}
                  onClick={() => setActiveStepIndex(index)}
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-white">
                    <span>Step {index + 1}</span>
                    {collectedSteps[step.id] ? <CheckCircle2 size={14} className="text-signal-green" /> : <Circle size={12} className="text-ink-500" />}
                  </div>
                  <div className="text-ink-300">{step.label}</div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Activity" icon={Gauge}>
            <div className="space-y-2">
              {activityLog.map((entry) => (
                <div key={entry} className="rounded-md border border-white/8 bg-white/5 px-3 py-2 text-xs leading-5 text-ink-300">
                  {entry}
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      )}

      <div className={expanded ? "mx-auto max-w-[1800px]" : ""}>{browserPanel}</div>
    </section>
  );
}

function FloatingStepController({
  step,
  stepNumber,
  stepTotal,
  collectedCount,
  targetUrl,
  captured,
  saving,
  onOpenTarget,
  onCollect,
  onPrevious,
  onNext
}: {
  step: CollectionStep;
  stepNumber: number;
  stepTotal: number;
  collectedCount: number;
  targetUrl?: string;
  captured: boolean;
  saving: boolean;
  onOpenTarget: () => void;
  onCollect: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <motion.div
      className="mio-floating-collector absolute left-4 top-4 z-20 w-[360px] rounded-[22px] border border-white/16 bg-ink-950/78 p-4 shadow-glow backdrop-blur-2xl"
      initial={{ opacity: 0, y: -14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22 }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-[0.14em] text-ink-500">
            Guided Collection {stepNumber}/{stepTotal}
          </div>
          <div className="text-sm font-semibold text-white">{step.label}</div>
        </div>
        <div className={["rounded-full px-2 py-1 text-[11px]", step.ready ? "bg-signal-green/15 text-signal-green" : "bg-white/8 text-ink-300"].join(" ")}>
          {captured ? "saved" : step.ready ? "ready" : "waiting"}
        </div>
      </div>
      <ProgressBar value={(collectedCount / stepTotal) * 100} />
      <div className="mt-3 rounded-2xl border border-white/8 bg-white/6 p-3 text-xs leading-5 text-ink-300">
        <div className="mb-1 font-medium text-white">{step.section}</div>
        {step.instruction}
      </div>
      <div className="mt-3 grid grid-cols-[auto_auto_minmax(0,1fr)] gap-2">
        <button className="secondary-button h-9 w-10 px-0" type="button" onClick={onPrevious} aria-label="Previous step">
          <ChevronLeft size={15} />
        </button>
        <button className="secondary-button h-9 w-10 px-0" type="button" onClick={onNext} aria-label="Next step">
          <ChevronRight size={15} />
        </button>
        {targetUrl && (
          <button className="secondary-button h-9 px-3" type="button" onClick={onOpenTarget}>
            <ExternalLink size={14} />
            Open Target
          </button>
        )}
      </div>
      {step.ready ? (
        <button className="primary-button mt-3 h-10" type="button" disabled={saving} onClick={onCollect}>
          <ClipboardCheck size={16} />
          {saving ? "Saving Evidence" : captured ? "Capture Again" : "Collect This Step"}
        </button>
      ) : (
        <div className="mt-3 rounded-full border border-white/8 bg-white/6 px-3 py-2 text-xs text-ink-400">
          Navigate to the target page or section to reveal the collect button.
        </div>
      )}
    </motion.div>
  );
}

function ProjectsView() {
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: apiClient.dashboard });
  const projects = dashboard.data?.projects ?? [];

  return (
    <section className="grid grid-cols-[minmax(0,1fr)_360px] gap-5">
      <Panel title="Projects" icon={Table2}>
        <div className="space-y-3">
          {projects.map((project) => (
            <div key={project.id} className="rounded-md border border-white/8 bg-white/5 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-base font-semibold text-white">{project.name}</div>
                <StatusPill status={project.status} />
              </div>
              <div className="grid grid-cols-4 gap-3 text-xs text-ink-400">
                <InfoLine label="Keyword" value={project.keyword} />
                <InfoLine label="Category" value={project.productCategory ?? "-"} />
                <InfoLine label="Marketplace" value={project.marketplace} />
                <InfoLine label="Updated" value={formatDate(project.updatedAt)} />
              </div>
            </div>
          ))}
          {projects.length === 0 && <EmptyState label="No projects yet. Create an analysis from Home." />}
        </div>
      </Panel>
      <Panel title="Vault Metrics" icon={Gauge}>
        <div className="grid grid-cols-2 gap-3">
          <Metric icon={Archive} label="Projects" value={projects.length} />
          <Metric icon={FileDown} label="Reports" value={dashboard.data?.metrics.completedReports ?? 0} />
          <Metric icon={ShoppingBag} label="Products" value={dashboard.data?.metrics.collectedProducts ?? 0} />
          <Metric icon={Gauge} label="Running" value={dashboard.data?.metrics.runningJobs ?? 0} />
        </div>
      </Panel>
    </section>
  );
}

function KeyStoresView() {
  return (
    <section className="grid grid-cols-3 gap-5">
      <InsightCard
        title="Manual Store Evidence"
        body="Store homepage, products, best sellers, banners, and social-account checks are now collected through guided browser steps."
      />
      <InsightCard
        title="AI Ranking Input"
        body="Captured store evidence is saved as project assets and remains available for the structured AI scoring/report pipeline."
      />
      <InsightCard
        title="Automation Boundary"
        body="Shopee login, traffic verification, and protected screens are intentionally user-controlled instead of forced through brittle automation."
      />
    </section>
  );
}

function ReportsView() {
  const queryClient = useQueryClient();
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: apiClient.dashboard });
  const [projectId, setProjectId] = useState("");
  const [sections, setSections] = useState<ReportSectionConfig[]>(DEFAULT_REPORT_SECTIONS);
  const generateReport = useMutation({
    mutationFn: apiClient.generateReport,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["dashboard"] })
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const selectedProjectId = projectId || dashboard.data?.projects[0]?.id;
    if (!selectedProjectId) {
      return;
    }
    generateReport.mutate({
      projectId: selectedProjectId,
      templateId: "marketplace-research-os-v1",
      sections
    });
  }

  return (
    <section className="grid grid-cols-[minmax(360px,0.75fr)_minmax(0,1.25fr)] gap-5">
      <Panel title="Report Generator" icon={FileDown}>
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Project">
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="input">
              <option value="">{dashboard.data?.projects[0] ? "Use latest project" : "No project"}</option>
              {(dashboard.data?.projects ?? []).map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Field>
          <button className="primary-button" type="submit" disabled={!dashboard.data?.projects.length || generateReport.isPending}>
            <FileDown size={16} />
            Export PDF
          </button>
          {generateReport.data && (
            <div className="rounded-md border border-signal-green/25 bg-signal-green/10 p-3 text-sm text-signal-green">
              PDF exported to {generateReport.data.pdfPath}
            </div>
          )}
        </form>
      </Panel>
      <Panel title="Report Workflow Sections" icon={ListChecks}>
        <div className="grid grid-cols-2 gap-3">
          {sections.map((section) => (
            <button
              type="button"
              key={section.id}
              className={[
                "rounded-md border p-4 text-left transition",
                section.enabled ? "border-signal-blue/35 bg-signal-blue/10" : "border-white/8 bg-white/5 text-ink-500"
              ].join(" ")}
              onClick={() =>
                setSections((current) =>
                  current.map((item) => (item.id === section.id ? { ...item, enabled: !item.enabled } : item))
                )
              }
            >
              <div className="mb-2 flex items-center justify-between text-sm font-medium">
                {section.label}
                {section.enabled && <CheckCircle2 size={16} className="text-signal-blue" />}
              </div>
              <div className="text-xs leading-5 text-ink-500">{section.requiredEvidence.slice(0, 3).join(", ")}</div>
            </button>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function SettingsView() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["settings"], queryFn: apiClient.settings });
  const platform = useQuery({ queryKey: ["platform"], queryFn: apiClient.platform });
  const health = useQuery({ queryKey: ["health"], queryFn: apiClient.health });
  const browsers = useQuery({ queryKey: ["browsers"], queryFn: apiClient.browsers });
  type SettingsFormState = SaveSettingsPayload &
    Pick<SettingsPayload, "openAiKeyConfigured" | "geminiKeyConfigured">;
  const [form, setForm] = useState<SettingsFormState | null>(null);
  const value: SettingsFormState | null = form ?? settings.data ?? null;
  const save = useMutation({
    mutationFn: apiClient.saveSettings,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["settings"] })
  });

  if (!value) {
    return <EmptyState label="Loading settings." />;
  }

  function update(patch: Partial<SettingsFormState>) {
    if (!value) {
      return;
    }
    setForm({ ...value, ...patch });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!value) {
      return;
    }
    save.mutate({
      marketplace: value.marketplace,
      theme: value.theme,
      browser: value.browser,
      exportFolder: value.exportFolder,
      screenshotFolder: value.screenshotFolder,
      language: value.language,
      concurrency: value.concurrency,
      openAiApiKey: value.openAiApiKey,
      geminiApiKey: value.geminiApiKey
    });
  }

  return (
    <section className="grid grid-cols-[minmax(0,1fr)_360px] gap-5">
      <Panel title="Settings" icon={Settings}>
        <form className="grid grid-cols-2 gap-4" onSubmit={submit}>
          <Field label="Theme">
            <select value={value.theme} onChange={(event) => update({ theme: event.target.value as SaveSettingsPayload["theme"] })} className="input">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </Field>
          <Field label="Preferred Browser">
            <select value={value.browser} onChange={(event) => update({ browser: event.target.value as SaveSettingsPayload["browser"] })} className="input">
              {(browsers.data ?? [{ id: "chromium" as const, name: "Bundled Chromium", available: true, profilePath: "" }]).map((browser) => (
                <option key={browser.id} value={browser.id} disabled={!browser.available}>
                  {browser.name}
                  {browser.available ? "" : " (not detected)"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Export folder">
            <input value={value.exportFolder} onChange={(event) => update({ exportFolder: event.target.value })} className="input" />
          </Field>
          <Field label="Screenshot folder">
            <input value={value.screenshotFolder} onChange={(event) => update({ screenshotFolder: event.target.value })} className="input" />
          </Field>
          <Field label="Language">
            <input value={value.language} onChange={(event) => update({ language: event.target.value })} className="input" />
          </Field>
          <Field label="Concurrency">
            <input
              type="number"
              min={1}
              max={5}
              value={value.concurrency}
              onChange={(event) => update({ concurrency: Number(event.target.value) })}
              className="input"
            />
          </Field>
          <Field label="OpenAI API key">
            <input type="password" onChange={(event) => update({ openAiApiKey: event.target.value })} className="input" placeholder={value.openAiKeyConfigured ? "Configured" : ""} />
          </Field>
          <Field label="Gemini API key">
            <input type="password" onChange={(event) => update({ geminiApiKey: event.target.value })} className="input" placeholder={value.geminiKeyConfigured ? "Configured" : ""} />
          </Field>
          <button className="primary-button col-span-2" type="submit" disabled={save.isPending}>
            <KeyRound size={16} />
            Save Settings
          </button>
        </form>
      </Panel>
      <Panel title="Runtime" icon={TerminalSquare}>
        <div className="space-y-3 text-sm text-ink-300">
          <StatusLine label="OpenAI" active={value.openAiKeyConfigured} />
          <StatusLine label="Gemini" active={value.geminiKeyConfigured} />
          <StatusLine label="Marketplace adapters" active />
          <StatusLine label="Local database" active />
          <div className="rounded-md border border-white/8 bg-white/5 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.12em] text-ink-500">Application</div>
            <div className="mb-3 space-y-1 break-all text-xs leading-5 text-ink-300">
              <div>Product: {health.data?.product ?? "Marketplace Intelligence OS"}</div>
              <div>Version: {health.data?.version ?? "-"}</div>
              <div>Packaged: {platform.data?.isPackaged ? "Yes" : "No"}</div>
            </div>
            <div className="mb-2 text-xs uppercase tracking-[0.12em] text-ink-500">
              {platform.data?.os ?? "Platform"} folders
            </div>
            <div className="space-y-1 break-all text-xs leading-5 text-ink-300">
              <div>Data: {platform.data?.directories.data ?? "-"}</div>
              <div>Reports: {platform.data?.directories.reports ?? "-"}</div>
              <div>Browser profiles: {platform.data?.directories.browserProfiles ?? "-"}</div>
            </div>
            {platform.data?.directories.appData && (
              <button className="primary-button mt-3" type="button" onClick={() => void apiClient.openPath(platform.data.directories.appData)}>
                <Archive size={16} />
                Open App Folder
              </button>
            )}
          </div>
        </div>
      </Panel>
    </section>
  );
}

function PlatformButton({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        "flex h-12 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition",
        active ? "border-signal-blue/45 bg-signal-blue/12 text-white" : "border-white/8 bg-white/5 text-ink-300 hover:text-white"
      ].join(" ")}
      onClick={onClick}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function SegmentButton({
  active,
  disabled,
  icon: Icon,
  children,
  onClick
}: {
  active: boolean;
  disabled?: boolean;
  icon: LucideIcon;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        "inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm transition",
        active ? "border-signal-blue/45 bg-signal-blue/12 text-white" : "border-white/8 bg-white/5 text-ink-400 hover:text-white",
        disabled ? "cursor-not-allowed opacity-45" : ""
      ].join(" ")}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={15} />
      {children}
    </button>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-md border border-white/8 bg-white/6 p-4 shadow-glow">
      <div className="mb-4 flex items-center justify-between text-ink-500">
        <span className="text-xs uppercase tracking-[0.14em]">{label}</span>
        <Icon size={17} />
      </div>
      <div className="text-3xl font-semibold text-white">{value}</div>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  action,
  children
}: {
  title: string;
  icon: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mio-panel rounded-[18px] border border-white/8 bg-ink-900/72 p-5 shadow-glow">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Icon size={17} className="text-signal-blue" />
          {title}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="block space-y-2">
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-ink-500">{label}</span>
      {children}
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.12em] text-ink-500">{label}</div>
      <div className="mt-1 break-words text-sm text-white">{value}</div>
    </div>
  );
}

function StatusLine({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-white/8 bg-white/5 px-3 py-2">
      <span>{label}</span>
      <span className={active ? "text-signal-green" : "text-ink-500"}>{active ? "Ready" : "Not configured"}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return <span className="rounded-full bg-signal-green/15 px-2 py-1 text-xs text-signal-green">{status}</span>;
}

function InsightCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-white/8 bg-ink-900/72 p-5 shadow-glow">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <BadgeCheck size={17} className="text-signal-blue" />
        {title}
      </div>
      <div className="text-sm leading-6 text-ink-300">{body}</div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-white/12 bg-white/[0.03] p-6 text-sm text-ink-500">
      {label}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const width = `${Math.max(0, Math.min(100, Math.round(value)))}%`;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-signal-blue transition-all duration-300 ease-out" style={{ width }} />
    </div>
  );
}

function buildCollectionSteps(project: ProjectSummary, platform: ResearchPlatform, currentUrl: string): CollectionStep[] {
  return platform === "SHOPEE_ID"
    ? buildShopeeSteps(project, currentUrl)
    : buildTikTokSteps(project, currentUrl);
}

function buildShopeeSteps(project: ProjectSummary, currentUrl: string): CollectionStep[] {
  const keyword = encodeURIComponent(project.keyword);
  const relevanceUrl = `https://shopee.co.id/search?keyword=${keyword}&page=0&sortBy=relevancy`;
  const salesUrl = `https://shopee.co.id/search?keyword=${keyword}&page=0&sortBy=sales`;
  const searchReady = isShopeeSearchPage(currentUrl);
  const productReady = isShopeeProductPage(currentUrl);
  const storeReady = isShopeeStorePage(currentUrl);
  const tiktokReady = isTikTokPage(currentUrl);
  const popularStoreTarget = storeReady ? withStoreSort(currentUrl, "pop") : undefined;
  const bestSellerTarget = storeReady ? withStoreSort(currentUrl, "sales") : undefined;

  return [
    {
      id: "keyword-relevance",
      section: "Keyword as Title",
      label: "Relevance first page screenshot",
      kind: "SEARCH_RESULT",
      instruction: "Open the Shopee relevance result page for the desired keyword and capture the visible first page.",
      targetUrl: relevanceUrl,
      ready: sameUrlIntent(currentUrl, relevanceUrl) || searchReady
    },
    {
      id: "keyword-top-sales",
      section: "Keyword as Title",
      label: "Top sales first page screenshot",
      kind: "TOP_SALES",
      instruction: "Open the Shopee top-sales result page for the desired keyword and capture the visible first page.",
      targetUrl: salesUrl,
      ready: sameUrlIntent(currentUrl, salesUrl) || searchReady
    },
    {
      id: "key-product-table",
      section: "Key Product",
      label: "Key product source evidence",
      kind: "SEARCH_RESULT",
      instruction: "Use the relevance and top-sales pages to decide the candidate products and capture the page used for the table.",
      targetUrl: relevanceUrl,
      ready: searchReady
    },
    {
      id: "product-detail-first-page",
      section: "Product Detailed Qualified",
      label: "Product page first viewport",
      kind: "PRODUCT_PAGE",
      instruction: "Open a selected product page. Capture the viewport containing product images, title, ratings, sold count, price, variants, and buy buttons.",
      ready: productReady
    },
    {
      id: "product-images",
      section: "Product Detailed Qualified",
      label: "Product images 1-9",
      kind: "PRODUCT_IMAGE",
      instruction: "Navigate through the product image carousel or gallery. Capture the image evidence, no more than three images per report row.",
      ready: productReady
    },
    {
      id: "product-description",
      section: "Product Detailed Qualified",
      label: "Product description",
      kind: "PRODUCT_DESCRIPTION",
      instruction: "Scroll to the product description/specification section and capture it.",
      ready: productReady
    },
    {
      id: "product-reviews",
      section: "Product Detailed Qualified",
      label: "Reviews: 3 positive and 2 negative",
      kind: "REVIEW_SECTION",
      instruction: "Open the review area and capture visible positive or negative review evidence including timestamp when visible.",
      ready: productReady
    },
    {
      id: "review-user-media",
      section: "Product Detailed Qualified",
      label: "Review user media",
      kind: "REVIEW_IMAGE",
      instruction: "Filter or scroll to reviews with attached images and capture user media evidence.",
      ready: productReady
    },
    {
      id: "store-homepage",
      section: "Key Store",
      label: "Store homepage",
      kind: "STORE_HOME",
      instruction: "Open the inspected product store page and capture the visible homepage.",
      ready: storeReady
    },
    {
      id: "store-products",
      section: "Key Store",
      label: "Store products popular page",
      kind: "STORE_FEATURED_PRODUCTS",
      instruction: "Open the store product tab sorted by popular products and capture it.",
      targetUrl: popularStoreTarget,
      ready: storeReady && currentUrl.includes("sortBy=pop")
    },
    {
      id: "store-best-seller",
      section: "Key Store",
      label: "Store best-seller page",
      kind: "STORE_BEST_SELLER",
      instruction: "Open the store product tab sorted by sales and capture the best-selling products.",
      targetUrl: bestSellerTarget,
      ready: storeReady && currentUrl.includes("sortBy=sales")
    },
    {
      id: "store-visual-style",
      section: "Key Store",
      label: "Store visual style and banners",
      kind: "STORE_BANNER",
      instruction: "Capture store decoration, banners, campaign strips, and visual theme evidence.",
      ready: storeReady
    },
    {
      id: "tiktok-brand-search",
      section: "Cross Platform Evidence",
      label: "TikTok Shop brand/store search",
      kind: "SOCIAL_ACCOUNT",
      instruction: "Open TikTok/TikTok Shop, search the store or brand name, and capture the mobile-style evidence.",
      targetUrl: `https://www.tiktok.com/search?q=${keyword}`,
      ready: tiktokReady
    }
  ];
}

function buildTikTokSteps(project: ProjectSummary, currentUrl: string): CollectionStep[] {
  const keyword = encodeURIComponent(project.keyword);
  const tiktokReady = isTikTokPage(currentUrl);
  return [
    {
      id: "tiktok-shop-search",
      section: "TikTok Shop Manual Evidence",
      label: "TikTok Shop keyword search",
      kind: "SEARCH_RESULT",
      instruction: "Open TikTok Shop or TikTok search for the desired keyword and capture the first useful result surface.",
      targetUrl: `https://www.tiktok.com/search?q=${keyword}`,
      ready: tiktokReady
    },
    {
      id: "tiktok-product-detail",
      section: "TikTok Shop Manual Evidence",
      label: "TikTok product detail",
      kind: "PRODUCT_PAGE",
      instruction: "Open a candidate product or shop result and capture price, title, seller, and visible trust signals.",
      ready: tiktokReady && !currentUrl.endsWith("/shop")
    },
    {
      id: "tiktok-store-detail",
      section: "TikTok Shop Manual Evidence",
      label: "TikTok store detail",
      kind: "STORE_HOME",
      instruction: "Open the store or seller profile and capture the visible store evidence.",
      ready: tiktokReady
    },
    {
      id: "tiktok-cross-platform",
      section: "Cross Platform Evidence",
      label: "TikTok brand/search screenshot",
      kind: "SOCIAL_ACCOUNT",
      instruction: "Search the store name or brand name and capture the full mobile-style TikTok evidence.",
      targetUrl: `https://www.tiktok.com/search?q=${keyword}`,
      ready: tiktokReady
    }
  ];
}

function initialPlatformUrl(platform: ResearchPlatform, keyword: string): string {
  if (platform === "TIKTOK_SHOP") {
    return TIKTOK_SHOP_URL;
  }
  return `https://shopee.co.id/search?keyword=${encodeURIComponent(keyword)}&page=0&sortBy=relevancy`;
}

function isShopeeSearchPage(value: string): boolean {
  return value.includes("shopee.co.id/search");
}

function isShopeeProductPage(value: string): boolean {
  if (!isShopeePage(value) || isShopeeSearchPage(value)) {
    return false;
  }
  return /-i\.\d+\.\d+/u.test(value) || value.includes("/product/") || /\/[^/?#]+-i\./u.test(value);
}

function isShopeeStorePage(value: string): boolean {
  if (!isShopeePage(value) || isShopeeSearchPage(value) || isShopeeProductPage(value)) {
    return false;
  }
  try {
    const parsed = new URL(value);
    return parsed.pathname !== "/" && !parsed.pathname.includes("verify");
  } catch {
    return false;
  }
}

function isShopeePage(value: string): boolean {
  return value.includes("shopee.co.id");
}

function isTikTokPage(value: string): boolean {
  return value.includes("tiktok.com");
}

function sameUrlIntent(current: string, target: string): boolean {
  try {
    const currentUrl = new URL(current);
    const targetUrl = new URL(target);
    return (
      currentUrl.hostname === targetUrl.hostname &&
      currentUrl.pathname === targetUrl.pathname &&
      currentUrl.searchParams.get("keyword") === targetUrl.searchParams.get("keyword") &&
      currentUrl.searchParams.get("sortBy") === targetUrl.searchParams.get("sortBy")
    );
  } catch {
    return false;
  }
}

function withStoreSort(value: string, sortBy: "pop" | "sales"): string {
  try {
    const url = new URL(value);
    url.searchParams.set("page", "0");
    url.searchParams.set("sortBy", sortBy);
    url.searchParams.set("tab", "0");
    return url.toString();
  } catch {
    return value;
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function normalizeUrl(value: string): string {
  if (/^https?:\/\//i.test(value) || value === "about:blank") {
    return value;
  }
  return `https://${value}`;
}

function appendLog(setter: (updater: (current: string[]) => string[]) => void, message: string): void {
  setter((current) => [message, ...current].slice(0, 8));
}
