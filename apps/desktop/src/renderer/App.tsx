import { FormEvent, PointerEvent, ReactNode, WheelEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Copy,
  Eye,
  ExternalLink,
  FileDown,
  FileText,
  Filter,
  Gauge,
  Globe2,
  ImagePlus,
  KeyRound,
  LayoutGrid,
  ListChecks,
  Maximize2,
  Minimize2,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Printer,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  Sun,
  Table2,
  TerminalSquare,
  Trash2,
  Rows3,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  AndroidAppRuntimeStatus,
  AndroidToolStatus,
  CollectionStage,
  CollectionState,
  DashboardSnapshot,
  ExtractedPageProduct,
  ManualEvidenceKind,
  ManualEvidencePayload,
  MarketplaceId,
  NewProjectInput,
  ProjectDetailPayload,
  ReportHtmlPayload,
  ReportSummary,
  SaveSettingsPayload,
  SettingsPayload
} from "../shared/contracts.js";
import { DEFAULT_REPORT_SECTIONS, type ReportSectionConfig } from "../shared/reportSections.js";
import { apiClient } from "./api/client.js";
import { type AppView, useUiStore } from "./store/uiStore.js";

const SHOPEE_HOME_URL = "https://shopee.co.id/";
const TIKTOK_SHOP_URL = "https://www.tiktok.com/shop";
const APP_DISPLAY_NAME = "MarketPlace Keyword Competitor Analysis";

const navItems: Array<{ id: AppView; label: string; icon: LucideIcon }> = [
  { id: "research", label: "New Research", icon: Search },
  { id: "projects", label: "Keyword Projects", icon: Table2 },
  { id: "reports", label: "Reports", icon: FileDown },
  { id: "settings", label: "Settings", icon: Settings }
];

type ResearchPlatform = Extract<MarketplaceId, "SHOPEE_ID" | "TIKTOK_SHOP">;
type PlatformViewMode = "desktop" | "mobile";
type ThemeMode = "dark" | "light";
type ResearchMode = "home" | "setup" | "collect";
type ProjectSummary = DashboardSnapshot["projects"][number];
type ProjectProductEvidence = ProjectDetailPayload["products"][number];

type AnalysisFormState = {
  keyword: string;
  productCategory: string;
  marketplace: ResearchPlatform;
  createdAt: string;
};

type CollectionSubAction = {
  id: string;
  label: string;
  mode: "screenshot" | "download" | "collect" | "sync" | "background";
  description: string;
  collectLabel?: string;
  captureMode?: "viewport" | "full-page";
  targetSelector?: string;
  guidance?: string;
  targetUrl?: string;
  preferredViewMode?: PlatformViewMode;
};

type CollectionStep = {
  id: string;
  stage: CollectionStage;
  section: string;
  label: string;
  kind: ManualEvidenceKind;
  mode?: "CAPTURE" | "PROCESS";
  captureMode?: "viewport" | "full-page";
  targetSelector?: string;
  substeps?: string[];
  subActions?: CollectionSubAction[];
  ownerType?: ManualEvidencePayload["ownerType"];
  ownerId?: string;
  instruction: string;
  targetUrl?: string;
  ready: boolean;
};

type CapturedPageImage = {
  toDataURL: () => string;
  getSize?: () => { width: number; height: number };
};

type FullPageScreenshot = {
  imageDataUrl: string;
  width: number;
  height: number;
  mode: "viewport" | "full-page";
  clipped?: boolean;
};

type ElementPageRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  pageHeight: number;
  scrollY: number;
};

type PendingEvidenceCapture = {
  payload: ManualEvidencePayload;
  stepLabel: string;
};

type BrowserCaptureStatus = {
  message: string;
  state: "idle" | "working" | "done" | "failed";
  actionLabel?: string;
};

const COLLECTION_STAGES: CollectionStage[] = ["KEYWORD_GENERAL", "PRODUCT_DETAILS", "EVALUATION_KEY_STORE"];

type RenderedProductDetailSnapshot = {
  storeName?: string;
  storeUrl?: string;
  storeType?: string;
  rating?: number;
  ratingText?: string;
  reviewText?: string;
  totalSoldText?: string;
  activeReviewFilter?: string;
  images: string[];
  videos: string[];
  description?: string;
  descriptionImages: string[];
  shopVouchers: string[];
  bundleDeals: string[];
  promotionCount?: number;
  reviews: Array<{
    type: "Positive Reviews" | "Negative Reviews";
    rating: number;
    ratingLabel: string;
    comment: string;
    reviewDate?: string;
    variation?: string;
  }>;
  reviewMediaImages: string[];
  reviewMediaVideos: string[];
};

type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type WebviewElement = HTMLElement & {
  capturePage?: () => Promise<CapturedPageImage>;
  executeJavaScript?: <T>(code: string) => Promise<T>;
  getURL?: () => string;
  loadURL?: (url: string) => Promise<void>;
  reload?: () => void;
  setZoomFactor?: (factor: number) => void;
  getZoomFactor?: () => number;
  print?: (options?: Record<string, unknown>) => void;
  printToPDF?: (options?: Record<string, unknown>) => Promise<Uint8Array>;
};

type WebviewNavigationEvent = Event & {
  url?: string;
  validatedURL?: string;
  errorCode?: number;
};

export default function App() {
  const activeView = useUiStore((state) => state.activeView);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");

  return (
    <div className={`mio-app ${themeMode === "light" ? "mio-light" : "mio-dark"} min-h-screen bg-ink-950 text-ink-100`}>
      <div className={["grid min-h-screen transition-[grid-template-columns] duration-300 ease-out", sidebarVisible ? "grid-cols-[264px_minmax(0,1fr)]" : "grid-cols-[minmax(0,1fr)]"].join(" ")}>
        <AnimatePresence>{sidebarVisible && <Sidebar onHide={() => setSidebarVisible(false)} />}</AnimatePresence>
        <main className="mio-main min-w-0 border-l border-white/8 bg-[linear-gradient(180deg,#10141d,#090b10_48%)]">
          {!sidebarVisible && (
            <button
              type="button"
              className="mio-sidebar-show secondary-button fixed left-4 top-4 z-[60] h-10 w-10 px-0"
              aria-label="Show sidebar"
              onClick={() => setSidebarVisible(true)}
            >
              <PanelLeftOpen size={17} />
            </button>
          )}
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
                {activeView === "research" && <ManualResearchExperience />}
                {activeView === "projects" && <ProjectsView />}
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

function Sidebar({ onHide }: { onHide: () => void }) {
  const activeView = useUiStore((state) => state.activeView);
  const setActiveView = useUiStore((state) => state.setActiveView);

  return (
    <motion.aside
      className="mio-sidebar flex min-h-screen flex-col bg-ink-900 px-4 py-5 transition-all duration-300 ease-out"
      initial={false}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -24, opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="mio-brand-mark flex h-9 w-9 items-center justify-center rounded-md bg-signal-blue/15 text-signal-blue">
          <Brain size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mio-brand-title text-sm font-semibold leading-5">MarketPlace Keyword</div>
          <div className="mio-brand-subtitle text-xs leading-5 text-ink-500">Competitor Analysis</div>
        </div>
        <button
          type="button"
          className="secondary-button h-9 w-9 shrink-0 px-0"
          aria-label="Hide sidebar"
          title="Hide sidebar"
          onClick={onHide}
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={[
                "mio-nav-button flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition",
                active ? "mio-nav-active bg-white/9 text-white shadow-glow" : "text-ink-300 hover:bg-white/6 hover:text-white"
              ].join(" ")}
              onClick={() => setActiveView(item.id)}
            >
              <Icon size={17} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto rounded-md border border-white/8 bg-white/5 p-3 transition-opacity duration-300">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-ink-300">
          <ShieldCheck size={14} />
          Local Evidence Vault
        </div>
        <div className="text-xs leading-5 text-ink-500">
          Keyword projects, screenshots, reports, browser sessions, and keys stay on this machine.
        </div>
      </div>
    </motion.aside>
  );
}

function TopBar({ themeMode, onThemeToggle }: { themeMode: ThemeMode; onThemeToggle: () => void }) {
  return (
    <header className="flex h-16 items-center justify-between px-8">
      <div>
        <div className="text-xs uppercase tracking-[0.16em] text-ink-500">{APP_DISPLAY_NAME}</div>
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

  const resetAnalysis = () => {
    setActiveProject(null);
    setForm({
      keyword: "",
      productCategory: "",
      marketplace: "SHOPEE_ID",
      createdAt: new Date().toISOString()
    });
    setBrowserUrl(SHOPEE_HOME_URL);
    setMode("setup");
  };

  if (activeProject.marketplace === "TIKTOK_SHOP") {
    return <AndroidTikTokCollector project={activeProject} productCategory={form.productCategory} onNewAnalysis={resetAnalysis} />;
  }

  return (
    <GuidedBrowserCollector
      project={activeProject}
      productCategory={form.productCategory}
      browserUrl={browserUrl}
      onBrowserUrlChange={setBrowserUrl}
      onNewAnalysis={resetAnalysis}
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

function AndroidTikTokCollector({
  project,
  productCategory,
  onNewAnalysis,
  exitLabel = "New Analysis"
}: {
  project: ProjectSummary;
  productCategory: string;
  onNewAnalysis: () => void;
  exitLabel?: string;
}) {
  const queryClient = useQueryClient();
  const androidStatus = useQuery({
    queryKey: ["android-status"],
    queryFn: apiClient.androidStatus,
    refetchInterval: 5000
  });
  const apkCandidates = useQuery({
    queryKey: ["android-apk-candidates"],
    queryFn: apiClient.androidApkCandidates
  });
  const status = androidStatus.data;
  const [selectedAvd, setSelectedAvd] = useState("");
  const [apkPath, setApkPath] = useState("");
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [collectedSteps, setCollectedSteps] = useState<Record<string, string>>({});
  const [visibleText, setVisibleText] = useState("");
  const [activityLog, setActivityLog] = useState<string[]>([
    "TikTok Shop uses the Android Emulator workspace. Launch an AVD, install TikTok, then capture each mobile step."
  ]);
  const runtime = status?.tiktokRuntime;
  const steps = useMemo(() => buildAndroidTikTokSteps(project, status), [project, status]);
  const activeStep = steps[activeStepIndex] ?? steps[0];
  const collectedCount = steps.filter((step) => collectedSteps[step.id]).length;
  const bootedDevice = Boolean(status?.devices.some((device) => device.bootCompleted));

  useEffect(() => {
    if (!selectedAvd && status?.avds[0]) {
      setSelectedAvd(status.avds[0].name);
    }
  }, [selectedAvd, status?.avds]);

  useEffect(() => {
    const candidate = apkCandidates.data?.[0];
    if (!apkPath && candidate) {
      setApkPath(candidate.path);
    }
  }, [apkCandidates.data, apkPath]);

  const startEmulator = useMutation({
    mutationFn: () => apiClient.startAndroidEmulator({ avdName: selectedAvd || undefined }),
    onSuccess: async () => {
      appendLog(setActivityLog, `Android emulator launch requested${selectedAvd ? ` for ${selectedAvd}` : ""}.`);
      await androidStatus.refetch();
    },
    onError: (error) => appendLog(setActivityLog, error instanceof Error ? error.message : "Could not start Android emulator.")
  });
  const installApk = useMutation({
    mutationFn: () => apiClient.installAndroidApk({ apkPath }),
    onSuccess: async () => {
      appendLog(setActivityLog, "TikTok APK install completed.");
      await androidStatus.refetch();
    },
    onError: (error) => appendLog(setActivityLog, error instanceof Error ? error.message : "Could not install TikTok APK.")
  });
  const openTikTok = useMutation({
    mutationFn: apiClient.openTikTokAndroid,
    onSuccess: async () => {
      appendLog(setActivityLog, "TikTok opened on the Android device.");
      await androidStatus.refetch();
    },
    onError: (error) => appendLog(setActivityLog, error instanceof Error ? error.message : "Could not open TikTok.")
  });
  const recoverTikTok = useMutation({
    mutationFn: apiClient.recoverTikTokAndroid,
    onSuccess: async () => {
      appendLog(setActivityLog, "TikTok was force-stopped and reopened. App data, install state, and login data were preserved.");
      await androidStatus.refetch();
    },
    onError: (error) => appendLog(setActivityLog, error instanceof Error ? error.message : "Could not recover TikTok.")
  });
  const extractVisibleText = useMutation({
    mutationFn: apiClient.androidVisibleText,
    onSuccess: (result) => {
      setVisibleText(result.text);
      appendLog(setActivityLog, result.text ? "Android visible text extracted from the active screen." : "Android visible text extraction returned no readable text.");
    },
    onError: (error) => appendLog(setActivityLog, error instanceof Error ? error.message : "Could not extract Android visible text.")
  });
  const captureEvidence = useMutation({
    mutationFn: (step: CollectionStep) =>
      apiClient.captureAndroidEvidence({
        projectId: project.id,
        stepId: step.id,
        label: step.label,
        kind: step.kind,
        note: step.instruction,
        metadata: {
          source: "android-emulator",
          keyword: project.keyword,
          productCategory,
          marketplace: project.marketplace,
          capturedAt: new Date().toISOString()
        }
      }),
    onSuccess: async (result, step) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setCollectedSteps((current) => ({ ...current, [step.id]: result.assetPath }));
      appendLog(setActivityLog, `Captured Android evidence: ${step.label}.`);
      setActiveStepIndex((current) => Math.min(current + 1, steps.length - 1));
    },
    onError: (error) => appendLog(setActivityLog, error instanceof Error ? error.message : "Could not capture Android evidence.")
  });

  async function pickApk() {
    const picked = await window.marketplaceOS?.platform?.pickFile?.();
    if (picked) {
      setApkPath(picked);
    }
  }

  function selectDetectedApk(path: string) {
    setApkPath(path);
    appendLog(setActivityLog, "Selected detected TikTok APK from local Downloads.");
  }

  return (
    <section className="grid grid-cols-[360px_minmax(0,1fr)] gap-5">
      <aside className="space-y-5">
        <Panel title="TikTok Analysis Session" icon={Smartphone}>
          <div className="space-y-3 text-sm text-ink-300">
            <InfoLine label="Keyword" value={project.keyword} />
            <InfoLine label="Category" value={project.productCategory ?? productCategory} />
            <InfoLine label="Platform" value="TikTok Shop Android" />
            <InfoLine label="Created" value={formatDateTime(project.createdAt)} />
          </div>
          <div className="mt-4 rounded-md border border-white/8 bg-white/5 p-3 text-xs leading-5 text-ink-300">
            Launch Android, install or open TikTok, log in with Gmail if needed, then enter TikTok Shop manually. Closing the emulator keeps the AVD data partition, installed apps, and login state.
          </div>
          <button className="secondary-button mt-5" type="button" onClick={onNewAnalysis}>
            <ClipboardCheck size={16} />
            {exitLabel}
          </button>
        </Panel>

        <Panel title="Mobile Collection Steps" icon={ListChecks}>
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
      </aside>

      <div className="space-y-5">
        <Panel
          title="Android Emulator Workspace"
          icon={Smartphone}
          action={
            <button className="secondary-button h-9 w-auto px-3" type="button" onClick={() => void androidStatus.refetch()}>
              <RefreshCcw size={15} />
              Refresh
            </button>
          }
        >
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:grid-cols-7">
            <AndroidStatusTile label="ADB" ready={Boolean(status?.adbPath)} value={status?.adbPath ? "Detected" : "Missing"} />
            <AndroidStatusTile label="Java" ready={Boolean(status?.javaAvailable)} value={status?.javaAvailable ? "Detected" : "Missing"} />
            <AndroidStatusTile label="Emulator" ready={Boolean(status?.emulatorPath)} value={status?.emulatorPath ? "Detected" : "Missing"} />
            <AndroidStatusTile label="AVD" ready={Boolean(status?.avds.length)} value={status?.avds[0]?.name ?? "None"} />
            <AndroidStatusTile
              label="Device"
              ready={Boolean(status?.devices.some((device) => device.bootCompleted))}
              value={
                status?.devices[0]
                  ? `${status.devices[0].model ?? status.devices[0].id}${status.devices[0].bootCompleted ? " booted" : " booting"}`
                  : "None"
              }
            />
            <AndroidStatusTile label="TikTok" ready={Boolean(status?.tiktokInstalled)} value={status?.tiktokPackage ?? "Not installed"} />
            <AndroidStatusTile
              label="Runtime"
              ready={runtime?.state === "responding" || Boolean(status?.ready)}
              value={runtime ? formatAndroidRuntimeState(runtime.state) : "Unknown"}
            />
          </div>

          <div className="mt-4 rounded-md border border-white/8 bg-white/5 p-3 text-xs leading-5 text-ink-300">
            Emulator launch is persistent by design. The app does not wipe Android, uninstall TikTok, clear app data, or reset Google login when the emulator is closed.
          </div>

          {runtime?.activeAnr && (
            <div className="mt-5 rounded-md border border-signal-rose/35 bg-signal-rose/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-signal-rose">
                <AlertTriangle size={16} />
                TikTok is not responding
              </div>
              <div className="text-xs leading-5 text-ink-300">
                Android reported an ANR in TikTok. Recovery force-stops and reopens TikTok only; it keeps the emulator profile, installed app, and account data intact.
                {runtime.lastAnrReason ? ` Last reason: ${runtime.lastAnrReason}` : ""}
              </div>
              <button className="primary-button mt-3 w-auto px-4" type="button" onClick={() => recoverTikTok.mutate()} disabled={recoverTikTok.isPending || !status?.tiktokInstalled}>
                <RefreshCcw size={16} />
                {recoverTikTok.isPending ? "Recovering TikTok" : "Recover TikTok"}
              </button>
            </div>
          )}

          <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <select value={selectedAvd} onChange={(event) => setSelectedAvd(event.target.value)} className="input">
              <option value="">{status?.avds.length ? "Use first available emulator" : "No Android emulator profile detected"}</option>
              {(status?.avds ?? []).map((avd) => (
                <option key={avd.name} value={avd.name}>
                  {avd.name}
                </option>
              ))}
            </select>
            <button className="primary-button w-auto px-4" type="button" onClick={() => startEmulator.mutate()} disabled={startEmulator.isPending || !status?.emulatorPath || !status?.avds.length}>
              <Smartphone size={16} />
              Launch Emulator
            </button>
          </div>

          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3">
            <input className="input" value={apkPath} onChange={(event) => setApkPath(event.target.value)} placeholder="TikTok APK path" />
            <button className="secondary-button w-auto px-4" type="button" onClick={() => void pickApk()}>
              Select APK
            </button>
            <button className="primary-button w-auto px-4" type="button" onClick={() => installApk.mutate()} disabled={installApk.isPending || !apkPath.trim() || !bootedDevice}>
              Install TikTok
            </button>
          </div>

          {(apkCandidates.data?.length ?? 0) > 0 && (
            <div className="mt-3 space-y-2">
              {apkCandidates.data?.slice(0, 3).map((candidate) => (
                <button
                  key={candidate.path}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-white/8 bg-white/5 px-3 py-2 text-left text-xs text-ink-300 transition hover:bg-white/8 hover:text-white"
                  onClick={() => selectDetectedApk(candidate.path)}
                >
                  <span className="truncate">{candidate.name}</span>
                  <span className="shrink-0 text-ink-500">{formatFileSize(candidate.sizeBytes)}</span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <button className="secondary-button" type="button" onClick={() => openTikTok.mutate()} disabled={openTikTok.isPending || !status?.tiktokInstalled}>
              <ExternalLink size={16} />
              Open TikTok App
            </button>
            <button className="secondary-button" type="button" onClick={() => recoverTikTok.mutate()} disabled={recoverTikTok.isPending || !status?.tiktokInstalled}>
              <RefreshCcw size={16} />
              {recoverTikTok.isPending ? "Recovering" : "Recover TikTok"}
            </button>
            <button className="secondary-button" type="button" onClick={() => extractVisibleText.mutate()} disabled={extractVisibleText.isPending || !bootedDevice}>
              <TerminalSquare size={16} />
              {extractVisibleText.isPending ? "Reading Text" : "Extract Text"}
            </button>
            <button className="primary-button" type="button" onClick={() => captureEvidence.mutate(activeStep)} disabled={captureEvidence.isPending || !activeStep.ready}>
              <ClipboardCheck size={16} />
              {captureEvidence.isPending ? "Capturing" : "Capture Active Step"}
            </button>
          </div>

          <div className="mt-5 rounded-[18px] border border-white/8 bg-white/5 p-4">
            <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-ink-500">
              Active Step {activeStepIndex + 1}/{steps.length}
            </div>
            <div className="mb-2 text-lg font-semibold text-white">{activeStep.label}</div>
            <div className="text-sm leading-6 text-ink-300">{activeStep.instruction}</div>
            <div className={["mt-3 inline-flex rounded-full px-3 py-1 text-xs", activeStep.ready ? "bg-signal-green/15 text-signal-green" : "bg-white/8 text-ink-400"].join(" ")}>
              {activeStep.ready ? "Ready to capture from Android" : "Launch Android, install TikTok, and open TikTok Shop manually first"}
            </div>
            {visibleText && (
              <pre className="mt-4 max-h-32 overflow-auto whitespace-pre-wrap rounded-md border border-white/8 bg-black/20 p-3 text-xs leading-5 text-ink-300">
                {visibleText}
              </pre>
            )}
          </div>

          {(status?.diagnostics.length ?? 0) > 0 && (
            <div className="mt-5 space-y-2">
              {status?.diagnostics.map((diagnostic) => (
                <div key={diagnostic} className="rounded-md border border-signal-amber/25 bg-signal-amber/10 px-3 py-2 text-xs leading-5 text-signal-amber">
                  {diagnostic}
                </div>
              ))}
            </div>
          )}
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
      </div>
    </section>
  );
}

function GuidedBrowserCollector({
  project,
  productCategory,
  browserUrl,
  onBrowserUrlChange,
  onNewAnalysis,
  onCollectionCompleted,
  exitLabel = "New Analysis"
}: {
  project: ProjectSummary;
  productCategory: string;
  browserUrl: string;
  onBrowserUrlChange: (url: string) => void;
  onNewAnalysis: () => void;
  onCollectionCompleted?: (projectId: string) => void;
  exitLabel?: string;
}) {
  const webviewRef = useRef<WebviewElement | null>(null);
  const queryClient = useQueryClient();
  const platform = project.marketplace as ResearchPlatform;
  const savedCollectionState = projectCollectionState(project);
  const initialUrl = savedCollectionState.browserUrl ?? browserUrl;
  const [viewMode, setViewMode] = useState<PlatformViewMode>(savedCollectionState.viewMode ?? (platform === "TIKTOK_SHOP" ? "mobile" : "desktop"));
  const [activeStage, setActiveStage] = useState<CollectionStage>(savedCollectionState.stage);
  const [expanded, setExpanded] = useState(false);
  const [address, setAddress] = useState(initialUrl);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [collectedSteps, setCollectedSteps] = useState<Record<string, string>>(savedCollectionState.stepAssetPaths);
  const [stageCompleted, setStageCompleted] = useState<CollectionState["stageCompleted"]>(savedCollectionState.stageCompleted);
  const [reviewingKeyProducts, setReviewingKeyProducts] = useState(false);
  const [reviewingEvaluation, setReviewingEvaluation] = useState(false);
  const [activeSubActionId, setActiveSubActionId] = useState<string | undefined>(undefined);
  const [analysisSessionCollapsed, setAnalysisSessionCollapsed] = useState(true);
  const [activitySidebarOpen, setActivitySidebarOpen] = useState(false);
  const [pageTextPreview, setPageTextPreview] = useState("");
  const [zoomFactor, setZoomFactor] = useState(1);
  const [pendingCapture, setPendingCapture] = useState<PendingEvidenceCapture | null>(null);
  const [manualNoticeVisible, setManualNoticeVisible] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<BrowserCaptureStatus>({
    message: "Waiting for target page",
    state: "idle"
  });
  const [activityLog, setActivityLog] = useState<string[]>([
    "Open each target page manually, then capture the matching report step."
  ]);
  const projectDetail = useQuery({
    queryKey: ["project-detail", project.id],
    queryFn: () => apiClient.projectDetail(project.id)
  });

  const runAnalysis = useMutation({
    mutationFn: () => apiClient.analyzeProject(project.id),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["project-detail", project.id] })
      ]);
      appendLog(setActivityLog, `AI scoring saved with ${result.provider}.`);
    },
    onError: (error) => {
      appendLog(setActivityLog, error instanceof Error ? error.message : "AI scoring could not be completed.");
    }
  });

  const allSteps = useMemo(
    () => buildCollectionSteps(project, platform, currentUrl, projectDetail.data),
    [currentUrl, platform, project, projectDetail.data]
  );
  const steps = useMemo(() => allSteps.filter((step) => step.stage === activeStage), [activeStage, allSteps]);
  const activeStep = steps[activeStepIndex] ?? steps[0] ?? allSteps[0];
  const activeSubAction = activeStep?.subActions?.find((action) => action.id === activeSubActionId) ?? activeStep?.subActions?.[0];
  const activeSubActionReady = activeSubAction?.id === "shop-homepage" ? isShopeeStorePage(currentUrl) : activeStep?.ready;
  const activeTargetUrl = activeSubAction?.targetUrl ?? activeStep?.targetUrl;
  const activeSubActionCounts = useMemo(
    () => activeStep ? collectionSubActionCounts(activeStep, projectDetail.data) : {},
    [activeStep, projectDetail.data]
  );
  const controllerStep = activeStep
    ? {
        ...activeStep,
        ready: Boolean(activeSubActionReady),
        targetUrl: activeTargetUrl
      }
    : activeStep;
  const selectedKeyProducts = useMemo(
    () => selectKeyProductCandidates(projectDetail.data?.products ?? []),
    [projectDetail.data?.products]
  );
  const collectedCount = allSteps.filter((step) => isCollectionStepComplete(step, collectedSteps)).length;
  const stageCollectedCount = steps.filter((step) => isCollectionStepComplete(step, collectedSteps)).length;
  const collectionProgressPercent = allSteps.length > 0 ? Math.round((collectedCount / allSteps.length) * 100) : 0;
  const isManualActionState =
    platform === "SHOPEE_ID" &&
    (isProtectedShopeePage(currentUrl) || isShopeeLoginPage(currentUrl) || loadState === "failed");

  useEffect(() => {
    if (!isManualActionState) {
      setManualNoticeVisible(false);
      return;
    }
    setManualNoticeVisible(true);
    const timer = window.setTimeout(() => setManualNoticeVisible(false), 5000);
    return () => window.clearTimeout(timer);
  }, [isManualActionState, currentUrl]);

  useEffect(() => {
    if (captureStatus.state !== "done") {
      return;
    }
    const timer = window.setTimeout(() => {
      setCaptureStatus({ message: "Waiting for target page", state: "idle" });
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [captureStatus.message, captureStatus.state]);

  useEffect(() => {
    setActiveSubActionId(undefined);
  }, [activeStep?.id]);

  const saveCollectionState = useMutation({
    mutationFn: (state: CollectionState) => apiClient.saveCollectionState(project.id, state),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["project-detail", project.id] })
      ]);
    },
    onError: (error) => {
      appendLog(setActivityLog, error instanceof Error ? error.message : "Could not save collection progress.");
    }
  });

  function buildCollectionState(overrides: Partial<CollectionState> = {}): CollectionState {
    const stepAssetPaths = overrides.stepAssetPaths ?? collectedSteps;
    const completedStepIds = Object.keys(stepAssetPaths);
    const nextStage = overrides.stage ?? activeStage;
    return {
      stage: nextStage,
      stageLabel: overrides.stageLabel ?? collectionStageLabel(nextStage),
      progressPercent: overrides.progressPercent ?? collectionProgress(allSteps, stepAssetPaths),
      completedStepIds: overrides.completedStepIds ?? completedStepIds,
      stepAssetPaths,
      stageCompleted: overrides.stageCompleted ?? stageCompleted,
      currentStepId: overrides.currentStepId ?? activeStep?.id,
      browserUrl: overrides.browserUrl ?? currentUrl,
      viewMode: overrides.viewMode ?? viewMode,
      savedAt: new Date().toISOString()
    };
  }

  function persistCollectionState(overrides: Partial<CollectionState> = {}) {
    saveCollectionState.mutate(buildCollectionState(overrides));
  }

  const saveEvidence = useMutation({
    mutationFn: apiClient.saveManualEvidence,
    onSuccess: async (result, payload) => {
      const step = steps.find((item) => item.id === payload.stepId) ?? activeStep;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["project-detail", project.id] })
      ]);
      const productDetailSubAction = typeof payload.metadata?.productDetailSubAction === "string" ? payload.metadata.productDetailSubAction : undefined;
      const progressKey = stepProgressKey(step, productDetailSubAction);
      const nextCollectedSteps = { ...collectedSteps, [progressKey]: result.assetPath };
      setCollectedSteps(nextCollectedSteps);
      setPendingCapture(null);
      const productDetailSubActionLabel = typeof payload.metadata?.productDetailSubActionLabel === "string" ? payload.metadata.productDetailSubActionLabel : undefined;
      appendLog(
        setActivityLog,
        `Captured ${step.label}${productDetailSubActionLabel ? ` / ${productDetailSubActionLabel}` : ""}${result.extractedProductCount ? ` and extracted ${result.extractedProductCount} product rows` : ""}.`
      );
      const completedStageSteps = steps.every((item) => isCollectionStepComplete(item, nextCollectedSteps));
      if (step.stage === "EVALUATION_KEY_STORE" && completedStageSteps) {
        persistCollectionState({
          stepAssetPaths: nextCollectedSteps,
          completedStepIds: Object.keys(nextCollectedSteps),
          progressPercent: collectionProgress(allSteps, nextCollectedSteps),
          currentStepId: step.id
        });
        completeCurrentStage(nextCollectedSteps);
        return;
      }
      const stayOnProductDetail = step.stage === "PRODUCT_DETAILS" && Boolean(productDetailSubAction);
      const nextStepIndex = stayOnProductDetail ? activeStepIndex : Math.min(activeStepIndex + 1, steps.length - 1);
      setActiveStepIndex(nextStepIndex);
      persistCollectionState({
        stepAssetPaths: nextCollectedSteps,
        completedStepIds: Object.keys(nextCollectedSteps),
        progressPercent: collectionProgress(allSteps, nextCollectedSteps),
        currentStepId: steps[nextStepIndex]?.id ?? step.id
      });
    },
    onError: (error) => {
      appendLog(setActivityLog, error instanceof Error ? error.message : "Could not capture the current step.");
    }
  });

  const attachFileEvidence = useMutation({
    mutationFn: async (step: CollectionStep) => {
      const picked = await window.marketplaceOS?.platform?.pickFile?.();
      if (!picked) {
        throw new Error("No screenshot was selected.");
      }
      return apiClient.saveManualFileEvidence({
        projectId: project.id,
        stepId: step.id,
        label: step.label,
        kind: step.kind,
        ownerType: step.ownerType,
        ownerId: step.ownerId,
        sourcePath: picked,
        sourceUrl: currentUrl,
        note: step.instruction,
        metadata: {
          section: step.section,
          keyword: project.keyword,
          productCategory,
          marketplace: platform,
          evidenceMode: "attached-screenshot",
          capturedAt: new Date().toISOString()
        }
      });
    },
    onSuccess: async (result, step) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      const nextCollectedSteps = { ...collectedSteps, [step.id]: result.assetPath };
      setCollectedSteps(nextCollectedSteps);
      appendLog(setActivityLog, `Attached screenshot for ${step.label}.`);
      const nextStepIndex = Math.min(activeStepIndex + 1, steps.length - 1);
      setActiveStepIndex(nextStepIndex);
      persistCollectionState({
        stepAssetPaths: nextCollectedSteps,
        completedStepIds: Object.keys(nextCollectedSteps),
        progressPercent: collectionProgress(allSteps, nextCollectedSteps),
        currentStepId: steps[nextStepIndex]?.id ?? step.id
      });
    },
    onError: (error) => {
      appendLog(setActivityLog, error instanceof Error ? error.message : "Could not attach screenshot evidence.");
    }
  });

  useEffect(() => {
    setAddress(initialUrl);
    setCurrentUrl(initialUrl);
  }, [initialUrl]);

  useEffect(() => {
    if (activeStage !== "KEYWORD_GENERAL") {
      setReviewingKeyProducts(false);
    }
    if (activeStage !== "EVALUATION_KEY_STORE") {
      setReviewingEvaluation(false);
    }
  }, [activeStage]);

  function switchCollectionStage(stage: CollectionStage) {
    const stageSteps = allSteps.filter((step) => step.stage === stage);
    const firstIncompleteIndex = stageSteps.findIndex((step) => !isCollectionStepComplete(step, collectedSteps));
    const nextIndex = firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0;
    setActiveStage(stage);
    setActiveStepIndex(nextIndex);
    setReviewingKeyProducts(false);
    const showEvaluation = stage === "EVALUATION_KEY_STORE" && (stageSteps[nextIndex]?.id === "evaluation-phase-scoring" || !stageSteps.some((step) => step.id === "evaluation-phase-scoring" && isCollectionStepComplete(step, collectedSteps)));
    setReviewingEvaluation(showEvaluation);
    if (showEvaluation) {
      setExpanded(false);
    }
    persistCollectionState({
      stage,
      stageLabel: collectionStageLabel(stage),
      currentStepId: stageSteps[nextIndex]?.id,
      browserUrl: currentUrl,
      viewMode
    });
  }

  function selectSubAction(actionId: string) {
    setActiveSubActionId(actionId);
    const action = activeStep?.subActions?.find((item) => item.id === actionId);
    if (action?.preferredViewMode) {
      setViewMode(action.preferredViewMode);
      persistCollectionState({ viewMode: action.preferredViewMode });
    }
  }

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

  function applyZoom(nextZoom: number) {
    const clamped = Math.max(0.5, Math.min(2, Number(nextZoom.toFixed(2))));
    setZoomFactor(clamped);
    webviewRef.current?.setZoomFactor?.(clamped);
  }

  function printCurrentPage() {
    const webview = webviewRef.current;
    if (!webview?.print) {
      appendLog(setActivityLog, "Print is not available in the current embedded browser runtime.");
      return;
    }
    webview.print({ printBackground: true });
    appendLog(setActivityLog, "Opened the browser print workflow for the current page.");
  }

  function saveProgress() {
    persistCollectionState();
    appendLog(setActivityLog, "Collection progress saved. You can close the browser and continue from this project later.");
  }

  function completeCurrentStage(nextCollectedSteps = collectedSteps) {
    const nextStage = nextCollectionStage(activeStage);
    const nextStageCompleted = {
      ...stageCompleted,
      [activeStage]: true
    };
    setStageCompleted(nextStageCompleted);
    if (nextStage) {
      setActiveStage(nextStage);
      setActiveStepIndex(0);
      const enteringEvaluation = nextStage === "EVALUATION_KEY_STORE";
      setReviewingEvaluation(enteringEvaluation);
      if (enteringEvaluation) {
        setExpanded(false);
      }
      persistCollectionState({
        stage: nextStage,
        stageLabel: collectionStageLabel(nextStage),
        stageCompleted: nextStageCompleted,
        stepAssetPaths: nextCollectedSteps,
        completedStepIds: Object.keys(nextCollectedSteps),
        progressPercent: collectionProgress(allSteps, nextCollectedSteps),
        currentStepId: allSteps.find((step) => step.stage === nextStage)?.id
      });
      appendLog(setActivityLog, `${collectionStageLabel(activeStage)} completed. Continue with ${collectionStageLabel(nextStage)}.`);
      if (activeStage === "PRODUCT_DETAILS" && enteringEvaluation) {
        appendLog(setActivityLog, "Opened Evaluation Phase automatically. Review Potential Stores, then continue Key Store collection.");
      }
      return;
    }
    persistCollectionState({
      stageCompleted: nextStageCompleted,
      stepAssetPaths: nextCollectedSteps,
      completedStepIds: Object.keys(nextCollectedSteps),
      progressPercent: 100,
      currentStepId: activeStep?.id
    });
    appendLog(setActivityLog, "Shopee collection flow marked complete. Review the project inspector before generating the report.");
    window.setTimeout(() => onCollectionCompleted?.(project.id), 500);
  }

  function openKeyProductTableReview() {
    setExpanded(false);
    setReviewingKeyProducts(true);
    appendLog(setActivityLog, "Built the AI-assisted Key Product table from Relevance and Top Sales evidence.");
  }

  function openEvaluationReview() {
    setExpanded(false);
    setReviewingEvaluation(true);
    appendLog(setActivityLog, "Opened Evaluation Phase in the collection workspace. Score Potential Stores before collecting Key Store evidence.");
  }

  function startProductDetailCollection() {
    const processStep = allSteps.find((step) => step.id === "key-product-table");
    const nextCollectedSteps = processStep
      ? { ...collectedSteps, [processStep.id]: "processed:key-product-table" }
      : collectedSteps;
    setCollectedSteps(nextCollectedSteps);
    setReviewingKeyProducts(false);
    completeCurrentStage(nextCollectedSteps);
  }

  function startKeyStoreCollection() {
    const processStep = allSteps.find((step) => step.id === "evaluation-phase-scoring");
    const nextCollectedSteps = processStep
      ? { ...collectedSteps, [processStep.id]: "processed:evaluation-phase-scoring" }
      : collectedSteps;
    setCollectedSteps(nextCollectedSteps);
    setReviewingEvaluation(false);
    const nextIndex = Math.max(0, steps.findIndex((step) => step.id !== "evaluation-phase-scoring"));
    setActiveStepIndex(nextIndex);
    persistCollectionState({
      stepAssetPaths: nextCollectedSteps,
      completedStepIds: Object.keys(nextCollectedSteps),
      progressPercent: collectionProgress(allSteps, nextCollectedSteps),
      currentStepId: steps[nextIndex]?.id ?? processStep?.id
    });
    appendLog(setActivityLog, "Evaluation Phase marked processed. Continue with Key Store store-page evidence.");
  }

  function runStagePrimaryAction() {
    if (activeStage === "KEYWORD_GENERAL") {
      openKeyProductTableReview();
      return;
    }
    if (activeStage === "EVALUATION_KEY_STORE") {
      openEvaluationReview();
      return;
    }
    completeCurrentStage();
  }

  async function captureAndSaveEvidence(step: CollectionStep, subAction?: CollectionSubAction) {
    try {
      setCaptureStatus({ message: "Targeted page received", state: "working" });
      appendLog(setActivityLog, `Capturing rendered page snapshot for ${subAction ? `${step.label} / ${subAction.label}` : step.label}...`);
      const payload = await buildManualEvidencePayload(step, subAction);
      if (!subAction || subAction.mode === "screenshot") {
        setPendingCapture({
          payload,
          stepLabel: subAction ? `${step.label} / ${subAction.label}` : step.label
        });
        appendLog(setActivityLog, "Review the screenshot, crop if needed, then save the evidence.");
        return;
      }
      appendLog(setActivityLog, `Saving ${subAction.label} data from the current page.`);
      saveEvidence.mutate(payload);
    } catch (error) {
      appendLog(setActivityLog, error instanceof Error ? error.message : "Could not prepare rendered page snapshot.");
    }
  }

  async function buildManualEvidencePayload(step: CollectionStep, subAction?: CollectionSubAction): Promise<ManualEvidencePayload> {
    const webview = webviewRef.current;
    if (!webview?.capturePage) {
      throw new Error("The embedded browser cannot capture this page in the current runtime.");
    }
    const captureMode = subAction?.captureMode ?? step.captureMode ?? "full-page";
    const targetSelector = subAction?.targetSelector ?? step.targetSelector;
    setCaptureStatus({
      message: targetSelector
        ? "Capturing target section"
        : captureMode === "viewport" ? "Capturing visible viewport" : "Capturing full page screenshot",
      state: "working"
    });
    const screenshot = targetSelector
      ? await captureElementScreenshot(webview, targetSelector)
      : captureMode === "viewport"
        ? await captureViewportScreenshot(webview)
        : await captureFullPageScreenshot(webview);
    const sourceUrl = webview.getURL?.() ?? currentUrl;
    setCaptureStatus({ message: "Downloading HTML from #main", state: "working" });
    const snapshot = await extractRenderedPageSnapshot(webview)
      .then((value) => {
        setCaptureStatus({
          message: value.html ? "HTML download done" : "HTML download failed",
          state: value.html ? "done" : "failed",
          actionLabel: value.html ? undefined : "Download HTML"
        });
        return value;
      })
      .catch(() => {
        setCaptureStatus({ message: "HTML download failed", state: "failed", actionLabel: "Download HTML" });
        return {
          html: "",
          visibleText: "",
          products: [] as ExtractedPageProduct[],
          productDetail: {
            storeName: undefined,
            storeUrl: undefined,
            storeType: undefined,
            activeReviewFilter: undefined,
            images: [],
            videos: [],
            descriptionImages: [],
            shopVouchers: [],
            bundleDeals: [],
            promotionCount: 0,
            reviews: [],
            reviewMediaImages: [],
            reviewMediaVideos: []
          },
          storeDecorationImages: []
        };
      });
    const printPdfDataUrl = await webview.printToPDF?.({ printBackground: true })
      .then((data) => `data:application/pdf;base64,${uint8ArrayToBase64(data)}`)
      .catch(() => undefined);
    const structuredProductDetail = scopeProductDetailSnapshot(snapshot.productDetail, subAction?.id);
    return {
      projectId: project.id,
      stepId: step.id,
      label: step.label,
      kind: subActionEvidenceKind(step, subAction),
      ownerType: step.ownerType,
      ownerId: step.ownerId,
      sourceUrl: sourceUrl === "about:blank" ? undefined : sourceUrl,
      imageDataUrl: screenshot.imageDataUrl,
      width: screenshot.width,
      height: screenshot.height,
      note: step.instruction,
      pageHtml: snapshot.html,
      visibleText: snapshot.visibleText,
      pagePdfDataUrl: printPdfDataUrl,
      extractedProducts: snapshot.products,
      metadata: {
        section: step.section,
        keyword: project.keyword,
        productCategory,
        marketplace: platform,
        viewMode,
        zoomFactor,
        screenshotMode: captureMode,
        actualScreenshotMode: screenshot.mode,
        screenshotClipped: screenshot.clipped,
        targetSelector,
        productDetailSubsteps: step.substeps,
        productDetailSubAction: subAction?.id,
        productDetailSubActionLabel: subAction?.label,
        productDetailSubActionMode: subAction?.mode,
        syncProductDetail: step.stage === "PRODUCT_DETAILS",
        structuredProductDetail,
        storeDecorationImages: snapshot.storeDecorationImages,
        extractedText: snapshot.visibleText,
        extractedProductCount: snapshot.products.length,
        capturedAt: new Date().toISOString()
      }
    };
  }

  async function extractCurrentPageText() {
    const webview = webviewRef.current;
    if (!webview) {
      appendLog(setActivityLog, "The embedded browser is not ready for text extraction.");
      return;
    }
    const text = await extractVisibleBrowserText(webview).catch((error: unknown) => {
      appendLog(setActivityLog, error instanceof Error ? error.message : "Could not extract browser text.");
      return "";
    });
    setPageTextPreview(text);
    appendLog(setActivityLog, text ? "Extracted visible page text from the current browser session." : "No readable browser text was found on the current page.");
  }

  async function downloadCurrentHtml() {
    const webview = webviewRef.current;
    if (!webview) {
      appendLog(setActivityLog, "The embedded browser is not ready for HTML download.");
      return;
    }
    setCaptureStatus({ message: "Downloading HTML from #main", state: "working" });
    const snapshot = await extractRenderedPageSnapshot(webview).catch((error: unknown) => {
      appendLog(setActivityLog, error instanceof Error ? `HTML extraction failed: ${error.message}` : "HTML extraction failed before a snapshot could be created.");
      return undefined;
    });
    if (!snapshot?.html) {
      setCaptureStatus({ message: "HTML download failed", state: "failed", actionLabel: "Download HTML" });
      appendLog(setActivityLog, "Could not download readable HTML from this page. Complete login/verification or reload the target page.");
      return;
    }
    const sourceUrl = webview.getURL?.() ?? currentUrl;
    try {
      const saved = await apiClient.saveHtmlSnapshot({
        projectId: project.id,
        label: `${project.keyword} browser-html`,
        sourceUrl: sourceUrl === "about:blank" ? undefined : sourceUrl,
        pageHtml: snapshot.html,
        visibleText: snapshot.visibleText
      });
      setCaptureStatus({ message: "HTML download done", state: "done" });
      appendLog(setActivityLog, `Saved the current #main HTML snapshot to ${saved.htmlPath}.`);
    } catch (error) {
      setCaptureStatus({ message: "HTML download failed", state: "failed", actionLabel: "Download HTML" });
      appendLog(setActivityLog, error instanceof Error ? `Could not save HTML snapshot: ${error.message}` : "Could not save the current HTML snapshot.");
    }
  }

  async function openTikTokAndroidFromShopeeStep() {
    await apiClient.openTikTokAndroid()
      .then(() => appendLog(setActivityLog, "TikTok opened in the Android emulator. Attach a screenshot after navigating to the target evidence."))
      .catch((error: unknown) => appendLog(setActivityLog, error instanceof Error ? error.message : "Could not open TikTok in Android."));
  }

  const userAgent =
    viewMode === "mobile"
      ? "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36"
      : undefined;

  const browserPanel = (
    <Panel
      title="Platform Browser"
      icon={Globe2}
      className={expanded ? "mio-browser-panel-expanded flex h-screen flex-col rounded-none border-0 p-0" : ""}
      action={
        <button className="secondary-button h-9 w-9 px-0" type="button" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? "Exit fullscreen" : "Expand browser"} title={expanded ? "Exit fullscreen" : "Expand browser"}>
          {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      }
    >
      <div className="mio-browser-toolbar mb-3 grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-white/8 bg-white/5 p-1">
          <SegmentButton
            active={viewMode === "desktop"}
            icon={Monitor}
            disabled={platform !== "SHOPEE_ID"}
            compact
            onClick={() => platform === "SHOPEE_ID" && setViewMode("desktop")}
          >
            Desktop
          </SegmentButton>
          <SegmentButton active={viewMode === "mobile"} icon={Smartphone} compact onClick={() => setViewMode("mobile")}>
            Mobile
          </SegmentButton>
        </div>
        <input value={address} onChange={(event) => setAddress(event.target.value)} className="input mio-address-input" aria-label="Browser address" />
        <div className="flex items-center gap-2">
          <button className="secondary-button w-10 px-0" type="button" onClick={goToAddress} aria-label="Go to address" title="Go">
            <ChevronRight size={15} />
          </button>
          <button className="secondary-button w-10 px-0" type="button" onClick={() => webviewRef.current?.reload?.()} aria-label="Reload browser" title="Reload">
            <RefreshCcw size={15} />
          </button>
          <button className="secondary-button w-10 px-0" type="button" onClick={() => applyZoom(zoomFactor - 0.1)} aria-label="Zoom out" title="Zoom out">
            <ZoomOut size={15} />
          </button>
          <button className="secondary-button w-10 px-0" type="button" onClick={() => applyZoom(zoomFactor + 0.1)} aria-label="Zoom in" title="Zoom in">
            <ZoomIn size={15} />
          </button>
          <button className="secondary-button w-10 px-0" type="button" onClick={printCurrentPage} aria-label="Print current page" title="Print current page">
            <Printer size={15} />
          </button>
          <button className="secondary-button w-10 px-0" type="button" onClick={() => void extractCurrentPageText()} aria-label="Extract visible page text" title="Extract visible page text">
            <TerminalSquare size={15} />
          </button>
        </div>
        <LoadStatePill state={loadState} />
      </div>

      <div className={["mio-browser-frame relative min-h-0 overflow-hidden border border-white/12 bg-black", expanded ? "flex-1 rounded-none" : "rounded-[18px]", viewMode === "mobile" && !expanded ? "mx-auto h-[720px] max-w-[430px]" : expanded ? "h-screen w-screen" : "h-[720px] w-full"].join(" ")}>
        <webview
          key={`${project.id}-${viewMode}`}
          ref={(node) => {
            webviewRef.current = node as WebviewElement | null;
          }}
          src={initialUrl}
          partition={`persist:mio-${platform.toLowerCase()}`}
          allowpopups
          useragent={userAgent}
          webpreferences="contextIsolation=yes, sandbox=yes"
        />
        {isManualActionState && (
          <button
            className="mio-warning-dot absolute right-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-signal-amber/35 bg-signal-amber/15 text-signal-amber shadow-sm backdrop-blur"
            type="button"
            onClick={() => setManualNoticeVisible(true)}
            aria-label="Show manual action notice"
            title="Manual action required"
          >
            <AlertTriangle size={16} />
          </button>
        )}
        <AnimatePresence>
          {isManualActionState && manualNoticeVisible && (
            <motion.div
              className="mio-manual-toast absolute right-4 top-16 z-30 max-w-[420px] rounded-xl border border-signal-amber/30 bg-signal-amber/12 px-4 py-3 text-sm leading-6 text-ink-200 shadow-sm backdrop-blur-xl"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.16 }}
            >
              <div className="mb-1 flex items-center gap-2 font-semibold text-white">
                <AlertTriangle size={16} className="text-signal-amber" />
                Manual action required
              </div>
              Shopee is showing login, verification, captcha, or a protected page. Complete it manually, then capture evidence after the target page is visible.
            </motion.div>
          )}
        </AnimatePresence>
        <BrowserCaptureStatusPill status={captureStatus} onAction={() => void downloadCurrentHtml()} />
        <FloatingStepController
          step={controllerStep}
          activeSubActionId={activeSubAction?.id}
          stepNumber={activeStepIndex + 1}
          stepTotal={steps.length}
          stageCollectedCount={stageCollectedCount}
          targetUrl={activeTargetUrl}
          captured={isCurrentCollectorTargetSaved(activeStep, activeSubAction?.id, collectedSteps)}
          subActionCounts={activeSubActionCounts}
          saving={saveEvidence.isPending}
          onOpenTarget={(subActionId) => {
            const selectedSubAction = subActionId
              ? activeStep.subActions?.find((action) => action.id === subActionId)
              : activeSubAction;
            if (selectedSubAction) {
              selectSubAction(selectedSubAction.id);
            }
            const selectedTargetUrl = selectedSubAction?.targetUrl ?? activeStep.targetUrl;
            if (selectedTargetUrl) {
              navigateTo(selectedTargetUrl);
            }
          }}
          onCollect={(subActionId) => {
            const selectedSubAction = subActionId
              ? activeStep.subActions?.find((action) => action.id === subActionId)
              : activeSubAction;
            if (selectedSubAction) {
              selectSubAction(selectedSubAction.id);
            }
            if (activeStep.mode === "PROCESS") {
              if (activeStep.id === "evaluation-phase-scoring") {
                openEvaluationReview();
              } else {
                openKeyProductTableReview();
              }
              return;
            }
            void captureAndSaveEvidence(activeStep, selectedSubAction);
          }}
          onSelectSubAction={selectSubAction}
          onAttachFile={activeStep.id === "tiktok-brand-search" ? () => attachFileEvidence.mutate(activeStep) : undefined}
          onOpenAndroid={activeStep.id === "tiktok-brand-search" ? () => void openTikTokAndroidFromShopeeStep() : undefined}
          onPrevious={() => setActiveStepIndex((current) => Math.max(0, current - 1))}
          onNext={() => setActiveStepIndex((current) => Math.min(steps.length - 1, current + 1))}
        />
      </div>
      {pageTextPreview && (
        <pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-md border border-white/8 bg-white/5 p-3 text-xs leading-5 text-ink-400">
          {pageTextPreview.slice(0, 4000)}
        </pre>
      )}
      {pendingCapture && (
        <ScreenshotReviewModal
          capture={pendingCapture}
          saving={saveEvidence.isPending}
          onCancel={() => setPendingCapture(null)}
          onSave={(payload) => saveEvidence.mutate(payload)}
        />
      )}
    </Panel>
  );

  const keyProductTablePanel = (
    <KeyProductTableReview
      products={selectedKeyProducts}
      totalProducts={projectDetail.data?.products.length ?? 0}
      onBackToBrowser={() => setReviewingKeyProducts(false)}
      onStartProductDetails={startProductDetailCollection}
    />
  );

  const evaluationPanel = (
    <EvaluationCollectionPanel
      detail={projectDetail.data}
      onBackToBrowser={() => setReviewingEvaluation(false)}
      onRunAnalysis={() => runAnalysis.mutate()}
      scoring={runAnalysis.isPending}
      scoringProvider={runAnalysis.data?.provider}
      onStartKeyStoreCollection={startKeyStoreCollection}
    />
  );

  return (
    <section className={expanded ? "mio-browser-fullscreen fixed inset-0 z-50 overflow-hidden bg-ink-950" : `grid gap-5 ${activitySidebarOpen ? "grid-cols-[360px_minmax(0,1fr)_300px]" : "grid-cols-[360px_minmax(0,1fr)_48px]"}`}>
      {!expanded && (
        <aside className="space-y-5">
          <button className="secondary-button" type="button" onClick={onNewAnalysis}>
            <ClipboardCheck size={16} />
            {exitLabel}
          </button>
          <Panel
            title="Analysis Session"
            icon={ClipboardCheck}
            className={analysisSessionCollapsed ? "mio-analysis-session-collapsed" : undefined}
            action={
              <button
                className="secondary-button mio-round-icon-button h-8 w-8 px-0"
                type="button"
                onClick={() => setAnalysisSessionCollapsed((value) => !value)}
                aria-label={analysisSessionCollapsed ? "Expand analysis session" : "Collapse analysis session"}
                title={analysisSessionCollapsed ? "Expand analysis session" : "Collapse analysis session"}
              >
                {analysisSessionCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
            }
          >
            {!analysisSessionCollapsed && (
              <div className="space-y-3 text-sm text-ink-300">
                <InfoLine label="Keyword" value={project.keyword} />
                <InfoLine label="Category" value={project.productCategory ?? productCategory} />
                <InfoLine label="Platform" value={project.marketplace === "SHOPEE_ID" ? "Shopee" : "TikTok Shop"} />
                <InfoLine label="Created" value={formatDateTime(project.createdAt)} />
              </div>
            )}
          </Panel>

          <Panel title="Collection Progress" icon={ListChecks}>
            <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl border border-white/8 bg-white/5 p-1">
              {COLLECTION_STAGES.map((stage) => {
                const stageSteps = allSteps.filter((step) => step.stage === stage);
                const stageDoneCount = stageSteps.filter((step) => isCollectionStepComplete(step, collectedSteps)).length;
                const isActive = stage === activeStage;
                return (
                  <button
                    key={stage}
                    type="button"
                    className={[
                      "rounded-lg px-2 py-2 text-left transition",
                      isActive ? "mio-stage-tab-active bg-signal-blue text-white shadow-sm" : "text-ink-400 hover:bg-white/8 hover:text-white"
                    ].join(" ")}
                    onClick={() => switchCollectionStage(stage)}
                    title={collectionStageLabel(stage)}
                  >
                    <div className="text-[11px] font-semibold">{collectionStageShortLabel(stage)}</div>
                    <div className={["mt-0.5 text-[10px]", isActive ? "text-white/80" : "text-ink-500"].join(" ")}>
                      {stageDoneCount}/{stageSteps.length}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mb-3 rounded-md border border-white/8 bg-white/5 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-white">{collectionStageLabel(activeStage)}</div>
                  <div className="text-[11px] text-ink-500">{stageCollectedCount}/{steps.length} steps in this part · {collectedCount}/{allSteps.length} total</div>
                </div>
                <CircularProgress value={collectionProgressPercent} />
              </div>
              <ProgressBar value={collectionProgressPercent} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="secondary-button h-9 px-2 text-xs" type="button" onClick={saveProgress} disabled={saveCollectionState.isPending}>
                <Archive size={14} />
                Save
              </button>
              <button className="primary-button h-9 px-2 text-xs" type="button" onClick={runStagePrimaryAction} disabled={saveCollectionState.isPending}>
                <CheckCircle2 size={14} />
                {activeStage === "KEYWORD_GENERAL" ? "Review Table" : stageCompletionButtonLabel(activeStage)}
              </button>
            </div>
            <div className="mt-4 max-h-[420px] space-y-2 overflow-auto pr-1">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  role="button"
                  tabIndex={0}
                  className={[
                    "mio-step-card w-full cursor-pointer rounded-md border px-3 py-2 text-left text-xs transition",
                    index === activeStepIndex ? "mio-step-card-active border-signal-blue/40 bg-signal-blue/12" : "border-white/8 bg-white/5 hover:bg-white/8"
                  ].join(" ")}
                  onClick={() => setActiveStepIndex(index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveStepIndex(index);
                    }
                  }}
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-white">
                    <span>Step {index + 1}</span>
                    {isCollectionStepComplete(step, collectedSteps) ? <CheckCircle2 size={14} className="text-signal-green" /> : <Circle size={12} className="text-ink-500" />}
                  </div>
                  <div className="text-ink-300">{step.label}</div>
                  {index === activeStepIndex && (
                    <CollectionStepPreview
                      step={step}
                      detail={projectDetail.data}
                      selectedProducts={selectedKeyProducts}
                      collected={isCollectionStepComplete(step, collectedSteps)}
                    />
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      )}

      <div className={expanded ? "h-screen w-screen" : ""}>
        {reviewingKeyProducts && activeStage === "KEYWORD_GENERAL"
          ? keyProductTablePanel
          : reviewingEvaluation && activeStage === "EVALUATION_KEY_STORE"
            ? evaluationPanel
            : browserPanel}
      </div>
      {!expanded && (
        <aside className="sticky top-4 h-[calc(100vh-96px)] self-start overflow-hidden rounded-[18px] border border-white/8 bg-white/5">
          {activitySidebarOpen ? (
            <div className="flex h-full flex-col p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Gauge size={16} className="text-signal-blue" />
                  Activity
                </div>
                <button className="secondary-button h-8 w-8 px-0" type="button" onClick={() => setActivitySidebarOpen(false)} aria-label="Collapse activity">
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-auto pr-1">
                {activityLog.map((entry) => (
                  <div key={entry} className="rounded-md border border-white/8 bg-white/5 px-3 py-2 text-xs leading-5 text-ink-300">
                    {entry}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <button className="flex h-full w-full items-start justify-center pt-3 text-ink-400 hover:text-white" type="button" onClick={() => setActivitySidebarOpen(true)} aria-label="Open activity">
              <Gauge size={17} />
            </button>
          )}
        </aside>
      )}
    </section>
  );
}

function CollectionStepPreview({
  step,
  detail,
  selectedProducts,
  collected
}: {
  step: CollectionStep;
  detail?: ProjectDetailPayload;
  selectedProducts: ProjectProductEvidence[];
  collected: boolean;
}) {
  if (!detail) {
    return null;
  }

  if (step.id === "key-product-table") {
    return (
      <div className="mt-4 rounded-md border border-white/8 bg-white/5 p-3 text-xs leading-5 text-ink-300">
        <div className="mb-2 font-semibold text-white">Preview: Key Product Table</div>
        <div>{selectedProducts.length} qualified product{selectedProducts.length === 1 ? "" : "s"} selected from {detail.products.length} extracted rows.</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <EvidenceStatusPill label="Relevance rows" done={detail.products.some((product) => product.source === "Relevance")} />
          <EvidenceStatusPill label="Top Sales rows" done={detail.products.some((product) => product.source === "Top Sales")} />
        </div>
      </div>
    );
  }

  if (step.id === "evaluation-phase-scoring") {
    const candidates = storeEvaluationCandidates(detail);
    return (
      <div className="mt-4 rounded-md border border-white/8 bg-white/5 p-3 text-xs leading-5 text-ink-300">
        <div className="mb-2 font-semibold text-white">Preview: Evaluation Phase</div>
        <div>{candidates.length} Potential Store{candidates.length === 1 ? "" : "s"} ready for GMV, sold/month, and promotion scoring.</div>
        <div className="mt-2 space-y-1">
          {candidates.slice(0, 3).map((candidate, index) => (
            <div key={candidate.key} className="flex items-center justify-between gap-3 rounded border border-white/8 bg-white/[0.04] px-2 py-1">
              <span className="truncate">{index + 1}. {candidate.name}</span>
              <span className="shrink-0 text-signal-blue">{candidate.score}</span>
            </div>
          ))}
          {candidates.length === 0 && <div className="text-ink-500">Capture Product Detail Qualified evidence first.</div>}
        </div>
      </div>
    );
  }

  const product = step.ownerType === "PRODUCT" && step.ownerId
    ? detail.products.find((item) => item.id === step.ownerId)
    : undefined;
  if (product) {
    const productAssets = detail.assets.filter((asset) => asset.ownerType === "PRODUCT" && asset.ownerId === product.id);
    const productReviews = curatedShopeeReviews(detail.reviews.filter((review) => review.productId === product.id));
    const previewImage = product.images[0] ?? product.imageUrl;
    return (
      <div className="mt-4 rounded-md border border-white/8 bg-white/5 p-3 text-xs leading-5 text-ink-300">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {previewImage && (
              <img src={previewImage} alt="" className="h-10 w-10 shrink-0 rounded border border-white/8 bg-white object-cover" />
            )}
            <div className="min-w-0">
              <div className="truncate font-semibold text-white">{displayProductTitle(product)}</div>
              <div className="mt-0.5 truncate text-[11px] text-ink-500">{product.storeName ?? "Store name pending PDP sync"}</div>
            </div>
          </div>
          <span className={["shrink-0 rounded-full px-2 py-1 text-[10px]", collected ? "bg-signal-green/15 text-signal-green" : "bg-white/8 text-ink-400"].join(" ")}>
            {collected ? "saved" : "open PDP"}
          </span>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2 rounded-md border border-white/8 bg-white/[0.04] p-2 text-[11px]">
          <InfoLine label="Store" value={product.storeName ?? "-"} />
          <InfoLine label="Store Type" value={product.storeType ?? "-"} />
          <InfoLine label="Rating" value={product.ratingText ?? (product.rating ? String(product.rating) : "-")} />
          <InfoLine label="Reviews" value={product.reviewText ?? product.reviewCount?.toLocaleString() ?? "-"} />
          <InfoLine label="Sold" value={product.totalSoldText ?? product.monthlySoldText ?? "-"} />
          <InfoLine label="Media" value={`${product.images.length} images · ${product.videos.length} videos`} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <EvidenceStatusPill label="First page" done={productAssets.some((asset) => asset.kind === "PRODUCT_PAGE")} />
          <EvidenceStatusPill label="Slides / video" done={product.images.length > 0 || product.videos.length > 0} />
          <EvidenceStatusPill label="Description" done={Boolean(product.description)} />
          <EvidenceStatusPill label="Reviews" done={productReviews.length > 0} />
          <EvidenceStatusPill label="Media in user" done={product.reviewMediaImages.length > 0 || product.reviewMediaVideos.length > 0} />
          <EvidenceStatusPill label="Shop vouchers" done={product.shopVouchers.length > 0 || product.bundleDeals.length > 0} />
        </div>
        {product.description && (
          <div className="mt-3 rounded border border-white/8 bg-white/[0.04] p-2 text-[11px] leading-4 text-ink-400">
            <div className="mb-1 font-semibold text-white">Description preview</div>
            {product.description.slice(0, 220)}{product.description.length > 220 ? "..." : ""}
          </div>
        )}
        {productReviews.length > 0 && (
          <div className="mt-3 overflow-hidden rounded border border-white/8">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="bg-white/[0.04] text-ink-500">
                  <th className="px-2 py-1.5">Type</th>
                  <th className="px-2 py-1.5">Star</th>
                  <th className="px-2 py-1.5">Comment - timepost</th>
                </tr>
              </thead>
              <tbody>
                {productReviews.map((review) => (
                  <tr key={review.id} className="border-t border-white/8">
                    <td className="px-2 py-1.5">{review.sentiment === "NEGATIVE" ? "Negative Reviews" : "Positive Reviews"}</td>
                    <td className="px-2 py-1.5">{review.rating ? `${review.rating} Star` : "-"}</td>
                    <td className="px-2 py-1.5">{reviewCommentCell(review).slice(0, 180)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return step.subActions && step.subActions.length > 0 ? (
    <div className="mt-4 rounded-md border border-white/8 bg-white/5 p-3 text-xs leading-5 text-ink-300">
      <div className="mb-2 font-semibold text-white">Step Actions</div>
      <div className="space-y-1">
        {step.subActions.map((action) => (
          <div key={action.id} className="flex items-start justify-between gap-3 rounded border border-white/8 bg-white/[0.04] px-2 py-1.5">
            <div>
              <div className="font-medium text-white">{action.label}</div>
              <div className="text-[11px] text-ink-500">{action.description}</div>
            </div>
            <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-ink-400">{action.mode}</span>
          </div>
        ))}
      </div>
    </div>
  ) : null;
}

function EvidenceStatusPill({ label, done }: { label: string; done: boolean }) {
  return (
    <div className={["flex items-center gap-1.5 rounded border px-2 py-1", done ? "border-signal-green/25 bg-signal-green/10 text-signal-green" : "border-white/8 bg-white/[0.04] text-ink-500"].join(" ")}>
      {done ? <CheckCircle2 size={12} /> : <Circle size={11} />}
      <span className="truncate">{label}</span>
    </div>
  );
}

function collectionSubActionCounts(step: CollectionStep, detail?: ProjectDetailPayload): Record<string, number> {
  if (!detail || step.ownerType !== "PRODUCT" || !step.ownerId) {
    return {};
  }
  const product = detail.products.find((item) => item.id === step.ownerId);
  if (!product) {
    return {};
  }
  const productAssets = productAssetsForStep(detail, product);
  const productReviews = curatedShopeeReviews(detail.reviews.filter((review) => review.productId === product.id));
  return {
    "first-page": productAssets.filter((asset) => asset.kind === "PRODUCT_PAGE").length,
    slides: uniqueMediaValues([...product.images, ...product.videos]).length,
    "positive-reviews": productReviews.filter((review) => review.sentiment === "POSITIVE" || (review.rating ?? 0) >= 5).length,
    "negative-reviews": productReviews.filter((review) => review.sentiment === "NEGATIVE" || (review.rating ?? 5) <= 3).length,
    "media-in-user": uniqueMediaValues([...product.reviewMediaImages, ...product.reviewMediaVideos]).length,
    "description-promotions": product.description || product.shopVouchers.length || product.bundleDeals.length ? 1 : 0,
    "shop-homepage": productAssets.filter((asset) => asset.kind === "STORE_HOME").length
  };
}

function EvaluationCollectionPanel({
  detail,
  onBackToBrowser,
  onRunAnalysis,
  scoring,
  scoringProvider,
  onStartKeyStoreCollection
}: {
  detail?: ProjectDetailPayload;
  onBackToBrowser: () => void;
  onRunAnalysis: () => void;
  scoring: boolean;
  scoringProvider?: string;
  onStartKeyStoreCollection: () => void;
}) {
  const candidates = detail ? storeEvaluationCandidates(detail) : [];
  return (
    <Panel
      title="Evaluation Phase"
      icon={Brain}
      action={
        <button className="secondary-button h-9 w-auto px-3" type="button" onClick={onBackToBrowser}>
          <ChevronLeft size={15} />
          Browser
        </button>
      }
    >
      <div className="mb-4 rounded-md border border-signal-blue/20 bg-signal-blue/10 p-4 text-sm leading-6 text-ink-300">
        Review Potential Stores without leaving the collection workspace. Run AI scoring after Product Detail Qualified evidence is synced, then start Key Store collection for the top-ranked store.
      </div>
      {detail ? (
        <>
          <EvaluationCards detail={detail} onRunAnalysis={onRunAnalysis} scoring={scoring} scoringProvider={scoringProvider} />
          <AnalysisSummary detail={detail} />
        </>
      ) : (
        <EmptyState label="Loading project evidence..." />
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs leading-5 text-ink-500">
          {candidates.length > 0
            ? `${candidates[0].name} is currently ranked as Key Store from ${candidates.length} Potential Store candidates.`
            : "No Potential Store is available yet. Capture PDP store names or store links first."}
        </div>
        <button className="primary-button h-10 w-auto px-4" type="button" onClick={onStartKeyStoreCollection} disabled={candidates.length === 0}>
          <Store size={16} />
          Start Key Store Collection
        </button>
      </div>
    </Panel>
  );
}

function BrowserCaptureStatusPill({
  status,
  onAction
}: {
  status: BrowserCaptureStatus;
  onAction: () => void;
}) {
  if (status.state === "idle") {
    return null;
  }
  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2">
      <div
        className={[
          "pointer-events-auto flex items-center gap-2 rounded-full border px-3 py-2 text-xs shadow-glow backdrop-blur-2xl",
          status.state === "failed" ? "border-signal-rose/35 bg-signal-rose/15 text-signal-rose" : "",
          status.state === "done" ? "border-signal-green/35 bg-signal-green/15 text-signal-green" : "",
          status.state === "working" ? "border-signal-blue/35 bg-signal-blue/15 text-signal-blue" : ""
        ].join(" ")}
      >
        <span>{status.message}</span>
        {status.actionLabel && (
          <button className="rounded-full border border-current/30 px-2 py-1 text-[11px] font-semibold" type="button" onClick={onAction}>
            {status.actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function FloatingStepController({
  step,
  activeSubActionId,
  stepNumber,
  stepTotal,
  stageCollectedCount,
  targetUrl,
  captured,
  subActionCounts,
  saving,
  onOpenTarget,
  onCollect,
  onSelectSubAction,
  onAttachFile,
  onOpenAndroid,
  onPrevious,
  onNext
}: {
  step: CollectionStep;
  activeSubActionId?: string;
  stepNumber: number;
  stepTotal: number;
  stageCollectedCount: number;
  targetUrl?: string;
  captured: boolean;
  subActionCounts?: Record<string, number>;
  saving: boolean;
  onOpenTarget: (subActionId?: string) => void;
  onCollect: (subActionId?: string) => void;
  onSelectSubAction: (id: string) => void;
  onAttachFile?: () => void;
  onOpenAndroid?: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const [compact, setCompact] = useState(true);
  const activeSubAction = step.subActions?.find((action) => action.id === activeSubActionId) ?? step.subActions?.[0];
  const activeSubActionCount = activeSubAction ? subActionCounts?.[activeSubAction.id] ?? 0 : 0;
  const activeSubActionMaxed = activeSubAction?.id === "slides" && activeSubActionCount >= 9;
  const collectLabel = activeSubAction
    ? subActionButtonLabel(activeSubAction, activeSubActionCount)
    : undefined;
  const compactInstruction = step.stage === "PRODUCT_DETAILS"
    ? "Choose the sub-action, confirm the target page, then collect."
    : step.instruction;
  const usesSubActionCollectButtons = step.stage === "PRODUCT_DETAILS" && Boolean(step.subActions?.length);
  if (compact) {
    return (
      <motion.div
        className="mio-floating-collector mio-floating-collector-compact absolute left-4 top-4 z-20 max-w-[430px] rounded-full border border-white/14 bg-ink-950/72 px-3 py-2 shadow-glow backdrop-blur-2xl"
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18 }}
      >
        <div className="flex items-center gap-2">
          <button className="secondary-button mio-round-icon-button h-8 w-8 rounded-full px-0" type="button" onClick={() => setCompact(false)} aria-label="Expand collector">
            <Maximize2 size={13} />
          </button>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.12em] text-ink-500">
              Step {stepNumber}/{stepTotal}
            </div>
            <div className="truncate text-xs font-medium text-white">{step.label}</div>
            {activeSubAction && <div className="truncate text-[10px] text-ink-400">{activeSubAction.label}</div>}
          </div>
          <span className={["shrink-0 rounded-full px-2 py-1 text-[10px]", step.ready ? "bg-signal-green/15 text-signal-green" : "bg-white/8 text-ink-300"].join(" ")}>
            {captured ? (step.mode === "PROCESS" ? "processed" : "saved") : step.ready ? "ready" : "wait"}
          </span>
          <button
            className="secondary-button mio-round-icon-button h-8 w-8 shrink-0 rounded-full px-0"
            type="button"
            onClick={() => onOpenTarget(activeSubAction?.id)}
            disabled={!targetUrl}
            aria-label="Open target page"
            title="Open target page"
          >
            <ExternalLink size={13} />
          </button>
          <button
            className="primary-button mio-round-icon-button h-8 w-8 shrink-0 rounded-full px-0"
            type="button"
            disabled={saving || !step.ready || activeSubActionMaxed}
            onClick={() => onCollect(activeSubAction?.id)}
            aria-label={step.mode === "PROCESS" ? "Process step" : "Collect step"}
            title={step.mode === "PROCESS" ? "Process step" : "Collect step"}
          >
            {step.mode === "PROCESS" ? <Table2 size={13} /> : <ClipboardCheck size={13} />}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="mio-floating-collector mio-floating-collector-expanded absolute left-4 top-4 z-20 flex w-[320px] flex-col rounded-[18px] border border-white/14 bg-ink-950/72 p-3 shadow-glow backdrop-blur-2xl"
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-ink-500">
            Guided Collection {stepNumber}/{stepTotal}
          </div>
          <div className="truncate text-sm font-semibold text-white">{step.label}</div>
        </div>
        <button className="secondary-button mio-round-icon-button h-8 w-8 rounded-full px-0" type="button" onClick={() => setCompact(true)} aria-label="Collapse collector">
          <Minimize2 size={13} />
        </button>
      </div>
      <ProgressBar value={(stageCollectedCount / Math.max(stepTotal, 1)) * 100} />
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/8 bg-white/6 p-3 text-xs leading-5 text-ink-300">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="font-medium text-white">{step.section}</span>
          <span className={["rounded-full px-2 py-0.5 text-[10px]", step.ready ? "bg-signal-green/15 text-signal-green" : "bg-white/8 text-ink-300"].join(" ")}>
            {captured ? (step.mode === "PROCESS" ? "processed" : "saved") : step.ready ? "ready" : "waiting"}
          </span>
        </div>
        <div className="text-[11px] leading-4 text-ink-400">{compactInstruction}</div>
        {step.subActions && step.subActions.length > 0 && (
          <div className="mt-2 space-y-1.5 border-t border-white/8 pt-2">
            {step.subActions.map((action) => {
              const actionTargetUrl = action.targetUrl ?? targetUrl;
              const actionCount = subActionCounts?.[action.id] ?? 0;
              const actionMaxed = action.id === "slides" && actionCount >= 9;
              return (
                <div
                  key={action.id}
                  className={[
                    "w-full rounded-md border px-2 py-1.5 text-left transition",
                    activeSubAction?.id === action.id ? "border-signal-blue/45 bg-signal-blue/12" : "border-white/8 bg-white/[0.04] hover:bg-white/8"
                  ].join(" ")}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <button className="min-w-0 text-left" type="button" onClick={() => onSelectSubAction(action.id)}>
                      <span className="truncate text-[11px] font-medium text-white">{action.label}</span>
                    </button>
                    <span className="rounded-full bg-white/8 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-ink-500">{subActionModeLabel(action)}</span>
                  </div>
                  <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
                    <div className="truncate text-[10px] text-ink-500">{action.description}</div>
                    <button
                      className="secondary-button h-7 w-8 px-0 text-[10px]"
                      type="button"
                      disabled={!actionTargetUrl}
                      onClick={() => {
                        onSelectSubAction(action.id);
                        onOpenTarget(action.id);
                      }}
                      aria-label={`Open target for ${action.label}`}
                      title={`Open target for ${action.label}`}
                    >
                      <ExternalLink size={12} />
                    </button>
                    {usesSubActionCollectButtons && (
                      <button
                        className="secondary-button h-7 w-auto px-3 text-[10px]"
                        type="button"
                        disabled={saving || !step.ready || actionMaxed}
                        onClick={() => {
                          onSelectSubAction(action.id);
                          onCollect(action.id);
                        }}
                      >
                        {subActionButtonLabel(action, actionCount)}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {activeSubAction?.guidance && <div className="mt-2 rounded-md border border-signal-blue/20 bg-signal-blue/10 px-2 py-1.5 text-[10px] leading-4 text-signal-blue">{activeSubAction.guidance}</div>}
      </div>
      <div className={["mt-2 grid gap-2", usesSubActionCollectButtons ? "grid-cols-2" : "grid-cols-[auto_auto_minmax(0,1fr)]"].join(" ")}>
        <button className="secondary-button h-9 w-10 px-0" type="button" onClick={onPrevious} aria-label="Previous step">
          <ChevronLeft size={15} />
        </button>
        <button className="secondary-button h-9 w-10 px-0" type="button" onClick={onNext} aria-label="Next step">
          <ChevronRight size={15} />
        </button>
        {!usesSubActionCollectButtons && targetUrl && (
          <button className="secondary-button h-9 px-3" type="button" onClick={() => onOpenTarget()}>
            <ExternalLink size={14} />
            Open Target
          </button>
        )}
      </div>
      {!usesSubActionCollectButtons && (step.ready ? (
        <button className="primary-button mt-2 h-9" type="button" disabled={saving || activeSubActionMaxed} onClick={() => onCollect(activeSubAction?.id)}>
          <ClipboardCheck size={16} />
          {step.mode === "PROCESS"
            ? captured ? "Review Process Again" : step.id === "evaluation-phase-scoring" ? "Open Evaluation Phase" : "Build Key Product Table"
            : saving ? "Saving Evidence" : captured ? `Collect Again${activeSubAction ? `: ${activeSubAction.label}` : ""}` : collectLabel ?? "Collect This Step"}
        </button>
      ) : (
        <div className="mt-2 rounded-full border border-white/8 bg-white/6 px-3 py-2 text-xs text-ink-400">
          {step.mode === "PROCESS"
            ? "Capture both Relevance and Top Sales first. The table builder appears when product rows exist."
            : "Open the target page or complete Shopee login/verification manually. The collect button appears when this step is ready."}
        </div>
      ))}
      {usesSubActionCollectButtons && !step.ready && (
        <div className="mt-2 rounded-full border border-white/8 bg-white/6 px-3 py-2 text-xs text-ink-400">
          Open the matching product page before collecting Product Detail data.
        </div>
      )}
      {(onAttachFile || onOpenAndroid) && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {onOpenAndroid && (
            <button className="secondary-button h-9 px-2 text-xs" type="button" onClick={onOpenAndroid}>
              <Smartphone size={14} />
              Open TikTok
            </button>
          )}
          {onAttachFile && (
            <button className="secondary-button h-9 px-2 text-xs" type="button" onClick={onAttachFile}>
              <ImagePlus size={14} />
              Attach Shot
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

function subActionModeLabel(action: CollectionSubAction): string {
  if (action.mode === "collect" || action.mode === "sync") {
    return "collect";
  }
  return action.mode;
}

function subActionButtonLabel(action: CollectionSubAction, collectedCount = 0): string {
  if (action.id === "slides") {
    if (collectedCount >= 9) {
      return "Max 9 Saved";
    }
    return collectedCount <= 0 ? "Download" : `Download ${collectedCount + 1}`;
  }
  if (action.collectLabel) {
    return action.collectLabel;
  }
  switch (action.mode) {
    case "screenshot":
      return "Capture";
    case "download":
      return "Download";
    case "background":
      return "Collect Data";
    case "collect":
    case "sync":
    default:
      return "Collect Data";
  }
}

function subActionEvidenceKind(step: CollectionStep, action?: CollectionSubAction): ManualEvidenceKind {
  if (!action) {
    return step.kind;
  }
  switch (action.id) {
    case "slides":
      return "PRODUCT_IMAGE";
    case "positive-reviews":
    case "negative-reviews":
      return "REVIEW_SECTION";
    case "media-in-user":
      return "REVIEW_IMAGE";
    case "description-promotions":
      return "PRODUCT_DESCRIPTION";
    case "shop-homepage":
      return "STORE_HOME";
    case "first-page":
    default:
      return step.kind;
  }
}

function scopeProductDetailSnapshot(
  snapshot: RenderedProductDetailSnapshot,
  subActionId?: string
): RenderedProductDetailSnapshot {
  const metricOnly: RenderedProductDetailSnapshot = {
    storeName: snapshot.storeName,
    storeUrl: snapshot.storeUrl,
    storeType: snapshot.storeType,
    rating: snapshot.rating,
    ratingText: snapshot.ratingText,
    reviewText: snapshot.reviewText,
    totalSoldText: snapshot.totalSoldText,
    activeReviewFilter: snapshot.activeReviewFilter,
    images: [],
    videos: [],
    descriptionImages: [],
    shopVouchers: [],
    bundleDeals: [],
    promotionCount: 0,
    reviews: [],
    reviewMediaImages: [],
    reviewMediaVideos: []
  };

  switch (subActionId) {
    case "first-page":
    case "shop-homepage":
      return metricOnly;
    case "slides":
      return {
        ...metricOnly,
        images: snapshot.images,
        videos: snapshot.videos
      };
    case "positive-reviews":
      return {
        ...metricOnly,
        reviews: snapshot.reviews.filter((review) => review.type === "Positive Reviews")
      };
    case "negative-reviews":
      return {
        ...metricOnly,
        reviews: snapshot.reviews.filter((review) => review.type === "Negative Reviews")
      };
    case "media-in-user":
      return {
        ...metricOnly,
        reviewMediaImages: snapshot.reviewMediaImages,
        reviewMediaVideos: snapshot.reviewMediaVideos
      };
    case "description-promotions":
      return {
        ...metricOnly,
        description: snapshot.description,
        descriptionImages: snapshot.descriptionImages,
        shopVouchers: snapshot.shopVouchers,
        bundleDeals: snapshot.bundleDeals,
        promotionCount: snapshot.promotionCount
      };
    default:
      return snapshot;
  }
}

function ScreenshotReviewModal({
  capture,
  saving,
  onCancel,
  onSave
}: {
  capture: PendingEvidenceCapture;
  saving: boolean;
  onCancel: () => void;
  onSave: (payload: ManualEvidencePayload) => void;
}) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [selection, setSelection] = useState<CropRect | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);

  useEffect(() => {
    setPreviewZoom(1);
    setSelection(null);
  }, [capture.payload.imageDataUrl]);

  function applyPreviewZoom(nextZoom: number) {
    setPreviewZoom(Math.max(0.35, Math.min(4, Number(nextZoom.toFixed(2)))));
  }

  function handlePreviewWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.12 : -0.12;
    applyPreviewZoom(previewZoom + delta);
  }

  function pointerPosition(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top))
    };
  }

  function startSelection(event: PointerEvent<HTMLDivElement>) {
    const point = pointerPosition(event);
    setDragStart(point);
    setSelection({ x: point.x, y: point.y, width: 0, height: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function updateSelection(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart) {
      return;
    }
    const point = pointerPosition(event);
    setSelection({
      x: Math.min(dragStart.x, point.x),
      y: Math.min(dragStart.y, point.y),
      width: Math.abs(point.x - dragStart.x),
      height: Math.abs(point.y - dragStart.y)
    });
  }

  function endSelection() {
    setDragStart(null);
  }

  async function saveSelected() {
    if (!selection || selection.width < 8 || selection.height < 8 || !imageRef.current) {
      onSave(capture.payload);
      return;
    }
    const cropped = await cropImageDataUrl(capture.payload.imageDataUrl, imageRef.current, selection);
    onSave({
      ...capture.payload,
      imageDataUrl: cropped.imageDataUrl,
      width: cropped.width,
      height: cropped.height,
      metadata: {
        ...(capture.payload.metadata ?? {}),
        screenshotMode: "manual-crop",
        crop: selection
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="mio-panel flex max-h-[calc(100vh-32px)] w-full max-w-[calc(100vw-32px)] flex-col rounded-[18px] border border-white/12 bg-ink-900/95 p-5 shadow-glow">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-white">Review Screenshot</div>
            <div className="mt-1 text-xs text-ink-400">{capture.stepLabel}</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="secondary-button h-9 w-9 px-0" type="button" onClick={() => applyPreviewZoom(previewZoom - 0.2)} aria-label="Zoom screenshot out" title="Zoom out">
              <ZoomOut size={15} />
            </button>
            <button className="secondary-button h-9 w-auto px-3 text-xs" type="button" onClick={() => applyPreviewZoom(1)}>
              {Math.round(previewZoom * 100)}%
            </button>
            <button className="secondary-button h-9 w-9 px-0" type="button" onClick={() => applyPreviewZoom(previewZoom + 0.2)} aria-label="Zoom screenshot in" title="Zoom in">
              <ZoomIn size={15} />
            </button>
            <button className="secondary-button h-9 w-auto px-3" type="button" onClick={onCancel} disabled={saving}>
              Redo
            </button>
          </div>
        </div>
        <div
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border border-white/12 bg-black/85"
          onWheel={handlePreviewWheel}
          onPointerDown={startSelection}
          onPointerMove={updateSelection}
          onPointerUp={endSelection}
          onPointerCancel={endSelection}
        >
          <img
            ref={imageRef}
            src={capture.payload.imageDataUrl}
            alt="Captured evidence preview"
            className="block h-full max-h-[72vh] w-full select-none object-contain transition-transform duration-150 ease-out"
            draggable={false}
            style={{ transform: `scale(${previewZoom})`, transformOrigin: "center center" }}
          />
          {selection && selection.width > 2 && selection.height > 2 && (
            <div
              className="pointer-events-none absolute border-2 border-signal-blue bg-signal-blue/15"
              style={{
                left: selection.x,
                top: selection.y,
                width: selection.width,
                height: selection.height
              }}
            />
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-ink-400">
            Scroll or pinch to zoom. Drag over the focused area to crop; use Redo if the capture is wrong.
          </div>
          <div className="flex items-center gap-2">
            <button className="secondary-button h-9 w-auto px-3" type="button" onClick={() => onSave(capture.payload)} disabled={saving}>
              Save Full
            </button>
            <button className="primary-button h-9 w-auto px-4" type="button" onClick={() => void saveSelected()} disabled={saving}>
              {saving ? "Saving" : selection ? "Save Selected" : "Save Evidence"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectsView() {
  const queryClient = useQueryClient();
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: apiClient.dashboard });
  const projects = useMemo(() => dashboard.data?.projects ?? [], [dashboard.data?.projects]);
  const [inspectingProjectId, setInspectingProjectId] = useState("");
  const [collectingProject, setCollectingProject] = useState<ProjectSummary | null>(null);
  const [collectionBrowserUrl, setCollectionBrowserUrl] = useState(SHOPEE_HOME_URL);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [projectViewMode, setProjectViewMode] = useState<"cards" | "list">("cards");
  const inspectingProject = projects.find((project) => project.id === inspectingProjectId);
  const categories = useMemo(
    () => Array.from(new Set(projects.map((project) => project.productCategory).filter((value): value is string => Boolean(value?.trim())))).sort(),
    [projects]
  );
  const filteredProjects = projects.filter((project) => categoryFilter === "all" || project.productCategory === categoryFilter);
  const detail = useQuery({
    queryKey: ["project-detail", inspectingProjectId],
    queryFn: () => apiClient.projectDetail(inspectingProjectId),
    enabled: Boolean(inspectingProjectId)
  });
  const deleteProject = useMutation({
    mutationFn: apiClient.deleteProject,
    onSuccess: async () => {
      setInspectingProjectId("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["project-detail"] }),
        queryClient.invalidateQueries({ queryKey: ["reports"] })
      ]);
    }
  });

  function confirmDeleteProject(project: ProjectSummary) {
    const confirmation = window.prompt(`Delete keyword project "${project.name}"? Type the exact project title to confirm.`);
    if (confirmation === project.name) {
      deleteProject.mutate(project.id);
    }
  }

  function startProjectCollection(project: ProjectSummary) {
    const collectionState = projectCollectionState(project);
    const platform: ResearchPlatform = project.marketplace === "TIKTOK_SHOP" ? "TIKTOK_SHOP" : "SHOPEE_ID";
    setInspectingProjectId("");
    setCollectingProject(project);
    setCollectionBrowserUrl(collectionState.browserUrl ?? initialPlatformUrl(platform, project.keyword));
  }

  function closeProjectCollection() {
    setCollectingProject(null);
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["project-detail"] })
    ]);
  }

  function finishProjectCollection(projectId: string) {
    setCollectingProject(null);
    setInspectingProjectId(projectId);
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["project-detail", projectId] }),
      queryClient.invalidateQueries({ queryKey: ["project-detail"] })
    ]);
  }

  if (collectingProject) {
    if (collectingProject.marketplace === "TIKTOK_SHOP") {
      return (
        <AndroidTikTokCollector
          project={collectingProject}
          productCategory={collectingProject.productCategory ?? ""}
          onNewAnalysis={closeProjectCollection}
          exitLabel="Back to Projects"
        />
      );
    }

    return (
      <GuidedBrowserCollector
        project={collectingProject}
        productCategory={collectingProject.productCategory ?? ""}
        browserUrl={collectionBrowserUrl}
        onBrowserUrlChange={setCollectionBrowserUrl}
        onNewAnalysis={closeProjectCollection}
        onCollectionCompleted={finishProjectCollection}
        exitLabel="Back to Projects"
      />
    );
  }

  if (inspectingProjectId) {
    return (
      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <button className="secondary-button w-auto px-4" type="button" onClick={() => setInspectingProjectId("")}>
            <ChevronLeft size={16} />
            Back to Projects
          </button>
          {inspectingProject && (
            <div className="min-w-0 text-right">
              <div className="truncate text-lg font-semibold text-white">{inspectingProject.name}</div>
              <div className="text-xs text-ink-500">{inspectingProject.marketplace} · {formatDateTime(inspectingProject.createdAt)}</div>
            </div>
          )}
        </div>
        {detail.data ? (
          <ProjectInspectionPanel
            detail={detail.data}
            deleting={deleteProject.isPending}
            onDelete={() => confirmDeleteProject(detail.data.project)}
            onContinueCollection={() => startProjectCollection(detail.data.project)}
          />
        ) : (
          <Panel title="Project Inspector" icon={Search}>
            <EmptyState label="Loading project evidence..." />
          </Panel>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <Panel title="Vault Metrics" icon={Gauge}>
        <div className="grid grid-cols-4 gap-3">
          <Metric icon={Archive} label="Keyword Projects" value={projects.length} />
          <Metric icon={FileDown} label="Reports" value={dashboard.data?.metrics.completedReports ?? 0} />
          <Metric icon={ShoppingBag} label="Products" value={dashboard.data?.metrics.collectedProducts ?? 0} />
          <Metric icon={Filter} label="Categories" value={categories.length} />
        </div>
      </Panel>

      <Panel
        title="Keyword Projects"
        icon={Table2}
        action={
          <div className="flex items-center gap-2">
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="input h-9 w-[180px] text-xs">
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <ProductViewToggle value={projectViewMode} onChange={setProjectViewMode} />
          </div>
        }
      >
        <div className={projectViewMode === "cards" ? "grid grid-cols-1 gap-3 xl:grid-cols-2" : "space-y-2"}>
          {filteredProjects.map((project) => {
            const collectionState = projectCollectionState(project);
            const completed = isProjectComplete(project);
            return (
              <div
                key={project.id}
                className={[
                  "w-full rounded-md border border-white/8 bg-white/5 p-4 text-left transition hover:border-signal-blue/35 hover:bg-signal-blue/10",
                  projectViewMode === "list" ? "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4" : ""
                ].join(" ")}
              >
                <div className="min-w-0">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-white">{project.name}</div>
                      <div className="mt-1 text-xs text-ink-500">{formatDateTime(project.createdAt)}</div>
                    </div>
                    <ProjectStatusPill completed={completed} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs text-ink-400 lg:grid-cols-4">
                    <InfoLine label="Keyword" value={project.keyword} />
                    <InfoLine label="Category" value={project.productCategory ?? "-"} />
                    <InfoLine label="Marketplace" value={project.marketplace} />
                    <InfoLine label="Media" value={`${project.counts.products} products · ${project.counts.stores} stores`} />
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between gap-3 text-[11px] text-ink-500">
                      <span>{collectionState.stageLabel}</span>
                      <span>{collectionState.progressPercent}%</span>
                    </div>
                    <ProgressBar value={collectionState.progressPercent} />
                  </div>
                </div>
                <div className={projectViewMode === "list" ? "flex shrink-0 flex-wrap items-center gap-2" : "mt-4 flex flex-wrap items-center gap-2"}>
                  <button className="secondary-button h-9 w-auto px-3" type="button" onClick={() => setInspectingProjectId(project.id)}>
                    <Search size={14} />
                    Inspect
                  </button>
                  {!completed && (
                    <button className="primary-button h-9 w-auto px-3" type="button" onClick={() => startProjectCollection(project)}>
                      <ClipboardCheck size={14} />
                      Continue Collection
                    </button>
                  )}
                  <button className="secondary-button h-9 w-auto px-3 text-signal-rose" type="button" onClick={() => confirmDeleteProject(project)}>
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
          {filteredProjects.length === 0 && <EmptyState label="No keyword projects match this category." />}
        </div>
      </Panel>
    </section>
  );
}

function ProjectInspectionPanel({
  detail,
  deleting,
  onDelete,
  onContinueCollection
}: {
  detail: ProjectDetailPayload;
  deleting: boolean;
  onDelete: () => void;
  onContinueCollection: () => void;
}) {
  const queryClient = useQueryClient();
  const mediaCount = projectMediaCount(detail);
  const collectionState = projectCollectionState(detail.project);
  const completed = isProjectComplete(detail.project);
  const outlineItems = projectOutlineItems(detail);
  const [outlineCollapsed, setOutlineCollapsed] = useState(false);
  const runAnalysis = useMutation({
    mutationFn: () => apiClient.analyzeProject(detail.project.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project-detail", detail.project.id] });
    }
  });
  return (
    <Panel
      title="Project Inspector"
      icon={Search}
      action={
        <div className="flex items-center gap-2">
          <button className="primary-button h-9 w-auto px-3" type="button" onClick={onContinueCollection}>
            <ClipboardCheck size={15} />
            {completed ? "Collect Again" : "Continue Collection"}
          </button>
          <button className="secondary-button h-9 w-auto px-3 text-signal-rose" type="button" onClick={onDelete} disabled={deleting}>
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric icon={ImagePlus} label="Media" value={mediaCount} />
        <Metric icon={ShoppingBag} label="Products" value={detail.products.length} />
        <Metric icon={Store} label="Stores" value={detail.stores.length} />
        <Metric icon={ListChecks} label="Reviews" value={detail.reviews.length} />
        <Metric icon={FileDown} label="Reports" value={detail.reports.length} />
      </div>

      <div className="mio-saved-progress-compact mt-4 rounded-md border border-white/8 bg-white/5 p-3">
        <div className="grid items-center gap-3 md:grid-cols-[auto_minmax(0,1.1fr)_minmax(0,1.4fr)_auto]">
          <CircularProgress value={collectionState.progressPercent} />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">Saved Collection Progress</div>
            <div className="mt-1 truncate text-xs text-ink-500">{collectionState.stageLabel}</div>
          </div>
          <div className="min-w-0">
            <div className="mb-1 text-[11px] uppercase tracking-[0.12em] text-ink-500">Saved URL</div>
            {collectionState.browserUrl ? (
              <button className="secondary-button h-8 w-auto max-w-full px-3 text-xs" type="button" onClick={() => void apiClient.openUrl(collectionState.browserUrl ?? "")}>
                <ExternalLink size={13} />
                <span className="truncate">{collectionState.browserUrl}</span>
              </button>
            ) : (
              <div className="text-xs text-ink-400">No browser URL saved</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-ink-400 md:grid-cols-1">
            <InfoLine label="Current Step" value={collectionState.currentStepId ?? "Not selected"} />
            <InfoLine label="View Mode" value={collectionState.viewMode ?? "Default"} />
          </div>
        </div>
      </div>

      <div className={["mt-5 grid gap-5", outlineCollapsed ? "grid-cols-[48px_minmax(0,1fr)]" : "grid-cols-[240px_minmax(0,1fr)]"].join(" ")}>
        <ProjectOutlineNav
          title={detail.project.name}
          items={outlineItems}
          collapsed={outlineCollapsed}
          onToggle={() => setOutlineCollapsed((value) => !value)}
        />
        <ProjectReportOutline
          detail={detail}
          onContinueCollection={onContinueCollection}
          onRunAnalysis={() => runAnalysis.mutate()}
          scoring={runAnalysis.isPending}
          scoringProvider={runAnalysis.data?.provider}
        />
      </div>
    </Panel>
  );
}

function ProjectReportOutline({
  detail,
  onContinueCollection,
  onRunAnalysis,
  scoring,
  scoringProvider
}: {
  detail: ProjectDetailPayload;
  onContinueCollection: () => void;
  onRunAnalysis: () => void;
  scoring: boolean;
  scoringProvider?: string;
}) {
  const relevanceProducts = detail.products.filter((product) => product.source === "Relevance");
  const topSalesProducts = detail.products.filter((product) => product.source === "Top Sales");
  const keyProducts = selectKeyProductCandidates(detail.products);
  return (
    <div className="space-y-3">
      <ReportOutlineSection id="keyword-general" title="Keyword General" defaultOpen>
        <NestedReportSection title="Relevance">
          <AssetList assets={detail.assets.filter((asset) => asset.kind === "SEARCH_RESULT")} />
          <ProductCardGrid products={relevanceProducts} />
        </NestedReportSection>
        <NestedReportSection title="Top Sales">
          <AssetList assets={detail.assets.filter((asset) => asset.kind === "TOP_SALES")} />
          <ProductCardGrid products={topSalesProducts} />
        </NestedReportSection>
      </ReportOutlineSection>

      <ReportOutlineSection id="key-product" title="Key Product">
        <div className="mb-3 rounded-md border border-white/8 bg-white/5 p-3 text-xs leading-5 text-ink-400">
          Monthly sold only applies to Top Sales result snapshots. Total sold is collected from PDP evidence when visible.
          Rating is the star value; Reviews is the rating/review count. Price ranges are stored as estimated average price.
        </div>
        <ProductInfoTable products={keyProducts} />
      </ReportOutlineSection>

      <ReportOutlineSection id="product-detail-qualified" title="Product Detailed Qualified">
        <div className="space-y-3">
          {keyProducts.map((product) => (
            <NestedReportSection key={product.id} title={displayProductTitle(product)} defaultOpen={false}>
              <ProductQualifiedSection
                product={product}
                reviews={detail.reviews.filter((review) => review.productId === product.id)}
                assets={productAssetsForStep(detail, product)}
              />
            </NestedReportSection>
          ))}
          {keyProducts.length === 0 && <EmptyState label="Capture Relevance and Top Sales first to generate dynamic product detail steps." />}
        </div>
      </ReportOutlineSection>

      <ReportOutlineSection id="evaluation-phase" title="Evaluation Phase">
        <EvaluationCards
          detail={detail}
          onRunAnalysis={onRunAnalysis}
          scoring={scoring}
          scoringProvider={scoringProvider}
        />
        <AnalysisSummary detail={detail} />
      </ReportOutlineSection>

      <ReportOutlineSection id="key-store" title="Key Store">
        <KeyStorePanel detail={detail} onContinueCollection={onContinueCollection} />
      </ReportOutlineSection>

      <ReportOutlineSection id="tiktok-evidence" title="TikTok Evidence">
        <AssetList assets={detail.assets.filter((asset) => asset.kind === "SOCIAL_ACCOUNT")} />
      </ReportOutlineSection>
    </div>
  );
}

function projectOutlineItems(detail: ProjectDetailPayload): Array<{ id: string; label: string; depth: number }> {
  const keyProducts = selectKeyProductCandidates(detail.products);
  return [
    { id: "keyword-general", label: "Keyword General", depth: 0 },
    { id: "keyword-general", label: "Relevance", depth: 1 },
    { id: "keyword-general", label: "Top sales", depth: 1 },
    { id: "key-product", label: "Key Product", depth: 0 },
    { id: "key-product", label: "Product info", depth: 1 },
    { id: "product-detail-qualified", label: "Product Detail Qualified", depth: 0 },
    ...keyProducts.flatMap((product, index) => [
      { id: "product-detail-qualified", label: displayProductTitle(product, `Product ${index + 1}`), depth: 1 },
      { id: "product-detail-qualified", label: "First page", depth: 2 },
      { id: "product-detail-qualified", label: "Slides and images", depth: 2 },
      { id: "product-detail-qualified", label: "Reviews", depth: 2 },
      { id: "product-detail-qualified", label: "Media in user", depth: 2 },
      { id: "product-detail-qualified", label: "Shop homepage", depth: 2 }
    ]),
    { id: "evaluation-phase", label: "Evaluation Phase", depth: 0 },
    { id: "key-store", label: "Key Store", depth: 0 },
    { id: "tiktok-evidence", label: "TikTok Evidence", depth: 0 }
  ];
}

function EvaluationCards({
  detail,
  onRunAnalysis,
  scoring,
  scoringProvider
}: {
  detail: ProjectDetailPayload;
  onRunAnalysis: () => void;
  scoring: boolean;
  scoringProvider?: string;
}) {
  const candidates = storeEvaluationCandidates(detail);
  if (candidates.length === 0) {
    return (
      <div className="space-y-3">
        <EvaluationActionBar onRunAnalysis={onRunAnalysis} scoring={scoring} scoringProvider={scoringProvider} />
        <EmptyState label="No store candidates yet. Capture Key Product data and Product Detail Qualified evidence first." />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <EvaluationActionBar onRunAnalysis={onRunAnalysis} scoring={scoring} scoringProvider={scoringProvider} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {candidates.map((candidate, index) => (
          <button key={candidate.key} type="button" className="rounded-md border border-white/8 bg-white/5 p-3 text-left hover:bg-white/8" onClick={() => candidate.url && void apiClient.openUrl(candidate.url)}>
            <div className="aspect-video overflow-hidden rounded bg-white/10">
              {candidate.thumbnail ? <img src={imageSource(candidate.thumbnail)} alt={candidate.name} className="h-full w-full object-cover" /> : null}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.12em] text-ink-500">Potential Store {index + 1}</div>
                <div className="mt-1 line-clamp-1 text-sm font-semibold text-white">{candidate.name}</div>
              </div>
              <div className="rounded-full border border-signal-blue/25 bg-signal-blue/10 px-2 py-1 text-xs font-semibold text-signal-blue">
                {candidate.score}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink-400">
              <InfoLine label="Store Type" value={candidate.type} />
              <InfoLine label="Products" value={candidate.productCount.toString()} />
              <InfoLine label="GMV ETA" value={formatCurrency(candidate.gmvEstimate)} />
              <InfoLine label="Sold / Month" value={formatOptionalNumber(candidate.monthlySoldEstimate)} />
              <InfoLine label="Promotion" value={`${candidate.promotionCount} signals`} />
              <InfoLine label="Evidence" value={candidate.hasStoreEvidence ? "Store evidence" : "Product evidence"} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function EvaluationActionBar({
  onRunAnalysis,
  scoring,
  scoringProvider
}: {
  onRunAnalysis: () => void;
  scoring: boolean;
  scoringProvider?: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/8 bg-white/5 p-3">
      <div>
        <div className="text-sm font-semibold text-white">AI Scoring</div>
        <div className="mt-1 text-xs text-ink-500">Score Potential Stores from GMV/month, sold/month, and active promotions.</div>
      </div>
      <div className="flex items-center gap-2">
        {scoringProvider && (
          <span className="rounded-full border border-signal-green/25 bg-signal-green/10 px-3 py-1 text-xs text-signal-green">
            Saved with {scoringProvider}
          </span>
        )}
        <button className="primary-button h-9 w-auto px-3" type="button" onClick={onRunAnalysis} disabled={scoring}>
          <Brain size={15} />
          {scoring ? "Scoring" : "Run AI Scoring"}
        </button>
      </div>
    </div>
  );
}

function AnalysisSummary({ detail }: { detail: ProjectDetailPayload }) {
  if (detail.analyses.length === 0) {
    return (
      <div className="mt-3">
        <EmptyState label="No AI evaluation yet. Run AI after collecting Product Detail Qualified and Key Store evidence." />
      </div>
    );
  }
  const latest = [...detail.analyses].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
  const summary = analysisPreview(latest.resultJson);
  return (
    <div className="mt-3 rounded-md border border-white/8 bg-white/[0.04] p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.12em] text-ink-500">Latest AI Evaluation</div>
          <div className="mt-1 text-sm font-semibold text-white">{latest.provider}</div>
        </div>
        <div className="text-xs text-ink-500">{formatDateTime(latest.createdAt)}</div>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {summary.map((item) => (
          <div key={item.label} className="rounded border border-white/8 bg-white/5 p-2">
            <div className="text-[11px] uppercase tracking-[0.12em] text-ink-500">{item.label}</div>
            <div className="mt-1 text-sm text-ink-200">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KeyStorePanel({
  detail,
  onContinueCollection
}: {
  detail: ProjectDetailPayload;
  onContinueCollection: () => void;
}) {
  const candidate = storeEvaluationCandidates(detail)[0];
  if (!candidate) {
    return <EmptyState label="No Key Store selected yet. Complete Product Detail Qualified and run Evaluation Phase scoring first." />;
  }
  const matchingProducts = selectKeyProductCandidates(detail.products)
    .filter((product) => normalizeStoreKey(product) === candidate.key);
  const latestAnalysis = [...detail.analyses].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
  const conclusionSentences = keyStoreOverallConclusions(candidate, latestAnalysis?.resultJson);
  const storeProducts = detail.products.filter((product) => product.source === "Store Products");
  const storeBestSellers = detail.products.filter((product) => product.source === "Store Best Sellers");
  const homeAssets = detail.assets.filter((asset) => asset.kind === "STORE_HOME");
  const productAssets = detail.assets.filter((asset) => asset.kind === "STORE_FEATURED_PRODUCTS");
  const bestSellerAssets = detail.assets.filter((asset) => asset.kind === "STORE_BEST_SELLER");
  const bannerAssets = detail.assets.filter((asset) => asset.kind === "STORE_BANNER");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/8 bg-white/5 p-3">
        <div>
          <div className="text-xs uppercase tracking-[0.12em] text-ink-500">Selected Key Store</div>
          <div className="mt-1 text-base font-semibold text-white">{candidate.name}</div>
          {candidate.url && (
            <button className="secondary-button mt-2 h-8 max-w-full px-3 text-xs" type="button" onClick={() => void apiClient.openUrl(candidate.url ?? "")}>
              <ExternalLink size={13} />
              <span className="truncate">Open Store Page</span>
            </button>
          )}
        </div>
        <button className="primary-button h-9 w-auto px-3" type="button" onClick={onContinueCollection}>
          <ClipboardCheck size={15} />
          Collect Key Store Data
        </button>
      </div>

      <NestedReportSection title="Overall" defaultOpen>
        <div className="space-y-2 text-sm leading-6 text-ink-300">
          {conclusionSentences.map((sentence) => (
            <p key={sentence}>{sentence}</p>
          ))}
        </div>
      </NestedReportSection>

      <NestedReportSection title="Store Home Page" defaultOpen={false}>
        <AssetList assets={homeAssets} />
      </NestedReportSection>

      <NestedReportSection title="Products" defaultOpen={false}>
        <AssetList assets={productAssets} />
        <div className="mt-3">
          <ProductCardGrid products={storeProducts.length > 0 ? storeProducts : matchingProducts} />
        </div>
      </NestedReportSection>

      <NestedReportSection title="Best Sellers" defaultOpen={false}>
        <AssetList assets={bestSellerAssets} />
        {storeBestSellers.length > 0 && (
          <div className="mt-3">
            <ProductCardGrid products={storeBestSellers} />
          </div>
        )}
      </NestedReportSection>

      <NestedReportSection title="Visual Style" defaultOpen={false}>
        <AssetList assets={bannerAssets} />
      </NestedReportSection>
    </div>
  );
}

function ProjectOutlineNav({
  title,
  items,
  collapsed,
  onToggle
}: {
  title: string;
  items: Array<{ id: string; label: string; depth: number }>;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const groups = groupProjectOutlineItems(items);
  if (collapsed) {
    return (
      <nav className="mio-inspector-nav sticky top-4 self-start rounded-md border border-white/8 bg-white/5 p-2 text-sm">
        <button className="secondary-button h-8 w-8 px-0" type="button" onClick={onToggle} aria-label="Show project outline" title="Show project outline">
          <PanelLeftOpen size={15} />
        </button>
      </nav>
    );
  }
  return (
    <nav className="mio-inspector-nav sticky top-4 max-h-[calc(100vh-96px)] self-start overflow-auto rounded-md border border-white/8 bg-white/5 p-3 text-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="line-clamp-2 font-semibold text-white">{title}</div>
        <button className="secondary-button h-8 w-8 px-0" type="button" onClick={onToggle} aria-label="Hide project outline" title="Hide project outline">
          <PanelLeftClose size={15} />
        </button>
      </div>
      <div className="space-y-1">
        {groups.map((group) => (
          <details key={`${group.id}-${group.label}`} className="mio-outline-group rounded-md" open>
            <summary className="cursor-pointer select-none rounded px-2 py-1.5 text-sm font-semibold text-ink-200 hover:bg-white/8 hover:text-ink-950 dark:hover:text-white">
              <a href={`#${group.id}`} onClick={(event) => event.stopPropagation()}>{group.label}</a>
            </summary>
            <div className="mt-1 space-y-1">
              {group.children.map((item) => item.children.length > 0 ? (
                <details key={`${item.id}-${item.label}`} className="mio-outline-subgroup ml-3 rounded-md">
                  <summary className="cursor-pointer select-none rounded px-2 py-1.5 text-xs font-medium text-ink-300 hover:bg-white/8 hover:text-ink-950 dark:hover:text-white">
                    <a href={`#${item.id}`} onClick={(event) => event.stopPropagation()}>{item.label}</a>
                  </summary>
                  <div className="mt-1 space-y-1">
                    {item.children.map((child) => (
                      <a
                        key={`${child.id}-${child.label}`}
                        href={`#${child.id}`}
                        className="block rounded px-2 py-1.5 pl-5 text-xs text-ink-400 hover:bg-white/8 hover:text-ink-950 dark:hover:text-white"
                      >
                        {child.label}
                      </a>
                    ))}
                  </div>
                </details>
              ) : (
                <a
                  key={`${item.id}-${item.label}`}
                  href={`#${item.id}`}
                  className="ml-3 block rounded px-2 py-1.5 text-xs text-ink-400 hover:bg-white/8 hover:text-ink-950 dark:hover:text-white"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </details>
        ))}
      </div>
    </nav>
  );
}

function groupProjectOutlineItems(items: Array<{ id: string; label: string; depth: number }>) {
  const groups: Array<{
    id: string;
    label: string;
    children: Array<{
      id: string;
      label: string;
      children: Array<{ id: string; label: string }>;
    }>;
  }> = [];
  for (const item of items) {
    if (item.depth === 0 || groups.length === 0) {
      groups.push({ id: item.id, label: item.label, children: [] });
      continue;
    }
    const currentGroup = groups[groups.length - 1];
    if (item.depth === 1 || currentGroup.children.length === 0) {
      currentGroup.children.push({ id: item.id, label: item.label, children: [] });
      continue;
    }
    currentGroup.children[currentGroup.children.length - 1].children.push({ id: item.id, label: item.label });
  }
  return groups;
}

function ReportOutlineSection({ id, title, defaultOpen, children }: { id: string; title: string; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details id={id} className="mio-report-section scroll-mt-4 rounded-md border border-white/8 bg-white/5 p-4" open={defaultOpen}>
      <summary className="cursor-pointer select-none text-sm font-semibold text-white">{title}</summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function NestedReportSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details className="mb-3 rounded-md border border-white/8 bg-white/[0.04] p-3" open={defaultOpen}>
      <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">{title}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function AssetList({ assets }: { assets: ProjectDetailPayload["assets"] }) {
  if (assets.length === 0) {
    return <EmptyState label="No collected data yet for this section." />;
  }
  return (
    <div className="grid grid-cols-3 gap-3">
      {assets.slice(0, 12).map((asset) => (
        <button key={asset.id} type="button" className="rounded-md border border-white/8 bg-white/5 p-2 text-left hover:bg-white/8" onClick={() => void apiClient.openPath(asset.path)}>
          <div className="aspect-video overflow-hidden rounded bg-white/10">
            {asset.mimeType.startsWith("image/") ? <img src={toFileImageSrc(asset.path)} alt={asset.label} className="h-full w-full object-cover" /> : null}
          </div>
          <div className="mt-2 truncate text-xs font-medium text-white">{asset.label}</div>
          <div className="mt-1 truncate text-[11px] text-ink-500">{asset.kind}</div>
        </button>
      ))}
    </div>
  );
}

function ProductCardGrid({ products }: { products: ProjectProductEvidence[] }) {
  const [view, setView] = useState<"cards" | "list">("cards");
  if (products.length === 0) {
    return <EmptyState label="No rendered product rows extracted yet." />;
  }
  if (view === "list") {
    return (
      <div>
        <ProductViewToggle value={view} onChange={setView} />
        <div className="mt-3 overflow-hidden rounded-md border border-white/8">
          {products.slice(0, 40).map((product) => (
            <button key={product.id} type="button" className="grid w-full grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/8 bg-white/5 p-2 text-left last:border-b-0 hover:bg-white/8" onClick={() => void apiClient.openUrl(product.productUrl)}>
              <div className="h-16 w-16 overflow-hidden rounded bg-white/10">
              {product.imageUrl ? <img src={product.imageUrl} alt={displayProductTitle(product)} className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0">
                <div className="line-clamp-1 text-sm font-medium text-white">{displayProductTitle(product)}</div>
                <div className="mt-1 text-xs text-ink-500">
                  {formatCurrency(product.priceAverage)} · Rating {productRatingText(product)} · Sold {productSoldText(product)}
                </div>
              </div>
              <div className="text-xs text-ink-500">{productSourcePlacement(product)}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div>
      <ProductViewToggle value={view} onChange={setView} />
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {products.slice(0, 20).map((product) => (
          <button key={product.id} type="button" className="rounded-md border border-white/8 bg-white/5 p-2 text-left hover:bg-white/8" onClick={() => void apiClient.openUrl(product.productUrl)}>
            <div className="aspect-square overflow-hidden rounded bg-white/10">
              {product.imageUrl ? <img src={product.imageUrl} alt={displayProductTitle(product)} className="h-full w-full object-cover" /> : null}
            </div>
            <div className="mt-2 min-w-0">
              <div className="line-clamp-2 text-xs font-medium text-white">{displayProductTitle(product)}</div>
              <div className="mt-1 text-[11px] text-ink-500">
                {formatCurrency(product.priceAverage)} · Rating {productRatingText(product)} · Sold {productSoldText(product)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProductViewToggle({ value, onChange }: { value: "cards" | "list"; onChange: (value: "cards" | "list") => void }) {
  return (
    <div className="flex justify-end gap-1">
      <button className={["secondary-button h-8 w-8 px-0", value === "cards" ? "border-signal-blue/45 bg-signal-blue/12 text-signal-blue" : ""].join(" ")} type="button" onClick={() => onChange("cards")} aria-label="Card view" title="Card view">
        <LayoutGrid size={14} />
      </button>
      <button className={["secondary-button h-8 w-8 px-0", value === "list" ? "border-signal-blue/45 bg-signal-blue/12 text-signal-blue" : ""].join(" ")} type="button" onClick={() => onChange("list")} aria-label="List view" title="List view">
        <Rows3 size={14} />
      </button>
    </div>
  );
}

function ProductInfoTable({ products }: { products: ProjectProductEvidence[] }) {
  if (products.length === 0) {
    return <EmptyState label="Product info table is empty. Capture Relevance and Top Sales pages first." />;
  }
  return (
    <div className="overflow-auto rounded-md border border-white/8">
      <table className="min-w-[1160px] text-left text-xs">
        <thead className="bg-white/8 text-ink-500">
          <tr>
            <th className="px-3 py-2">No</th>
            <th className="px-3 py-2">Source</th>
            <th className="px-3 py-2">Reason</th>
            <th className="px-3 py-2">Product Title</th>
            <th className="px-3 py-2">Product Type</th>
            <th className="px-3 py-2">Monthly Sold</th>
            <th className="px-3 py-2">Store Name</th>
            <th className="px-3 py-2">Store Type</th>
            <th className="px-3 py-2">Price</th>
            <th className="px-3 py-2">Rating</th>
            <th className="px-3 py-2">Reviews</th>
            <th className="px-3 py-2">Total Sold</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => (
            <tr key={product.id} className="border-t border-white/8">
              <td className="px-3 py-2">{index + 1}</td>
              <td className="px-3 py-2">{productSourcePlacement(product)}</td>
              <td className="px-3 py-2">{product.selectionReason ?? "-"}</td>
              <td className="px-3 py-2">{displayProductTitle(product)}</td>
              <td className="px-3 py-2">{product.productType ?? inferredProductTypeLabel(displayProductTitle(product))}</td>
              <td className="px-3 py-2">{product.monthlySoldText ?? formatOptionalNumber(product.monthlySold)}</td>
              <td className="px-3 py-2">{product.storeName ?? "-"}</td>
              <td className="px-3 py-2">{storeTypeLabel(product)}</td>
              <td className="px-3 py-2">{formatCurrency(product.priceAverage)}</td>
              <td className="px-3 py-2">{productRatingText(product)}</td>
              <td className="px-3 py-2">{product.reviewText ?? formatOptionalNumber(product.reviewCount)}</td>
              <td className="px-3 py-2">{product.totalSoldText ?? formatOptionalNumber(product.totalSold)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KeyProductTableReview({
  products,
  totalProducts,
  onBackToBrowser,
  onStartProductDetails
}: {
  products: ProjectProductEvidence[];
  totalProducts: number;
  onBackToBrowser: () => void;
  onStartProductDetails: () => void;
}) {
  return (
    <Panel
      title="Key Product Table"
      icon={Table2}
      action={
        <button className="secondary-button h-9 w-auto px-3" type="button" onClick={onBackToBrowser}>
          <ChevronLeft size={15} />
          Browser
        </button>
      }
    >
      <div className="mb-4 rounded-md border border-signal-blue/20 bg-signal-blue/10 p-4 text-sm leading-6 text-ink-300">
        AI-assisted local scoring merged Relevance and Top Sales rows, removed duplicates, then prioritized Top Sales placement,
        monthly sold, reviews, rating, price clarity, and usable thumbnails. Showing {products.length} selected product{products.length === 1 ? "" : "s"} from {totalProducts} extracted row{totalProducts === 1 ? "" : "s"}.
      </div>
      <ProductInfoTable products={products} />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs leading-5 text-ink-500">
          Store Name, Total Sold, review detail, slides, description, and shop homepage are enriched during Product Detail Qualified collection.
        </div>
        <button className="primary-button h-10 w-auto px-4" type="button" onClick={onStartProductDetails} disabled={products.length === 0}>
          <ClipboardCheck size={16} />
          Start Collect Product Detail
        </button>
      </div>
    </Panel>
  );
}

function ProductQualifiedSection({
  product,
  reviews,
  assets
}: {
  product: ProjectProductEvidence;
  reviews: ProjectDetailPayload["reviews"];
  assets: ProjectDetailPayload["assets"];
}) {
  const firstPageAssets = assets.filter((asset) => asset.kind === "PRODUCT_PAGE");
  const shopHomeAssets = assets.filter((asset) => asset.kind === "STORE_HOME");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <InfoLine label="Price" value={formatCurrency(product.priceAverage)} />
        <InfoLine label="Store Name" value={product.storeName ?? "-"} />
        <InfoLine label="Store Type" value={storeTypeLabel(product)} />
        <InfoLine label="GMV ETA" value={formatCurrency((product.priceAverage ?? 0) * (product.monthlySold ?? product.totalSold ?? 0))} />
      </div>

      <NestedReportSection title="1st Page" defaultOpen={false}>
        <AssetList assets={firstPageAssets} />
      </NestedReportSection>

      <NestedReportSection title="Slides" defaultOpen={false}>
        <ProductImageGrid images={product.images.length > 0 ? product.images : product.imageUrl ? [product.imageUrl] : []} />
        <div className="mt-3">
          <ProductVideoGrid videos={product.videos} />
        </div>
      </NestedReportSection>

      <NestedReportSection title="Description" defaultOpen={false}>
        <div className="rounded-md border border-white/8 bg-white/[0.04] p-3">
          <p className="whitespace-pre-wrap text-sm leading-6 text-ink-300">
            {product.description ?? "No browser-readable product description captured yet."}
          </p>
        </div>
        {product.descriptionImages.length > 0 && (
          <div className="mt-3">
            <ProductImageGrid images={product.descriptionImages} />
          </div>
        )}
        <ProductPromotionSignals product={product} />
      </NestedReportSection>

      <NestedReportSection title="Reviews" defaultOpen={false}>
        <ReviewEvidenceTable reviews={reviews} />
      </NestedReportSection>

      <NestedReportSection title="Media in User" defaultOpen={false}>
        <ProductImageGrid images={product.reviewMediaImages} />
        <div className="mt-3">
          <ProductVideoGrid videos={product.reviewMediaVideos} />
        </div>
      </NestedReportSection>

      <NestedReportSection title="Shop Home Page" defaultOpen={false}>
        <AssetList assets={shopHomeAssets} />
      </NestedReportSection>
    </div>
  );
}

function productAssetsForStep(detail: ProjectDetailPayload, product: ProjectProductEvidence): ProjectDetailPayload["assets"] {
  const productAssets = detail.assets.filter((asset) => asset.ownerType === "PRODUCT" && asset.ownerId === product.id);
  const productStoreUrl = product.storeUrl ? normalizeUrl(product.storeUrl) : undefined;
  const legacyShopHomeAssets = productStoreUrl
    ? detail.assets.filter((asset) =>
        asset.kind === "STORE_HOME" &&
        asset.ownerType === "STORE" &&
        asset.sourceUrl &&
        sameUrlIntent(asset.sourceUrl, productStoreUrl) &&
        !productAssets.some((productAsset) => productAsset.id === asset.id)
      )
    : [];
  return [...productAssets, ...legacyShopHomeAssets];
}

function uniqueMediaValues(values: string[]): string[] {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value
        .replace(/([?&](?:x-oss-process|width|height|resize|quality|format)=[^&]+)/giu, "")
        .replace(/@resize_[^?]+/giu, "")
        .replace(/@!.*$/u, "");
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function ProductPromotionSignals({ product }: { product: ProjectProductEvidence }) {
  const rows = [
    { label: "Shop Vouchers", values: product.shopVouchers },
    { label: "Bundle Deals", values: product.bundleDeals }
  ];
  return (
    <div className="mt-3 grid gap-3 lg:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="rounded-md border border-white/8 bg-white/[0.04] p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">{row.label}</div>
          <div className="space-y-1 text-sm text-ink-300">
            {row.values.length > 0 ? row.values.slice(0, 8).map((value) => <div key={value}>{value}</div>) : <span className="text-ink-500">No promotion signal captured yet.</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function _ProductDossierSummary({
  product,
  reviews
}: {
  product: ProjectProductEvidence;
  reviews: ProjectDetailPayload["reviews"];
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <InfoLine label="Price" value={formatCurrency(product.priceAverage)} />
        <InfoLine label="Discount" value={product.discount ?? "-"} />
        <InfoLine label="Rating" value={productRatingText(product)} />
        <InfoLine label="Total Sold" value={productSoldText(product)} />
        <InfoLine label="Reviews" value={product.reviewText ?? formatOptionalNumber(product.reviewCount)} />
        <InfoLine label="Stock" value={formatOptionalNumber(product.stock)} />
        <InfoLine label="Voucher" value={product.voucherText ?? "-"} />
        <InfoLine label="Shipping" value={product.shippingText ?? "-"} />
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">Slides and Images</div>
        <ProductImageGrid images={product.images.length > 0 ? product.images : product.imageUrl ? [product.imageUrl] : []} />
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">Videos</div>
        <ProductVideoGrid videos={product.videos} />
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">Media in User</div>
        <ProductImageGrid images={product.reviewMediaImages} />
        {product.reviewMediaVideos.length > 0 && (
          <div className="mt-3">
            <ProductVideoGrid videos={product.reviewMediaVideos} />
          </div>
        )}
      </div>

      <div className="rounded-md border border-white/8 bg-white/[0.04] p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">Description</div>
        <p className="line-clamp-6 text-sm leading-6 text-ink-300">
          {product.description ?? "No browser-readable product description captured yet. Save Product Description evidence from the guided collector."}
        </p>
        {product.descriptionImages.length > 0 && (
          <div className="mt-3">
            <ProductImageGrid images={product.descriptionImages} />
          </div>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-white/8 bg-white/[0.04] p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">Variants</div>
          <div className="flex flex-wrap gap-2">
            {product.variants.slice(0, 16).map((variant) => (
              <span key={variant} className="rounded-full border border-white/8 bg-white/5 px-2 py-1 text-xs text-ink-300">
                {variant}
              </span>
            ))}
            {product.variants.length === 0 && <span className="text-sm text-ink-500">No variants detected.</span>}
          </div>
        </div>
        <div className="rounded-md border border-white/8 bg-white/[0.04] p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">Specifications</div>
          <div className="space-y-1 text-xs text-ink-300">
            {Object.entries(product.specifications).slice(0, 10).map(([key, value]) => (
              <div key={key} className="grid grid-cols-[120px_minmax(0,1fr)] gap-2">
                <span className="text-ink-500">{key}</span>
                <span>{value}</span>
              </div>
            ))}
            {Object.keys(product.specifications).length === 0 && <span className="text-sm text-ink-500">No specifications detected.</span>}
          </div>
        </div>
      </div>

      <ReviewEvidenceTable reviews={reviews} />
    </div>
  );
}

function ProductImageGrid({ images }: { images: string[] }) {
  const [brokenImages, setBrokenImages] = useState<Set<string>>(() => new Set());
  const visibleImages = uniqueMediaValues(images).filter((image) => !brokenImages.has(image));
  if (visibleImages.length === 0) {
    return <EmptyState label="No product image URLs captured yet." />;
  }
  return (
    <div className="grid grid-cols-3 gap-3">
      {visibleImages.slice(0, 9).map((image, index) => (
        <button key={`${image}-${index}`} type="button" className="overflow-hidden rounded-md border border-white/8 bg-white/5" onClick={() => void apiClient.openUrl(image)}>
          <div className="aspect-square bg-white/10">
            <img
              src={image}
              alt={`Product slide ${index + 1}`}
              className="h-full w-full object-cover"
              onError={() => setBrokenImages((current) => new Set(current).add(image))}
            />
          </div>
          <div className="px-2 py-1 text-left text-[11px] text-ink-500">Slide {index + 1}</div>
        </button>
      ))}
    </div>
  );
}

function ProductVideoGrid({ videos }: { videos: string[] }) {
  const visibleVideos = uniqueMediaValues(videos);
  if (visibleVideos.length === 0) {
    return <EmptyState label="No product video URLs captured yet." />;
  }
  return (
    <div className="grid grid-cols-3 gap-3">
      {visibleVideos.slice(0, 9).map((video, index) => (
        <button key={`${video}-${index}`} type="button" className="overflow-hidden rounded-md border border-white/8 bg-white/5" onClick={() => void apiClient.openUrl(video)}>
          <div className="mio-product-video-frame bg-black">
            <video src={video} className="h-full w-full object-contain" muted controls playsInline />
          </div>
          <div className="px-2 py-1 text-left text-[11px] text-ink-500">Video {index + 1}</div>
        </button>
      ))}
    </div>
  );
}

function curatedShopeeReviews(reviews: ProjectDetailPayload["reviews"]): ProjectDetailPayload["reviews"] {
  const cleanReviews = reviews.filter((review) => isReadableShopeeReview(review.comment));
  const positiveReviews = cleanReviews
    .filter((review) => review.sentiment === "POSITIVE" || (typeof review.rating === "number" && review.rating >= 5))
    .slice(0, 3);
  const negativeReviews = cleanReviews
    .filter((review) => review.sentiment === "NEGATIVE" || (typeof review.rating === "number" && review.rating <= 3))
    .slice(0, 2);
  return [...positiveReviews, ...negativeReviews].slice(0, 5);
}

function isReadableShopeeReview(comment: string): boolean {
  const value = comment.trim();
  return value.length >= 20 &&
    /\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}(?:\s+\d{1,2}:\d{2})?\b/u.test(value) &&
    !/^https?:\/\//iu.test(value) &&
    !/(product ratings|all\s*\(|semua\s*\(|comments?\s*\(|with media|dengan media|repeat purchase|shop vouchers|bundle deals|barcode|bpom sesuai|dermatologically tested|add to cart|buy now)/iu.test(value);
}

function reviewCommentCell(review: ProjectDetailPayload["reviews"][number]): string {
  const comment = review.comment.trim();
  const hasDate = review.reviewDate ? comment.includes(review.reviewDate) : /\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}/u.test(comment);
  const prefix = [
    hasDate ? undefined : review.reviewDate,
    review.variation && !comment.includes(review.variation) ? review.variation : undefined
  ].filter(Boolean);
  return [...prefix, comment].join(" | ");
}

function ReviewEvidenceTable({ reviews }: { reviews: ProjectDetailPayload["reviews"] }) {
  const curatedReviews = curatedShopeeReviews(reviews);
  if (curatedReviews.length === 0) {
    return <EmptyState label="No review text collected yet. Capture the review section with 3 positive and 2 negative examples visible." />;
  }
  return (
    <div className="overflow-auto rounded-md border border-white/8">
      <table className="min-w-[680px] text-left text-xs">
        <thead className="bg-white/8 text-ink-500">
          <tr>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Star Rated</th>
            <th className="px-3 py-2">Comment - Include timestamp</th>
          </tr>
        </thead>
        <tbody>
          {curatedReviews.map((review) => (
            <tr key={review.id} className="border-t border-white/8">
              <td className="px-3 py-2">{review.sentiment === "NEGATIVE" ? "Negative Reviews" : review.sentiment === "POSITIVE" ? "Positive Reviews" : "Neutral Reviews"}</td>
              <td className="px-3 py-2">{review.rating ? `${review.rating} Star` : "-"}</td>
              <td className="px-3 py-2">
                {reviewCommentCell(review)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportsView() {
  const queryClient = useQueryClient();
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: apiClient.dashboard });
  const reports = useQuery({ queryKey: ["reports"], queryFn: apiClient.reports });
  const [projectId, setProjectId] = useState("");
  const [sections, setSections] = useState<ReportSectionConfig[]>(DEFAULT_REPORT_SECTIONS);
  const [previewReport, setPreviewReport] = useState<ReportHtmlPayload | null>(null);
  const generateReport = useMutation({
    mutationFn: apiClient.generateReport,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    }
  });
  const deleteReport = useMutation({
    mutationFn: apiClient.deleteReport,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });
  const loadReportPreview = useMutation({
    mutationFn: apiClient.reportHtml,
    onSuccess: (result) => setPreviewReport(result)
  });
  const exportReportDocx = useMutation({
    mutationFn: apiClient.exportReportDocx,
    onSuccess: (result) => void apiClient.openPath(result.docxPath)
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

  function confirmDeleteReport(report: ReportSummary) {
    if (window.confirm(`Delete report for "${report.projectName}"? The saved PDF/HTML files will be removed where possible.`)) {
      deleteReport.mutate(report.id);
    }
  }

  return (
    <section className="grid grid-cols-[minmax(360px,0.75fr)_minmax(0,1.25fr)] gap-5">
      <div className="space-y-5">
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
        <Panel title="Report History" icon={Archive}>
          <div className="max-h-[520px] space-y-2 overflow-auto pr-1">
            {(reports.data ?? []).map((report) => (
              <div key={report.id} className="rounded-md border border-white/8 bg-white/5 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{report.projectName}</div>
                    <div className="text-xs text-ink-500">{formatDateTime(report.generatedAt ?? report.updatedAt)}</div>
                  </div>
                  <StatusPill status={report.status} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button className="secondary-button h-9 px-3 text-xs" type="button" disabled={!report.htmlPath || loadReportPreview.isPending} onClick={() => loadReportPreview.mutate(report.id)}>
                    <Eye size={14} />
                    Preview
                  </button>
                  <button className="secondary-button h-9 px-3 text-xs" type="button" disabled={!report.pdfPath} onClick={() => report.pdfPath && void apiClient.openPath(report.pdfPath)}>
                    <FileDown size={14} />
                    PDF
                  </button>
                  <button className="secondary-button h-9 px-3 text-xs" type="button" disabled={!report.htmlPath} onClick={() => report.htmlPath && void apiClient.openPath(report.htmlPath)}>
                    <FileText size={14} />
                    HTML
                  </button>
                  <button className="secondary-button h-9 px-3 text-xs" type="button" disabled={!report.htmlPath || exportReportDocx.isPending} onClick={() => exportReportDocx.mutate(report.id)}>
                    <FileDown size={14} />
                    DOCX
                  </button>
                  <button className="secondary-button h-9 px-3 text-xs text-signal-rose" type="button" disabled={deleteReport.isPending} onClick={() => confirmDeleteReport(report)}>
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {(reports.data ?? []).length === 0 && <EmptyState label="No generated reports yet." />}
          </div>
        </Panel>
      </div>
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
      {previewReport && <ReportPreviewModal report={previewReport} onClose={() => setPreviewReport(null)} />}
    </section>
  );
}

function ReportPreviewModal({ report, onClose }: { report: ReportHtmlPayload; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copyReport() {
    if ("ClipboardItem" in window && navigator.clipboard.write) {
      const htmlClipboard = new ClipboardItem({
        "text/html": new Blob([report.html], { type: "text/html" }),
        "text/plain": new Blob([report.text], { type: "text/plain" })
      });
      await navigator.clipboard.write([htmlClipboard]).catch(async () => {
        await navigator.clipboard.writeText(report.text || report.html);
      });
    } else {
      await navigator.clipboard.writeText(report.text || report.html);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="mio-panel flex h-[calc(100vh-48px)] w-[min(1180px,calc(100vw-48px))] flex-col rounded-[18px] border border-white/12 bg-ink-900/95 p-4 shadow-glow">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">Report Preview</div>
            <div className="mt-1 truncate text-xs text-ink-500">{report.htmlPath}</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="secondary-button h-9 w-auto px-3 text-xs" type="button" onClick={() => void copyReport()}>
              <Copy size={14} />
              {copied ? "Copied" : "Copy Report"}
            </button>
            <button className="secondary-button h-9 w-auto px-3 text-xs" type="button" onClick={() => void apiClient.openPath(report.htmlPath)}>
              <FileText size={14} />
              Open HTML
            </button>
            <button className="secondary-button h-9 w-auto px-3 text-xs" type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <iframe title="Report preview" srcDoc={report.html} className="min-h-0 flex-1 rounded-xl border border-white/12 bg-white" />
      </div>
    </div>
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
              <div>Product: {health.data?.product ?? APP_DISPLAY_NAME}</div>
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
  compact,
  children,
  onClick
}: {
  active: boolean;
  disabled?: boolean;
  icon: LucideIcon;
  compact?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        "inline-flex h-9 items-center justify-center rounded-md border text-sm transition",
        compact ? "gap-1.5 px-2" : "gap-2 px-3",
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
    <div className="mio-metric-card rounded-md border border-white/8 bg-white/6 p-4">
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
  className,
  children
}: {
  title: string;
  icon: LucideIcon;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={["mio-panel rounded-[18px] border border-white/8 bg-ink-900/72 p-5", className ?? ""].join(" ")}>
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

function ProjectStatusPill({ completed }: { completed: boolean }) {
  return (
    <span className={["shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold", completed ? "bg-signal-green/15 text-signal-green" : "bg-signal-amber/15 text-signal-amber"].join(" ")}>
      {completed ? "Completed" : "Incomplete"}
    </span>
  );
}

function LoadStatePill({ state }: { state: "idle" | "loading" | "ready" | "failed" }) {
  const labels: Record<typeof state, string> = {
    idle: "Idle",
    loading: "Loading",
    ready: "Ready",
    failed: "Needs attention"
  };
  return (
    <div
      className={[
        "mio-load-pill rounded-full border px-3 py-1 text-xs",
        state === "ready" ? "border-signal-green/25 bg-signal-green/10 text-signal-green" : "",
        state === "failed" ? "border-signal-amber/35 bg-signal-amber/10 text-signal-amber" : "",
        state === "loading" ? "border-signal-blue/25 bg-signal-blue/10 text-signal-blue" : "",
        state === "idle" ? "border-white/10 bg-white/6 text-ink-300" : ""
      ].join(" ")}
    >
      {labels[state]}
    </div>
  );
}

function AndroidStatusTile({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  return (
    <div className="rounded-md border border-white/8 bg-white/5 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-[0.12em] text-ink-500">{label}</span>
        {ready ? <CheckCircle2 size={14} className="text-signal-green" /> : <Circle size={12} className="text-ink-500" />}
      </div>
      <div className="truncate text-sm text-white">{value}</div>
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

function CircularProgress({ value }: { value: number }) {
  const normalized = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-signal-blue"
      style={{ background: `conic-gradient(#62a8ff ${normalized * 3.6}deg, rgba(148, 163, 184, 0.18) 0deg)` }}
      aria-label={`${normalized}% complete`}
    >
      <div className="absolute inset-[4px] rounded-full bg-white dark:bg-ink-900" />
      <span className="relative">{normalized}%</span>
    </div>
  );
}

function collectionStageLabel(stage: CollectionStage): string {
  switch (stage) {
    case "PRODUCT_DETAILS":
      return "Part 2 - Product Details";
    case "EVALUATION_KEY_STORE":
      return "Part 3 - Evaluation and Key Store";
    case "KEYWORD_GENERAL":
    default:
      return "Part 1 - Keyword General";
  }
}

function collectionStageShortLabel(stage: CollectionStage): string {
  switch (stage) {
    case "PRODUCT_DETAILS":
      return "Part 2";
    case "EVALUATION_KEY_STORE":
      return "Part 3";
    case "KEYWORD_GENERAL":
    default:
      return "Part 1";
  }
}

function defaultCollectionState(): CollectionState {
  return {
    stage: "KEYWORD_GENERAL",
    stageLabel: "Part 1 - Keyword General",
    progressPercent: 0,
    completedStepIds: [],
    stepAssetPaths: {},
    stageCompleted: {}
  };
}

function projectCollectionState(project: ProjectSummary): CollectionState {
  return (project as ProjectSummary & { collectionState?: CollectionState }).collectionState ?? defaultCollectionState();
}

function isProjectComplete(project: ProjectSummary): boolean {
  return projectCollectionState(project).progressPercent >= 100;
}

function projectMediaCount(detail: ProjectDetailPayload): number {
  const productMedia = detail.products.flatMap((product) => [
    product.imageUrl,
    ...product.images,
    ...product.videos,
    ...product.descriptionImages,
    ...product.reviewMediaImages,
    ...product.reviewMediaVideos
  ].filter((value): value is string => Boolean(value)));
  return uniqueMediaValues([
    ...detail.assets.map((asset) => asset.path),
    ...productMedia
  ]).length;
}

function stageCompletionButtonLabel(stage: CollectionStage): string {
  switch (stage) {
    case "KEYWORD_GENERAL":
      return "Done";
    case "PRODUCT_DETAILS":
      return "Collection Complete";
    case "EVALUATION_KEY_STORE":
      return "Open Evaluation";
    default:
      return "Done";
  }
}

function nextCollectionStage(stage: CollectionStage): CollectionStage | null {
  switch (stage) {
    case "KEYWORD_GENERAL":
      return "PRODUCT_DETAILS";
    case "PRODUCT_DETAILS":
      return "EVALUATION_KEY_STORE";
    case "EVALUATION_KEY_STORE":
    default:
      return null;
  }
}

function collectionProgress(steps: CollectionStep[], stepAssetPaths: Record<string, string>): number {
  if (steps.length === 0) {
    return 0;
  }
  const completed = steps.filter((step) => isCollectionStepComplete(step, stepAssetPaths)).length;
  return Math.round((completed / steps.length) * 100);
}

function stepProgressKey(step: CollectionStep, subActionId?: string): string {
  return subActionId ? `${step.id}:${subActionId}` : step.id;
}

function isCurrentCollectorTargetSaved(
  step: CollectionStep,
  subActionId: string | undefined,
  stepAssetPaths: Record<string, string>
): boolean {
  if (subActionId) {
    return Boolean(stepAssetPaths[stepProgressKey(step, subActionId)] || stepAssetPaths[step.id]);
  }
  return isCollectionStepComplete(step, stepAssetPaths);
}

function isCollectionStepComplete(step: CollectionStep, stepAssetPaths: Record<string, string>): boolean {
  if (stepAssetPaths[step.id]) {
    return true;
  }
  if (step.stage !== "PRODUCT_DETAILS" || !step.subActions?.length) {
    return false;
  }
  return step.subActions.every((action) => Boolean(stepAssetPaths[stepProgressKey(step, action.id)]));
}

function buildCollectionSteps(
  project: ProjectSummary,
  platform: ResearchPlatform,
  currentUrl: string,
  detail?: ProjectDetailPayload
): CollectionStep[] {
  return platform === "SHOPEE_ID"
    ? buildShopeeSteps(project, currentUrl, detail?.products ?? [])
    : buildTikTokSteps(project, currentUrl);
}

function buildAndroidTikTokSteps(project: ProjectSummary, status: AndroidToolStatus | undefined): CollectionStep[] {
  const tiktokReady = Boolean(status?.ready);
  const keyword = project.keyword;
  return [
    {
      id: "android-tiktok-launch",
      stage: "EVALUATION_KEY_STORE",
      section: "Android TikTok Setup",
      label: "TikTok app launch evidence",
      kind: "SOCIAL_ACCOUNT",
      instruction: "Launch the Android emulator, install or open TikTok, and capture the TikTok home or shop entry surface.",
      ready: tiktokReady
    },
    {
      id: "android-tiktok-keyword-search",
      stage: "EVALUATION_KEY_STORE",
      section: "TikTok Shop Search",
      label: `TikTok keyword search: ${keyword}`,
      kind: "SEARCH_RESULT",
      instruction: "Inside the TikTok app, search the desired keyword or open TikTok Shop search, then capture the first useful result surface.",
      ready: tiktokReady
    },
    {
      id: "android-tiktok-product-detail",
      stage: "PRODUCT_DETAILS",
      section: "TikTok Shop Product",
      label: "TikTok product detail evidence",
      kind: "PRODUCT_PAGE",
      instruction: "Open a candidate TikTok Shop product and capture title, price, seller, ratings, sales or trust indicators visible on the screen.",
      ready: tiktokReady
    },
    {
      id: "android-tiktok-store-detail",
      stage: "EVALUATION_KEY_STORE",
      section: "TikTok Shop Store",
      label: "TikTok store detail evidence",
      kind: "STORE_HOME",
      instruction: "Open the seller or brand store in TikTok Shop and capture the visible profile, products, and trust cues.",
      ready: tiktokReady
    },
    {
      id: "android-tiktok-brand-search",
      stage: "EVALUATION_KEY_STORE",
      section: "Cross Platform Evidence",
      label: "TikTok brand/store search evidence",
      kind: "SOCIAL_ACCOUNT",
      instruction: "Search the target Shopee store name or brand name in TikTok and capture the evidence for cross-platform presence.",
      ready: tiktokReady
    }
  ];
}

function buildShopeeSteps(
  project: ProjectSummary,
  currentUrl: string,
  products: ProjectProductEvidence[]
): CollectionStep[] {
  const keyword = encodeURIComponent(project.keyword);
  const relevanceUrl = `https://shopee.co.id/search?keyword=${keyword}&page=0&sortBy=relevancy`;
  const salesUrl = `https://shopee.co.id/search?keyword=${keyword}&page=0&sortBy=sales`;
  const searchReady = isShopeeSearchPage(currentUrl);
  const productReady = isShopeeProductPage(currentUrl);
  const storeReady = isShopeeStorePage(currentUrl);
  const hasRelevanceProducts = products.some((product) => product.source === "Relevance");
  const hasTopSalesProducts = products.some((product) => product.source === "Top Sales");
  const keyProducts = selectKeyProductCandidates(products);
  const keyStoreSeed = selectKeyStoreSeedProduct(keyProducts);
  const keyStoreUrl = keyStoreSeed?.storeUrl ?? undefined;
  const keyStoreBrandName = keyStoreSeed?.storeName ?? storeNameFromUrl(keyStoreUrl) ?? project.keyword;
  const currentStoreUrl = storeReady ? currentUrl : keyStoreUrl;
  const popularStoreTarget = currentStoreUrl ? withStoreSort(currentStoreUrl, "pop") : undefined;
  const bestSellerTarget = currentStoreUrl ? withStoreSort(currentStoreUrl, "sales") : undefined;
  const tiktokBrandSearchTarget = `https://www.tiktok.com/search?q=${encodeURIComponent(keyStoreBrandName)}`;

  const discoverySteps: CollectionStep[] = [
    {
      id: "keyword-relevance",
      stage: "KEYWORD_GENERAL",
      section: "Keyword as Title",
      label: "Relevance first page screenshot",
      kind: "SEARCH_RESULT",
      instruction: "Open the Shopee relevance result page for the desired keyword and capture the visible first page.",
      targetUrl: relevanceUrl,
      ready: sameUrlIntent(currentUrl, relevanceUrl) || searchReady
    },
    {
      id: "keyword-top-sales",
      stage: "KEYWORD_GENERAL",
      section: "Keyword as Title",
      label: "Top sales first page screenshot",
      kind: "TOP_SALES",
      instruction: "Open the Shopee top-sales result page for the desired keyword and capture the visible first page.",
      targetUrl: salesUrl,
      ready: sameUrlIntent(currentUrl, salesUrl) || searchReady
    },
    {
      id: "key-product-table",
      stage: "KEYWORD_GENERAL",
      section: "Key Product",
      label: "Build key product table",
      kind: "SEARCH_RESULT",
      mode: "PROCESS",
      instruction: "Process Relevance and Top Sales product rows into the Key Product table. No extra screenshot is captured in this step.",
      ready: hasRelevanceProducts && hasTopSalesProducts
    }
  ];

  const productSteps = keyProducts.map((product): CollectionStep => {
    const productUrl = product.productUrl;
    const productCurrent = productReady && sameProductIntent(currentUrl, productUrl);
    const productTitle = displayProductTitle(product);
    return {
      id: `product-${product.id}-qualified`,
      stage: "PRODUCT_DETAILS",
      section: productTitle,
      label: shortProductTitle(productTitle),
      kind: "PRODUCT_PAGE",
      captureMode: "viewport",
      ownerType: "PRODUCT",
      ownerId: product.id,
      targetUrl: productUrl,
      instruction: `Open ${productTitle}. Capture the visible first frame; the app syncs slides, video, description, reviews, user media, vouchers, and bundle deals from the page HTML in the background.`,
      substeps: [
        "First page: capture visible first viewport only",
        "Slides: download images and videos from page-product picture/source/video elements",
        "Description: sync from page-product__content in the background",
        "Reviews: open 5-star tab and collect 3 positive rows, then open 1-star tab or the nearest available 2/3-star tab and collect 2 negative rows",
        "Media in User: download review image/video carousel URLs",
        "Shop vouchers and bundle deals: sync in the background",
        "Shop Home Page: open the shop page later for store evidence"
      ],
      subActions: [
        {
          id: "first-page",
          label: "First page screenshot",
          mode: "screenshot",
          collectLabel: "Capture",
          description: "Capture only the visible first viewport frame."
        },
        {
          id: "slides",
          label: "Slides and images",
          mode: "download",
          collectLabel: "Download Images",
          description: "Extract first-page product gallery image and video URLs only."
        },
        {
          id: "positive-reviews",
          label: "Positive reviews: 5 star",
          mode: "collect",
          collectLabel: "Collect Data",
          guidance: "Open the Shopee 5-star review tab first, then click Collect.",
          description: "Collect up to 3 positive reviews from product-ratings and product-comment-list."
        },
        {
          id: "negative-reviews",
          label: "Negative reviews: 1-3 star",
          mode: "collect",
          collectLabel: "Collect Data",
          guidance: "Open the Shopee 1-star tab first. If it has no rows, open 2-star or 3-star, then click Collect.",
          description: "Collect up to 2 negative reviews from the selected low-star tab."
        },
        {
          id: "media-in-user",
          label: "Media in user",
          mode: "download",
          collectLabel: "Download Review Media",
          description: "Extract image and video URLs from review media only."
        },
        {
          id: "description-promotions",
          label: "Description, vouchers, bundle deals",
          mode: "background",
          collectLabel: "Collect Data",
          description: "Sync description, mini vouchers, and Bundle Deals from readable HTML."
        },
        {
          id: "shop-homepage",
          label: "Shop Home Page",
          mode: "screenshot",
          collectLabel: "Capture Shop Page",
          captureMode: "full-page",
          description: product.storeUrl ? "Open the synced shop page and capture the full shop page." : "Open the PDP, visit View Shop manually, then capture the shop page.",
          guidance: product.storeUrl ? "Open Target switches to the store page. Capture the shop page after it is visible." : "Store URL is not synced yet. Open the product page, use View Shop manually, then capture.",
          targetUrl: product.storeUrl ?? productUrl
        }
      ],
      ready: productCurrent
    };
  });

  const genericProductSteps: CollectionStep[] = keyProducts.length > 0 ? [] : [
    {
      id: "product-detail-first-page",
      stage: "PRODUCT_DETAILS",
      section: "Product Detailed Qualified",
      label: "Product page first viewport",
      kind: "PRODUCT_PAGE",
      captureMode: "viewport",
      instruction: "Capture relevance/top-sales first. Until products are extracted, open any selected product page and capture the first viewport.",
      ready: productReady
    }
  ];

  const storeSteps: CollectionStep[] = [
    {
      id: "evaluation-phase-scoring",
      stage: "EVALUATION_KEY_STORE",
      section: "Evaluation Phase",
      label: "AI score Potential Stores",
      kind: "STORE_HOME",
      mode: "PROCESS",
      instruction: "Score Potential Stores by estimated GMV/month, sold/month, and active promotion signals. The highest ranked store becomes the Key Store.",
      subActions: [
        {
          id: "potential-stores",
          label: "Potential Store cards",
          mode: "sync",
          description: "Deduplicate qualified products by store and show one card per store."
        },
        {
          id: "ai-scoring",
          label: "AI Scoring",
          mode: "sync",
          description: "Use GMV/month, sold/month, shop vouchers, bundle deals, and evidence readiness."
        },
        {
          id: "key-store-selection",
          label: "Key Store selection",
          mode: "background",
          description: "Promote the highest scoring Potential Store into the Key Store section."
        }
      ],
      ready: keyProducts.some((product) => product.storeName || product.storeUrl)
    },
    {
      id: "store-homepage",
      stage: "EVALUATION_KEY_STORE",
      section: "Key Store",
      label: "Store homepage",
      kind: "STORE_HOME",
      targetSelector: ".shop-decoration",
      instruction: "Open the inspected product store page and capture only the shop-decoration homepage area.",
      targetUrl: keyStoreUrl,
      ready: Boolean(storeReady && (!keyStoreUrl || sameUrlIntent(currentUrl, keyStoreUrl)))
    },
    {
      id: "store-products",
      stage: "EVALUATION_KEY_STORE",
      section: "Key Store",
      label: "Store products popular page",
      kind: "STORE_FEATURED_PRODUCTS",
      targetSelector: ".shop-page__all-products-section",
      instruction: "Open the store product tab sorted by popular products. Capture only shop-page__all-products-section and extract product rows like the Relevance section.",
      targetUrl: popularStoreTarget,
      ready: storeReady && currentUrl.includes("sortBy=pop")
    },
    {
      id: "store-best-seller",
      stage: "EVALUATION_KEY_STORE",
      section: "Key Store",
      label: "Store best-seller page",
      kind: "STORE_BEST_SELLER",
      targetSelector: ".shop-page__all-products-section",
      instruction: "Open the store product tab sorted by sales. Capture only shop-page__all-products-section and extract product rows like the Top Sales section.",
      targetUrl: bestSellerTarget,
      ready: storeReady && currentUrl.includes("sortBy=sales")
    },
    {
      id: "store-visual-style",
      stage: "EVALUATION_KEY_STORE",
      section: "Key Store",
      label: "Store visual style and banners",
      kind: "STORE_BANNER",
      targetSelector: ".shop-decoration",
      instruction: "Download all readable banner images from shop-decoration, including carousel banners.",
      targetUrl: keyStoreUrl,
      ready: storeReady
    },
    {
      id: "tiktok-brand-search",
      stage: "EVALUATION_KEY_STORE",
      section: "Cross Platform Evidence",
      label: "TikTok brand/store search",
      kind: "SOCIAL_ACCOUNT",
      instruction: `Open TikTok search for ${keyStoreBrandName}, then capture or attach the cross-platform evidence.`,
      targetUrl: tiktokBrandSearchTarget,
      ready: sameUrlIntent(currentUrl, tiktokBrandSearchTarget) || isTikTokPage(currentUrl)
    }
  ];

  return [...discoverySteps, ...genericProductSteps, ...productSteps, ...storeSteps];
}

function buildTikTokSteps(project: ProjectSummary, currentUrl: string): CollectionStep[] {
  const keyword = encodeURIComponent(project.keyword);
  const tiktokReady = isTikTokPage(currentUrl);
  return [
    {
      id: "tiktok-shop-search",
      stage: "KEYWORD_GENERAL",
      section: "TikTok Shop Manual Evidence",
      label: "TikTok Shop keyword search",
      kind: "SEARCH_RESULT",
      instruction: "Open TikTok Shop or TikTok search for the desired keyword and capture the first useful result surface.",
      targetUrl: `https://www.tiktok.com/search?q=${keyword}`,
      ready: tiktokReady
    },
    {
      id: "tiktok-product-detail",
      stage: "PRODUCT_DETAILS",
      section: "TikTok Shop Manual Evidence",
      label: "TikTok product detail",
      kind: "PRODUCT_PAGE",
      instruction: "Open a candidate product or shop result and capture price, title, seller, and visible trust signals.",
      ready: tiktokReady && !currentUrl.endsWith("/shop")
    },
    {
      id: "tiktok-store-detail",
      stage: "EVALUATION_KEY_STORE",
      section: "TikTok Shop Manual Evidence",
      label: "TikTok store detail",
      kind: "STORE_HOME",
      instruction: "Open the store or seller profile and capture the visible store evidence.",
      ready: tiktokReady
    },
    {
      id: "tiktok-cross-platform",
      stage: "EVALUATION_KEY_STORE",
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

function isProtectedShopeePage(value: string): boolean {
  return value.includes("shopee.co.id/verify") || value.includes("traffic") || value.includes("captcha");
}

function isShopeeLoginPage(value: string): boolean {
  return value.includes("shopee.co.id/buyer/login") || value.includes("login");
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

function sameProductIntent(current: string, target: string): boolean {
  const currentId = shopeeProductIdentity(current);
  const targetId = shopeeProductIdentity(target);
  if (currentId && targetId) {
    return currentId === targetId;
  }
  return samePathIntent(current, target);
}

function samePathIntent(current: string, target: string): boolean {
  try {
    const currentUrl = new URL(current);
    const targetUrl = new URL(target);
    return currentUrl.hostname === targetUrl.hostname && currentUrl.pathname === targetUrl.pathname;
  } catch {
    return false;
  }
}

function shopeeProductIdentity(value: string): string | undefined {
  const match = /(?:-i\.|i\.|product\/)(\d+)[./](\d+)/u.exec(value);
  return match ? `${match[1]}:${match[2]}` : undefined;
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

function storeNameFromUrl(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  try {
    const url = new URL(value);
    const slug = decodeURIComponent(url.pathname.split("/").filter(Boolean)[0] ?? "");
    const name = slug.replace(/[-_]+/gu, " ").replace(/\.id$/iu, "").trim();
    return name || undefined;
  } catch {
    return undefined;
  }
}

function selectKeyProductCandidates(products: ProjectProductEvidence[]): ProjectProductEvidence[] {
  const merged = new Map<string, ProjectProductEvidence>();
  for (const product of products.filter(isQualifiedProductSource)) {
    const key = normalizeProductKey(product);
    const current = merged.get(key);
    if (!current || productQualityScore(product) > productQualityScore(current)) {
      merged.set(key, mergeProductSignals(current, product));
    } else {
      merged.set(key, mergeProductSignals(product, current));
    }
  }
  return Array.from(merged.values())
    .filter((product) => product.title && product.productUrl)
    .sort((left, right) => productQualityScore(right) - productQualityScore(left))
    .slice(0, 10);
}

function isQualifiedProductSource(product: ProjectProductEvidence): boolean {
  return product.source !== "Store Products" && product.source !== "Store Best Sellers";
}

function normalizeProductKey(product: ProjectProductEvidence): string {
  try {
    const url = new URL(product.productUrl);
    return url.pathname.replace(/\/$/u, "").toLowerCase();
  } catch {
    return product.title.toLowerCase().replace(/\s+/gu, " ").trim();
  }
}

function mergeProductSignals(base: ProjectProductEvidence | undefined, preferred: ProjectProductEvidence): ProjectProductEvidence {
  if (!base) {
    return preferred;
  }
  return {
    ...preferred,
    sourcePlacement: mergePlacementLabels([preferred.sourcePlacement, base.sourcePlacement, productSourcePlacement(preferred), productSourcePlacement(base)]),
    selectionReason: mergeReasonLabels(preferred.selectionReason, base.selectionReason),
    productType: preferred.productType ?? base.productType,
    storeType: preferred.storeType ?? base.storeType,
    ratingText: preferred.ratingText ?? base.ratingText,
    reviewText: preferred.reviewText ?? base.reviewText,
    monthlySoldText: preferred.monthlySoldText ?? base.monthlySoldText,
    totalSoldText: preferred.totalSoldText ?? base.totalSoldText,
    monthlySold: preferred.monthlySold ?? base.monthlySold,
    totalSold: preferred.totalSold ?? base.totalSold,
    reviewCount: preferred.reviewCount ?? base.reviewCount,
    rating: preferred.rating ?? base.rating,
    storeName: preferred.storeName ?? base.storeName,
    storeUrl: preferred.storeUrl ?? base.storeUrl,
    imageUrl: preferred.imageUrl ?? base.imageUrl,
    images: preferred.images.length > 0 ? preferred.images : base.images,
    videos: preferred.videos.length > 0 ? preferred.videos : base.videos,
    descriptionImages: preferred.descriptionImages.length > 0 ? preferred.descriptionImages : base.descriptionImages,
    reviewMediaImages: preferred.reviewMediaImages.length > 0 ? preferred.reviewMediaImages : base.reviewMediaImages,
    reviewMediaVideos: preferred.reviewMediaVideos.length > 0 ? preferred.reviewMediaVideos : base.reviewMediaVideos
  };
}

function productQualityScore(product: ProjectProductEvidence): number {
  const topSalesBoost = product.source === "Top Sales" ? 120 - Math.min(product.rank ?? 99, 99) : 35 - Math.min(product.rank ?? 35, 35);
  const monthlySoldScore = product.monthlySold ? Math.log10(product.monthlySold + 1) * 18 : 0;
  const totalSoldScore = product.totalSold ? Math.log10(product.totalSold + 1) * 12 : 0;
  const reviewScore = product.reviewCount ? Math.log10(product.reviewCount + 1) * 10 : 0;
  const ratingScore = product.rating ? product.rating * 12 : 0;
  const priceScore = product.priceAverage ? 8 : 0;
  const imageScore = product.imageUrl ? 8 : 0;
  return topSalesBoost + monthlySoldScore + totalSoldScore + reviewScore + ratingScore + priceScore + imageScore;
}

function productSourcePlacement(product: ProjectProductEvidence): string {
  if (product.sourcePlacement) {
    return product.sourcePlacement;
  }
  if (product.source === "Top Sales") {
    return `Top ${product.rank ?? "-"}`;
  }
  if (product.source === "Relevance") {
    return `Relevance ${product.rank ?? "-"}`;
  }
  return product.source ?? "-";
}

function mergePlacementLabels(values: Array<string | null | undefined>): string {
  return uniqueInlineLabels(values).join(" / ");
}

function mergeReasonLabels(...values: Array<string | null | undefined>): string {
  return uniqueInlineLabels(values.flatMap((value) => String(value ?? "").split("/"))).join(" / ");
}

function uniqueInlineLabels(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (!normalized || normalized === "-" || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    output.push(normalized);
  }
  return output;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const normalized = String(value ?? "").replace(/\s+/gu, " ").trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(normalized);
  }
  return output;
}

function shortProductTitle(title: string): string {
  return title.length > 54 ? `${title.slice(0, 51).trim()}...` : title;
}

function displayProductTitle(product: ProjectProductEvidence, fallback = "Product detail"): string {
  const title = product.title?.trim();
  if (title && !isBadDisplayProductTitle(title)) {
    return title;
  }
  try {
    const url = new URL(product.productUrl);
    const slug = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(0) ?? "")
      .replace(/[-_]+/gu, " ")
      .trim();
    return slug && !isBadDisplayProductTitle(slug) ? titleCase(slug) : fallback;
  } catch {
    return fallback;
  }
}

function isBadDisplayProductTitle(value: string): boolean {
  return /(shopping cart|cart icon|keranjang|add to cart|buy now|favorite|share|seller centre|seller center|notifications?|notifikasi|help|bantuan|report|laporkan)/iu.test(value);
}

function formatCurrency(value?: number | null): string {
  if (!value) {
    return "-";
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatOptionalNumber(value?: number | null): string {
  if (value === null || value === undefined) {
    return "-";
  }
  return new Intl.NumberFormat("id-ID").format(value);
}

function toFileImageSrc(path: string): string {
  const normalized = path.replace(/\\/gu, "/");
  if (/^[a-z]:\//iu.test(normalized)) {
    return `file:///${normalized}`;
  }
  if (normalized.startsWith("/")) {
    return `file://${normalized}`;
  }
  return normalized;
}

function inferredProductTypeLabel(title: string): string {
  const normalized = title.toLowerCase();
  if (/iphone\s*15|iphone15/u.test(normalized)) {
    return "iphone15";
  }
  if (/iphone/u.test(normalized)) {
    return "iPhones";
  }
  if (/bulu mata|eyelash|lashes|lash/u.test(normalized)) {
    return "Eyelash";
  }
  if (/eye\s*cream|krim mata|mata anti keriput/u.test(normalized)) {
    return "eye cream";
  }
  if (/lotion|body lotion|handbody/u.test(normalized)) {
    return "body lotion";
  }
  if (/lip\s*tint|lipstick|liptint/u.test(normalized)) {
    return "lip tint";
  }
  if (/serum/u.test(normalized)) {
    return "serum";
  }
  return "marketplace product";
}

function storeTypeLabel(product: ProjectProductEvidence): string {
  if (product.storeType && /^(Mall ORI|Star\+|Star)$/u.test(product.storeType)) {
    return product.storeType;
  }
  return "-";
}

function productRatingText(product: ProjectProductEvidence): string {
  if (product.ratingText) {
    return product.ratingText;
  }
  return product.rating === undefined || product.rating === null ? "-" : product.rating.toFixed(1).replace(".", ",");
}

function productSoldText(product: ProjectProductEvidence): string {
  return product.totalSoldText ?? product.monthlySoldText ?? formatOptionalNumber(product.totalSold ?? product.monthlySold);
}

type StoreEvaluationCandidate = {
  key: string;
  name: string;
  url?: string;
  type: string;
  score: number;
  productCount: number;
  gmvEstimate: number;
  monthlySoldEstimate: number;
  promotionCount: number;
  thumbnail?: string;
  hasStoreEvidence: boolean;
};

function storeEvaluationCandidates(detail: ProjectDetailPayload): StoreEvaluationCandidate[] {
  const storeEvidenceKinds: Array<ProjectDetailPayload["assets"][number]["kind"]> = [
    "STORE_HOME",
    "STORE_FEATURED_PRODUCTS",
    "STORE_BEST_SELLER",
    "STORE_BANNER",
    "STORE_PROMOTION",
    "STORE_VOUCHER"
  ];
  const hasStoreEvidence = hasAnyAsset(detail, storeEvidenceKinds);
  const grouped = new Map<string, StoreEvaluationCandidate & { qualityTotal: number }>();
  for (const product of selectKeyProductCandidates(detail.products).filter((item) => item.storeName || item.storeUrl)) {
    const key = normalizeStoreKey(product);
    const existing = grouped.get(key);
    const monthlySold = product.monthlySold ?? 0;
    const price = product.priceAverage ?? 0;
    const promotionCount = product.promotionCount ?? product.shopVouchers.length + product.bundleDeals.length;
    const candidate = existing ?? {
      key,
      name: product.storeName ?? product.storeUrl ?? "Store pending PDP capture",
      url: product.storeUrl ?? undefined,
      type: storeTypeLabel(product),
      score: 0,
      productCount: 0,
      gmvEstimate: 0,
      monthlySoldEstimate: 0,
      promotionCount: 0,
      thumbnail: product.imageUrl ?? undefined,
      hasStoreEvidence,
      qualityTotal: 0
    };
    candidate.productCount += 1;
    candidate.gmvEstimate += price * monthlySold;
    candidate.monthlySoldEstimate += monthlySold;
    candidate.promotionCount += promotionCount;
    candidate.qualityTotal += productQualityScore(product) + Math.min(18, promotionCount * 3);
    candidate.score = Math.min(100, Math.round(candidate.qualityTotal / candidate.productCount));
    if (!candidate.thumbnail && product.imageUrl) {
      candidate.thumbnail = product.imageUrl;
    }
    if (!candidate.url && product.storeUrl) {
      candidate.url = product.storeUrl;
    }
    grouped.set(key, candidate);
  }
  return [...grouped.values()]
    .sort((left, right) => right.gmvEstimate - left.gmvEstimate || right.score - left.score)
    .slice(0, 10)
    .map((candidate) => ({
      key: candidate.key,
      name: candidate.name,
      url: candidate.url,
      type: candidate.type,
      score: candidate.score,
      productCount: candidate.productCount,
      gmvEstimate: candidate.gmvEstimate,
      monthlySoldEstimate: candidate.monthlySoldEstimate,
      promotionCount: candidate.promotionCount,
      thumbnail: candidate.thumbnail,
      hasStoreEvidence: candidate.hasStoreEvidence
    }));
}

function selectKeyStoreSeedProduct(products: ProjectProductEvidence[]): ProjectProductEvidence | undefined {
  return [...products]
    .filter((product) => product.storeName || product.storeUrl)
    .sort((left, right) => {
      const leftGmv = (left.priceAverage ?? 0) * (left.monthlySold ?? left.totalSold ?? 0);
      const rightGmv = (right.priceAverage ?? 0) * (right.monthlySold ?? right.totalSold ?? 0);
      return rightGmv - leftGmv || productQualityScore(right) - productQualityScore(left);
    })[0];
}

function normalizeStoreKey(product: ProjectProductEvidence): string {
  return (product.storeUrl ?? product.storeName ?? product.title).toLowerCase().replace(/\s+/g, "-");
}

function analysisPreview(resultJson: string): Array<{ label: string; value: string }> {
  const parsed = parseRecord(resultJson);
  if (!parsed) {
    return [{ label: "Raw Result", value: resultJson.slice(0, 180) || "-" }];
  }
  const scoredSections = Object.entries(parsed)
    .flatMap(([label, value]) => {
      if (!isRecord(value)) {
        return [];
      }
      const score = value.score;
      return typeof score === "number" || typeof score === "string" ? [{ label: titleCase(label), value: String(score) }] : [];
    })
    .slice(0, 6);
  if (scoredSections.length > 0) {
    return scoredSections;
  }
  return Object.entries(parsed)
    .filter(([, value]) => typeof value === "string" || typeof value === "number")
    .slice(0, 6)
    .map(([label, value]) => ({ label: titleCase(label), value: String(value).slice(0, 140) }));
}

function keyStoreOverallConclusions(candidate: StoreEvaluationCandidate, resultJson?: string): string[] {
  const parsed = resultJson ? parseRecord(resultJson) : null;
  const candidates = [
    textFromAnalysisValue(parsed?.executiveSummary),
    textFromAnalysisValue(parsed?.summary),
    textFromAnalysisValue(parsed?.storeAnalysis),
    textFromAnalysisValue(parsed?.competitivePosition),
    textFromAnalysisValue(parsed?.recommendations)
  ].filter(Boolean) as string[];
  const evidenceSentence = `${candidate.name} is selected as the Key Store because it has the strongest combined signal across estimated monthly GMV, sold-per-month volume, promotion activity, store type, and captured evidence readiness.`;
  const benchmarkSentence = `Use ${candidate.name} as the benchmark for homepage structure, product matrix, best-seller presentation, banner style, voucher strategy, and TikTok brand presence.`;
  const scoreSentence = `The current local score is ${candidate.score}/100 from ${candidate.productCount} qualified product signal${candidate.productCount === 1 ? "" : "s"}, estimated GMV ${formatCurrency(candidate.gmvEstimate)}, and ${candidate.promotionCount} promotion signal${candidate.promotionCount === 1 ? "" : "s"}.`;
  return uniqueStrings([evidenceSentence, ...candidates, scoreSentence, benchmarkSentence]).slice(0, 5);
}

function textFromAnalysisValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim() || undefined;
  }
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? item : undefined)).filter(Boolean).join(" ").slice(0, 360) || undefined;
  }
  if (isRecord(value)) {
    const summary = value.summary ?? value.overall ?? value.rationale ?? value.recommendation ?? value.description;
    if (typeof summary === "string" && summary.trim()) {
      return summary.trim();
    }
  }
  return undefined;
}

function parseRecord(value: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function imageSource(value: string): string {
  return /^https?:\/\//i.test(value) || value.startsWith("data:") ? value : toFileImageSrc(value);
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function hasAnyAsset(detail: ProjectDetailPayload, kinds: Array<ProjectDetailPayload["assets"][number]["kind"]>): boolean {
  return detail.assets.some((asset) => kinds.includes(asset.kind));
}

function formatAndroidRuntimeState(state: AndroidAppRuntimeStatus["state"]): string {
  switch (state) {
    case "not-installed":
      return "Not installed";
    case "not-running":
      return "Not running";
    case "starting":
      return "Starting";
    case "responding":
      return "Responding";
    case "not-responding":
      return "Not responding";
    default:
      return "Unknown";
  }
}

async function extractVisibleBrowserText(webview: WebviewElement): Promise<string> {
  if (!webview.executeJavaScript) {
    return "";
  }
  const result = await webview.executeJavaScript<{
    title: string;
    url: string;
    text: string;
  }>(`
    (async () => {
      const text = (document.body?.innerText || "")
        .replace(/\\s+/g, " ")
        .trim()
        .slice(0, 12000);
      return {
        title: document.title || "",
        url: location.href,
        text
      };
    })();
  `);
  return [result.title, result.url, result.text].filter(Boolean).join("\n");
}

async function extractRenderedPageSnapshot(webview: WebviewElement): Promise<{
  html: string;
  visibleText: string;
  products: ExtractedPageProduct[];
  productDetail: RenderedProductDetailSnapshot;
  storeDecorationImages: string[];
}> {
  if (!webview.executeJavaScript) {
    return {
      html: "",
      visibleText: "",
      products: [],
      productDetail: {
        storeName: undefined,
        storeUrl: undefined,
        storeType: undefined,
        activeReviewFilter: undefined,
        images: [],
        videos: [],
        descriptionImages: [],
        shopVouchers: [],
        bundleDeals: [],
        promotionCount: 0,
        reviews: [],
        reviewMediaImages: [],
        reviewMediaVideos: []
      },
      storeDecorationImages: []
    };
  }
  return webview.executeJavaScript<{
    html: string;
    visibleText: string;
    products: ExtractedPageProduct[];
    productDetail: RenderedProductDetailSnapshot;
    storeDecorationImages: string[];
  }>(`
    (async () => {
      const parseHumanNumber = (value) => {
        if (!value) return undefined;
        const normalized = String(value).toLowerCase().replace(/\\+/g, "").replace(/,/g, ".").trim();
        const match = normalized.match(/([\\d.]+)\\s*(rb|ribu|k|jt|juta|m)?/i);
        if (!match) return undefined;
        const number = Number(match[1]);
        if (!Number.isFinite(number)) return undefined;
        const suffix = match[2] || "";
        if (["rb", "ribu", "k"].includes(suffix)) return Math.round(number * 1000);
        if (["jt", "juta", "m"].includes(suffix)) return Math.round(number * 1000000);
        return Math.round(number);
      };
      const parsePrice = (value) => {
        const matches = String(value || "").match(/(?:Rp\\s*)?[\\d.]+(?:,\\d+)?/gi) || [];
        const values = matches
          .map((item) => Number(item.replace(/[^\\d]/g, "")))
          .filter((item) => Number.isFinite(item) && item > 0);
        if (!values.length) return undefined;
        return Math.round(values.reduce((sum, item) => sum + item, 0) / values.length);
      };
      const absoluteUrl = (href) => {
        try { return new URL(href, location.href).toString(); } catch { return href || ""; }
      };
      const compact = (value) => String(value || "").replace(/\\s+/g, " ").trim();
      const unique = (values) => {
        const seen = new Set();
        return values
          .map((value) => compact(value))
          .filter(Boolean)
          .filter((value) => {
            if (seen.has(value)) return false;
            seen.add(value);
            return true;
          });
      };
      const pickShopeeContentRoot = () => {
        const main = document.querySelector("#main");
        if (!main) return document.querySelector("main") || document.body || document.documentElement;
        const shell = Array.from(main.children).find((child) => child instanceof HTMLElement && child.tagName === "DIV");
        if (!shell) return main;
        const directContent = Array.from(shell.children).find((child) => child instanceof HTMLElement && child.tagName === "DIV");
        return directContent || shell || main;
      };
      const htmlRoot = pickShopeeContentRoot();
      const parseSrcSet = (value) => {
        const candidates = String(value || "")
          .split(",")
          .map((item) => item.trim().split(/\\s+/)[0])
          .filter(Boolean);
        return candidates.at(-1) || undefined;
      };
      const mediaUrlFrom = (element) => {
        if (!element) return undefined;
        if (element.tagName === "PICTURE") {
          return mediaUrlFrom(element.querySelector("source[srcset], source[data-srcset], source[scrset], img[srcset], img[data-srcset], img[src], img[data-src], source[src], source[data-src]"));
        }
        return parseSrcSet(element.getAttribute("srcset") || element.getAttribute("data-srcset") || element.getAttribute("scrset")) ||
          element.currentSrc ||
          element.getAttribute("data-src") ||
          element.getAttribute("data-original") ||
          element.getAttribute("src") ||
          element.src ||
          undefined;
      };
      const imageUrlFrom = (element) => {
        const url = mediaUrlFrom(element);
        return url ? absoluteUrl(url) : undefined;
      };
      const inferProductType = (title) => {
        const normalized = compact(title).toLowerCase();
        if (/iphone\\s*15|iphone15/u.test(normalized)) return "iphone15";
        if (/iphone/u.test(normalized)) return "iPhones";
        if (/bulu mata|eyelash|lashes|lash/u.test(normalized)) return "Eyelash";
        if (/eye\\s*cream|krim mata|mata anti keriput/u.test(normalized)) return "eye cream";
        if (/lotion|body lotion|handbody/u.test(normalized)) return "body lotion";
        if (/lip\\s*tint|lipstick|liptint/u.test(normalized)) return "lip tint";
        if (/serum/u.test(normalized)) return "serum";
        const firstUseful = normalized
          .replace(/\\b(ori|original|ready|promo|gratis|free|termurah|murah|new|baru)\\b/giu, " ")
          .split(/\\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .join(" ");
        return firstUseful || "marketplace product";
      };
      const inferStoreType = (text, imageUrl, outerHtml) => {
        const value = compact([text, imageUrl, outerHtml].filter(Boolean).join(" ")).toLowerCase();
        if (/mall\\s*ori|mallori|mall-ori/u.test(value)) return "Mall ORI";
        if (/shopee\\s*mall|mall/u.test(value)) return "Mall ORI";
        if (/star\\s*\\+|starplus|star-plus/u.test(value)) return "Star+";
        if (/star/u.test(value)) return "Star";
        return undefined;
      };
      const classifyBadgeImageByPixels = async (imageElement) => {
        if (!imageElement) return undefined;
        const rect = imageElement.getBoundingClientRect?.();
        const width = Math.max(1, Math.round(rect?.width || imageElement.naturalWidth || 0));
        const height = Math.max(1, Math.round(rect?.height || imageElement.naturalHeight || 0));
        if (width < 8 || height < 6 || width > 120 || height > 50) return undefined;
        try {
          const canvas = document.createElement("canvas");
          canvas.width = Math.min(width, 120);
          canvas.height = Math.min(height, 50);
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) return undefined;
          context.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
          const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
          let red = 0;
          let orange = 0;
          let bright = 0;
          for (let index = 0; index < data.length; index += 4) {
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const a = data[index + 3];
            if (a < 120) continue;
            if (r > 150 || g > 100 || b > 100) bright += 1;
            if (r > 170 && g < 95 && b < 95) red += 1;
            if (r > 180 && g >= 65 && g < 170 && b < 95) orange += 1;
          }
          const denominator = Math.max(bright, 1);
          if (red / denominator > 0.12) return "Mall ORI";
          if (orange / denominator > 0.10) {
            return width / height > 2.15 ? "Star+" : "Star";
          }
        } catch {
          return undefined;
        }
        return undefined;
      };
      const findStoreBadgeImage = (card, productImageUrl) => {
        const dataRoots = [
          card.querySelector('div.p-2.flex-1.flex.flex-col.justify-between'),
          card.querySelector('div[class*="p-2"][class*="flex-1"][class*="flex-col"]'),
          card.querySelector("div.p-2"),
          card
        ].filter(Boolean);
        const candidates = [];
        for (const root of dataRoots) {
          for (const imageCandidate of Array.from(root.querySelectorAll("img"))) {
            const candidateUrl = imageUrlFrom(imageCandidate);
            if (candidateUrl && productImageUrl && candidateUrl === productImageUrl) continue;
            const rect = imageCandidate.getBoundingClientRect?.();
            const width = Math.round(rect?.width || imageCandidate.naturalWidth || 0);
            const height = Math.round(rect?.height || imageCandidate.naturalHeight || 0);
            const descriptor = compact([
              imageCandidate.alt,
              imageCandidate.title,
              imageCandidate.getAttribute("aria-label"),
              imageCandidate.getAttribute("src"),
              imageCandidate.getAttribute("srcset"),
              imageCandidate.outerHTML
            ].filter(Boolean).join(" "));
            const explicit = inferStoreType(descriptor, candidateUrl, imageCandidate.outerHTML);
            const smallBadgeShape = width >= 8 && height >= 6 && width <= 120 && height <= 50;
            const score =
              (explicit ? 100 : 0) +
              (smallBadgeShape ? 50 : 0) +
              (width > height ? 10 : 0) -
              (width > 160 || height > 80 ? 100 : 0);
            if (score > 0) {
              candidates.push({ image: imageCandidate, score });
            }
          }
        }
        return candidates.sort((left, right) => right.score - left.score)[0]?.image;
      };
      const extractSoldText = (text) => {
        const match = compact(text).match(/(?:terjual|sold)\\s*([\\d.,]+\\s*(?:rb|ribu|k|jt|juta|m)?\\+?)|([\\d.,]+\\s*(?:rb|ribu|k|jt|juta|m)?\\+?)\\s*(?:terjual|sold)/i);
        if (!match) return undefined;
        const metric = match[1] || match[2];
        return compact(match[0].match(/terjual|sold/i)?.index === 0 ? \`\${metric} \${match[0].match(/terjual|sold/i)?.[0] || ""}\` : match[0]);
      };
      const firstRatingToken = (value) => {
        const textValue = String(value || "");
        const matches = Array.from(textValue.matchAll(/(^|[^\\d.,a-z])([1-5](?:[.,]\\d)?)(?![\\d.,a-z])/giu))
          .map((match) => match[2])
          .filter((candidate) => {
            const numeric = Number(candidate.replace(",", "."));
            return numeric >= 1 && numeric <= 5;
          });
        return matches[0];
      };
      const extractReviewText = (text) => {
        const metricText = compact(text);
        const match = metricText.match(/([\\d.,]+\\s*(?:rb|ribu|k|jt|juta|m)?\\+?)\\s*(ratings?|reviews?|penilaian|ulasan)/iu) ||
          metricText.match(/(ratings?|reviews?|penilaian|ulasan)\\s*:?\\s*([\\d.,]+\\s*(?:rb|ribu|k|jt|juta|m)?\\+?)/iu);
        if (!match) return undefined;
        const value = /ratings?|reviews?|penilaian|ulasan/iu.test(match[1]) ? match[2] : match[1];
        const label = /ratings?|reviews?|penilaian|ulasan/iu.test(match[1]) ? match[1] : match[2];
        return compact(String(value || "") + " " + String(label || ""));
      };
      const extractRatingText = (text, soldText) => {
        const rawLines = String(text || "")
          .split(/\\n+/u)
          .map(compact)
          .filter(Boolean);
        const metricLine = rawLines.find((line) => /(★|star|bintang)/iu.test(line)) ||
          rawLines.find((line) => /(sold|terjual)/iu.test(line) && firstRatingToken(line)) ||
          rawLines.find((line) => /(ratings?|reviews?|penilaian|ulasan)/iu.test(line) && firstRatingToken(line));
        if (metricLine) {
          return firstRatingToken(metricLine);
        }
        const metricText = compact(text);
        const searchable = soldText && metricText.includes(soldText) ? metricText.slice(0, metricText.indexOf(soldText)) : metricText;
        return firstRatingToken(searchable);
      };
      const prettyHtml = (value) => String(value || "")
        .replace(/></g, ">\\n<")
        .replace(/\\n\\s+/g, "\\n")
        .replace(/\\n{3,}/g, "\\n\\n")
        .trim();
      const isBadTitle = (value) => /(shopping cart|cart icon|keranjang|add to cart|buy now|favorite|share|seller centre|seller center|notifications?|notifikasi|help|bantuan|report|laporkan)/i.test(compact(value));
      const meaningfulTitle = (text, imageAlt) => {
        const lines = String(text || "")
          .split(/\\n+/)
          .map(compact)
          .filter(Boolean)
          .filter((line) => !/^rp\\s*/i.test(line))
          .filter((line) => !isBadTitle(line))
          .filter((line) => !/(terjual|sold|rating|penilaian|gratis ongkir|cashback|mall)$/i.test(line))
          .filter((line) => line.length >= 8 && line.length <= 180);
        const alt = compact(imageAlt);
        if (alt && alt.length >= 8 && !/(^image)/i.test(alt) && !isBadTitle(alt)) return alt;
        return lines.sort((left, right) => right.length - left.length)[0] || lines[0] || "";
      };
      const findCard = (anchor) => {
        let node = anchor;
        let best = anchor;
        for (let depth = 0; depth < 7 && node?.parentElement; depth += 1) {
          node = node.parentElement;
          const text = node.innerText || "";
          const productLinks = node.querySelectorAll('a[href*="-i."], a[href*="/product/"], a[href*="i."]').length;
          const hasProductImage = Boolean(node.querySelector('picture._displayContents_ img, picture img, img'));
          const hasPrice = /Rp\\s*[\\d.]+/i.test(text);
          if (hasProductImage && hasPrice && productLinks <= 3) {
            best = node;
            break;
          }
          if (text.length > (best.innerText || "").length && hasProductImage && productLinks <= 6) {
            best = node;
          }
        }
        return best;
      };
      const anchors = Array.from(htmlRoot.querySelectorAll('a[href]'))
        .filter((anchor) => /(?:-i\\.|\\/product\\/|i\\.)/i.test(anchor.getAttribute("href") || ""))
        .filter((anchor) => !/cart|checkout|help|seller/i.test(anchor.getAttribute("href") || ""));
      const seen = new Set();
      const products = [];
      for (const anchor of anchors) {
        const url = absoluteUrl(anchor.getAttribute("href"));
        const key = url.split("?")[0];
        if (!url || seen.has(key)) continue;
        const card = findCard(anchor);
        const dataRoot = card.querySelector("div.p-2") || card;
        const text = dataRoot.innerText || card.innerText || anchor.innerText || "";
        const cardText = card.innerText || text;
        const image = card.querySelector('picture._displayContents_, picture, picture._displayContents_ img, picture img, img');
        const productImageUrl = imageUrlFrom(image);
        const title = meaningfulTitle(text, image?.alt || image?.querySelector?.("img")?.alt);
        if (!title) continue;
        seen.add(key);
        const badgeImage = findStoreBadgeImage(card, productImageUrl);
        const badgeImageUrl = imageUrlFrom(badgeImage);
        const badgeText = compact([badgeImage?.alt, badgeImage?.getAttribute("aria-label"), badgeImage?.title, badgeImage?.outerHTML].filter(Boolean).join(" "));
        const storeType = inferStoreType(badgeText, badgeImageUrl, badgeImage?.outerHTML) || await classifyBadgeImageByPixels(badgeImage);
        const priceText = compact((text.match(/Rp\\s*[\\d.]+(?:\\s*-\\s*Rp\\s*[\\d.]+)?/i) || [])[0] || "");
        const soldText = extractSoldText(text);
        const ratingText = extractRatingText(text, soldText);
        const reviewText = extractReviewText(text);
        products.push({
          rank: products.length + 1,
          title,
          url,
          imageUrl: productImageUrl,
          priceText: priceText || undefined,
          priceAverage: parsePrice(priceText),
          rating: ratingText ? Number(ratingText.replace(",", ".")) : undefined,
          ratingText,
          reviewText,
          soldCount: soldText ? parseHumanNumber(soldText) : undefined,
          soldText,
          productType: inferProductType(title),
          storeType,
          storeBadgeImageUrl: badgeImageUrl,
          sourcePlacement: String(products.length + 1),
          mallStatus: storeType === "Mall ORI",
          officialStatus: /official|resmi/i.test(cardText),
          starSeller: storeType === "Star" || storeType === "Star+",
          rawText: compact(cardText).slice(0, 1200)
        });
      }
      const textFrom = (element) => compact(element?.innerText || element?.textContent || "");
      const blockTextFromHtml = (element) => {
        if (!element) return "";
        const clone = element.cloneNode(true);
        clone.querySelectorAll?.("script, style, noscript, button").forEach((node) => node.remove());
        clone.querySelectorAll?.("br").forEach((node) => node.replaceWith("\\n"));
        clone.querySelectorAll?.("p, li, div, h1, h2, h3, h4, section").forEach((node) => {
          if (node !== clone) node.append(document.createTextNode("\\n"));
        });
        return String(clone.textContent || "")
          .replace(/[ \\t]+\\n/g, "\\n")
          .replace(/\\n[ \\t]+/g, "\\n")
          .replace(/\\n{3,}/g, "\\n\\n")
          .trim();
      };
      const productPageRoot = document.querySelector(".page-product") || document.querySelector('[role="main"]') || htmlRoot || document.body;
      const galleryRoot = document.querySelector(".page-product [role='main'] > section > section") ||
        productPageRoot?.querySelector?.('[role="main"] section section') ||
        productPageRoot?.querySelector?.("section section");
      const descriptionRoot = document.querySelector(".page-product__content .page-product__content--left section:nth-of-type(2) div") ||
        document.querySelector(".page-product__content .page-product__content--left") ||
        document.querySelector(".page-product__content");
      const shopRoot = document.querySelector("#s112-product-shop, #sll2-pdp-product-shop, [id*='pdp-product-shop'], [class*='pdp-product-shop'], section.page-product__shop");
      const shopSection = shopRoot?.matches?.("section.page-product__shop")
        ? shopRoot
        : shopRoot?.querySelector?.("section.page-product__shop") || document.querySelector("section.page-product__shop") || shopRoot;
      const cleanStoreNameCandidate = (value) => compact(value)
        .replace(/\\s+(active|aktif)\\b[\\s\\S]*$/iu, "")
        .replace(/\\s+(chat now|view shop|lihat toko|ratings?|penilaian|products?|produk|response|respon|joined|bergabung|followers?|pengikut)\\b[\\s\\S]*$/iu, "")
        .trim();
      const isGoodStoreName = (value) => {
        const normalized = cleanStoreNameCandidate(value);
        const lowered = normalized.toLowerCase();
        return normalized.length >= 2 &&
          normalized.length <= 120 &&
          !/(chat|chat now|follow|ikuti|active|aktif|online|offline|click here to visit shop|visit shop|view shop|lihat toko|rating|ratings|penilaian|produk|products|response|respon|followers|pengikut|seller centre|seller center|notifications?|notifikasi|laporkan|report|joined|bergabung|ago|yang lalu)/iu.test(lowered) &&
          !/^(mall\\s*ori|star\\+?|official|resmi)$/iu.test(lowered) &&
          !/^\\d+(?:[.,]\\d+)?\\s*(rb|k|jt|juta|%|months?|bulan)?/iu.test(lowered);
      };
      const storeNameLinesFrom = (element) => String(element?.innerText || element?.textContent || "")
        .split(/\\n|\\|/u)
        .map(compact)
        .map(cleanStoreNameCandidate)
        .filter(isGoodStoreName);
      const storeNameAfterAnchor = (anchor) => {
        const candidates = [];
        let wrapper = anchor;
        for (let depth = 0; depth < 5 && wrapper && shopSection?.contains?.(wrapper); depth += 1) {
          const sibling = wrapper.nextElementSibling;
          if (sibling) {
            candidates.push(...storeNameLinesFrom(sibling));
            const firstNested = sibling.querySelector?.("div div, div, span");
            candidates.push(...storeNameLinesFrom(firstNested));
          }
          wrapper = wrapper.parentElement;
        }
        return candidates;
      };
      const shopAnchors = Array.from(shopSection?.querySelectorAll?.('a[href]') || [])
        .filter((anchor) => !/(chat|cart|checkout|help|report|seller|login|verify)/iu.test(anchor.getAttribute("href") || ""))
        .filter((anchor) => !/(chat|cart|checkout|help|report|seller centre|seller center|login|verify)/iu.test(textFrom(anchor)));
      const storeAnchor = shopAnchors
        .map((anchor) => ({
          anchor,
          candidates: [
            ...storeNameLinesFrom(anchor),
            ...storeNameAfterAnchor(anchor),
            anchor.getAttribute("title"),
            anchor.getAttribute("aria-label"),
            anchor.querySelector?.("img[alt]")?.getAttribute("alt")
          ].filter(Boolean)
        }))
        .sort((left, right) => right.candidates.length - left.candidates.length)[0]?.anchor ||
        shopSection?.querySelector?.('a[href]');
      const shopNameCandidates = [
        ...storeNameAfterAnchor(storeAnchor),
        ...storeNameLinesFrom(storeAnchor),
        ...storeNameLinesFrom(shopSection?.querySelector?.(".fV3TIn")),
        ...storeNameLinesFrom(shopSection?.querySelector?.("[class*='shop-name'], [class*='ShopName'], [class*='name']")),
        ...storeNameLinesFrom(shopSection?.querySelector?.("a[href] + div")),
        ...storeNameLinesFrom(shopSection?.querySelector?.("a[href] ~ div")),
        storeAnchor?.getAttribute?.("title"),
        storeAnchor?.getAttribute?.("aria-label"),
        storeAnchor?.querySelector?.("img[alt]")?.getAttribute("alt"),
        ...Array.from(shopSection?.querySelectorAll?.("div, span") || [])
          .flatMap((node) => storeNameLinesFrom(node))
      ];
      const storeName = unique(shopNameCandidates).find(isGoodStoreName);
      const storeUrl = storeAnchor ? absoluteUrl(storeAnchor.getAttribute("href")) : undefined;
      const pdpBadgeImage = findStoreBadgeImage(productPageRoot || document.body, undefined);
      const storeType = inferStoreType("", imageUrlFrom(pdpBadgeImage), pdpBadgeImage?.outerHTML) || await classifyBadgeImageByPixels(pdpBadgeImage);
      const productPageText = textFrom(productPageRoot);
      const pdpSoldText = extractSoldText(productPageText);
      const pdpRatingText = extractRatingText(productPageText, pdpSoldText);
      const pdpReviewText = extractReviewText(productPageText);
      const voucherRoot = document.querySelector("section.mini-vouchers .mini-vouchers-with-popover") || document.querySelector("section.mini-vouchers");
      const shopVouchers = unique(textFrom(voucherRoot).split(/\\n|\\s{2,}|(?=Rp\\s)|(?=Diskon)|(?=Voucher)|(?=Cashback)/iu))
        .filter((value) => value.length >= 3)
        .slice(0, 12);
      const bundleSection = Array.from(document.querySelectorAll("section"))
        .find((section) => /bundle deals|paket hemat|bundling/iu.test(section.querySelector("h2")?.textContent || section.textContent || ""));
      const bundleDeals = unique(textFrom(bundleSection).split(/\\n|\\s{2,}/u))
        .filter((value) => value.length >= 3)
        .slice(0, 12);
      const reviewRoot = document.querySelector(".product-ratings");
      const commentRoot = document.querySelector(".product-comment-list") || reviewRoot;
      const activeReviewFilter = textFrom(reviewRoot?.querySelector?.(".product-rating-overview__filter--active") || document.querySelector(".product-rating-overview__filter--active"));
      const activeReviewRatingMatch = activeReviewFilter.match(/(?:^|\\s)([1-5])\\s*(?:star|bintang)?(?:\\s|$)/iu);
      const activeReviewRating = activeReviewRatingMatch ? Number(activeReviewRatingMatch[1]) : undefined;
      const isReviewMediaElement = (element) => Boolean(element?.closest?.(".product-ratings, .product-comment-list, .rating-media-list-image-carousel__item-list-wrapper, [class*='rating-media']"));
      const isProductGalleryElement = (element) => Boolean(element?.closest?.(".page-product [role='main'] > section > section"));
      const visibleMediaScore = (element) => {
        const rect = element?.getBoundingClientRect?.();
        if (!rect || rect.width < 80 || rect.height < 80) return 0;
        const visibleWidth = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
        const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
        if (visibleWidth <= 0 || visibleHeight <= 0) return 0;
        const centerBonus = rect.left < window.innerWidth * 0.62 && rect.top < window.innerHeight * 0.8 ? 100000 : 0;
        const firstScreenBonus = rect.top < window.innerHeight * 0.75 ? 50000 : 0;
        return visibleWidth * visibleHeight + centerBonus + firstScreenBonus;
      };
      const selectedProductImage = Array.from(galleryRoot?.querySelectorAll?.("picture._displayContents_, picture, img[srcset], img[data-srcset], img[src], img[data-src]") || [])
        .filter((element) => !isReviewMediaElement(element))
        .map((element) => ({
          url: imageUrlFrom(element),
          score: visibleMediaScore(element.tagName === "PICTURE" ? element.querySelector("img") || element : element)
        }))
        .filter((item) => item.url && item.score > 0)
        .sort((left, right) => right.score - left.score)[0]?.url;
      const selectedProductVideo = Array.from(galleryRoot?.querySelectorAll?.("video") || [])
        .filter((element) => !isReviewMediaElement(element))
        .map((video) => ({
          url: absoluteUrl(video.currentSrc || video.src || video.getAttribute("data-src") || video.getAttribute("src") || ""),
          score: visibleMediaScore(video)
        }))
        .filter((item) => item.url && item.score > 0)
        .sort((left, right) => right.score - left.score)[0]?.url;
      const productImages = selectedProductImage ? [selectedProductImage] : [];
      const productVideos = selectedProductVideo ? [selectedProductVideo] : [];
      const descriptionImages = descriptionRoot
        ? unique(Array.from(descriptionRoot.querySelectorAll("picture, source[srcset], img[srcset], img[src]"))
          .map(imageUrlFrom))
        : [];
      const mediaRoot = document.querySelector(".rating-media-list-image-carousel__item-list-wrapper") || reviewRoot;
      const reviewMediaImages = mediaRoot
        ? unique(Array.from(mediaRoot.querySelectorAll("picture, source[srcset], img[srcset], img[src]"))
          .filter((element) => !isProductGalleryElement(element))
          .map(imageUrlFrom))
        : [];
      const reviewMediaVideos = mediaRoot
        ? unique(Array.from(mediaRoot.querySelectorAll("video"))
          .filter((element) => !isProductGalleryElement(element))
          .map((video) => absoluteUrl(video.currentSrc || video.src || video.getAttribute("src") || "")))
        : [];
      const looksLikeReviewRow = (element) => {
        const text = textFrom(element);
        if (text.length < 20) return false;
        if (!/\\b20\\d{2}[-/]\\d{1,2}[-/]\\d{1,2}(?:\\s+\\d{1,2}:\\d{2})?\\b/u.test(text)) return false;
        if (/^https?:\\/\\//iu.test(text)) return false;
        if (/(product ratings|all\\s*\\(|semua\\s*\\(|with media|dengan media|repeat purchase|comments?\\s*\\(|filter|urutkan|sort by|rating overview|shop vouchers|bundle deals|add to cart|buy now)/iu.test(text)) return false;
        return true;
      };
      const cleanReviewComment = (value) => {
        const dateMatch = String(value || "").match(/\\b20\\d{2}[-/]\\d{1,2}[-/]\\d{1,2}(?:\\s+\\d{1,2}:\\d{2})?\\b/u);
        let cleaned = dateMatch ? String(value || "").slice(dateMatch.index) : String(value || "");
        cleaned = cleaned
          .replace(/Seller's Response:[\\s\\S]*$/iu, "")
          .replace(/Respons Penjual:[\\s\\S]*$/iu, "")
          .replace(/Penjual Membalas:[\\s\\S]*$/iu, "")
          .replace(/\\s*(?:Helpful|Membantu)\\s*[\\d.,kkrb]*\\s*$/iu, "")
          .replace(/\\s+/g, " ")
          .trim();
        return cleaned.slice(0, 900);
      };
      const isCleanReviewComment = (value) => {
        const normalized = compact(value);
        if (normalized.length < 20) return false;
        if (!/\\b20\\d{2}[-/]\\d{1,2}[-/]\\d{1,2}(?:\\s+\\d{1,2}:\\d{2})?\\b/u.test(normalized)) return false;
        if (/^https?:\\/\\//iu.test(normalized)) return false;
        if (/(product ratings|all\\s*\\(|semua\\s*\\(|with media|dengan media|repeat purchase|comments?\\s*\\(|shop vouchers|bundle deals|barcode|bpom sesuai|dermatologically tested|add to cart|buy now)/iu.test(normalized)) return false;
        return true;
      };
      const reviewRows = Array.from(commentRoot?.querySelectorAll?.(".product-comment-list > div, .shopee-product-rating, [class*='shopee-product-rating'], [class*='product-rating'], [class*='comment-list'] > div") || [])
        .filter(looksLikeReviewRow);
      const reviewChunksFromText = (value) => {
        const source = String(value || "");
        const dateMatches = Array.from(source.matchAll(/\\b20\\d{2}[-/]\\d{1,2}[-/]\\d{1,2}(?:\\s+\\d{1,2}:\\d{2})?\\b/gu));
        if (!dateMatches.length) return [];
        return dateMatches.map((match, index) => {
          const next = dateMatches[index + 1];
          const start = Math.max(0, (match.index || 0) - 140);
          const end = next?.index ? Math.max(start, next.index) : Math.min(source.length, (match.index || 0) + 900);
          return source.slice(start, end);
        });
      };
      const reviewBlocks = unique([
        ...reviewRows.map((row) => cleanReviewComment(textFrom(row))),
        ...reviewChunksFromText(commentRoot?.innerText || "").map(cleanReviewComment)
      ].filter(isCleanReviewComment)).slice(0, 8);
      const toReview = (type, rating, comment) => {
        const normalized = compact(comment);
        const dateMatch = normalized.match(/\\b20\\d{2}[-/]\\d{1,2}[-/]\\d{1,2}(?:\\s+\\d{1,2}:\\d{2})?\\b/u);
        const variationMatch = normalized.match(/(?:Variasi|Variation)\\s*:\\s*([^|\\n]+)/iu);
        return {
          type,
          rating,
          ratingLabel: \`\${rating} Star\`,
          comment: normalized.slice(0, 900),
          reviewDate: dateMatch?.[0],
          variation: variationMatch?.[1] ? compact(variationMatch[1]).slice(0, 120) : undefined
        };
      };
      let positiveReviews = [];
      let negativeReviews = [];
      if (activeReviewRating === 5) {
        positiveReviews = reviewBlocks.slice(0, 3).map((comment) => toReview("Positive Reviews", 5, comment));
      } else if ([1, 2, 3].includes(activeReviewRating)) {
        negativeReviews = reviewBlocks.slice(0, 2).map((comment) => toReview("Negative Reviews", activeReviewRating, comment));
      }
      const productDetail = {
        storeName,
        storeUrl,
        storeType,
        rating: pdpRatingText ? Number(pdpRatingText.replace(",", ".")) : undefined,
        ratingText: pdpRatingText,
        reviewText: pdpReviewText,
        totalSoldText: pdpSoldText,
        activeReviewFilter,
        images: productImages.slice(0, 12),
        videos: productVideos.slice(0, 1),
        description: blockTextFromHtml(descriptionRoot).slice(0, 8000) || undefined,
        descriptionImages: descriptionImages.slice(0, 24),
        shopVouchers,
        bundleDeals,
        promotionCount: shopVouchers.length + bundleDeals.length,
        reviews: [...positiveReviews.slice(0, 3), ...negativeReviews.slice(0, 2)],
        reviewMediaImages: reviewMediaImages.slice(0, 30),
        reviewMediaVideos: reviewMediaVideos.slice(0, 12)
      };
      const storeDecorationRoot = document.querySelector(".shop-decoration");
      const storeDecorationImages = storeDecorationRoot
        ? unique([
            ...Array.from(storeDecorationRoot.querySelectorAll("picture, source[srcset], source[data-srcset], source[scrset], img[srcset], img[data-srcset], img[src], img[data-src]")).map(imageUrlFrom),
            ...Array.from(storeDecorationRoot.querySelectorAll("[style*='url(']")).flatMap((element) => {
              const style = element.getAttribute("style") || "";
              return Array.from(style.matchAll(/url\\((['"]?)(.*?)\\1\\)/giu)).map((match) => absoluteUrl(match[2]));
            })
          ])
        : [];
      const html = prettyHtml(htmlRoot.outerHTML || document.documentElement?.outerHTML || "");
      const visibleTextSource = htmlRoot.innerText || document.body?.innerText || "";
      const visibleText = [document.title || "", location.href, compact(visibleTextSource).slice(0, 24000)]
        .filter(Boolean)
        .join("\\n");
      return { html, visibleText, products, productDetail, storeDecorationImages: storeDecorationImages.slice(0, 40) };
    })();
  `);
}

async function captureFullPageScreenshot(webview: WebviewElement): Promise<FullPageScreenshot> {
  if (!webview.capturePage) {
    throw new Error("The embedded browser cannot capture this page in the current runtime.");
  }
  const metrics = await readScrollablePageMetrics(webview);
  if (!metrics || metrics.viewportHeight <= 0 || metrics.viewportWidth <= 0) {
    const image = await webview.capturePage();
    const size = image.getSize?.() ?? {
      width: Math.round(webview.clientWidth),
      height: Math.round(webview.clientHeight)
    };
    return {
      imageDataUrl: image.toDataURL(),
      width: size.width,
      height: size.height,
      mode: "viewport"
    };
  }

  const maxCssHeight = 18000;
  const captureHeight = Math.min(metrics.pageHeight, maxCssHeight);
  const sliceTops = Array.from(
    { length: Math.max(1, Math.ceil(captureHeight / metrics.viewportHeight)) },
    (_item, index) => Math.min(index * metrics.viewportHeight, Math.max(0, captureHeight - metrics.viewportHeight))
  ).filter((value, index, values) => index === 0 || value !== values[index - 1]);

  if (sliceTops.length <= 1 && captureHeight <= metrics.viewportHeight + 8) {
    const image = await webview.capturePage();
    const size = image.getSize?.() ?? {
      width: Math.round(webview.clientWidth),
      height: Math.round(webview.clientHeight)
    };
    return {
      imageDataUrl: image.toDataURL(),
      width: size.width,
      height: size.height,
      mode: "viewport"
    };
  }

  const slices: Array<{ y: number; height: number; image: HTMLImageElement }> = [];
  for (const y of sliceTops) {
    await scrollEmbeddedPage(webview, y);
    await waitForFramePaint();
    const image = await webview.capturePage();
    const element = await loadImageElement(image.toDataURL());
    slices.push({
      y,
      height: Math.min(metrics.viewportHeight, captureHeight - y),
      image: element
    });
  }
  await scrollEmbeddedPage(webview, metrics.scrollY);

  const scaleX = slices[0]?.image.naturalWidth ? slices[0].image.naturalWidth / metrics.viewportWidth : 1;
  const scaleY = slices[0]?.image.naturalHeight ? slices[0].image.naturalHeight / metrics.viewportHeight : scaleX;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, slices[0]?.image.naturalWidth ?? Math.round(metrics.viewportWidth * scaleX));
  canvas.height = Math.max(1, Math.round(captureHeight * scaleY));
  const context = canvas.getContext("2d");
  if (!context) {
    const first = slices[0]?.image;
    return {
      imageDataUrl: first?.src ?? "",
      width: first?.naturalWidth ?? 0,
      height: first?.naturalHeight ?? 0,
      mode: "viewport"
    };
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (const slice of slices) {
    const sourceHeight = Math.max(1, Math.round(slice.height * scaleY));
    context.drawImage(
      slice.image,
      0,
      0,
      slice.image.naturalWidth,
      Math.min(sourceHeight, slice.image.naturalHeight),
      0,
      Math.round(slice.y * scaleY),
      canvas.width,
      Math.min(sourceHeight, canvas.height - Math.round(slice.y * scaleY))
    );
  }

  return {
    imageDataUrl: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
    mode: "full-page",
    clipped: metrics.pageHeight > maxCssHeight
  };
}

async function captureViewportScreenshot(webview: WebviewElement): Promise<FullPageScreenshot> {
  if (!webview.capturePage) {
    throw new Error("The embedded browser cannot capture this page in the current runtime.");
  }
  const image = await webview.capturePage();
  const size = image.getSize?.() ?? {
    width: Math.max(1, Math.round(webview.clientWidth)),
    height: Math.max(1, Math.round(webview.clientHeight))
  };
  return {
    imageDataUrl: image.toDataURL(),
    width: size.width,
    height: size.height,
    mode: "viewport"
  };
}

async function captureElementScreenshot(webview: WebviewElement, selector: string): Promise<FullPageScreenshot> {
  const initialMetrics = await readScrollablePageMetrics(webview);
  const initialRect = await readElementPageRect(webview, selector);
  if (!initialRect || initialRect.width < 8 || initialRect.height < 8) {
    return captureFullPageScreenshot(webview);
  }

  await scrollEmbeddedPage(webview, Math.max(0, initialRect.y - 24));
  await waitForFramePaint();
  const targetRect = await readElementPageRect(webview, selector) ?? initialRect;
  const screenshot = await captureFullPageScreenshot(webview);
  const cropped = await cropFullPageScreenshotToRect(screenshot, targetRect);
  if (initialMetrics) {
    await scrollEmbeddedPage(webview, initialMetrics.scrollY);
  }
  return cropped ?? screenshot;
}

async function readElementPageRect(webview: WebviewElement, selector: string): Promise<ElementPageRect | undefined> {
  if (!webview.executeJavaScript) {
    return undefined;
  }
  return webview.executeJavaScript<ElementPageRect | undefined>(`
    (() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return undefined;
      const root = document.scrollingElement || document.documentElement || document.body;
      const body = document.body || root;
      const rect = element.getBoundingClientRect();
      const viewportWidth = Math.max(1, window.innerWidth || root.clientWidth || ${Math.max(1, Math.round(webview.clientWidth))});
      const viewportHeight = Math.max(1, window.innerHeight || root.clientHeight || ${Math.max(1, Math.round(webview.clientHeight))});
      const pageHeight = Math.max(viewportHeight, root.scrollHeight || 0, body.scrollHeight || 0, root.clientHeight || 0);
      return {
        x: Math.max(0, rect.left + (window.scrollX || root.scrollLeft || 0)),
        y: Math.max(0, rect.top + (window.scrollY || root.scrollTop || 0)),
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
        viewportWidth,
        viewportHeight,
        pageHeight,
        scrollY: window.scrollY || root.scrollTop || 0
      };
    })();
  `).catch(() => undefined);
}

async function cropFullPageScreenshotToRect(
  screenshot: FullPageScreenshot,
  rect: ElementPageRect
): Promise<FullPageScreenshot | undefined> {
  if (!screenshot.imageDataUrl) {
    return undefined;
  }
  const image = await loadImageElement(screenshot.imageDataUrl).catch(() => undefined);
  if (!image) {
    return undefined;
  }
  const capturedCssHeight = Math.min(rect.pageHeight, 18000);
  const scaleX = image.naturalWidth / Math.max(1, rect.viewportWidth);
  const scaleY = image.naturalHeight / Math.max(1, capturedCssHeight);
  const cropX = Math.max(0, Math.floor(rect.x * scaleX));
  const cropY = Math.max(0, Math.floor(rect.y * scaleY));
  const cropWidth = Math.max(1, Math.min(image.naturalWidth - cropX, Math.ceil(rect.width * scaleX)));
  const cropHeight = Math.max(1, Math.min(image.naturalHeight - cropY, Math.ceil(rect.height * scaleY)));
  if (cropWidth <= 0 || cropHeight <= 0) {
    return undefined;
  }
  const canvas = document.createElement("canvas");
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    return undefined;
  }
  context.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  return {
    imageDataUrl: canvas.toDataURL("image/png"),
    width: cropWidth,
    height: cropHeight,
    mode: "full-page",
    clipped: screenshot.clipped
  };
}

async function readScrollablePageMetrics(webview: WebviewElement): Promise<{
  viewportWidth: number;
  viewportHeight: number;
  pageWidth: number;
  pageHeight: number;
  scrollY: number;
} | undefined> {
  if (!webview.executeJavaScript) {
    return undefined;
  }
  return webview.executeJavaScript(`
    (() => {
      const root = document.scrollingElement || document.documentElement || document.body;
      const body = document.body || root;
      const viewportWidth = Math.max(1, window.innerWidth || root.clientWidth || ${Math.max(1, Math.round(webview.clientWidth))});
      const viewportHeight = Math.max(1, window.innerHeight || root.clientHeight || ${Math.max(1, Math.round(webview.clientHeight))});
      const pageWidth = Math.max(viewportWidth, root.scrollWidth || 0, body.scrollWidth || 0, root.clientWidth || 0);
      const pageHeight = Math.max(viewportHeight, root.scrollHeight || 0, body.scrollHeight || 0, root.clientHeight || 0);
      return {
        viewportWidth,
        viewportHeight,
        pageWidth,
        pageHeight,
        scrollY: window.scrollY || root.scrollTop || 0
      };
    })();
  `);
}

async function scrollEmbeddedPage(webview: WebviewElement, y: number): Promise<void> {
  if (!webview.executeJavaScript) {
    return;
  }
  await webview.executeJavaScript(`
    (() => {
      const root = document.scrollingElement || document.documentElement || document.body;
      root.scrollTo(0, ${Math.max(0, Math.round(y))});
      window.scrollTo(0, ${Math.max(0, Math.round(y))});
    })();
  `).catch(() => undefined);
}

function waitForFramePaint(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 180));
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load captured screenshot slice."));
    image.src = src;
  });
}

function uint8ArrayToBase64(data: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < data.length; index += chunkSize) {
    binary += String.fromCharCode(...data.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

async function cropImageDataUrl(
  imageDataUrl: string,
  imageElement: HTMLImageElement,
  selection: CropRect
): Promise<{ imageDataUrl: string; width: number; height: number }> {
  if (!imageElement.complete || imageElement.naturalWidth === 0 || imageElement.naturalHeight === 0) {
    return { imageDataUrl, width: imageElement.naturalWidth, height: imageElement.naturalHeight };
  }
  const parentRect = imageElement.parentElement?.getBoundingClientRect();
  const elementRect = imageElement.getBoundingClientRect();
  const naturalRatio = imageElement.naturalWidth / imageElement.naturalHeight;
  const elementRatio = elementRect.width / elementRect.height;
  const renderedWidth = elementRatio > naturalRatio ? elementRect.height * naturalRatio : elementRect.width;
  const renderedHeight = elementRatio > naturalRatio ? elementRect.height : elementRect.width / naturalRatio;
  const contentLeft = elementRect.left + (elementRect.width - renderedWidth) / 2;
  const contentTop = elementRect.top + (elementRect.height - renderedHeight) / 2;
  const offsetX = parentRect ? contentLeft - parentRect.left : 0;
  const offsetY = parentRect ? contentTop - parentRect.top : 0;
  const selectedX = Math.max(0, selection.x - offsetX);
  const selectedY = Math.max(0, selection.y - offsetY);
  const selectedWidth = Math.min(selection.width, renderedWidth - selectedX);
  const selectedHeight = Math.min(selection.height, renderedHeight - selectedY);
  if (selectedWidth <= 0 || selectedHeight <= 0) {
    return { imageDataUrl, width: imageElement.naturalWidth, height: imageElement.naturalHeight };
  }
  const scaleX = imageElement.naturalWidth / renderedWidth;
  const scaleY = imageElement.naturalHeight / renderedHeight;
  const sourceX = Math.round(selectedX * scaleX);
  const sourceY = Math.round(selectedY * scaleY);
  const sourceWidth = Math.round(selectedWidth * scaleX);
  const sourceHeight = Math.round(selectedHeight * scaleY);
  const canvas = document.createElement("canvas");
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    return { imageDataUrl, width: imageElement.naturalWidth, height: imageElement.naturalHeight };
  }
  context.drawImage(
    imageElement,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sourceWidth,
    sourceHeight
  );
  return {
    imageDataUrl: canvas.toDataURL("image/png"),
    width: sourceWidth,
    height: sourceHeight
  };
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
