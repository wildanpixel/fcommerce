import { FormEvent, PointerEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  AlertTriangle,
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
  ImagePlus,
  KeyRound,
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
  ReportSummary,
  SaveSettingsPayload,
  SettingsPayload
} from "../shared/contracts.js";
import { DEFAULT_REPORT_SECTIONS, type ReportSectionConfig } from "../shared/reportSections.js";
import { apiClient } from "./api/client.js";
import { type AppView, useUiStore } from "./store/uiStore.js";

const SHOPEE_HOME_URL = "https://shopee.co.id/";
const TIKTOK_SHOP_URL = "https://www.tiktok.com/shop";

const navItems: Array<{ id: AppView; label: string; icon: LucideIcon }> = [
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
type ProjectProductEvidence = ProjectDetailPayload["products"][number];

type AnalysisFormState = {
  keyword: string;
  productCategory: string;
  marketplace: ResearchPlatform;
  createdAt: string;
};

type CollectionStep = {
  id: string;
  stage: CollectionStage;
  section: string;
  label: string;
  kind: ManualEvidenceKind;
  mode?: "CAPTURE" | "PROCESS";
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

type PendingEvidenceCapture = {
  payload: ManualEvidencePayload;
  stepLabel: string;
};

type BrowserCaptureStatus = {
  message: string;
  state: "idle" | "working" | "done" | "failed";
  actionLabel?: string;
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
          <div className="mio-brand-title text-sm font-semibold leading-5">Marketplace Intelligence</div>
          <div className="mio-brand-subtitle text-xs leading-5 text-ink-500">Operating System</div>
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
          Projects, screenshots, reports, browser sessions, and keys stay on this machine.
        </div>
      </div>
    </motion.aside>
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
  exitLabel = "New Analysis"
}: {
  project: ProjectSummary;
  productCategory: string;
  browserUrl: string;
  onBrowserUrlChange: (url: string) => void;
  onNewAnalysis: () => void;
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
  const [pageTextPreview, setPageTextPreview] = useState("");
  const [zoomFactor, setZoomFactor] = useState(1);
  const [pendingCapture, setPendingCapture] = useState<PendingEvidenceCapture | null>(null);
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

  const allSteps = useMemo(
    () => buildCollectionSteps(project, platform, currentUrl, projectDetail.data),
    [currentUrl, platform, project, projectDetail.data]
  );
  const steps = useMemo(() => allSteps.filter((step) => step.stage === activeStage), [activeStage, allSteps]);
  const activeStep = steps[activeStepIndex] ?? steps[0] ?? allSteps[0];
  const selectedKeyProducts = useMemo(
    () => selectKeyProductCandidates(projectDetail.data?.products ?? []),
    [projectDetail.data?.products]
  );
  const collectedCount = allSteps.filter((step) => collectedSteps[step.id]).length;
  const stageCollectedCount = steps.filter((step) => collectedSteps[step.id]).length;
  const collectionProgressPercent = allSteps.length > 0 ? Math.round((collectedCount / allSteps.length) * 100) : 0;
  const isManualActionState =
    platform === "SHOPEE_ID" &&
    (isProtectedShopeePage(currentUrl) || isShopeeLoginPage(currentUrl) || loadState === "failed");

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
      const nextCollectedSteps = { ...collectedSteps, [step.id]: result.assetPath };
      setCollectedSteps(nextCollectedSteps);
      setPendingCapture(null);
      appendLog(
        setActivityLog,
        `Captured ${step.label}${result.extractedProductCount ? ` and extracted ${result.extractedProductCount} product rows` : ""}.`
      );
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
    setActiveStepIndex(0);
    setReviewingKeyProducts(false);
  }, [activeStage]);

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
  }

  function openKeyProductTableReview() {
    setExpanded(false);
    setReviewingKeyProducts(true);
    appendLog(setActivityLog, "Built the AI-assisted Key Product table from Relevance and Top Sales evidence.");
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

  function runStagePrimaryAction() {
    if (activeStage === "KEYWORD_GENERAL") {
      openKeyProductTableReview();
      return;
    }
    completeCurrentStage();
  }

  async function captureAndSaveEvidence(step: CollectionStep) {
    try {
      setCaptureStatus({ message: "Targeted page received", state: "working" });
      appendLog(setActivityLog, `Capturing rendered page snapshot for ${step.label}...`);
      setPendingCapture({
        payload: await buildManualEvidencePayload(step),
        stepLabel: step.label
      });
      appendLog(setActivityLog, "Review the screenshot, crop if needed, then save the evidence.");
    } catch (error) {
      appendLog(setActivityLog, error instanceof Error ? error.message : "Could not prepare rendered page snapshot.");
    }
  }

  async function buildManualEvidencePayload(step: CollectionStep): Promise<ManualEvidencePayload> {
    const webview = webviewRef.current;
    if (!webview?.capturePage) {
      throw new Error("The embedded browser cannot capture this page in the current runtime.");
    }
    setCaptureStatus({ message: "Capturing full page screenshot", state: "working" });
    const screenshot = await captureFullPageScreenshot(webview);
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
          products: [] as ExtractedPageProduct[]
        };
      });
    const printPdfDataUrl = await webview.printToPDF?.({ printBackground: true })
      .then((data) => `data:application/pdf;base64,${uint8ArrayToBase64(data)}`)
      .catch(() => undefined);
    return {
      projectId: project.id,
      stepId: step.id,
      label: step.label,
      kind: step.kind,
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
        screenshotMode: screenshot.mode,
        screenshotClipped: screenshot.clipped,
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
    const snapshot = await extractRenderedPageSnapshot(webview).catch(() => undefined);
    if (!snapshot?.html) {
      setCaptureStatus({ message: "HTML download failed", state: "failed", actionLabel: "Download HTML" });
      appendLog(setActivityLog, "Could not download readable HTML from this page. Complete login/verification or reload the target page.");
      return;
    }
    const blob = new Blob([snapshot.html], { type: "text/html;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${project.keyword.replace(/[^a-z0-9]+/giu, "-").replace(/^-|-$/gu, "") || "marketplace-page"}-${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    setCaptureStatus({ message: "HTML download done", state: "done" });
    appendLog(setActivityLog, "Downloaded the current #main HTML snapshot.");
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
      action={
        <button className="secondary-button h-9 w-9 px-0" type="button" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? "Exit fullscreen" : "Expand browser"} title={expanded ? "Exit fullscreen" : "Expand browser"}>
          {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      }
    >
      <div className="mio-browser-toolbar mb-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
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
        <LoadStatePill state={loadState} />
      </div>

      {isManualActionState && (
        <div className="mio-manual-state mb-3 rounded-xl border border-signal-amber/30 bg-signal-amber/10 px-4 py-3 text-sm leading-6 text-ink-300">
          <div className="mb-1 flex items-center gap-2 font-semibold text-white">
            <AlertTriangle size={16} className="text-signal-amber" />
            Manual action required
          </div>
          Shopee is showing login, verification, or a protected page. Use the browser manually, then capture evidence after the target page is visible.
        </div>
      )}

      <div className={["relative overflow-hidden rounded-[18px] border border-white/12 bg-black", viewMode === "mobile" ? "mx-auto h-[720px] max-w-[430px]" : "h-[720px] w-full"].join(" ")}>
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
        <BrowserCaptureStatusPill status={captureStatus} onAction={() => void downloadCurrentHtml()} />
        <FloatingStepController
          step={activeStep}
          stepNumber={activeStepIndex + 1}
          stepTotal={steps.length}
          stageCollectedCount={stageCollectedCount}
          targetUrl={activeStep.targetUrl}
          captured={Boolean(collectedSteps[activeStep.id])}
          saving={saveEvidence.isPending}
          onOpenTarget={() => activeStep.targetUrl && navigateTo(activeStep.targetUrl)}
          onCollect={() => activeStep.mode === "PROCESS" ? openKeyProductTableReview() : void captureAndSaveEvidence(activeStep)}
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

  return (
    <section className={expanded ? "mio-browser-fullscreen fixed inset-0 z-50 overflow-auto bg-ink-950 p-5" : "grid grid-cols-[360px_minmax(0,1fr)] gap-5"}>
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
              {exitLabel}
            </button>
          </Panel>

          <Panel title="Collection Progress" icon={ListChecks}>
            <div className="mb-3 rounded-md border border-white/8 bg-white/5 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-white">{collectionStageLabel(activeStage)}</div>
                  <div className="text-[11px] text-ink-500">{stageCollectedCount}/{steps.length} steps in this part · {collectedCount}/{allSteps.length} total</div>
                </div>
                <span className="rounded-full bg-signal-blue/12 px-2 py-1 text-xs text-signal-blue">{collectionProgressPercent}%</span>
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
                <button
                  key={step.id}
                  type="button"
                  className={[
                    "mio-step-card w-full rounded-md border px-3 py-2 text-left text-xs transition",
                    index === activeStepIndex ? "mio-step-card-active border-signal-blue/40 bg-signal-blue/12" : "border-white/8 bg-white/5 hover:bg-white/8"
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

      <div className={expanded ? "mx-auto max-w-[1800px]" : ""}>
        {reviewingKeyProducts && activeStage === "KEYWORD_GENERAL" ? keyProductTablePanel : browserPanel}
      </div>
    </section>
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
  stepNumber,
  stepTotal,
  stageCollectedCount,
  targetUrl,
  captured,
  saving,
  onOpenTarget,
  onCollect,
  onAttachFile,
  onOpenAndroid,
  onPrevious,
  onNext
}: {
  step: CollectionStep;
  stepNumber: number;
  stepTotal: number;
  stageCollectedCount: number;
  targetUrl?: string;
  captured: boolean;
  saving: boolean;
  onOpenTarget: () => void;
  onCollect: () => void;
  onAttachFile?: () => void;
  onOpenAndroid?: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const [compact, setCompact] = useState(true);
  if (compact) {
    return (
      <motion.div
        className="mio-floating-collector mio-floating-collector-compact absolute left-4 top-4 z-20 max-w-[300px] rounded-full border border-white/14 bg-ink-950/72 px-3 py-2 shadow-glow backdrop-blur-2xl"
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18 }}
      >
        <div className="flex items-center gap-2">
          <button className="secondary-button h-8 w-8 rounded-full px-0" type="button" onClick={() => setCompact(false)} aria-label="Expand collector">
            <Maximize2 size={13} />
          </button>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.12em] text-ink-500">
              Step {stepNumber}/{stepTotal}
            </div>
            <div className="truncate text-xs font-medium text-white">{step.label}</div>
          </div>
          <span className={["shrink-0 rounded-full px-2 py-1 text-[10px]", step.ready ? "bg-signal-green/15 text-signal-green" : "bg-white/8 text-ink-300"].join(" ")}>
            {captured ? (step.mode === "PROCESS" ? "processed" : "saved") : step.ready ? "ready" : "wait"}
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="mio-floating-collector absolute left-4 top-4 z-20 w-[304px] rounded-[18px] border border-white/14 bg-ink-950/72 p-3 shadow-glow backdrop-blur-2xl"
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
        <button className="secondary-button h-8 w-8 rounded-full px-0" type="button" onClick={() => setCompact(true)} aria-label="Collapse collector">
          <Minimize2 size={13} />
        </button>
      </div>
      <ProgressBar value={(stageCollectedCount / Math.max(stepTotal, 1)) * 100} />
      <div className="mt-2 rounded-2xl border border-white/8 bg-white/6 p-3 text-xs leading-5 text-ink-300">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="font-medium text-white">{step.section}</span>
          <span className={["rounded-full px-2 py-0.5 text-[10px]", step.ready ? "bg-signal-green/15 text-signal-green" : "bg-white/8 text-ink-300"].join(" ")}>
            {captured ? (step.mode === "PROCESS" ? "processed" : "saved") : step.ready ? "ready" : "waiting"}
          </span>
        </div>
        {step.instruction}
      </div>
      <div className="mt-2 grid grid-cols-[auto_auto_minmax(0,1fr)] gap-2">
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
        <button className="primary-button mt-2 h-9" type="button" disabled={saving} onClick={onCollect}>
          <ClipboardCheck size={16} />
          {step.mode === "PROCESS"
            ? captured ? "Review Table Again" : "Build Key Product Table"
            : saving ? "Saving Evidence" : captured ? "Capture Again" : "Collect This Step"}
        </button>
      ) : (
        <div className="mt-2 rounded-full border border-white/8 bg-white/6 px-3 py-2 text-xs text-ink-400">
          {step.mode === "PROCESS"
            ? "Capture both Relevance and Top Sales first. The table builder appears when product rows exist."
            : "Open the target page or complete Shopee login/verification manually. The collect button appears when this step is ready."}
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
          <button className="secondary-button h-9 w-auto px-3" type="button" onClick={onCancel} disabled={saving}>
            Redo
          </button>
        </div>
        <div
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border border-white/12 bg-black/85"
          onPointerDown={startSelection}
          onPointerMove={updateSelection}
          onPointerUp={endSelection}
          onPointerCancel={endSelection}
        >
          <img ref={imageRef} src={capture.payload.imageDataUrl} alt="Captured evidence preview" className="block h-full max-h-[72vh] w-full select-none object-contain" draggable={false} />
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
            The full captured page is scaled to fit this preview. Drag over the focused area to crop; use Redo if the capture is wrong.
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
  const projects = dashboard.data?.projects ?? [];
  const [inspectingProjectId, setInspectingProjectId] = useState("");
  const [collectingProject, setCollectingProject] = useState<ProjectSummary | null>(null);
  const [collectionBrowserUrl, setCollectionBrowserUrl] = useState(SHOPEE_HOME_URL);
  const inspectingProject = projects.find((project) => project.id === inspectingProjectId);
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
    if (window.confirm(`Delete project "${project.name}" and its saved database records? Evidence files linked to this project will also be removed where possible.`)) {
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
          <Metric icon={Archive} label="Projects" value={projects.length} />
          <Metric icon={FileDown} label="Reports" value={dashboard.data?.metrics.completedReports ?? 0} />
          <Metric icon={ShoppingBag} label="Products" value={dashboard.data?.metrics.collectedProducts ?? 0} />
          <Metric icon={Gauge} label="Running" value={dashboard.data?.metrics.runningJobs ?? 0} />
        </div>
      </Panel>

      <Panel title="Projects" icon={Table2}>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {projects.map((project) => {
            const collectionState = projectCollectionState(project);
            return (
              <div
                key={project.id}
                className="w-full rounded-md border border-white/8 bg-white/5 p-4 text-left transition hover:border-signal-blue/35 hover:bg-signal-blue/10"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-white">{project.name}</div>
                    <div className="mt-1 text-xs text-ink-500">{formatDateTime(project.createdAt)}</div>
                  </div>
                  <StatusPill status={project.status} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-ink-400 lg:grid-cols-4">
                  <InfoLine label="Keyword" value={project.keyword} />
                  <InfoLine label="Category" value={project.productCategory ?? "-"} />
                  <InfoLine label="Marketplace" value={project.marketplace} />
                  <InfoLine label="Evidence" value={`${project.counts.products} products · ${project.counts.stores} stores`} />
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between gap-3 text-[11px] text-ink-500">
                    <span>{collectionState.stageLabel}</span>
                    <span>{collectionState.progressPercent}%</span>
                  </div>
                  <ProgressBar value={collectionState.progressPercent} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button className="secondary-button h-9 w-auto px-3" type="button" onClick={() => setInspectingProjectId(project.id)}>
                    <Search size={14} />
                    Inspect
                  </button>
                  <button className="primary-button h-9 w-auto px-3" type="button" onClick={() => startProjectCollection(project)}>
                    <ClipboardCheck size={14} />
                    Continue Collection
                  </button>
                </div>
              </div>
            );
          })}
          {projects.length === 0 && <EmptyState label="No projects yet. Create an analysis from New Research." />}
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
  const evidenceCount = detail.assets.length;
  const collectionState = projectCollectionState(detail.project);
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
            Continue Collection
          </button>
          <button className="secondary-button h-9 w-auto px-3" type="button" onClick={() => runAnalysis.mutate()} disabled={runAnalysis.isPending}>
            <Brain size={15} />
            {runAnalysis.isPending ? "Scoring" : "Run AI"}
          </button>
          <button className="secondary-button h-9 w-auto px-3 text-signal-rose" type="button" onClick={onDelete} disabled={deleting}>
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Metric icon={ImagePlus} label="Evidence" value={evidenceCount} />
        <Metric icon={ShoppingBag} label="Products" value={detail.products.length} />
        <Metric icon={Store} label="Stores" value={detail.stores.length} />
        <Metric icon={ListChecks} label="Reviews" value={detail.reviews.length} />
        <Metric icon={FileDown} label="Reports" value={detail.reports.length} />
        <Metric icon={CheckCircle2} label="Ready" value={projectReadinessScore(detail)} />
      </div>

      <div className="mt-4 rounded-md border border-white/8 bg-white/5 p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">Saved Collection Progress</div>
            <div className="mt-1 text-xs text-ink-500">{collectionState.stageLabel}</div>
          </div>
          <span className="rounded-full bg-signal-blue/12 px-3 py-1 text-xs font-semibold text-signal-blue">
            {collectionState.progressPercent}%
          </span>
        </div>
        <ProgressBar value={collectionState.progressPercent} />
        <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-ink-400 md:grid-cols-3">
          <InfoLine label="Current Step" value={collectionState.currentStepId ?? "Not selected"} />
          <InfoLine label="Saved URL" value={collectionState.browserUrl ?? "No browser URL saved"} />
          <InfoLine label="View Mode" value={collectionState.viewMode ?? "Default"} />
        </div>
      </div>

      {runAnalysis.data && (
        <div className="mt-4 rounded-md border border-signal-green/25 bg-signal-green/10 p-3 text-sm text-signal-green">
          AI evaluation saved with {runAnalysis.data.provider}.
        </div>
      )}
      <ProjectReportOutline detail={detail} />
    </Panel>
  );
}

function ProjectReportOutline({ detail }: { detail: ProjectDetailPayload }) {
  const relevanceProducts = detail.products.filter((product) => product.source === "Relevance");
  const topSalesProducts = detail.products.filter((product) => product.source === "Top Sales");
  const keyProducts = selectKeyProductCandidates(detail.products);
  return (
    <div className="mt-5 space-y-3">
      <ReportOutlineSection title="Keyword General" defaultOpen>
        <NestedReportSection title="Relevance">
          <AssetList assets={detail.assets.filter((asset) => asset.kind === "SEARCH_RESULT")} />
          <ProductCardGrid products={relevanceProducts} />
        </NestedReportSection>
        <NestedReportSection title="Top Sales">
          <AssetList assets={detail.assets.filter((asset) => asset.kind === "TOP_SALES")} />
          <ProductCardGrid products={topSalesProducts} />
        </NestedReportSection>
      </ReportOutlineSection>

      <ReportOutlineSection title="Key Product">
        <div className="mb-3 rounded-md border border-white/8 bg-white/5 p-3 text-xs leading-5 text-ink-400">
          Monthly sold only applies to Top Sales result snapshots. Total sold is collected from PDP evidence when visible.
          Rating is the star value; Reviews is the rating/review count. Price ranges are stored as estimated average price.
        </div>
        <ProductInfoTable products={keyProducts} />
      </ReportOutlineSection>

      <ReportOutlineSection title="Product Detailed Qualified">
        <div className="space-y-3">
          {keyProducts.map((product) => (
            <NestedReportSection key={product.id} title={product.title}>
              <ProductDossierSummary
                product={product}
                reviews={detail.reviews.filter((review) => review.productId === product.id)}
              />
              <AssetList assets={detail.assets.filter((asset) => asset.ownerType === "PRODUCT" && asset.ownerId === product.id)} />
            </NestedReportSection>
          ))}
          {keyProducts.length === 0 && <EmptyState label="Capture Relevance and Top Sales first to generate dynamic product detail steps." />}
        </div>
      </ReportOutlineSection>
    </div>
  );
}

function ReportOutlineSection({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details className="mio-report-section rounded-md border border-white/8 bg-white/5 p-4" open={defaultOpen}>
      <summary className="cursor-pointer select-none text-sm font-semibold text-white">{title}</summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function NestedReportSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="mb-3 rounded-md border border-white/8 bg-white/[0.04] p-3" open>
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
  if (products.length === 0) {
    return <EmptyState label="No rendered product rows extracted yet." />;
  }
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {products.slice(0, 20).map((product) => (
        <button key={product.id} type="button" className="rounded-md border border-white/8 bg-white/5 p-2 text-left hover:bg-white/8" onClick={() => void apiClient.openUrl(product.productUrl)}>
          <div className="aspect-square overflow-hidden rounded bg-white/10">
            {product.imageUrl ? <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" /> : null}
          </div>
          <div className="mt-2 min-w-0">
            <div className="line-clamp-2 text-xs font-medium text-white">{product.title}</div>
            <div className="mt-1 text-[11px] text-ink-500">
              {formatCurrency(product.priceAverage)} · Rating {product.rating ?? "-"} · Sold {formatOptionalNumber(product.monthlySold)}
            </div>
          </div>
        </button>
      ))}
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
              <td className="px-3 py-2">{product.title}</td>
              <td className="px-3 py-2">{product.productType ?? inferredProductTypeLabel(product.title)}</td>
              <td className="px-3 py-2">{formatOptionalNumber(product.monthlySold)}</td>
              <td className="px-3 py-2">{product.storeName ?? "-"}</td>
              <td className="px-3 py-2">{product.storeType ?? storeTypeLabel(product)}</td>
              <td className="px-3 py-2">{formatCurrency(product.priceAverage)}</td>
              <td className="px-3 py-2">{product.rating ?? "-"}</td>
              <td className="px-3 py-2">{formatOptionalNumber(product.reviewCount)}</td>
              <td className="px-3 py-2">{formatOptionalNumber(product.totalSold)}</td>
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

function ProductDossierSummary({
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
        <InfoLine label="Rating" value={product.rating ? product.rating.toString() : "-"} />
        <InfoLine label="Total Sold" value={formatOptionalNumber(product.totalSold)} />
        <InfoLine label="Reviews" value={formatOptionalNumber(product.reviewCount)} />
        <InfoLine label="Stock" value={formatOptionalNumber(product.stock)} />
        <InfoLine label="Voucher" value={product.voucherText ?? "-"} />
        <InfoLine label="Shipping" value={product.shippingText ?? "-"} />
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">Slides</div>
        <ProductImageGrid images={product.images.length > 0 ? product.images : product.imageUrl ? [product.imageUrl] : []} />
      </div>

      <div className="rounded-md border border-white/8 bg-white/[0.04] p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">Description</div>
        <p className="line-clamp-6 text-sm leading-6 text-ink-300">
          {product.description ?? "No browser-readable product description captured yet. Save Product Description evidence from the guided collector."}
        </p>
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
  if (images.length === 0) {
    return <EmptyState label="No product image URLs captured yet." />;
  }
  return (
    <div className="grid grid-cols-3 gap-3">
      {images.slice(0, 9).map((image, index) => (
        <button key={`${image}-${index}`} type="button" className="overflow-hidden rounded-md border border-white/8 bg-white/5" onClick={() => void apiClient.openUrl(image)}>
          <div className="aspect-square bg-white/10">
            <img src={image} alt={`Product slide ${index + 1}`} className="h-full w-full object-cover" />
          </div>
          <div className="px-2 py-1 text-left text-[11px] text-ink-500">Slide {index + 1}</div>
        </button>
      ))}
    </div>
  );
}

function ReviewEvidenceTable({ reviews }: { reviews: ProjectDetailPayload["reviews"] }) {
  if (reviews.length === 0) {
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
          {reviews.map((review) => (
            <tr key={review.id} className="border-t border-white/8">
              <td className="px-3 py-2">{review.sentiment}</td>
              <td className="px-3 py-2">{review.rating ?? "-"}</td>
              <td className="px-3 py-2">
                {[review.reviewDate, review.variation, review.comment].filter(Boolean).join(" | ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
  const reports = useQuery({ queryKey: ["reports"], queryFn: apiClient.reports });
  const [projectId, setProjectId] = useState("");
  const [sections, setSections] = useState<ReportSectionConfig[]>(DEFAULT_REPORT_SECTIONS);
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
                  <button className="secondary-button h-9 px-3 text-xs" type="button" disabled={!report.pdfPath} onClick={() => report.pdfPath && void apiClient.openPath(report.pdfPath)}>
                    <FileDown size={14} />
                    Download
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

function stageCompletionButtonLabel(stage: CollectionStage): string {
  switch (stage) {
    case "KEYWORD_GENERAL":
      return "Done";
    case "PRODUCT_DETAILS":
      return "Collection Complete";
    case "EVALUATION_KEY_STORE":
    default:
      return "Finish";
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
  const completed = steps.filter((step) => stepAssetPaths[step.id]).length;
  return Math.round((completed / steps.length) * 100);
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
  const popularStoreTarget = storeReady ? withStoreSort(currentUrl, "pop") : undefined;
  const bestSellerTarget = storeReady ? withStoreSort(currentUrl, "sales") : undefined;

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

  const productSteps = keyProducts.flatMap((product): CollectionStep[] => {
    const productUrl = product.productUrl;
    const productCurrent = productReady && sameProductIntent(currentUrl, productUrl);
    const productTitle = shortProductTitle(product.title);
    return [
      {
        id: `product-${product.id}-first-page`,
        stage: "PRODUCT_DETAILS",
        section: product.title,
        label: `${productTitle} - first page`,
        kind: "PRODUCT_PAGE",
        ownerType: "PRODUCT",
        ownerId: product.id,
        targetUrl: productUrl,
        instruction: `Open ${product.title} from the product info table and capture images, title, ratings, reviews, sold count, price, variants, add-to-cart, and buy buttons.`,
        ready: productCurrent
      },
      {
        id: `product-${product.id}-slides`,
        stage: "PRODUCT_DETAILS",
        section: product.title,
        label: `${productTitle} - slides and images`,
        kind: "PRODUCT_IMAGE",
        ownerType: "PRODUCT",
        ownerId: product.id,
        targetUrl: productUrl,
        instruction: "Capture product image slides or gallery images. The report renders collected images in rows of no more than three.",
        ready: productCurrent
      },
      {
        id: `product-${product.id}-description`,
        stage: "PRODUCT_DETAILS",
        section: product.title,
        label: `${productTitle} - description`,
        kind: "PRODUCT_DESCRIPTION",
        ownerType: "PRODUCT",
        ownerId: product.id,
        targetUrl: productUrl,
        instruction: "Scroll to the product description/specifications section and capture it. Rendered HTML/text is saved in the background.",
        ready: productCurrent
      },
      {
        id: `product-${product.id}-reviews`,
        stage: "PRODUCT_DETAILS",
        section: product.title,
        label: `${productTitle} - reviews`,
        kind: "REVIEW_SECTION",
        ownerType: "PRODUCT",
        ownerId: product.id,
        targetUrl: productUrl,
        instruction: "Open the review area and display positive and negative reviews before capture.",
        ready: productCurrent
      },
      {
        id: `product-${product.id}-review-media`,
        stage: "PRODUCT_DETAILS",
        section: product.title,
        label: `${productTitle} - user media`,
        kind: "REVIEW_IMAGE",
        ownerType: "PRODUCT",
        ownerId: product.id,
        targetUrl: productUrl,
        instruction: "Filter or scroll to user reviews with attached images, then capture customer media evidence.",
        ready: productCurrent
      },
      {
        id: `product-${product.id}-shop-home`,
        stage: "PRODUCT_DETAILS",
        section: product.title,
        label: `${productTitle} - shop homepage`,
        kind: "STORE_HOME",
        ownerType: product.storeUrl ? "STORE" : "PRODUCT",
        ownerId: product.storeUrl ? `${project.id}:${product.storeUrl}` : product.id,
        targetUrl: product.storeUrl ?? productUrl,
        instruction: "Open the product's shop page and capture the first visible shop homepage evidence.",
        ready: product.storeUrl ? sameStoreIntent(currentUrl, product.storeUrl) : storeReady
      }
    ];
  });

  const genericProductSteps: CollectionStep[] = keyProducts.length > 0 ? [] : [
    {
      id: "product-detail-first-page",
      stage: "PRODUCT_DETAILS",
      section: "Product Detailed Qualified",
      label: "Product page first viewport",
      kind: "PRODUCT_PAGE",
      instruction: "Capture relevance/top-sales first. Until products are extracted, open any selected product page and capture the first viewport.",
      ready: productReady
    }
  ];

  const storeSteps: CollectionStep[] = [
    {
      id: "store-homepage",
      stage: "EVALUATION_KEY_STORE",
      section: "Key Store",
      label: "Store homepage",
      kind: "STORE_HOME",
      instruction: "Open the inspected product store page and capture the visible homepage.",
      ready: storeReady
    },
    {
      id: "store-products",
      stage: "EVALUATION_KEY_STORE",
      section: "Key Store",
      label: "Store products popular page",
      kind: "STORE_FEATURED_PRODUCTS",
      instruction: "Open the store product tab sorted by popular products and capture it.",
      targetUrl: popularStoreTarget,
      ready: storeReady && currentUrl.includes("sortBy=pop")
    },
    {
      id: "store-best-seller",
      stage: "EVALUATION_KEY_STORE",
      section: "Key Store",
      label: "Store best-seller page",
      kind: "STORE_BEST_SELLER",
      instruction: "Open the store product tab sorted by sales and capture the best-selling products.",
      targetUrl: bestSellerTarget,
      ready: storeReady && currentUrl.includes("sortBy=sales")
    },
    {
      id: "store-visual-style",
      stage: "EVALUATION_KEY_STORE",
      section: "Key Store",
      label: "Store visual style and banners",
      kind: "STORE_BANNER",
      instruction: "Capture store decoration, banners, campaign strips, and visual theme evidence.",
      ready: storeReady
    },
    {
      id: "tiktok-brand-search",
      stage: "EVALUATION_KEY_STORE",
      section: "Cross Platform Evidence",
      label: "TikTok Android brand/store screenshot",
      kind: "SOCIAL_ACCOUNT",
      instruction: "Open TikTok in the Android emulator, search the inspected Shopee store or brand name, then attach the emulator screenshot as cross-platform evidence.",
      ready: true
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

function sameStoreIntent(current: string, target: string): boolean {
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

function selectKeyProductCandidates(products: ProjectProductEvidence[]): ProjectProductEvidence[] {
  const merged = new Map<string, ProjectProductEvidence>();
  for (const product of products) {
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
    monthlySold: preferred.monthlySold ?? base.monthlySold,
    totalSold: preferred.totalSold ?? base.totalSold,
    reviewCount: preferred.reviewCount ?? base.reviewCount,
    rating: preferred.rating ?? base.rating,
    storeName: preferred.storeName ?? base.storeName,
    storeUrl: preferred.storeUrl ?? base.storeUrl,
    imageUrl: preferred.imageUrl ?? base.imageUrl,
    images: preferred.images.length > 0 ? preferred.images : base.images
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

function shortProductTitle(title: string): string {
  return title.length > 54 ? `${title.slice(0, 51).trim()}...` : title;
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
  if (/bulu mata|eyelash|lashes|lash/u.test(normalized)) {
    return "eyelash";
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
  if (product.storeType) {
    return product.storeType;
  }
  if (product.source === "Top Sales") {
    return "Top-sales store";
  }
  return "Marketplace";
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

function projectReadinessScore(detail: ProjectDetailPayload): number {
  const checks = [
    hasAnyAsset(detail, ["SEARCH_RESULT", "TOP_SALES"]),
    hasAnyAsset(detail, ["PRODUCT_PAGE", "PRODUCT_IMAGE", "PRODUCT_DESCRIPTION"]),
    hasAnyAsset(detail, ["REVIEW_SECTION", "REVIEW_IMAGE"]),
    detail.stores.length > 0 || hasAnyAsset(detail, ["STORE_HOME", "STORE_BANNER", "STORE_FEATURED_PRODUCTS", "STORE_BEST_SELLER", "SOCIAL_ACCOUNT"]),
    detail.reports.some((report) => report.status === "GENERATED")
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
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
    (() => {
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
}> {
  if (!webview.executeJavaScript) {
    return { html: "", visibleText: "", products: [] };
  }
  return webview.executeJavaScript<{
    html: string;
    visibleText: string;
    products: ExtractedPageProduct[];
  }>(`
    (() => {
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
      const imageUrlFrom = (image) => {
        if (!image) return undefined;
        return parseSrcSet(image.getAttribute("srcset")) || image.currentSrc || image.src || undefined;
      };
      const inferProductType = (title) => {
        const normalized = compact(title).toLowerCase();
        if (/bulu mata|eyelash|lashes|lash/u.test(normalized)) return "eyelash";
        if (/eye\\s*cream|krim mata|mata anti keriput/u.test(normalized)) return "eye cream";
        if (/lotion|body lotion|handbody/u.test(normalized)) return "body lotion";
        if (/lip\\s*tint|lipstick|liptint/u.test(normalized)) return "lip tint";
        if (/serum/u.test(normalized)) return "serum";
        return normalized.split(/\\s+/).slice(0, 4).join(" ") || "marketplace product";
      };
      const inferStoreType = (text, imageUrl) => {
        const value = compact([text, imageUrl].filter(Boolean).join(" ")).toLowerCase();
        if (/mall\\s*ori|mallori|mall-ori/u.test(value)) return "Mall ORI";
        if (/shopee\\s*mall|mall/u.test(value)) return "Mall";
        if (/star\\s*\\+|starplus|star-plus/u.test(value)) return "Star+";
        if (/star/u.test(value)) return "Star";
        if (/official|resmi/u.test(value)) return "Official";
        return undefined;
      };
      const prettyHtml = (value) => String(value || "")
        .replace(/></g, ">\\n<")
        .replace(/\\n\\s+/g, "\\n")
        .replace(/\\n{3,}/g, "\\n\\n")
        .trim();
      const meaningfulTitle = (text, imageAlt) => {
        const lines = String(text || "")
          .split(/\\n+/)
          .map(compact)
          .filter(Boolean)
          .filter((line) => !/^rp\\s*/i.test(line))
          .filter((line) => !/(terjual|sold|rating|penilaian|gratis ongkir|cashback|mall)$/i.test(line))
          .filter((line) => line.length >= 8 && line.length <= 180);
        const alt = compact(imageAlt);
        if (alt && alt.length >= 8 && !/^image/i.test(alt)) return alt;
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
        const text = card.innerText || anchor.innerText || "";
        const image = card.querySelector('picture._displayContents_ img, picture img, img');
        const title = meaningfulTitle(text, image?.alt);
        if (!title) continue;
        seen.add(key);
        const badgeImage = card.querySelector('div.p-2 div.space-y-1 div.whitespace-normal img, div.p-2 div.space-y-1 div.whitespaces-normal img, div.p-2 div.space-y-1 div[class*="whitespace"] img, img[alt*="Mall" i], img[alt*="Star" i], img[src*="mall" i], img[src*="star" i]');
        const badgeImageUrl = imageUrlFrom(badgeImage);
        const badgeText = compact([badgeImage?.alt, badgeImage?.getAttribute("aria-label"), badgeImage?.title].filter(Boolean).join(" "));
        const storeType = inferStoreType(badgeText, badgeImageUrl) || inferStoreType(text, undefined);
        const priceText = compact((text.match(/Rp\\s*[\\d.]+(?:\\s*-\\s*Rp\\s*[\\d.]+)?/i) || [])[0] || "");
        const soldMatch = text.match(/(?:terjual|sold)\\s*([\\d.,]+\\s*(?:rb|ribu|k|jt|juta|m)?\\+?)|([\\d.,]+\\s*(?:rb|ribu|k|jt|juta|m)?\\+?)\\s*(?:terjual|sold)/i);
        const reviewMatch = text.match(/([\\d.,]+\\s*(?:rb|ribu|k|jt|juta|m)?\\+?)\\s*(?:penilaian|ratings?|ulasan|reviews?)/i);
        const ratingMatch = text.match(/(?:^|\\s)([1-5](?:[.,]\\d)?)\\s*(?:\\/\\s*5|\\||rating|bintang|stars?)?/i);
        products.push({
          rank: products.length + 1,
          title,
          url,
          imageUrl: imageUrlFrom(image),
          priceText: priceText || undefined,
          priceAverage: parsePrice(priceText),
          rating: ratingMatch ? Number(ratingMatch[1].replace(",", ".")) : undefined,
          reviewCount: reviewMatch ? parseHumanNumber(reviewMatch[1]) : undefined,
          soldCount: soldMatch ? parseHumanNumber(soldMatch[1] || soldMatch[2]) : undefined,
          productType: inferProductType(title),
          storeType,
          storeBadgeImageUrl: badgeImageUrl,
          sourcePlacement: String(products.length + 1),
          mallStatus: /mall/i.test([text, storeType].filter(Boolean).join(" ")),
          officialStatus: /official|resmi/i.test(text),
          starSeller: /star\\s*seller|star\\+?|star plus/i.test([text, storeType].filter(Boolean).join(" ")),
          rawText: compact(text).slice(0, 1200)
        });
      }
      const html = prettyHtml(htmlRoot.outerHTML || document.documentElement?.outerHTML || "");
      const visibleTextSource = htmlRoot.innerText || document.body?.innerText || "";
      const visibleText = [document.title || "", location.href, compact(visibleTextSource).slice(0, 24000)]
        .filter(Boolean)
        .join("\\n");
      return { html, visibleText, products };
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
  const imageRect = imageElement.getBoundingClientRect();
  const offsetX = parentRect ? imageRect.left - parentRect.left : 0;
  const offsetY = parentRect ? imageRect.top - parentRect.top : 0;
  const selectedX = Math.max(0, selection.x - offsetX);
  const selectedY = Math.max(0, selection.y - offsetY);
  const selectedWidth = Math.min(selection.width, imageRect.width - selectedX);
  const selectedHeight = Math.min(selection.height, imageRect.height - selectedY);
  if (selectedWidth <= 0 || selectedHeight <= 0) {
    return { imageDataUrl, width: imageElement.naturalWidth, height: imageElement.naturalHeight };
  }
  const scaleX = imageElement.naturalWidth / imageRect.width;
  const scaleY = imageElement.naturalHeight / imageRect.height;
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
