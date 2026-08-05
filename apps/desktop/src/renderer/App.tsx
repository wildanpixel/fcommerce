import { FormEvent, MouseEvent as ReactMouseEvent, PointerEvent, ReactNode, WheelEvent, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import JSZip from "jszip";
import {
  Archive,
  AlertTriangle,
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
  FolderOpen,
  Gauge,
  Globe2,
  ImagePlus,
  LayoutGrid,
  ListChecks,
  Maximize2,
  Minimize2,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Smartphone,
  Store,
  Table2,
  TerminalSquare,
  Trash2,
  Rows3,
  X,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  AndroidAppRuntimeStatus,
  AndroidToolStatus,
  BulkReportFormat,
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
  ShopeeSearchFilters,
  ShopeeShopTypeFilter,
  StoreCollectionCandidate,
  QualifiedProductReference
} from "../shared/contracts.js";
import type { AiAnalysisJson } from "../domain/models.js";
import { SHOPEE_SHOP_TYPE_FILTERS } from "../shared/contracts.js";
import {
  DEFAULT_REPORT_SECTIONS,
  REPORT_SECTION_GROUPS,
  type ReportSectionConfig,
  type ReportSectionGroupId,
  type ReportSectionId
} from "../shared/reportSections.js";
import {
  normalizeStoreType as normalizeStoreTypeValue,
  STORE_TYPE_IMAGES,
  storeTypeImage,
  storeTypeLabel as storeTypeDisplayLabel,
  type StoreType
} from "../shared/storeTypes.js";
import { apiClient } from "./api/client.js";
import { APP_AUTHOR_NAME } from "./app/appMetadata.js";
import { APP_LANGUAGES, translate, type AppLanguage } from "./app/languages.js";
import { AppSidebar } from "./components/AppSidebar.js";
import { AppTopBar } from "./components/AppTopBar.js";
import { BulkReportWorkspace } from "./pages/BulkReportWorkspace.js";
import { ReportContentSettingsPage } from "./pages/ReportContentSettingsPage.js";
import { useEvidenceTranslations } from "./hooks/useEvidenceTranslations.js";
import {
  dedupeStoreCollectionCandidates,
  extractShopeeShopId,
  resolveCanonicalStoreList,
  stableStoreCandidateId,
  storeCategoriesUrl,
  storeHomepageUrl,
  storeProductsUrl,
  storeRatingsUrl
} from "./collectionKeyStore.js";
import {
  assertEvidenceHasProductRows,
  evidenceRequiresProductRows,
  isCollectionPageReady,
  preservesStoreEvidenceDuringReset
} from "./collectionEvidence.js";
import {
  collectionAdvanceMode,
  nextProductCollectionTarget,
  nextPendingCollectionActionId,
  previousCollectionActionId
} from "./collectionProgression.js";
import {
  createQualifiedProductReference,
  qualifiedProductRankingReason,
  rankQualifiedProducts,
  rankSelectedQualifiedProducts,
  resolveCanonicalQualifiedProducts,
  resolveQualifiedProductReferences,
  sameQualifiedProduct,
  stableProductIdentity
} from "./qualifiedProducts.js";
import { viewModeForCollectionStage } from "./collectionViewMode.js";
import {
  buildShopeeSearchUrl,
  matchesShopeeSearchIntent,
  toDesktopUrl,
  toMobileUrl,
  withShopeeProductDisplayModel
} from "./shopeeUrls.js";
import { useUiStore } from "./store/uiStore.js";
import { EmptyState, Field, LoadingProgressModal, LoadingSkeleton, Panel } from "./components/ui.js";
import { MarketplaceIllustration } from "./components/MarketplaceIllustration.js";
import { ResultCardMedia, StoreTypeMark } from "./components/ResultCardVisuals.js";
import { Button, Checkbox, Chip, Input, Modal, SegmentedControl, Select } from "./components/primitives.js";
import { SettingsView } from "./pages/SettingsView.js";
import researchProductMarketLogo from "./assets/research-product-market-logo-dark.png";
import wildanLogoBlack from "./assets/wildan-logo-black.png";

const SHOPEE_HOME_URL = "https://shopee.co.id/";
const TIKTOK_SHOP_URL = "https://www.tiktok.com/shop";
const SIDEBAR_STORAGE_KEY = "mio-sidebar-collapsed-v3";
const PROJECT_DETAIL_STALE_TIME_MS = 5 * 60_000;
const PROJECT_DETAIL_GC_TIME_MS = 30 * 60_000;

type ReportSectionExpansionState = {
  openSectionIds: ReadonlySet<string>;
  setSectionOpen: (id: string, open: boolean) => void;
  openSectionPath: (ids: string[]) => void;
};

const ReportSectionExpansionContext = createContext<ReportSectionExpansionState>({
  openSectionIds: new Set<string>(),
  setSectionOpen: () => undefined,
  openSectionPath: () => undefined
});

const EvidenceTranslationContext = createContext<(value: string | null | undefined) => string>(
  (value) => value ?? ""
);

const SHOPEE_SHOP_TYPE_OPTIONS: Array<{ id: ShopeeShopTypeFilter; label: string }> = [
  { id: "service_by_shopee_product_label_filter", label: "Fulfilled by Shopee" },
  { id: "OFFICIAL_MALL", label: "Shopee Mall" },
  { id: "PREFERRED_PLUS", label: "Star+" },
  { id: "PREFERRED", label: "Star" }
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
  language: AppLanguage;
  searchFilters: ShopeeSearchFilters;
};

type CollectionSubAction = {
  id: string;
  label: string;
  mode: "screenshot" | "download" | "collect" | "sync" | "background";
  kind?: ManualEvidenceKind;
  description: string;
  collectLabel?: string;
  captureMode?: "viewport" | "full-page";
  targetSelector?: string;
  captureStrategy?: "selector" | "top-through-selector";
  guidance?: string;
  targetUrl?: string;
  preferredViewMode?: PlatformViewMode;
  metadata?: Record<string, unknown>;
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
  captureStrategy?: "selector" | "top-through-selector";
  substeps?: string[];
  subActions?: CollectionSubAction[];
  ownerType?: ManualEvidencePayload["ownerType"];
  ownerId?: string;
  instruction: string;
  targetUrl?: string;
  ready: boolean;
  metadata?: Record<string, unknown>;
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

const DATA_ONLY_EVIDENCE_IMAGE: FullPageScreenshot = {
  imageDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  width: 1,
  height: 1,
  mode: "viewport"
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
  progress?: number;
};

const COLLECTION_STAGES: CollectionStage[] = ["KEYWORD_GENERAL", "PRODUCT_DETAILS", "EVALUATION_KEY_STORE"];

type RenderedProductDetailSnapshot = {
  storeName?: string;
  storeUrl?: string;
  storeType?: StoreType;
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

type RenderedStoreProfileSnapshot = {
  name?: string;
  url?: string;
  marketplaceStoreId?: string;
  storeType?: StoreType;
  followers?: number;
  following?: number;
  productsCount?: number;
  rating?: number;
  ratingCount?: number;
  chatResponse?: string;
  joinedDate?: string;
  description?: string;
  categories: string[];
  ratingSamples: Array<{
    rating: number;
    reviewer: string;
    reviewerUrl?: string;
    comment: string;
    productTitle?: string;
    productUrl?: string;
    productVariation?: string;
    sellerResponse?: string;
    mediaUrls: string[];
    capturedAt?: string;
  }>;
  bannerUrls: string[];
};

type ProductSelectionClassification =
  | "Priority"
  | "High"
  | "Average - Emerging Product"
  | "Average - Established but Slowing"
  | "Platform recommended"
  | "Not Recommended"
  | "Review";

type ProductSelectionDiagnostics = {
  classification: ProductSelectionClassification;
  finalScore: number;
  relevanceScore: number;
  monthlySalesScore: number;
  totalSalesScore: number;
  commercialValueScore: number;
  thumbnailScore: number;
  confidence: "High" | "Medium" | "Low";
  priceLevel: "low" | "medium" | "high" | "unknown";
  monthlySalesLevel: "low" | "medium" | "high" | "unknown";
  totalSalesLevel: "low" | "medium" | "high" | "unknown";
  clickPotential: "Very High" | "High" | "Medium" | "Low" | "Very Low";
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

function applyWebviewShadowFrameLayout(webview: WebviewElement | null | undefined): void {
  const shadowFrame = webview?.shadowRoot?.querySelector("iframe") as HTMLIFrameElement | null | undefined;
  if (!shadowFrame) {
    return;
  }

  shadowFrame.style.display = "block";
  shadowFrame.style.flex = "1 1 auto";
  shadowFrame.style.width = "100%";
  shadowFrame.style.height = "100%";
  shadowFrame.style.minHeight = "100%";
  shadowFrame.style.border = "0px";
}

function restoreRendererFocus(): void {
  window.requestAnimationFrame(() => {
    if (document.activeElement instanceof HTMLElement && document.activeElement.closest('[role="dialog"]')) {
      document.activeElement.blur();
    }
    window.focus();
  });
}

function appPortalRoot(): Element {
  return document.querySelector(".mio-app") ?? document.body;
}

export default function App() {
  const activeView = useUiStore((state) => state.activeView);
  const requestNewResearch = useUiStore((state) => state.requestNewResearch);
  const language = useUiStore((state) => state.language);
  const setLanguage = useUiStore((state) => state.setLanguage);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true"
  );
  const [sidebarHoverExpanded, setSidebarHoverExpanded] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() =>
    window.localStorage.getItem("mio-theme") === "light" ? "light" : "dark"
  );
  const [showSplash, setShowSplash] = useState(true);
  const [collectionPageActive, setCollectionPageActive] = useState(false);
  const [projectHeaderTitle, setProjectHeaderTitle] = useState("");

  const toggleSidebar = useCallback(() => {
    setSidebarHoverExpanded(false);
    setSidebarCollapsed((current) => !current);
  }, []);
  const effectiveSidebarCollapsed = sidebarCollapsed && !sidebarHoverExpanded;

  const toggleThemeMode = useCallback(() => {
    setThemeMode((value) => (value === "dark" ? "light" : "dark"));
  }, []);

  const requestActivityToggle = useCallback(() => {
    window.dispatchEvent(new CustomEvent("mio:toggle-activity"));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    restoreRendererFocus();
  }, [activeView]);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    window.localStorage.setItem("mio-theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const handleCollectionPageState = (event: Event) => {
      setCollectionPageActive(Boolean((event as CustomEvent<boolean>).detail));
    };
    window.addEventListener("mio:collection-page-state", handleCollectionPageState);
    return () => window.removeEventListener("mio:collection-page-state", handleCollectionPageState);
  }, []);

  useEffect(() => {
    const handleProjectHeaderContext = (event: Event) => {
      setProjectHeaderTitle(String((event as CustomEvent<string | undefined>).detail ?? ""));
    };
    window.addEventListener("mio:project-header-context", handleProjectHeaderContext);
    return () => window.removeEventListener("mio:project-header-context", handleProjectHeaderContext);
  }, []);

  const defaultTitle = { research: "Research Workspace", projects: "Keyword Projects", reports: "Reports", settings: "Settings" }[activeView];
  const topBarTitle = activeView === "projects" && projectHeaderTitle ? projectHeaderTitle : defaultTitle;
  const topBarBreadcrumbs = activeView === "projects" && projectHeaderTitle
    ? ["Keyword Projects", projectHeaderTitle]
    : [{ research: "New Research", projects: "Keyword Projects", reports: "Reports", settings: "Settings" }[activeView]];
  const topBarDescription = activeView === "projects" && !projectHeaderTitle
    ? "Inspect saved marketplace research or continue an active collection."
    : undefined;

  return (
    <div className={`mio-app ${themeMode === "light" ? "mio-light" : "mio-dark"} min-h-screen bg-ink-950 text-ink-100`}>
      <AnimatePresence>{showSplash && <SplashScreen themeMode={themeMode} />}</AnimatePresence>
      <div
        className={[
          "mio-shell grid min-h-screen transition-[grid-template-columns] duration-200 ease-out",
          effectiveSidebarCollapsed ? "grid-cols-[68px_minmax(0,1fr)]" : "grid-cols-[220px_minmax(0,1fr)]"
        ].join(" ")}
      >
        <AppSidebar
          collapsed={effectiveSidebarCollapsed}
          themeMode={themeMode}
          onToggle={toggleSidebar}
          onHoverChange={setSidebarHoverExpanded}
        />
        <main className="mio-main min-w-0 border-l border-white/8">
          <AppTopBar
            title={topBarTitle}
            breadcrumbs={topBarBreadcrumbs}
            description={topBarDescription}
            action={activeView === "projects" && !projectHeaderTitle ? (
              <Button variant="primary" onClick={requestNewResearch}>
                <Plus size={15} />
                {translate(language, "New Research")}
              </Button>
            ) : undefined}
            themeMode={themeMode}
            onThemeToggle={toggleThemeMode}
            language={language}
            onLanguageChange={setLanguage}
            showActivityButton={collectionPageActive}
            onActivityToggle={requestActivityToggle}
          />
          <div className="mio-content relative px-8 pb-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                className="mio-page-transition"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.14, ease: "easeOut" }}
              >
                {activeView === "research" && <ManualResearchExperience />}
                {activeView === "projects" && <ProjectsView />}
                {activeView === "reports" && <ReportsView themeMode={themeMode} />}
                {activeView === "settings" && <SettingsView />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

function SplashScreen({ themeMode }: { themeMode: ThemeMode }) {
  return (
    <motion.div
      className="mio-splash fixed inset-0 z-[120] flex items-center justify-center bg-[#f6f8fb]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <motion.div
        className="mio-splash-card flex flex-col items-center text-center"
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
      >
        <motion.div className="mio-splash-logo mb-5 flex h-20 w-20 items-center justify-center">
          <img src={themeMode === "light" ? wildanLogoBlack : researchProductMarketLogo} alt="" className="h-full w-full object-contain" />
        </motion.div>
        <motion.div
          className="text-4xl font-black tracking-[-0.04em] text-ink-950"
          initial={{ letterSpacing: "-0.12em", opacity: 0 }}
          animate={{ letterSpacing: "-0.04em", opacity: 1 }}
          transition={{ delay: 0.14, duration: 0.5 }}
        >
          Research Product Market
        </motion.div>
        <div className="mt-2 text-sm font-medium text-ink-500">Marketplace research and evidence workspace</div>
        <div className="mt-8 flex items-center gap-2 rounded-full bg-black/5 px-4 py-2 text-xs font-semibold text-ink-500">
          <Sparkles size={14} className="text-signal-blue" />
          Made by {APP_AUTHOR_NAME}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ManualResearchExperience() {
  const queryClient = useQueryClient();
  const openProjectInspector = useUiStore((state) => state.openProjectInspector);
  const language = useUiStore((state) => state.language);
  const researchSetupRequestId = useUiStore((state) => state.researchSetupRequestId);
  const clearResearchSetupRequest = useUiStore((state) => state.clearResearchSetupRequest);
  const [mode, setMode] = useState<ResearchMode>("home");
  const [activeProject, setActiveProject] = useState<ProjectSummary | null>(null);
  const [form, setForm] = useState<AnalysisFormState>({
    keyword: "",
    productCategory: "",
    marketplace: "SHOPEE_ID",
    createdAt: new Date().toISOString(),
    language,
    searchFilters: {
      shopTypes: []
    }
  });
  const [browserUrl, setBrowserUrl] = useState(SHOPEE_HOME_URL);

  useEffect(() => {
    if (researchSetupRequestId <= 0) {
      return;
    }
    setActiveProject(null);
    setMode("setup");
    setForm((current) => ({ ...current, language, createdAt: new Date().toISOString() }));
    clearResearchSetupRequest();
  }, [clearResearchSetupRequest, language, researchSetupRequestId]);

  useEffect(() => {
    if (mode === "home" || mode === "setup") {
      setForm((current) => current.language === language ? current : { ...current, language });
    }
  }, [language, mode]);

  const createProject = useMutation({
    mutationFn: (payload: NewProjectInput) => apiClient.createProject(payload),
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setActiveProject(project);
      setBrowserUrl(initialPlatformUrl(
        project.marketplace as ResearchPlatform,
        project.keyword,
        project.collectionState.searchFilters
      ));
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
      language: form.language,
      productCategory: form.productCategory.trim(),
      searchFilters: form.marketplace === "SHOPEE_ID" ? form.searchFilters : undefined
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

  const returnToProjectInspector = () => {
    const projectId = activeProject.id;
    setActiveProject(null);
    openProjectInspector(projectId);
  };

  if (activeProject.marketplace === "TIKTOK_SHOP") {
    return (
      <AndroidTikTokCollector
        project={activeProject}
        productCategory={form.productCategory}
        onNewAnalysis={returnToProjectInspector}
        exitLabel="Back to Projects"
      />
    );
  }

  return (
    <GuidedBrowserCollector
      project={activeProject}
      productCategory={form.productCategory}
      browserUrl={browserUrl}
      onBrowserUrlChange={setBrowserUrl}
      onNewAnalysis={returnToProjectInspector}
      exitLabel="Back to Projects"
    />
  );
}

function CreateAnalysisHome({ onCreate }: { onCreate: () => void }) {
  const language = useUiStore((state) => state.language);
  return (
    <section className="mio-new-research relative flex min-h-[calc(100vh-120px)] items-center justify-center overflow-hidden">
      <NewResearchBackdrop />
      <motion.button
        type="button"
        className="mio-create-button mio-ambient-border relative z-10 group flex min-h-[168px] w-full max-w-[520px] flex-col items-start justify-between text-left"
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.99 }}
        onClick={onCreate}
        aria-describedby="create-analysis-description"
      >
        <span className="mio-create-illustration" aria-hidden="true">
          <MarketplaceIllustration variant="research" label="Marketplace research workspace" />
        </span>
        <span>
          <span className="block text-3xl font-semibold text-white">{translate(language, "Create Analysis")}</span>
          <span id="create-analysis-description" className="mt-3 block max-w-[420px] text-sm leading-6 text-ink-300">
            {translate(language, "Start a guided marketplace evidence session. You control the browser, the app captures each required report step.")}
          </span>
        </span>
        <span className="mio-create-action inline-flex items-center gap-2 text-sm font-medium">
          {translate(language, "Open setup")}
          <ChevronRight size={16} />
        </span>
      </motion.button>
    </section>
  );
}

function NewResearchBackdrop() {
  return (
    <div className="mio-new-research-backdrop" aria-hidden="true" />
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
  const language = useUiStore((state) => state.language);
  const priceRangeValid =
    form.searchFilters.priceMin === undefined ||
    form.searchFilters.priceMax === undefined ||
    form.searchFilters.priceMin <= form.searchFilters.priceMax;
  const canProceed =
    form.keyword.trim().length >= 2 &&
    form.productCategory.trim().length >= 2 &&
    priceRangeValid &&
    !isSaving;
  const keywordInputRef = useRef<HTMLInputElement>(null);

  function toggleShopeeShopType(shopType: ShopeeShopTypeFilter) {
    const selected = new Set(form.searchFilters.shopTypes);
    if (selected.has(shopType)) {
      selected.delete(shopType);
    } else {
      selected.add(shopType);
    }
    onChange({
      searchFilters: {
        ...form.searchFilters,
        shopTypes: SHOPEE_SHOP_TYPE_FILTERS.filter((item) => selected.has(item))
      }
    });
  }

  function updatePriceRange(key: "priceMin" | "priceMax", value: string) {
    const parsed = value === "" ? undefined : Math.max(0, Math.round(Number(value)));
    onChange({
      searchFilters: {
        ...form.searchFilters,
        [key]: Number.isFinite(parsed) ? parsed : undefined
      }
    });
  }

  useEffect(() => {
    restoreRendererFocus();
    const focusTimer = window.setTimeout(() => keywordInputRef.current?.focus({ preventScroll: true }), 0);
    return () => window.clearTimeout(focusTimer);
  }, []);

  return (
    <section className="mio-analysis-setup mx-auto max-w-4xl">
      <Panel title={translate(language, "Create Analysis")} icon={ClipboardCheck} className="mio-analysis-panel mio-ambient-panel">
        <form className="mio-analysis-form grid grid-cols-2 gap-5" onSubmit={onSubmit}>
          <Field label={translate(language, "Desired Keyword")}>
            <Input
              ref={keywordInputRef}
              data-research-keyword-input
              aria-label="Desired Keyword"
              className="input"
              value={form.keyword}
              onChange={(event) => onChange({ keyword: event.target.value })}
              placeholder="Example: bulu mata palsu"
            />
          </Field>
          <Field label={translate(language, "Product Category")}>
            <Input
              aria-label="Product Category"
              className="input"
              value={form.productCategory}
              onChange={(event) => onChange({ productCategory: event.target.value })}
              placeholder="Example: false eyelashes"
            />
          </Field>
          <Field label={translate(language, "Date Created")}>
            <Input aria-label="Date Created" value={formatDateTime(form.createdAt)} readOnly />
          </Field>
          <Field label={translate(language, "Language")}>
            <Select
              aria-label="Language"
              value={form.language}
              onChange={(event) => onChange({ language: event.target.value as AppLanguage })}
            >
              {APP_LANGUAGES.map((language) => (
                <option key={language.id} value={language.id}>
                  {language.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={translate(language, "Collection Platform")}>
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
                badge={translate(language, "Coming soon")}
                disabled
                onClick={() => onChange({ marketplace: "TIKTOK_SHOP" })}
              />
            </div>
          </Field>
          {form.marketplace === "SHOPEE_ID" && (
            <>
              <Field label={translate(language, "Shop Type")}>
                <div className="mio-shop-type-grid grid grid-cols-2 gap-2" aria-label="Shopee Shop Type">
                  {SHOPEE_SHOP_TYPE_OPTIONS.map((option) => {
                    const checked = form.searchFilters.shopTypes.includes(option.id);
                    return (
                      <Checkbox
                        key={option.id}
                        label={option.label}
                        tile
                        checked={checked}
                        onChange={() => toggleShopeeShopType(option.id)}
                      />
                    );
                  })}
                </div>
              </Field>
              <Field label={translate(language, "Price Range (IDR)")}>
                <div className="mio-price-range grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <Input
                    aria-label="Minimum Price"
                    className="input"
                    type="number"
                    min="0"
                    step="1000"
                    value={form.searchFilters.priceMin ?? ""}
                    onChange={(event) => updatePriceRange("priceMin", event.target.value)}
                    placeholder={translate(language, "Minimum")}
                  />
                  <span className="text-sm text-ink-500">{translate(language, "to")}</span>
                  <Input
                    aria-label="Maximum Price"
                    className="input"
                    type="number"
                    min="0"
                    step="1000"
                    value={form.searchFilters.priceMax ?? ""}
                    onChange={(event) => updatePriceRange("priceMax", event.target.value)}
                    placeholder={translate(language, "Maximum")}
                  />
                </div>
                {!priceRangeValid && (
                  <div className="mt-2 text-xs text-signal-rose">{translate(language, "Maximum price must be greater than or equal to minimum price.")}</div>
                )}
              </Field>
            </>
          )}
          <div className="col-span-2 grid grid-cols-[180px_minmax(0,1fr)] gap-3">
            <Button variant="ghost" type="button" onClick={onBack}>
              <ChevronLeft size={16} />
              {translate(language, "Back")}
            </Button>
            <Button variant="primary" type="submit" disabled={!canProceed}>
              <ChevronRight size={16} />
              {translate(language, "Start Collection")}
            </Button>
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
    <section className="mio-android-workspace grid grid-cols-[360px_minmax(0,1fr)] gap-5">
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
  const language = useUiStore((state) => state.language);
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
  const [qualifiedProductIds, setQualifiedProductIds] = useState<string[]>(savedCollectionState.qualifiedProductIds ?? []);
  const [qualifiedProductReferences, setQualifiedProductReferences] = useState<QualifiedProductReference[]>(
    savedCollectionState.qualifiedProductReferences ?? []
  );
  const [qualifiedProductsInitialized, setQualifiedProductsInitialized] = useState(Boolean(savedCollectionState.qualifiedProductsInitialized));
  const [qualifiedProductsApproved, setQualifiedProductsApproved] = useState(Boolean(savedCollectionState.qualifiedProductsApproved));
  const [storeCollectionCandidates, setStoreCollectionCandidates] = useState<StoreCollectionCandidate[]>(
    dedupeStoreCollectionCandidates(savedCollectionState.storeCollectionCandidates ?? [])
  );
  const [storeListInitialized, setStoreListInitialized] = useState(Boolean(savedCollectionState.storeListInitialized));
  const [storeListApproved, setStoreListApproved] = useState(Boolean(savedCollectionState.storeListApproved));
  const [activeSubActionId, setActiveSubActionId] = useState<string | undefined>(undefined);
  const [analysisSessionCollapsed, setAnalysisSessionCollapsed] = useState(true);
  const [activitySidebarOpen, setActivitySidebarOpen] = useState(false);
  const [zoomFactor, setZoomFactor] = useState(1);
  const [pendingCapture, setPendingCapture] = useState<PendingEvidenceCapture | null>(null);
  const [preparingEvidenceKey, setPreparingEvidenceKey] = useState<string | null>(null);
  const [manualNoticeVisible, setManualNoticeVisible] = useState(false);
  const [expandedPortalRoot, setExpandedPortalRoot] = useState<HTMLElement | null>(null);
  const [browserInteractionToken, setBrowserInteractionToken] = useState(0);
  const [captureStatus, setCaptureStatus] = useState<BrowserCaptureStatus>({
    message: "Waiting for target page",
    state: "idle"
  });
  const [displayedCaptureProgress, setDisplayedCaptureProgress] = useState(0);
  const [activityLog, setActivityLog] = useState<string[]>([
    "Open each target page manually, then capture the matching report step."
  ]);
  const projectDetail = useQuery({
    queryKey: ["project-detail", project.id],
    queryFn: () => apiClient.projectDetail(project.id)
  });

  useEffect(() => {
    setExpandedPortalRoot(document.querySelector<HTMLElement>(".mio-app"));
  }, []);

  const allSteps = useMemo(
    () => buildCollectionSteps(
      {
        ...project,
        collectionState: {
          ...savedCollectionState,
          qualifiedProductIds,
          qualifiedProductReferences,
          qualifiedProductsInitialized,
          qualifiedProductsApproved,
          storeCollectionCandidates,
          storeListInitialized,
          storeListApproved
        }
      } as ProjectSummary,
      platform,
      currentUrl,
      viewMode,
      projectDetail.data,
      storeCollectionCandidates
    ),
    [
      currentUrl,
      platform,
      project,
      projectDetail.data,
      qualifiedProductIds,
      qualifiedProductReferences,
      qualifiedProductsApproved,
      qualifiedProductsInitialized,
      savedCollectionState,
      storeCollectionCandidates,
      storeListApproved,
      storeListInitialized,
      viewMode
    ]
  );
  const steps = useMemo(() => allSteps.filter((step) => step.stage === activeStage), [activeStage, allSteps]);
  const activeStep = steps[activeStepIndex] ?? steps[0];
  const activeSubAction = activeStep?.subActions?.find((action) => action.id === activeSubActionId) ?? activeStep?.subActions?.[0];
  const activeSubActionReady = activeStep?.ownerType === "STORE" && activeSubAction?.id !== "store-tiktok"
    ? matchesStoreCollectionTarget(
        currentUrl,
        activeSubAction?.targetUrl,
        typeof activeStep.metadata?.canonicalStoreUrl === "string" ? activeStep.metadata.canonicalStoreUrl : undefined,
        typeof activeStep.metadata?.shopId === "string" ? activeStep.metadata.shopId : undefined
      )
    : activeSubAction?.id === "shop-homepage" || activeSubAction?.id === "store-homepage"
    ? isShopeeStorePage(currentUrl)
    : activeSubAction?.id === "store-details"
      ? isShopeeStorePage(currentUrl) && Boolean(activeSubAction.targetUrl && sameStoreIntent(currentUrl, activeSubAction.targetUrl))
      : activeSubAction?.id === "store-tiktok"
        ? isTikTokPage(currentUrl)
        : activeSubAction?.targetUrl
          ? sameUrlIntent(currentUrl, activeSubAction.targetUrl)
          : activeStep?.ready;
  const activeTargetUrl = activeSubAction?.targetUrl ?? activeStep?.targetUrl;
  const activeSubActionCounts = useMemo(
    () => activeStep ? collectionSubActionCounts(activeStep, projectDetail.data) : {},
    [activeStep, projectDetail.data]
  );
  const activeSubActionStates = useMemo(
    () => activeStep ? collectionSubActionStates(activeStep, collectedSteps, activeSubActionCounts) : {},
    [activeStep, activeSubActionCounts, collectedSteps]
  );
  const activeEvidenceKind = activeStep ? subActionEvidenceKind(activeStep, activeSubAction) : undefined;
  const controllerStep = activeStep
    ? {
        ...activeStep,
        ready: isCollectionPageReady(
          Boolean(activeSubActionReady),
          loadState,
          activeEvidenceKind ? evidenceRequiresProductRows(activeEvidenceKind) : false
        ),
        targetUrl: activeTargetUrl
      }
    : activeStep;
  const availableKeyProductPool = useMemo(
    () => allKeyProductCandidates(projectDetail.data?.products ?? [], project.keyword),
    [project.keyword, projectDetail.data?.products]
  );
  const qualifiedProductPool = useMemo(
    () => rankQualifiedProducts(availableKeyProductPool).slice(0, 120),
    [availableKeyProductPool]
  );
  const selectedKeyProducts = useMemo(() => {
    const productsById = new Map<string, ProjectProductEvidence>();
    for (const product of projectDetail.data?.products ?? []) productsById.set(product.id, product);
    for (const product of availableKeyProductPool) productsById.set(product.id, product);
    const pool = Array.from(productsById.values());
    if (qualifiedProductReferences.length > 0) {
      return resolveCanonicalQualifiedProducts(pool, qualifiedProductReferences, qualifiedProductsInitialized, 10);
    }
    if (qualifiedProductsInitialized) {
      const byId = new Map(pool.map((product) => [product.id, product]));
      return qualifiedProductIds.map((id) => byId.get(id)).filter((product): product is ProjectProductEvidence => Boolean(product));
    }
    return [];
  }, [availableKeyProductPool, projectDetail.data?.products, qualifiedProductIds, qualifiedProductReferences, qualifiedProductsInitialized]);
  const collectedCount = allSteps.filter((step) => isCollectionStepComplete(step, collectedSteps)).length;
  const stageCollectedCount = steps.filter((step) => isCollectionStepComplete(step, collectedSteps)).length;
  const collectionProgressPercent = allSteps.length > 0 ? Math.round((collectedCount / allSteps.length) * 100) : 0;
  const isManualActionState =
    platform === "SHOPEE_ID" &&
    (isProtectedShopeePage(currentUrl) || isShopeeLoginPage(currentUrl) || loadState === "failed");

  useEffect(() => {
    const detail = projectDetail.data;
    if (!detail) {
      return;
    }
    setCollectedSteps((current) => {
      const next = { ...current };
      let changed = false;
      for (const step of allSteps.filter((item) => item.stage === "PRODUCT_DETAILS" && item.ownerType === "PRODUCT" && item.ownerId)) {
        const product = detail.products.find((item) => item.id === step.ownerId);
        const sharedAsset = product
          ? productAssetsForStep(detail, product).find((asset) => asset.kind === "STORE_HOME")
          : undefined;
        const progressKey = stepProgressKey(step, "shop-homepage");
        if (sharedAsset && !next[progressKey]) {
          next[progressKey] = sharedAsset.path;
          changed = true;
        }
      }
      for (const step of allSteps.filter((item) => item.metadata?.storeEvidenceType === "homepage")) {
        const storeUrl = typeof step.metadata?.canonicalStoreUrl === "string" ? step.metadata.canonicalStoreUrl : undefined;
        const keyStoreAsset = reusableKeyStoreHomepageAsset(detail, storeUrl);
        if (keyStoreAsset && !next[step.id]) {
          next[step.id] = keyStoreAsset.path;
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [allSteps, projectDetail.data]);

  useEffect(() => {
    if (activeStage !== "EVALUATION_KEY_STORE" || storeListInitialized || !projectDetail.data) {
      return;
    }
    const legacyStores = projectDetail.data.stores.map((store) => ({
      id: store.id,
      storeName: store.name,
      storeUrl: store.url,
      storeType: store.storeType,
      shopId: store.marketplaceStoreId
    }));
    const candidates = resolveCanonicalStoreList(selectedKeyProducts, storeCollectionCandidates, false, legacyStores);
    setStoreCollectionCandidates(candidates);
    setStoreListInitialized(true);
    setStoreListApproved(false);
    persistCollectionState({
      storeCollectionCandidates: candidates,
      storeListInitialized: true,
      storeListApproved: false
    });
    // Older projects are migrated once when Part 3 is first opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStage, projectDetail.data, storeListInitialized]);

  useEffect(() => {
    if (activeStage !== "EVALUATION_KEY_STORE" || !activeStep?.ownerId) {
      return;
    }
    const shopId = extractShopeeShopId(currentUrl);
    const currentCandidate = storeCollectionCandidates.find((candidate) => candidate.id === activeStep.ownerId);
    if (!shopId || !currentCandidate || currentCandidate.shopId === shopId) {
      return;
    }
    const nextCandidates = dedupeStoreCollectionCandidates(storeCollectionCandidates.map((candidate) =>
      candidate.id === activeStep.ownerId ? { ...candidate, shopId } : candidate
    ));
    setStoreCollectionCandidates(nextCandidates);
    persistCollectionState({ storeCollectionCandidates: nextCandidates });
    appendLog(setActivityLog, `Detected Shopee shop ID ${shopId} for ${currentCandidate.storeName}.`);
    // Persist only when navigation reveals a new shop ID.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStage, activeStep?.ownerId, currentUrl, storeCollectionCandidates]);

  useEffect(() => {
    if (!isManualActionState) {
      setManualNoticeVisible(false);
      return;
    }
    setManualNoticeVisible(true);
    const timer = window.setTimeout(() => setManualNoticeVisible(false), 4000);
    return () => window.clearTimeout(timer);
  }, [isManualActionState, currentUrl]);

  useEffect(() => {
    if (captureStatus.state !== "done" && captureStatus.state !== "failed") {
      return;
    }
    const timer = window.setTimeout(() => {
      setCaptureStatus({ message: "Waiting for target page", state: "idle" });
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [captureStatus.message, captureStatus.state]);

  useEffect(() => {
    const target = captureStatus.state === "idle" ? 0 : Math.max(1, Math.min(100, Math.round(captureStatus.progress ?? 1)));
    if (displayedCaptureProgress > target || captureStatus.state === "idle") {
      setDisplayedCaptureProgress(target);
      return;
    }
    if (displayedCaptureProgress >= target) {
      return;
    }
    const timer = window.setInterval(() => {
      setDisplayedCaptureProgress((current) => current >= target ? current : current + 1);
    }, 24);
    return () => window.clearInterval(timer);
  }, [captureStatus.progress, captureStatus.state, displayedCaptureProgress]);

  useEffect(() => {
    const toggleActivity = () => setActivitySidebarOpen((value) => !value);
    window.addEventListener("mio:toggle-activity", toggleActivity);
    return () => window.removeEventListener("mio:toggle-activity", toggleActivity);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("mio:collection-page-state", { detail: true }));
    return () => {
      window.dispatchEvent(new CustomEvent("mio:collection-page-state", { detail: false }));
    };
  }, []);

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
      searchFilters: overrides.searchFilters ?? savedCollectionState.searchFilters,
      qualifiedProductIds: overrides.qualifiedProductIds ?? qualifiedProductIds,
      qualifiedProductReferences: overrides.qualifiedProductReferences ?? qualifiedProductReferences,
      qualifiedProductsInitialized: overrides.qualifiedProductsInitialized ?? qualifiedProductsInitialized,
      qualifiedProductsApproved: overrides.qualifiedProductsApproved ?? qualifiedProductsApproved,
      storeCollectionCandidates: dedupeStoreCollectionCandidates(overrides.storeCollectionCandidates ?? storeCollectionCandidates),
      storeListInitialized: overrides.storeListInitialized ?? storeListInitialized,
      storeListApproved: overrides.storeListApproved ?? storeListApproved,
      savedAt: new Date().toISOString()
    };
  }

  function persistCollectionState(overrides: Partial<CollectionState> = {}) {
    saveCollectionState.mutate(buildCollectionState(overrides));
  }

  async function persistCollectionStateAsync(overrides: Partial<CollectionState> = {}) {
    await saveCollectionState.mutateAsync(buildCollectionState(overrides));
  }

  function updateStoreCollectionCandidates(candidates: StoreCollectionCandidate[]) {
    const nextCandidates = dedupeStoreCollectionCandidates(candidates).slice(0, 50);
    setStoreCollectionCandidates(nextCandidates);
    setStoreListInitialized(true);
    setStoreListApproved(false);
    persistCollectionState({
      storeCollectionCandidates: nextCandidates,
      storeListInitialized: true,
      storeListApproved: false
    });
  }

  const saveEvidence = useMutation({
    mutationFn: apiClient.saveManualEvidence,
    onMutate: (payload) => {
      const actionLabel = typeof payload.metadata?.productDetailSubActionLabel === "string"
        ? payload.metadata.productDetailSubActionLabel
        : payload.label;
      setCaptureStatus({
        message: `Saving ${actionLabel}`,
        state: "working",
        progress: 82
      });
    },
    onSuccess: async (result, payload) => {
      setPreparingEvidenceKey(null);
      const step = steps.find((item) => item.id === payload.stepId) ?? activeStep;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["project-detail", project.id] })
      ]);
      const refreshedDetail = queryClient.getQueryData<ProjectDetailPayload>(["project-detail", project.id]);
      const refreshedStep = refreshedDetail
        ? buildCollectionSteps(project, platform, currentUrl, viewMode, refreshedDetail, storeCollectionCandidates)
            .find((item) => item.id === step.id)
        : undefined;
      const progressionStep = refreshedStep ?? step;
      let nextStoreCollectionCandidates = storeCollectionCandidates;
      const structuredStoreProfile = isRecord(payload.metadata?.structuredStoreProfile)
        ? payload.metadata.structuredStoreProfile
        : undefined;
      const capturedStoreType = normalizeStoreTypeValue(
        typeof structuredStoreProfile?.storeType === "string" ? structuredStoreProfile.storeType : undefined
      );
      if (step.ownerType === "STORE" && step.ownerId && capturedStoreType) {
        nextStoreCollectionCandidates = dedupeStoreCollectionCandidates(storeCollectionCandidates.map((candidate) =>
          candidate.id === step.ownerId ? { ...candidate, storeType: capturedStoreType } : candidate
        ));
        setStoreCollectionCandidates(nextStoreCollectionCandidates);
      }
      const productDetailSubAction = typeof payload.metadata?.productDetailSubAction === "string" ? payload.metadata.productDetailSubAction : undefined;
      const progressKey = stepProgressKey(step, productDetailSubAction);
      const nextCollectedSteps = { ...collectedSteps, [progressKey]: result.assetPath };
      if (productDetailSubAction === "shop-homepage" && step.ownerType === "PRODUCT" && step.ownerId) {
        for (const relatedKey of relatedShopHomepageProgressKeys(step.ownerId, allSteps, projectDetail.data)) {
          nextCollectedSteps[relatedKey] = result.assetPath;
        }
      }
      if (
        productDetailSubAction === "store-homepage" &&
        step.ownerType === "STORE" &&
        refreshedDetail &&
        collectionSubActionCounts(progressionStep, refreshedDetail)["store-details"] > 0
      ) {
        nextCollectedSteps[stepProgressKey(step, "store-details")] = result.assetPath;
        appendLog(setActivityLog, "Store Data was already present in the downloaded homepage HTML, so the duplicate collection action was completed automatically.");
      }
      setPendingCapture(null);
      const productDetailSubActionLabel = typeof payload.metadata?.productDetailSubActionLabel === "string" ? payload.metadata.productDetailSubActionLabel : undefined;
      appendLog(
        setActivityLog,
        `Captured ${step.label}${productDetailSubActionLabel ? ` / ${productDetailSubActionLabel}` : ""}${result.extractedProductCount ? ` and extracted ${result.extractedProductCount} product rows` : ""}.`
      );
      const isStoreRatingAction = productDetailSubAction === "store-rating-negative" || productDetailSubAction === "store-rating-positive";
      const missingActionData = productDetailSubAction
        ? isStoreRatingAction && typeof result.storeRatingCount === "number"
          ? result.storeRatingCount === 0
          : productDetailSubActionEvidenceCount(payload, productDetailSubAction) === 0
        : (["STORE_FEATURED_PRODUCTS", "STORE_BEST_SELLER"].includes(payload.kind) && (result.extractedProductCount ?? 0) === 0) ||
          (payload.kind === "STORE_BANNER" && (result.storeBannerCount ?? 0) === 0);
      if (!missingActionData && step.stage === "PRODUCT_DETAILS" && productDetailSubAction === "media-in-user") {
        nextCollectedSteps[step.id] = result.assetPath;
      }
      if (missingActionData) {
        delete nextCollectedSteps[progressKey];
        if (productDetailSubAction === "shop-homepage" && step.ownerType === "PRODUCT" && step.ownerId) {
          for (const relatedKey of relatedShopHomepageProgressKeys(step.ownerId, allSteps, projectDetail.data)) {
            delete nextCollectedSteps[relatedKey];
          }
        }
        const missingLabel = productDetailSubActionLabel ?? step.label;
        setCaptureStatus({ message: `${missingLabel} not found`, state: "failed", progress: 100 });
        appendLog(setActivityLog, `${missingLabel} returned no matching data. Progress was not marked complete and the collector stayed on the current target.`);
      } else {
        setCaptureStatus({
          message: productDetailSubAction && productDetailSubActionLabel
            ? productDetailCollectionOutcomeMessage(productDetailSubAction, productDetailSubActionLabel, refreshedDetail, step)
            : "Evidence saved",
          state: "done",
          progress: 100
        });
        if (step.stage === "PRODUCT_DETAILS") {
          appendLog(setActivityLog, "Key Product ranking refreshed with the latest PDP metrics.");
        }
      }
      if (!missingActionData && step.stage === "PRODUCT_DETAILS" && productDetailSubAction === "media-in-user") {
        const nextProductTarget = nextProductCollectionTarget(steps, step.ownerId);
        if (nextProductTarget) {
          const nextUrl = nextProductTarget.targetUrl
            ? collectionTargetUrl(nextProductTarget.targetUrl, "PRODUCT_DETAILS")
            : currentUrl;
          try {
            await persistCollectionStateAsync({
              stepAssetPaths: nextCollectedSteps,
              completedStepIds: Object.keys(nextCollectedSteps),
              progressPercent: collectionProgress(allSteps, nextCollectedSteps),
              currentStepId: nextProductTarget.stepId,
              browserUrl: nextUrl,
              viewMode,
              storeCollectionCandidates: nextStoreCollectionCandidates
            });
          } catch {
            setCaptureStatus({ message: "Media saved, but progress could not be persisted", state: "failed", progress: 100 });
            return;
          }
          setCollectedSteps(nextCollectedSteps);
          setActiveStepIndex(nextProductTarget.stepIndex);
          setActiveSubActionId(nextProductTarget.firstActionId);
          if (nextProductTarget.targetUrl) navigateTo(nextUrl);
          return;
        }
        try {
          await completeCurrentStage(nextCollectedSteps, {
            storeCollectionCandidates: nextStoreCollectionCandidates
          });
        } catch {
          setCaptureStatus({ message: "Media saved, but Part 2 completion could not be persisted", state: "failed", progress: 100 });
          return;
        }
        setCollectedSteps(nextCollectedSteps);
        return;
      }

      setCollectedSteps(nextCollectedSteps);
      const completedStageSteps = steps.every((item) => isCollectionStepComplete(item, nextCollectedSteps));
      if (step.stage === "EVALUATION_KEY_STORE" && completedStageSteps) {
        await completeCurrentStage(nextCollectedSteps, { storeCollectionCandidates: nextStoreCollectionCandidates });
        return;
      }
      const advanceMode = collectionAdvanceMode(step.stage, productDetailSubAction, !missingActionData);
      if (advanceMode === "stay") {
        persistCollectionState({
          stepAssetPaths: nextCollectedSteps,
          completedStepIds: Object.keys(nextCollectedSteps),
          progressPercent: collectionProgress(allSteps, nextCollectedSteps),
          currentStepId: step.id,
          browserUrl: currentUrl,
          viewMode,
          storeCollectionCandidates: nextStoreCollectionCandidates
        });
        return;
      }

      if (advanceMode === "next-action") {
        const actionIds = (progressionStep.subActions ?? []).map((action) => action.id);
        const completedActionIds = new Set(actionIds.filter((actionId) => Boolean(nextCollectedSteps[stepProgressKey(step, actionId)])));
        const nextActionId = nextPendingCollectionActionId(actionIds, productDetailSubAction, completedActionIds);
        if (nextActionId) {
          const nextAction = progressionStep.subActions?.find((action) => action.id === nextActionId);
          setActiveSubActionId(nextActionId);
          if (nextAction?.targetUrl) {
            navigateTo(collectionTargetUrl(nextAction.targetUrl, step.stage));
          }
          persistCollectionState({
            stepAssetPaths: nextCollectedSteps,
            completedStepIds: Object.keys(nextCollectedSteps),
            progressPercent: collectionProgress(allSteps, nextCollectedSteps),
            currentStepId: step.id,
            browserUrl: nextAction?.targetUrl ? collectionTargetUrl(nextAction.targetUrl, step.stage) : currentUrl,
            viewMode,
            storeCollectionCandidates: nextStoreCollectionCandidates
          });
          return;
        }
        if (step.stage === "PRODUCT_DETAILS") {
          persistCollectionState({
            stepAssetPaths: nextCollectedSteps,
            completedStepIds: Object.keys(nextCollectedSteps),
            progressPercent: collectionProgress(allSteps, nextCollectedSteps),
            currentStepId: step.id,
            browserUrl: currentUrl,
            viewMode,
            storeCollectionCandidates: nextStoreCollectionCandidates
          });
          return;
        }
      }

      const nextStepIndex = Math.min(activeStepIndex + 1, steps.length - 1);
      setActiveStepIndex(nextStepIndex);
      setActiveSubActionId(undefined);
      const nextStep = steps[nextStepIndex];
      if (nextStep && nextStep.id !== step.id && nextStep.targetUrl) {
        navigateTo(collectionTargetUrl(nextStep.targetUrl, nextStep.stage));
      }
      if (step.id === "keyword-relevance") {
        const topSalesStep = steps.find((item) => item.id === "keyword-top-sales");
        if (topSalesStep?.targetUrl) {
          navigateTo(topSalesStep.targetUrl);
        }
      }
      persistCollectionState({
        stepAssetPaths: nextCollectedSteps,
        completedStepIds: Object.keys(nextCollectedSteps),
        progressPercent: collectionProgress(allSteps, nextCollectedSteps),
        currentStepId: nextStep?.id ?? step.id,
        storeCollectionCandidates: nextStoreCollectionCandidates
      });
    },
    onError: (error) => {
      setPreparingEvidenceKey(null);
      setCaptureStatus({ message: "Evidence save failed", state: "failed", progress: 100 });
      appendLog(setActivityLog, error instanceof Error ? error.message : "Could not capture the current step.");
    }
  });

  const resetEvidence = useMutation({
    mutationFn: apiClient.resetManualEvidence,
    onError: (error) => {
      setCaptureStatus({ message: "Evidence reset failed", state: "failed", progress: 100 });
      appendLog(setActivityLog, error instanceof Error ? error.message : "Could not reset the collected evidence.");
    }
  });

  async function resetCollectedEvidence(step: CollectionStep, subActionId?: string) {
    const action = subActionId ? step.subActions?.find((item) => item.id === subActionId) : undefined;
    const label = action?.label ?? step.label;
    setCaptureStatus({ message: `Resetting ${label}`, state: "working", progress: 20 });
    const nextCollectedSteps = { ...collectedSteps };
    delete nextCollectedSteps[stepProgressKey(step, subActionId)];
    if (preservesStoreEvidenceDuringReset(subActionId) && step.ownerType === "STORE") {
      try {
        await persistCollectionStateAsync({
          stepAssetPaths: nextCollectedSteps,
          completedStepIds: Object.keys(nextCollectedSteps),
          progressPercent: collectionProgress(allSteps, nextCollectedSteps),
          currentStepId: step.id
        });
      } catch {
        setCaptureStatus({ message: `${label} reset failed`, state: "failed", progress: 100 });
        return;
      }
      setCollectedSteps(nextCollectedSteps);
      if (subActionId) {
        selectSubAction(subActionId);
      }
      setCaptureStatus({ message: `${label} ready to refresh`, state: "done", progress: 100 });
      appendLog(setActivityLog, `${label} is ready to collect again. The last valid result remains available until the refresh succeeds.`);
      return;
    }
    await resetEvidence.mutateAsync({
      projectId: project.id,
      stepId: step.id,
      ownerType: step.ownerType,
      ownerId: step.ownerId,
      subActionId,
      kind: step.kind
    });
    if (subActionId === "shop-homepage" && step.ownerType === "PRODUCT" && step.ownerId) {
      for (const relatedKey of relatedShopHomepageProgressKeys(step.ownerId, allSteps, projectDetail.data)) {
        delete nextCollectedSteps[relatedKey];
      }
    }
    if (subActionId) {
      selectSubAction(subActionId);
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["project-detail", project.id] })
    ]);
    await persistCollectionStateAsync({
      stepAssetPaths: nextCollectedSteps,
      completedStepIds: Object.keys(nextCollectedSteps),
      progressPercent: collectionProgress(allSteps, nextCollectedSteps),
      currentStepId: step.id
    });
    setCollectedSteps(nextCollectedSteps);
    setCaptureStatus({ message: `${label} ready to collect again`, state: "done", progress: 100 });
    appendLog(setActivityLog, `Reset ${label}.`);
  }

  const attachFileEvidence = useMutation({
    onMutate: (step) => {
      setCaptureStatus({ message: `Attaching ${step.label}`, state: "working", progress: 10 });
    },
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
      setCaptureStatus({ message: "Evidence saved", state: "done" });
      persistCollectionState({
        stepAssetPaths: nextCollectedSteps,
        completedStepIds: Object.keys(nextCollectedSteps),
        progressPercent: collectionProgress(allSteps, nextCollectedSteps),
        currentStepId: steps[nextStepIndex]?.id ?? step.id
      });
    },
    onError: (error) => {
      setCaptureStatus({ message: "Evidence save failed", state: "failed", progress: 100 });
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
    const nextStep = stageSteps[nextIndex];
    const nextSubAction =
      nextStep?.subActions?.find(
        (action) => !collectedSteps[stepProgressKey(nextStep, action.id)],
      ) ?? nextStep?.subActions?.[0];
    setActiveStage(stage);
    const nextViewMode = viewModeForCollectionStage(stage, viewMode);
    setActiveStepIndex(nextIndex);
    setActiveSubActionId(nextSubAction?.id);
    setReviewingKeyProducts(false);
    const showEvaluation = stage === "EVALUATION_KEY_STORE";
    setReviewingEvaluation(showEvaluation);
    if (showEvaluation) {
      setExpanded(false);
    }
    persistCollectionState({
      stage,
      stageLabel: collectionStageLabel(stage),
      currentStepId: nextStep?.id,
      browserUrl: currentUrl,
      viewMode: nextViewMode
    });
  }

  function selectSubAction(actionId: string) {
    setActiveSubActionId(actionId);
  }

  function advanceGuidedCollection() {
    if (!activeStep) {
      return;
    }
    const actions = activeStep.subActions ?? [];
    if (actions.length > 0) {
      const completedActionIds = new Set(actions
        .filter((action) => (activeSubActionStates[action.id] ?? "pending") !== "pending")
        .map((action) => action.id));
      const nextActionId = nextPendingCollectionActionId(actions.map((action) => action.id), activeSubAction?.id, completedActionIds);
      const nextPendingAction = actions.find((action) => action.id === nextActionId);
      if (nextPendingAction) {
        selectSubAction(nextPendingAction.id);
        if (activeStage === "EVALUATION_KEY_STORE" && (nextPendingAction.targetUrl ?? activeStep.targetUrl)) {
          navigateTo(collectionTargetUrl(nextPendingAction.targetUrl ?? activeStep.targetUrl!, activeStep.stage));
        }
        return;
      }
      if (activeStage === "PRODUCT_DETAILS" && activeSubAction?.id !== "shop-homepage") {
        return;
      }
      const nextStepIndex = Math.min(activeStepIndex + 1, steps.length - 1);
      const nextStep = steps[nextStepIndex];
      setActiveStepIndex(nextStepIndex);
      setActiveSubActionId(undefined);
      if (nextStep && nextStep.id !== activeStep.id && nextStep.targetUrl) {
        navigateTo(collectionTargetUrl(nextStep.targetUrl, nextStep.stage));
      }
      return;
    }
    setActiveStepIndex((current) => Math.min(steps.length - 1, current + 1));
  }

  function retreatGuidedCollection() {
    if (!activeStep) {
      return;
    }
    const actionIds = (activeStep.subActions ?? []).map((action) => action.id);
    const previousActionId = previousCollectionActionId(actionIds, activeSubAction?.id);
    if (previousActionId) {
      selectSubAction(previousActionId);
      const previousAction = activeStep.subActions?.find((action) => action.id === previousActionId);
      if (previousAction?.targetUrl) {
        navigateTo(collectionTargetUrl(previousAction.targetUrl, activeStep.stage));
      }
      return;
    }
    const previousStepIndex = Math.max(0, activeStepIndex - 1);
    const previousStep = steps[previousStepIndex];
    setActiveStepIndex(previousStepIndex);
    const previousStepAction = previousStep?.subActions?.at(-1);
    setActiveSubActionId(previousStepAction?.id);
    if (previousStepAction?.targetUrl ?? previousStep?.targetUrl) {
      navigateTo(collectionTargetUrl(previousStepAction?.targetUrl ?? previousStep!.targetUrl!, previousStep?.stage ?? activeStage));
    }
  }

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) {
      return;
    }
    applyWebviewShadowFrameLayout(webview);
    const executeInWebview = webview.executeJavaScript?.bind(webview);
    let interactionBaseline = 0;
    let interactionPollBusy = false;
    const installInteractionProbe = async () => {
      if (!executeInWebview) {
        return;
      }
      const installedAt = await executeInWebview(`
        (() => {
          const marker = "__mioLastBrowserInteractionAt";
          window[marker] = Date.now();
          if (!window.__mioBrowserInteractionProbeInstalled) {
            const mark = () => { window[marker] = Date.now(); };
            document.addEventListener("click", mark, true);
            document.addEventListener("input", mark, true);
            document.addEventListener("change", mark, true);
            document.addEventListener("keydown", mark, true);
            window.__mioBrowserInteractionProbeInstalled = true;
          }
          return window[marker];
        })()
      `).catch(() => 0);
      interactionBaseline = Number(installedAt) || 0;
    };
    const installMediaAutoplayGuard = async () => {
      if (!executeInWebview) {
        return;
      }
      await executeInWebview(`
        (() => {
          const intentMarker = "__mioLastMediaIntentAt";
          const mediaElements = (root) => {
            if (!root) return [];
            const elements = [];
            if (root instanceof HTMLMediaElement) elements.push(root);
            if (root.querySelectorAll) elements.push(...root.querySelectorAll("video, audio"));
            return elements;
          };
          const prepareMedia = (root, pauseNow = true) => {
            for (const media of mediaElements(root)) {
              media.autoplay = false;
              media.removeAttribute("autoplay");
              if (!media.hasAttribute("preload") || media.preload === "auto") media.preload = "metadata";
              if (pauseNow && !media.paused) media.pause();
            }
          };
          prepareMedia(document, true);
          if (!window.__mioMediaAutoplayGuardInstalled) {
            window[intentMarker] = 0;
            const markIntent = () => { window[intentMarker] = Date.now(); };
            document.addEventListener("pointerdown", markIntent, true);
            document.addEventListener("keydown", markIntent, true);
            document.addEventListener("play", (event) => {
              const media = event.target;
              if (!(media instanceof HTMLMediaElement)) return;
              if (Date.now() - Number(window[intentMarker] || 0) > 1500) media.pause();
            }, true);
            const observer = new MutationObserver((records) => {
              for (const record of records) {
                if (record.type === "attributes") prepareMedia(record.target, true);
                for (const node of record.addedNodes) prepareMedia(node, true);
              }
            });
            observer.observe(document.documentElement, {
              childList: true,
              subtree: true,
              attributes: true,
              attributeFilter: ["autoplay"]
            });
            window.__mioMediaAutoplayGuardInstalled = true;
          }
          return true;
        })()
      `).catch(() => false);
    };
    const pollInteraction = async () => {
      if (interactionPollBusy || !executeInWebview) {
        return;
      }
      interactionPollBusy = true;
      const latestValue = await executeInWebview("window.__mioLastBrowserInteractionAt || 0").catch(() => 0);
      const latest = Number(latestValue) || 0;
      interactionPollBusy = false;
      if (latest > interactionBaseline && interactionBaseline > 0) {
        interactionBaseline = latest;
        setBrowserInteractionToken((value) => value + 1);
      }
    };
    const updateUrl = (event?: WebviewNavigationEvent) => {
      applyWebviewShadowFrameLayout(webview);
      const nextUrl = event?.url ?? event?.validatedURL ?? webview.getURL?.() ?? currentUrl;
      if (nextUrl) {
        setCurrentUrl(nextUrl);
        setAddress(nextUrl);
        onBrowserUrlChange(nextUrl);
      }
    };
    const ready = (event?: WebviewNavigationEvent) => {
      updateUrl(event);
      setLoadState("ready");
      void installInteractionProbe();
      void installMediaAutoplayGuard();
    };
    const loading = () => {
      applyWebviewShadowFrameLayout(webview);
      setLoadState("loading");
    };
    const failed = (event: Event) => {
      const failure = event as WebviewNavigationEvent;
      if (failure.errorCode === -3) {
        return;
      }
      setLoadState("failed");
      appendLog(setActivityLog, "The browser could not load this page. You can reload or navigate manually.");
    };
    webview.addEventListener("did-start-loading", loading);
    webview.addEventListener("dom-ready", ready);
    webview.addEventListener("did-finish-load", ready);
    webview.addEventListener("did-stop-loading", ready);
    webview.addEventListener("did-navigate", updateUrl as EventListener);
    webview.addEventListener("did-navigate-in-page", ready as EventListener);
    webview.addEventListener("did-fail-load", failed);
    const interactionTimer = window.setInterval(() => void pollInteraction(), 350);
    return () => {
      webview.removeEventListener("did-start-loading", loading);
      webview.removeEventListener("dom-ready", ready);
      webview.removeEventListener("did-finish-load", ready);
      webview.removeEventListener("did-stop-loading", ready);
      webview.removeEventListener("did-navigate", updateUrl as EventListener);
      webview.removeEventListener("did-navigate-in-page", ready as EventListener);
      webview.removeEventListener("did-fail-load", failed);
      window.clearInterval(interactionTimer);
    };
  }, [currentUrl, onBrowserUrlChange]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) {
      return;
    }

    let disposed = false;
    const sync = () => {
      if (!disposed) {
        applyWebviewShadowFrameLayout(webview);
      }
    };
    const animationFrame = window.requestAnimationFrame(sync);
    const timers = [0, 50, 250, 1000].map((delay) => window.setTimeout(sync, delay));
    const interval = window.setInterval(sync, 250);
    const observer = new MutationObserver(sync);

    const attachObserver = () => {
      if (!disposed && webview.shadowRoot) {
        observer.observe(webview.shadowRoot, {
          childList: true,
          subtree: true
        });
        sync();
      }
    };
    attachObserver();
    timers.push(window.setTimeout(attachObserver, 100));

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearInterval(interval);
      observer.disconnect();
    };
  }, [expanded, project.id, viewMode]);

  function navigateTo(url: string) {
    const nextUrl = normalizeUrl(url);
    setAddress(nextUrl);
    setCurrentUrl(nextUrl);
    onBrowserUrlChange(nextUrl);
    void webviewRef.current?.loadURL?.(nextUrl).catch((error: unknown) => {
      appendLog(setActivityLog, error instanceof Error ? error.message : "Navigation failed.");
    });
  }

  function collectionTargetUrl(url: string, stage: CollectionStage): string {
    if (platform !== "SHOPEE_ID" || stage !== "EVALUATION_KEY_STORE") {
      return url;
    }
    return viewMode === "mobile" ? toMobileUrl(url) : toDesktopUrl(url);
  }

  function switchBrowserViewMode(nextViewMode: PlatformViewMode) {
    const nextUrl = nextViewMode === "mobile"
      ? toMobileUrl(currentUrl)
      : toDesktopUrl(currentUrl);
    setViewMode(nextViewMode);
    setAddress(nextUrl);
    setCurrentUrl(nextUrl);
    onBrowserUrlChange(nextUrl);
    persistCollectionState({
      viewMode: nextViewMode,
      browserUrl: nextUrl
    });
    void webviewRef.current?.loadURL?.(nextUrl).catch((error: unknown) => {
      appendLog(setActivityLog, error instanceof Error ? error.message : "Could not switch browser view.");
    });
  }

  function goToAddress() {
    if (address.trim().length === 0) {
      return;
    }
    navigateTo(address);
  }

  function applyZoom(nextZoom: number) {
    const clamped = Math.max(0.4, Math.min(4, Number(nextZoom.toFixed(2))));
    setZoomFactor(clamped);
    webviewRef.current?.setZoomFactor?.(clamped);
  }

  function saveProgress() {
    persistCollectionState();
    appendLog(setActivityLog, "Collection progress saved. You can close the browser and continue from this project later.");
  }

  async function completeCurrentStage(
    nextCollectedSteps = collectedSteps,
    stateOverrides: Partial<CollectionState> = {}
  ) {
    const nextStage = nextCollectionStage(activeStage);
    const nextStageCompleted = {
      ...stageCompleted,
      [activeStage]: true
    };
    if (nextStage) {
      const enteringEvaluation = nextStage === "EVALUATION_KEY_STORE";
      await persistCollectionStateAsync({
        ...stateOverrides,
        stage: nextStage,
        stageLabel: collectionStageLabel(nextStage),
        stageCompleted: nextStageCompleted,
        stepAssetPaths: nextCollectedSteps,
        completedStepIds: Object.keys(nextCollectedSteps),
        progressPercent: collectionProgress(allSteps, nextCollectedSteps),
        currentStepId: allSteps.find((step) => step.stage === nextStage)?.id,
        viewMode
      });
      setStageCompleted(nextStageCompleted);
      setActiveStage(nextStage);
      setActiveStepIndex(0);
      setReviewingEvaluation(enteringEvaluation);
      if (enteringEvaluation) setExpanded(false);
      appendLog(setActivityLog, `${collectionStageLabel(activeStage)} completed. Continue with ${collectionStageLabel(nextStage)}.`);
      if (activeStage === "PRODUCT_DETAILS" && enteringEvaluation) {
        appendLog(setActivityLog, "Opened Key Store Page List automatically. Review the stores, then start collection.");
      }
      return;
    }
    await persistCollectionStateAsync({
      ...stateOverrides,
      stageCompleted: nextStageCompleted,
      stepAssetPaths: nextCollectedSteps,
      completedStepIds: Object.keys(nextCollectedSteps),
      progressPercent: 100,
      currentStepId: activeStep?.id
    });
    setStageCompleted(nextStageCompleted);
    appendLog(setActivityLog, "Shopee collection flow marked complete. Review the project inspector before generating the report.");
    window.setTimeout(() => onCollectionCompleted?.(project.id), 500);
  }

  function openKeyProductTableReview() {
    setExpanded(false);
    setReviewingKeyProducts(true);
    if (qualifiedProductsInitialized) return;
    const generated = qualifiedProductPool.slice(0, 10);
    const generatedIds = generated.map((product) => product.id);
    const generatedReferences = generated.map((product) => createQualifiedProductReference(product));
    setQualifiedProductIds(generatedIds);
    setQualifiedProductReferences(generatedReferences);
    setQualifiedProductsInitialized(true);
    setQualifiedProductsApproved(false);
    persistCollectionState({
      qualifiedProductIds: generatedIds,
      qualifiedProductReferences: generatedReferences,
      qualifiedProductsInitialized: true,
      qualifiedProductsApproved: false
    });
    appendLog(setActivityLog, `Generated and saved ${generatedIds.length} Product Qualified targets using the canonical sales-and-relevance ranking.`);
  }

  function openEvaluationReview() {
    setExpanded(false);
    setReviewingEvaluation(true);
    appendLog(setActivityLog, "Opened Key Store Page List in the collection workspace.");
  }

  function qualifiedSelectionPool(): ProjectProductEvidence[] {
    const byId = new Map<string, ProjectProductEvidence>();
    for (const product of projectDetail.data?.products ?? []) byId.set(product.id, product);
    for (const product of availableKeyProductPool) byId.set(product.id, product);
    return Array.from(byId.values());
  }

  function applyQualifiedProductSelection(
    products: ProjectProductEvidence[],
    manuallyAddedProducts: ProjectProductEvidence[] = []
  ) {
    const pool = qualifiedSelectionPool();
    const existingManualProducts = resolveQualifiedProductReferences(
      pool,
      qualifiedProductReferences.filter((reference) => reference.manuallyAdded)
    );
    const manualIdentities = new Set(
      [...existingManualProducts, ...manuallyAddedProducts].map(stableProductIdentity)
    );
    const ranked = rankSelectedQualifiedProducts(products, manualIdentities).slice(0, 20);
    const nextIds = ranked.map((product) => product.id);
    const nextReferences = ranked.map((product) =>
      createQualifiedProductReference(product, manualIdentities.has(stableProductIdentity(product)))
    );
    setQualifiedProductIds(nextIds);
    setQualifiedProductReferences(nextReferences);
    setQualifiedProductsInitialized(true);
    setQualifiedProductsApproved(false);
    void persistCollectionStateAsync({
      qualifiedProductIds: nextIds,
      qualifiedProductReferences: nextReferences,
      qualifiedProductsInitialized: true,
      qualifiedProductsApproved: false
    }).catch(() => undefined);
  }

  function removeQualifiedProduct(productId: string) {
    applyQualifiedProductSelection(selectedKeyProducts.filter((product) => product.id !== productId));
  }

  function addQualifiedProduct(productId: string) {
    const product = qualifiedSelectionPool().find((candidate) => candidate.id === productId);
    if (!product || selectedKeyProducts.some((current) => sameQualifiedProduct(current, product))) return;
    if (selectedKeyProducts.length >= 20) {
      setCaptureStatus({ message: "Maximum 20 qualified products", state: "failed", progress: 100 });
      return;
    }
    applyQualifiedProductSelection([...selectedKeyProducts, product], [product]);
  }

  function excludeQualifiedProducts(productIds: string[]) {
    const excluded = new Set(productIds);
    applyQualifiedProductSelection(selectedKeyProducts.filter((product) => !excluded.has(product.id)));
  }

  function addQualifiedProducts(productIds: string[]) {
    const requested = new Set(productIds);
    const additions = qualifiedSelectionPool().filter((product) =>
      requested.has(product.id) && !selectedKeyProducts.some((current) => sameQualifiedProduct(current, product))
    );
    const remainingSlots = Math.max(0, 20 - selectedKeyProducts.length);
    if (additions.length > remainingSlots) {
      setCaptureStatus({ message: "Maximum 20 qualified products", state: "failed", progress: 100 });
    }
    const accepted = additions.slice(0, remainingSlots);
    applyQualifiedProductSelection([...selectedKeyProducts, ...accepted], accepted);
  }

  async function approveQualifiedProducts() {
    if (selectedKeyProducts.length === 0) {
      setCaptureStatus({ message: "Select at least one qualified product", state: "failed", progress: 100 });
      return;
    }
    const references = selectedKeyProducts.map((product) => {
      const savedReference = qualifiedProductReferences.find((reference) =>
        resolveQualifiedProductReferences([product], [reference]).length > 0
      );
      return createQualifiedProductReference(product, Boolean(savedReference?.manuallyAdded));
    });
    const ids = selectedKeyProducts.map((product) => product.id);
    try {
      await persistCollectionStateAsync({
      qualifiedProductIds: ids,
      qualifiedProductReferences: references,
      qualifiedProductsInitialized: true,
      qualifiedProductsApproved: true
      });
    } catch {
      setCaptureStatus({ message: "Could not save qualified products", state: "failed", progress: 100 });
      return;
    }
    setQualifiedProductIds(ids);
    setQualifiedProductReferences(references);
    setQualifiedProductsInitialized(true);
    setQualifiedProductsApproved(true);
    setCaptureStatus({
      message: `${selectedKeyProducts.length} qualified products approved`,
      state: "done",
      progress: 100
    });
    appendLog(setActivityLog, `${selectedKeyProducts.length} qualified products approved and saved.`);
  }

  async function startProductDetailCollection() {
    if (!qualifiedProductsApproved || selectedKeyProducts.length === 0) {
      setCaptureStatus({ message: "Approve Product Qualified before continuing", state: "failed", progress: 100 });
      return;
    }
    const processStep = allSteps.find((step) => step.id === "key-product-table");
    const nextCollectedSteps = processStep
      ? { ...collectedSteps, [processStep.id]: "processed:key-product-table" }
      : collectedSteps;
    const ids = selectedKeyProducts.map((product) => product.id);
    const references = selectedKeyProducts.map((product) => {
      const current = qualifiedProductReferences.find((reference) => resolveQualifiedProductReferences([product], [reference]).length > 0);
      return createQualifiedProductReference(product, Boolean(current?.manuallyAdded));
    });
    try {
      await persistCollectionStateAsync({
        stepAssetPaths: nextCollectedSteps,
        qualifiedProductIds: ids,
        qualifiedProductReferences: references,
        qualifiedProductsInitialized: true,
        qualifiedProductsApproved: true
      });
      await completeCurrentStage(nextCollectedSteps, {
        qualifiedProductIds: ids,
        qualifiedProductReferences: references,
        qualifiedProductsInitialized: true,
        qualifiedProductsApproved: true
      });
    } catch {
      setCaptureStatus({ message: "Could not save before opening Part 2", state: "failed", progress: 100 });
      return;
    }
    setCollectedSteps(nextCollectedSteps);
    setReviewingKeyProducts(false);
  }

  async function startKeyStoreCollection() {
    const detail = projectDetail.data;
    if (!detail) {
      setCaptureStatus({ message: "Project evidence is still loading", state: "failed", progress: 100 });
      return;
    }
    const candidates = dedupeStoreCollectionCandidates(storeCollectionCandidates).slice(0, 50);
    if (candidates.length === 0) {
      setCaptureStatus({ message: "Add at least one store before starting collection", state: "failed", progress: 100 });
      return;
    }
    const nextAllSteps = allSteps;
    const stageSteps = nextAllSteps.filter((step) => step.stage === "EVALUATION_KEY_STORE");
    const nextCollectedSteps: Record<string, string> = { ...collectedSteps };
    let reusedHomepageCount = 0;
    for (const candidate of candidates) {
      const storeStep = stageSteps.find((step) => step.ownerId === candidate.id);
      const reusableAsset = reusableKeyStoreHomepageAsset(detail, candidate.storeUrl);
      if (storeStep && reusableAsset) {
        nextCollectedSteps[stepProgressKey(storeStep, "store-homepage")] = reusableAsset.path;
        reusedHomepageCount += 1;
      }
    }
    const nextIndex = Math.max(0, stageSteps.findIndex((step) => !isCollectionStepComplete(step, nextCollectedSteps)));
    const nextStep = stageSteps[nextIndex];
    const nextAction = nextStep?.subActions?.find((action) => !nextCollectedSteps[stepProgressKey(nextStep, action.id)]);
    try {
      await persistCollectionStateAsync({
        stage: "EVALUATION_KEY_STORE",
        viewMode,
        storeCollectionCandidates: candidates,
        storeListInitialized: true,
        storeListApproved: true,
        stepAssetPaths: nextCollectedSteps,
        completedStepIds: Object.keys(nextCollectedSteps),
        progressPercent: collectionProgress(nextAllSteps, nextCollectedSteps),
        currentStepId: nextStep?.id
      });
    } catch {
      setCaptureStatus({ message: "Could not save Store List", state: "failed", progress: 100 });
      return;
    }
    setStoreCollectionCandidates(candidates);
    setStoreListInitialized(true);
    setStoreListApproved(true);
    setCollectedSteps(nextCollectedSteps);
    setReviewingEvaluation(false);
    setActiveStepIndex(nextIndex);
    setActiveSubActionId(nextAction?.id);
    if (nextAction?.targetUrl ?? nextStep?.targetUrl) {
      navigateTo(collectionTargetUrl(nextAction?.targetUrl ?? nextStep!.targetUrl!, "EVALUATION_KEY_STORE"));
    }
    const nextStepLabel = stageSteps[nextIndex]?.label ?? "Store evidence";
    setCaptureStatus({
      message: `${candidates.length} stores ready${reusedHomepageCount ? `, ${reusedHomepageCount} homepages reused` : ""}`,
      state: "done",
      progress: 100
    });
    appendLog(setActivityLog, `Multi-store collection started for ${candidates.length} stores. Continue with ${nextStepLabel}.`);
  }

  async function saveStoreList() {
    try {
      await persistCollectionStateAsync({
        storeCollectionCandidates,
        storeListInitialized: true,
        storeListApproved: false
      });
      setCaptureStatus({ message: `${storeCollectionCandidates.length} stores saved`, state: "done", progress: 100 });
    } catch {
      setCaptureStatus({ message: "Could not save Store List", state: "failed", progress: 100 });
    }
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
    void completeCurrentStage();
  }

  async function captureAndSaveEvidence(step: CollectionStep, subAction?: CollectionSubAction) {
    const progressKey = stepProgressKey(step, subAction?.id);
    const actionLabel = subAction?.label ?? step.label;
    setPreparingEvidenceKey(progressKey);
    setCaptureStatus({
      message: subAction
        ? subAction.mode === "download" ? `Downloading ${actionLabel}` : `Collecting ${actionLabel}`
        : `Preparing ${actionLabel}`,
      state: "working",
      progress: 1
    });
    try {
      appendLog(setActivityLog, `Capturing rendered page snapshot for ${subAction ? `${step.label} / ${subAction.label}` : step.label}...`);
      const payload = await buildManualEvidencePayload(step, subAction);
      if ((!subAction || subAction.mode === "screenshot") && !isDataOnlyEvidenceStep(step, subAction)) {
        setPendingCapture({
          payload,
          stepLabel: subAction ? `${step.label} / ${subAction.label}` : step.label
        });
        setPreparingEvidenceKey(null);
        setCaptureStatus({ message: "Review screenshot before saving", state: "working", progress: 72 });
        appendLog(setActivityLog, "Review the screenshot, crop if needed, then save the evidence.");
        return;
      }
      setCaptureStatus({
        message: subAction
          ? subAction.mode === "download" ? `Downloading ${subAction.label}` : `Collecting ${subAction.label}`
          : `Collecting ${step.label}`,
        state: "working",
        progress: 72
      });
      appendLog(setActivityLog, `Saving ${subAction?.label ?? step.label} data from the current page.`);
      saveEvidence.mutate(payload);
    } catch (error) {
      setPreparingEvidenceKey(null);
      setCaptureStatus({ message: "Capture failed", state: "failed", progress: 100 });
      appendLog(setActivityLog, error instanceof Error ? error.message : "Could not prepare rendered page snapshot.");
    }
  }

  async function buildManualEvidencePayload(step: CollectionStep, subAction?: CollectionSubAction): Promise<ManualEvidencePayload> {
    const webview = webviewRef.current;
    if (!webview?.capturePage) {
      throw new Error("The embedded browser cannot capture this page in the current runtime.");
    }
    const actionLabel = subAction?.label ?? step.label;
    const captureMode = subAction?.captureMode ?? step.captureMode ?? "full-page";
    const targetSelector = subAction?.targetSelector ?? step.targetSelector;
    const extractionSelector = targetSelector;
    const captureStrategy = subAction?.captureStrategy ?? step.captureStrategy ?? "selector";
    const dataOnlyEvidence = isDataOnlyEvidenceStep(step, subAction);
    const evidenceKind = subActionEvidenceKind(step, subAction);
    if (evidenceRequiresProductRows(evidenceKind)) {
      setCaptureStatus({ message: "Waiting for marketplace product rows", state: "working", progress: 10 });
      await waitForRenderedProductRows(webview, targetSelector, actionLabel);
    }
    setCaptureStatus({
      message: dataOnlyEvidence
        ? "Collecting page data"
        : targetSelector
        ? "Capturing target section"
        : captureMode === "viewport" ? "Capturing visible viewport" : "Capturing full page screenshot",
      state: "working",
      progress: 18
    });
    const screenshot = dataOnlyEvidence
      ? DATA_ONLY_EVIDENCE_IMAGE
      : targetSelector
        ? captureStrategy === "top-through-selector"
          ? await captureTopThroughElementScreenshot(webview, targetSelector)
          : await captureElementScreenshot(webview, targetSelector)
        : captureMode === "viewport"
          ? await captureViewportScreenshot(webview)
          : await captureFullPageScreenshot(webview);
    const sourceUrl = webview.getURL?.() ?? currentUrl;
    setCaptureStatus({
      message: dataOnlyEvidence ? "Downloading store HTML" : "Downloading HTML from #main",
      state: "working",
      progress: 45
    });
    const extractionTimeoutMs = dataOnlyEvidence ? 32_000 : 20_000;
    const snapshot = await withTimeout(
          extractRenderedPageSnapshot(webview, extractionSelector, {
            includeHtml: true,
            viewMode,
            requestedStoreRating: typeof subAction?.metadata?.requestedRating === "number"
              ? subAction.metadata.requestedRating
              : typeof step.metadata?.requestedRating === "number"
                ? step.metadata.requestedRating
              : undefined
          }),
          extractionTimeoutMs,
          "The store HTML took too long to hydrate. Keep the target section visible, then try Collect Data again."
        )
      .then((value) => {
        setCaptureStatus({
          message: value.html ? "HTML download done" : "HTML download failed",
          state: value.html ? "done" : "failed",
          actionLabel: value.html ? undefined : "Download HTML",
          progress: value.html ? 68 : 100
        });
        return value;
      })
      .catch((error: unknown) => {
        setCaptureStatus({ message: "HTML download failed", state: "failed", actionLabel: "Download HTML", progress: 100 });
        if (evidenceRequiresProductRows(evidenceKind)) {
          const reason = error instanceof Error ? error.message : "The rendered page could not be read.";
          throw new Error(`${actionLabel} could not fetch product rows. ${reason}`);
        }
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
          storeProfile: {
            categories: [],
            ratingSamples: [],
            bannerUrls: []
          },
          storeDecorationImages: []
        };
      });
    assertEvidenceHasProductRows(evidenceKind, snapshot.products.length, actionLabel);
    const structuredProductDetail = scopeProductDetailSnapshot(snapshot.productDetail, subAction?.id);
    return {
      projectId: project.id,
      stepId: step.id,
      label: step.label,
      kind: evidenceKind,
      ownerType: step.ownerType,
      ownerId: step.ownerId,
      sourceUrl: sourceUrl === "about:blank" ? undefined : sourceUrl,
      imageDataUrl: screenshot.imageDataUrl,
      width: screenshot.width,
      height: screenshot.height,
      note: step.instruction,
      pageHtml: snapshot.html,
      visibleText: snapshot.visibleText,
      pagePdfDataUrl: undefined,
      extractedProducts: snapshot.products,
      metadata: {
        ...step.metadata,
        ...subAction?.metadata,
        section: step.section,
        keyword: project.keyword,
        productCategory,
        marketplace: platform,
        viewMode,
        zoomFactor,
        dataOnlyEvidence,
        screenshotMode: captureMode,
        captureStrategy,
        actualScreenshotMode: screenshot.mode,
        screenshotClipped: screenshot.clipped,
        targetSelector,
        productDetailSubsteps: step.substeps,
        productDetailSubAction: subAction?.id,
        productDetailSubActionLabel: subAction?.label,
        productDetailSubActionMode: subAction?.mode,
        syncProductDetail: step.stage === "PRODUCT_DETAILS",
        structuredProductDetail,
        structuredStoreProfile: snapshot.storeProfile,
        storeDecorationImages: snapshot.storeDecorationImages,
        extractedText: snapshot.visibleText,
        extractedProductCount: snapshot.products.length,
        extractionMode: dataOnlyEvidence ? "hydrated-html" : "page-html",
        capturedAt: new Date().toISOString(),
      }
    };
  }

  async function downloadCurrentHtml() {
    const webview = webviewRef.current;
    if (!webview) {
      appendLog(setActivityLog, "The embedded browser is not ready for HTML download.");
      return;
    }
    setCaptureStatus({ message: "Downloading HTML from #main", state: "working", progress: 12 });
    const snapshot = await extractRenderedPageSnapshot(webview).catch((error: unknown) => {
      appendLog(setActivityLog, error instanceof Error ? `HTML extraction failed: ${error.message}` : "HTML extraction failed before a snapshot could be created.");
      return undefined;
    });
    if (!snapshot?.html) {
      setCaptureStatus({ message: "HTML download failed", state: "failed", actionLabel: "Download HTML", progress: 100 });
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
      setCaptureStatus({ message: "HTML download done", state: "done", progress: 100 });
      appendLog(setActivityLog, `Saved the current #main HTML snapshot to ${saved.htmlPath}.`);
    } catch (error) {
      setCaptureStatus({ message: "HTML download failed", state: "failed", actionLabel: "Download HTML", progress: 100 });
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
        <button className="secondary-button mio-round-icon-button h-9 w-9 px-0" type="button" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? "Exit fullscreen" : "Expand browser"} title={expanded ? "Exit fullscreen" : "Expand browser"}>
          {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      }
    >
        <div className="mio-browser-toolbar mb-3 grid min-w-0 grid-cols-[auto_minmax(180px,1fr)_auto_auto] items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-white/8 bg-white/5 p-1">
          <SegmentButton
            active={viewMode === "desktop"}
            icon={Monitor}
            disabled={platform !== "SHOPEE_ID"}
            compact
            onClick={() => platform === "SHOPEE_ID" && switchBrowserViewMode("desktop")}
          >
            Desktop
          </SegmentButton>
          <SegmentButton active={viewMode === "mobile"} icon={Smartphone} compact onClick={() => switchBrowserViewMode("mobile")}>
            Mobile
          </SegmentButton>
        </div>
        <input value={address} onChange={(event) => setAddress(event.target.value)} className="input mio-address-input" aria-label="Browser address" />
        <div className="flex items-center gap-2">
          <button className="secondary-button mio-round-icon-button h-10 w-10 px-0" type="button" onClick={goToAddress} aria-label="Go to address" title="Go">
            <ChevronRight size={15} />
          </button>
          <button className="secondary-button mio-round-icon-button h-10 w-10 px-0" type="button" onClick={() => webviewRef.current?.reload?.()} aria-label="Reload browser" title="Reload">
            <RefreshCcw size={15} />
          </button>
          <button className="secondary-button mio-round-icon-button h-10 w-10 px-0" type="button" onClick={() => applyZoom(zoomFactor - 0.1)} aria-label="Zoom out" title="Zoom out">
            <ZoomOut size={15} />
          </button>
          <button className="secondary-button mio-round-icon-button h-10 w-10 px-0" type="button" onClick={() => applyZoom(zoomFactor + 0.1)} aria-label="Zoom in" title="Zoom in">
            <ZoomIn size={15} />
          </button>
        </div>
        <LoadStatePill state={loadState} />
      </div>

      <div
        className={[
          "mio-collection-workspace min-h-0",
          viewMode === "mobile"
            ? "flex flex-1 items-start justify-center gap-4 overflow-auto"
            : "relative flex-1"
        ].join(" ")}
      >
      <div
        className={[
          "mio-browser-frame relative min-h-0 shrink-0 overflow-hidden border border-white/12 bg-black",
          viewMode === "mobile"
            ? "h-[720px] w-[430px] max-w-full rounded-[18px]"
            : expanded
              ? "h-full w-full flex-1 rounded-none"
              : "h-[720px] w-full rounded-[18px]"
        ].join(" ")}
        onPointerDownCapture={(event) => {
          const target = event.target as Element | null;
          if (target?.closest(".mio-floating-collector")) {
            return;
          }
          setBrowserInteractionToken((value) => value + 1);
        }}
      >
        <webview
          key={`${project.id}-${viewMode}`}
          ref={(node) => {
            webviewRef.current = node as WebviewElement | null;
            applyWebviewShadowFrameLayout(webviewRef.current);
          }}
          src={currentUrl}
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
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <div className="mb-1 flex items-center gap-2 font-semibold text-white">
                <AlertTriangle size={16} className="text-signal-amber" />
                Manual action required
              </div>
              Shopee is showing login, verification, captcha, or a protected page. Complete it manually, then capture evidence after the target page is visible.
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {captureStatus.state !== "idle" && (
            <BrowserCaptureStatusPill
              key={`${captureStatus.state}-${captureStatus.message}`}
              status={{ ...captureStatus, progress: displayedCaptureProgress }}
              onAction={() => void downloadCurrentHtml()}
            />
          )}
        </AnimatePresence>
      </div>
      <div className={viewMode === "mobile" ? "relative h-[720px] w-[320px] shrink-0" : "contents"}>
        <FloatingStepController
          step={controllerStep}
          viewMode={viewMode}
          activeSubActionId={activeSubAction?.id}
          stepNumber={activeStepIndex + 1}
          stepTotal={steps.length}
          stageCollectedCount={stageCollectedCount}
          targetUrl={activeTargetUrl}
          captured={isCurrentCollectorTargetSaved(activeStep, activeSubAction?.id, collectedSteps)}
          subActionCounts={activeSubActionCounts}
          subActionStates={activeSubActionStates}
          outcomeMessage={captureStatus.message}
          saving={saveEvidence.isPending || Boolean(preparingEvidenceKey)}
          resetting={resetEvidence.isPending}
          collapseSignal={browserInteractionToken}
          onOpenTarget={(subActionId) => {
            const selectedSubAction = subActionId
              ? activeStep.subActions?.find((action) => action.id === subActionId)
              : activeSubAction;
            if (selectedSubAction) {
              selectSubAction(selectedSubAction.id);
            }
            const selectedTargetUrl = selectedSubAction?.targetUrl ?? activeStep.targetUrl;
            if (selectedTargetUrl) {
              navigateTo(collectionTargetUrl(selectedTargetUrl, activeStep.stage));
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
              if (activeStep.id === "store-list") openEvaluationReview();
              else openKeyProductTableReview();
              return;
            }
            void captureAndSaveEvidence(activeStep, selectedSubAction);
          }}
          onReset={(subActionId) => void resetCollectedEvidence(activeStep, subActionId)}
          onSelectSubAction={selectSubAction}
          onAttachFile={activeStep.id === "tiktok-brand-search" || activeStep.metadata?.storeEvidenceType === "tiktok" ? () => attachFileEvidence.mutate(activeStep) : undefined}
          onOpenAndroid={activeStep.id === "tiktok-brand-search" || activeStep.metadata?.storeEvidenceType === "tiktok" ? () => void openTikTokAndroidFromShopeeStep() : undefined}
          onPrevious={retreatGuidedCollection}
          onNext={advanceGuidedCollection}
        />
      </div>
      </div>
    </Panel>
  );

  const keyProductTablePanel = (
    <KeyProductTableReview
      products={selectedKeyProducts}
      availableProducts={availableKeyProductPool.filter((product) =>
        !selectedKeyProducts.some((selected) => sameQualifiedProduct(selected, product))
      )}
      totalProducts={projectDetail.data?.products.length ?? 0}
      approved={qualifiedProductsApproved}
      onBackToBrowser={() => setReviewingKeyProducts(false)}
      onRemoveProduct={removeQualifiedProduct}
      onAddProduct={addQualifiedProduct}
      onExcludeProducts={excludeQualifiedProducts}
      onAddProducts={addQualifiedProducts}
      onApprove={approveQualifiedProducts}
      onNext={startProductDetailCollection}
    />
  );

  const evaluationPanel = (
    <EvaluationCollectionPanel
      detail={projectDetail.data}
      candidates={storeCollectionCandidates}
      approved={storeListApproved}
      onBackToBrowser={() => setReviewingEvaluation(false)}
      onCandidatesChange={updateStoreCollectionCandidates}
      onSaveStoreList={() => void saveStoreList()}
      onStartKeyStoreCollection={startKeyStoreCollection}
    />
  );

  const workspaceContent = (
    <section className={expanded ? "mio-browser-fullscreen fixed inset-0 z-50 overflow-hidden bg-ink-950" : `mio-guided-workspace grid gap-5 ${activitySidebarOpen ? "grid-cols-[360px_minmax(0,1fr)_300px]" : "grid-cols-[360px_minmax(0,1fr)]"}`}>
      {!expanded && (
        <aside className="mio-collection-sidebar space-y-5">
          <button className="secondary-button" type="button" onClick={onNewAnalysis}>
            <ClipboardCheck size={16} />
            {translate(language, exitLabel)}
          </button>
          <Panel
            title={translate(language, "Analysis Session")}
            icon={ClipboardCheck}
            className={analysisSessionCollapsed ? "mio-analysis-session-collapsed" : undefined}
            action={
              <button
                className="secondary-button mio-round-icon-button h-8 w-8 px-0"
                type="button"
                onClick={() => setAnalysisSessionCollapsed((value) => !value)}
                aria-label={translate(language, analysisSessionCollapsed ? "Expand analysis session" : "Collapse analysis session")}
                title={translate(language, analysisSessionCollapsed ? "Expand analysis session" : "Collapse analysis session")}
              >
                {analysisSessionCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
            }
          >
            {!analysisSessionCollapsed && (
              <div className="space-y-3 text-sm text-ink-300">
                <InfoLine label={translate(language, "Keyword")} value={project.keyword} />
                <InfoLine label={translate(language, "Category")} value={project.productCategory ?? productCategory} />
                <InfoLine label={translate(language, "Platform")} value={project.marketplace === "SHOPEE_ID" ? "Shopee" : "TikTok Shop"} />
                <InfoLine label={translate(language, "Created")} value={formatDateTime(project.createdAt)} />
              </div>
            )}
          </Panel>

          <Panel title={translate(language, "Collection Progress")} icon={ListChecks}>
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
                    title={translate(language, collectionStageLabel(stage))}
                  >
                    <div className="text-[11px] font-semibold">{translate(language, collectionStageShortLabel(stage))}</div>
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
                  <div className="text-xs font-semibold text-white">{translate(language, collectionStageLabel(activeStage))}</div>
                  <div className="text-[11px] text-ink-500">{stageCollectedCount}/{steps.length} {translate(language, "steps in this part")} · {collectedCount}/{allSteps.length} {translate(language, "total")}</div>
                </div>
                <CircularProgress value={collectionProgressPercent} />
              </div>
              <ProgressBar value={collectionProgressPercent} />
            </div>
            <div className={reviewingKeyProducts || reviewingEvaluation ? "grid grid-cols-1 gap-2" : "grid grid-cols-2 gap-2"}>
              <button className="secondary-button h-9 px-2 text-xs" type="button" onClick={saveProgress} disabled={saveCollectionState.isPending}>
                {saveCollectionState.isPending ? <span className="mio-spinner" /> : <Archive size={14} />}
                {translate(language, "Save")}
              </button>
              {!reviewingKeyProducts && !reviewingEvaluation && (
                <button className="primary-button h-9 px-2 text-xs" type="button" onClick={runStagePrimaryAction} disabled={saveCollectionState.isPending}>
                  {saveCollectionState.isPending ? <span className="mio-spinner" /> : <CheckCircle2 size={14} />}
                  {translate(language, activeStage === "KEYWORD_GENERAL" ? "Key Product List" : stageCompletionButtonLabel(activeStage))}
                </button>
              )}
            </div>
            {!reviewingEvaluation && <div className="mt-4 max-h-[420px] space-y-2 overflow-auto pr-1">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  role="button"
                  tabIndex={0}
                  className={[
                    "mio-step-card w-full cursor-pointer rounded-md border px-3 py-2 text-left text-xs transition",
                    index === activeStepIndex ? "mio-step-card-active border-signal-blue/40 bg-signal-blue/12" : "border-white/8 bg-white/5 hover:bg-white/8"
                  ].join(" ")}
                  onClick={() => {
                    setActiveStepIndex(index);
                    if (step.targetUrl) {
                      navigateTo(collectionTargetUrl(step.targetUrl, step.stage));
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveStepIndex(index);
                      if (step.targetUrl) {
                        navigateTo(collectionTargetUrl(step.targetUrl, step.stage));
                      }
                    }
                  }}
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-white">
                    <span className="line-clamp-2 font-medium">{step.label}</span>
                    {isCollectionStepComplete(step, collectedSteps) ? <CheckCircle2 size={14} className="text-signal-green" /> : <Circle size={12} className="text-ink-500" />}
                  </div>
                  {index === activeStepIndex && (
                    <CollectionStepPreview
                      step={step}
                      detail={projectDetail.data}
                      selectedProducts={selectedKeyProducts}
                      collected={isCollectionStepComplete(step, collectedSteps)}
                      collectedSteps={collectedSteps}
                      loadingEvidenceKey={captureStatus.state === "working"
                        ? preparingEvidenceKey ?? (saveEvidence.isPending ? stepProgressKey(activeStep, activeSubAction?.id) : null)
                        : null}
                    />
                  )}
                </div>
              ))}
            </div>}
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
      {!expanded && activitySidebarOpen && (
        <aside className={[
          "sticky top-4 self-start overflow-hidden border border-white/8 bg-white/5",
          "h-[calc(100vh-96px)] rounded-[18px]"
        ].join(" ")}>
          <div className="flex h-full flex-col p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Gauge size={16} className="text-signal-blue" />
                Activity
              </div>
              <button className="secondary-button mio-round-icon-button h-8 w-8 px-0" type="button" onClick={() => setActivitySidebarOpen(false)} aria-label="Collapse activity">
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
        </aside>
      )}
    </section>
  );

  const screenshotReviewPortalRoot = typeof document !== "undefined" ? appPortalRoot() : null;
  const screenshotReviewPortal = pendingCapture && screenshotReviewPortalRoot
    ? createPortal(
        <ScreenshotReviewModal
          capture={pendingCapture}
          saving={saveEvidence.isPending}
          onSavingStart={() => {
            setPendingCapture(null);
            setCaptureStatus({ message: "Saving screenshot evidence", state: "working", progress: 82 });
          }}
          onCancel={() => setPendingCapture(null)}
          onSave={(payload) => {
            saveEvidence.mutate(payload);
          }}
        />,
        screenshotReviewPortalRoot
      )
    : null;

  return (
    <>
      {expanded && expandedPortalRoot ? createPortal(workspaceContent, expandedPortalRoot) : workspaceContent}
      {screenshotReviewPortal}
    </>
  );
}

function CollectionStepPreview({
  step,
  detail,
  selectedProducts,
  collected,
  collectedSteps,
  loadingEvidenceKey
}: {
  step: CollectionStep;
  detail?: ProjectDetailPayload;
  selectedProducts: ProjectProductEvidence[];
  collected: boolean;
  collectedSteps: Record<string, string>;
  loadingEvidenceKey: string | null;
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

  const product = step.ownerType === "PRODUCT" && step.ownerId
    ? detail.products.find((item) => item.id === step.ownerId)
    : undefined;
  if (product) {
    const productReviews = curatedShopeeReviews(detail.reviews.filter((review) => review.productId === product.id));
    const previewImage = product.images[0] ?? product.imageUrl;
    const subActionStates = collectionSubActionStates(step, collectedSteps, collectionSubActionCounts(step, detail));
    return (
      <div className="mt-4 rounded-md border border-white/8 bg-white/5 p-3 text-xs leading-5 text-ink-300">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {previewImage && (
              <img src={previewImage} alt="" loading="lazy" decoding="async" className="h-10 w-10 shrink-0 rounded border border-white/8 bg-white object-cover" />
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
          <InfoLine label="Source" value={productSourcePlacement(product)} />
          <InfoLine label="Store" value={product.storeName ?? "-"} />
          <div>
            <div className="text-[10px] uppercase text-ink-500">Store Type</div>
            <StoreTypeMark value={product.storeType} className="mt-1" />
          </div>
          <InfoLine label="Rating" value={product.ratingText ?? (product.rating ? String(product.rating) : "-")} />
          <InfoLine label="Reviews" value={product.reviewText ?? product.reviewCount?.toLocaleString() ?? "-"} />
          <InfoLine label="Sold" value={product.totalSoldText ?? product.monthlySoldText ?? "-"} />
          <InfoLine label="Media" value={`${product.images.length} images · ${product.videos.length} videos`} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <EvidenceStatusPill label="First page" state={subActionStates["first-page"] ?? "pending"} loading={loadingEvidenceKey === stepProgressKey(step, "first-page")} />
          <EvidenceStatusPill label="Slides / video" state={subActionStates.slides ?? "pending"} loading={loadingEvidenceKey === stepProgressKey(step, "slides")} />
          <EvidenceStatusPill label="Description" state={subActionStates.description ?? "pending"} loading={loadingEvidenceKey === stepProgressKey(step, "description")} />
          <EvidenceStatusPill label="Positive reviews" state={subActionStates["positive-reviews"] ?? "pending"} loading={loadingEvidenceKey === stepProgressKey(step, "positive-reviews")} />
          <EvidenceStatusPill label="Negative reviews" state={subActionStates["negative-reviews"] ?? "pending"} loading={loadingEvidenceKey === stepProgressKey(step, "negative-reviews")} />
          <EvidenceStatusPill label="Media in user" state={subActionStates["media-in-user"] ?? "pending"} loading={loadingEvidenceKey === stepProgressKey(step, "media-in-user")} />
          <EvidenceStatusPill label="Shop vouchers" state={subActionStates["shop-vouchers"] ?? "pending"} loading={loadingEvidenceKey === stepProgressKey(step, "shop-vouchers")} />
          <EvidenceStatusPill label="Bundle deals" state={subActionStates["bundle-deals"] ?? "pending"} loading={loadingEvidenceKey === stepProgressKey(step, "bundle-deals")} />
          <EvidenceStatusPill label="Shop Home Page" state={subActionStates["shop-homepage"] ?? "pending"} loading={loadingEvidenceKey === stepProgressKey(step, "shop-homepage")} />
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

  const storeCandidate = step.ownerType === "STORE" ? storeCandidateFromStep(step) : undefined;
  if (storeCandidate) {
    const store = findCollectedStore(detail, storeCandidate);
    const homepageAsset = storeAssetsForCandidate(detail, storeCandidate, "STORE_HOME")[0];
    const subActionStates = collectionSubActionStates(step, collectedSteps, collectionSubActionCounts(step, detail));
    return (
      <div className="mt-4 rounded-md border border-white/8 bg-white/5 p-3 text-xs leading-5 text-ink-300">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-semibold text-white">{storeCandidate.storeName}</div>
            <div className="truncate text-[11px] text-ink-500">Live store result preview</div>
          </div>
          <span className={["rounded-full px-2 py-1 text-[10px]", collected ? "bg-signal-green/15 text-signal-green" : "bg-white/8 text-ink-400"].join(" ")}>
            {collected ? "saved" : "collecting"}
          </span>
        </div>
        {homepageAsset && (
          <img
            src={imageSource(homepageAsset.path)}
            alt={`${storeCandidate.storeName} homepage evidence`}
            loading="lazy"
            decoding="async"
            className="mb-3 aspect-[16/7] w-full rounded border border-white/8 bg-white object-cover object-top"
          />
        )}
        {store && (
          <div className="mb-3 grid grid-cols-2 gap-2 rounded-md border border-white/8 bg-white/[0.04] p-2 text-[11px]">
            <InfoLine label="Products" value={formatOptionalNumber(store.productsCount)} />
            <InfoLine label="Followers" value={formatOptionalNumber(store.followers)} />
            <InfoLine label="Following" value={formatOptionalNumber(store.following)} />
            <InfoLine label="Rating" value={store.rating ? `${store.rating}${store.ratingCount ? ` (${formatOptionalNumber(store.ratingCount)})` : ""}` : "-"} />
            <InfoLine label="Chat" value={sanitizeStoreMetric(store.chatResponse)} />
            <InfoLine label="Joined" value={sanitizeStoreMetric(store.joinedDate)} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {(step.subActions ?? []).map((action) => (
            <EvidenceStatusPill
              key={action.id}
              label={action.label.replace(" (Optional)", "")}
              state={subActionStates[action.id] ?? "pending"}
              loading={loadingEvidenceKey === stepProgressKey(step, action.id)}
            />
          ))}
        </div>
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

function EvidenceStatusPill({
  label,
  state = "pending",
  done,
  loading = false
}: {
  label: string;
  state?: "pending" | "collected" | "not-found";
  done?: boolean;
  loading?: boolean;
}) {
  const resolvedState = done === undefined ? state : done ? "collected" : "pending";
  return (
    <div className={[
      "mio-evidence-status-pill flex items-center gap-1.5 rounded border px-2 py-1",
      loading ? "mio-evidence-status-loading" : "",
      resolvedState === "collected" ? "border-signal-green/25 bg-signal-green/10 text-signal-green" : "",
      resolvedState === "not-found" ? "border-signal-rose/30 bg-signal-rose/10 text-signal-rose" : "",
      resolvedState === "pending" ? "border-white/8 bg-white/[0.04] text-ink-500" : ""
    ].join(" ")}>
      {loading ? <span className="mio-evidence-status-spinner" aria-hidden="true" /> : resolvedState === "collected" ? <CheckCircle2 size={12} /> : resolvedState === "not-found" ? <X size={12} /> : <Circle size={11} />}
      <span className="truncate">{loading ? `Updating ${label}` : label}</span>
    </div>
  );
}

function collectionSubActionCounts(step: CollectionStep, detail?: ProjectDetailPayload): Record<string, number> {
  if (!detail) {
    return {};
  }
  if (step.ownerType === "STORE") {
    const candidate = storeCandidateFromStep(step);
    if (!candidate) {
      return {};
    }
    const store = findCollectedStore(detail, candidate);
    return {
      "store-homepage": storeAssetsForCandidate(detail, candidate, "STORE_HOME").length,
      "store-details": store ? [
        store.productsCount,
        store.followers,
        store.following,
        store.rating,
        store.ratingCount,
        store.chatResponse,
        store.joinedDate,
        store.description
      ].filter((value) => value !== null && value !== undefined && value !== "").length : 0,
      "store-rating-negative": store?.ratingSamples.filter((sample) => sample.rating === 1).length ?? 0,
      "store-rating-positive": store?.ratingSamples.filter((sample) => sample.rating === 5).length ?? 0,
      "store-categories": store?.categories.length ?? 0,
      "store-popular": storeProductsForCandidate(detail, candidate, "Store Products").length,
      "store-best-seller": storeProductsForCandidate(detail, candidate, "Store Best Sellers").length,
      "store-banner": storeAssetsForCandidate(detail, candidate, "STORE_BANNER").length,
      "store-tiktok": storeSocialAssetsForCandidate(detail, candidate).length
    };
  }
  if (step.ownerType !== "PRODUCT" || !step.ownerId) {
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
    description: product.description || product.descriptionImages.length ? 1 : 0,
    "shop-vouchers": product.shopVouchers.length,
    "bundle-deals": product.bundleDeals.length,
    "shop-homepage": productAssets.filter((asset) => asset.kind === "STORE_HOME").length
  };
}

function storeCandidateFromStep(step: CollectionStep): StoreCollectionCandidate | undefined {
  const id = step.ownerId ?? (typeof step.metadata?.storeCandidateId === "string" ? step.metadata.storeCandidateId : undefined);
  const storeName = typeof step.metadata?.storeName === "string" ? step.metadata.storeName : undefined;
  const storeUrl = typeof step.metadata?.canonicalStoreUrl === "string" ? step.metadata.canonicalStoreUrl : undefined;
  if (!id || !storeName || !storeUrl) {
    return undefined;
  }
  return {
    id,
    storeName,
    storeUrl,
    shopId: typeof step.metadata?.shopId === "string" ? step.metadata.shopId : undefined,
    includePopularProducts: true,
    includeShopBanner: true
  };
}

function productDetailCollectionOutcomeMessage(
  subActionId: string,
  fallbackLabel: string,
  detail: ProjectDetailPayload | undefined,
  step: CollectionStep
): string {
  const product = step.ownerType === "PRODUCT" && step.ownerId
    ? detail?.products.find((item) => item.id === step.ownerId)
    : undefined;
  if (!product) {
    return `${fallbackLabel} collected`;
  }
  if (subActionId === "slides") {
    return `Media: ${product.images.length} images & ${product.videos.length} video${product.videos.length === 1 ? "" : "s"} collected`;
  }
  if (subActionId === "media-in-user") {
    return `Review media: ${product.reviewMediaImages.length} images & ${product.reviewMediaVideos.length} video${product.reviewMediaVideos.length === 1 ? "" : "s"} collected`;
  }
  return `${fallbackLabel} collected`;
}

function productDetailSubActionEvidenceCount(payload: ManualEvidencePayload, subActionId: string): number {
  const structured = isRecord(payload.metadata?.structuredProductDetail)
    ? payload.metadata.structuredProductDetail
    : undefined;
  const values = (key: string): unknown[] => {
    const value = structured?.[key];
    return Array.isArray(value) ? value : [];
  };
  const structuredStore = isRecord(payload.metadata?.structuredStoreProfile)
    ? payload.metadata.structuredStoreProfile
    : undefined;
  const storeValues = (key: string): unknown[] => {
    const value = structuredStore?.[key];
    return Array.isArray(value) ? value : [];
  };
  switch (subActionId) {
    case "first-page":
    case "shop-homepage":
      return payload.imageDataUrl ? 1 : 0;
    case "slides":
      return values("images").length + values("videos").length;
    case "positive-reviews":
      return values("reviews").filter((review) => isRecord(review) && (review.type === "Positive Reviews" || Number(review.rating) >= 5)).length;
    case "negative-reviews":
      return values("reviews").filter((review) => isRecord(review) && (review.type === "Negative Reviews" || Number(review.rating) <= 3)).length;
    case "media-in-user":
      return values("reviewMediaImages").length + values("reviewMediaVideos").length;
    case "description-promotions":
      return (typeof structured?.description === "string" && structured.description.trim() ? 1 : 0) +
        values("descriptionImages").length +
        values("shopVouchers").length +
        values("bundleDeals").length;
    case "store-homepage":
    case "store-tiktok":
      return payload.imageDataUrl ? 1 : 0;
    case "store-details":
      return ["productsCount", "followers", "following", "rating", "ratingCount", "chatResponse", "joinedDate", "description"]
        .filter((key) => structuredStore?.[key] !== null && structuredStore?.[key] !== undefined && structuredStore?.[key] !== "")
        .length;
    case "store-rating-negative":
      return storeValues("ratingSamples").filter((sample) => isRecord(sample) && Number(sample.rating) === 1).length;
    case "store-rating-positive":
      return storeValues("ratingSamples").filter((sample) => isRecord(sample) && Number(sample.rating) === 5).length;
    case "store-categories":
      return storeValues("categories").length;
    case "store-popular":
    case "store-best-seller":
      return payload.extractedProducts?.length ?? 0;
    case "store-banner":
      return storeValues("bannerUrls").length + (Array.isArray(payload.metadata?.storeDecorationImages) ? payload.metadata.storeDecorationImages.length : 0);
    default:
      return 1;
  }
}

function EvaluationCollectionPanel({
  detail,
  candidates,
  approved,
  onBackToBrowser,
  onCandidatesChange,
  onSaveStoreList,
  onStartKeyStoreCollection
}: {
  detail?: ProjectDetailPayload;
  candidates: StoreCollectionCandidate[];
  approved: boolean;
  onBackToBrowser: () => void;
  onCandidatesChange: (candidates: StoreCollectionCandidate[]) => void;
  onSaveStoreList: () => void;
  onStartKeyStoreCollection: () => void;
}) {
  const [manualStoreName, setManualStoreName] = useState("");
  const [manualStoreUrl, setManualStoreUrl] = useState("");
  const [addingStore, setAddingStore] = useState(false);

  function addManualStore() {
    const storeName = manualStoreName.trim();
    const rawUrl = manualStoreUrl.trim();
    if (!storeName || !rawUrl) {
      return;
    }
    let storeUrl: string;
    try {
      storeUrl = new URL(rawUrl, "https://shopee.co.id").toString();
    } catch {
      return;
    }
    const id = stableStoreCandidateId(storeUrl, storeName);
    onCandidatesChange(dedupeStoreCollectionCandidates([
      ...candidates,
      {
        id,
        storeName,
        storeUrl,
        shopId: extractShopeeShopId(storeUrl),
        sourceProductIds: [],
        includePopularProducts: false,
        includeShopBanner: false
      }
    ]));
    setManualStoreName("");
    setManualStoreUrl("");
    setAddingStore(false);
  }

  return (
    <Panel
      title="Key Store Page List"
      icon={Store}
      action={
        <button className="secondary-button h-9 w-auto px-3" type="button" onClick={onBackToBrowser}>
          <ChevronLeft size={15} />
          Browser
        </button>
      }
    >
      <div className="mb-4 rounded-md border border-signal-blue/20 bg-signal-blue/10 p-4 text-sm leading-6 text-ink-300">
        Every distinct store from Product Qualified is listed once. Review the list, add another Shopee store when needed, then collect each store page independently.
      </div>
      {!detail ? (
        <EmptyState label="Loading project evidence..." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {candidates.map((candidate) => {
            const sourceIds = new Set(candidate.sourceProductIds ?? []);
            const relatedProducts = detail.products.filter((product) =>
              sourceIds.size > 0 ? sourceIds.has(product.id) : productMatchesCollectionCandidate(product, candidate)
            );
            const previewProduct = relatedProducts.find((product) => Boolean(product.imageUrl)) ?? relatedProducts[0];
            const candidateStoreType = strongestStoreType([
              candidate.storeType,
              ...relatedProducts.map((product) => product.storeType)
            ]);
            return (
              <article className="mio-result-card mio-store-result-card overflow-hidden" key={candidate.id}>
                <ResultCardMedia imageUrl={previewProduct?.imageUrl} alt={candidate.storeName} variant="store">
                  <span className="mio-card-chip">Key Store Page</span>
                </ResultCardMedia>
                <div className="mio-result-card-body min-w-0">
                  <div className="mio-result-card-title-row">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink-100">{candidate.storeName}</div>
                      <div className="mt-1 text-xs text-ink-500">
                        {relatedProducts.length > 0
                          ? `${relatedProducts.length} source product${relatedProducts.length === 1 ? "" : "s"}`
                          : "Manually added"}
                      </div>
                    </div>
                    <button
                      className="secondary-button mio-round-icon-button h-8 w-8 shrink-0 px-0"
                      type="button"
                      onClick={() => onCandidatesChange(candidates.filter((item) => item.id !== candidate.id))}
                      aria-label={`Remove ${candidate.storeName}`}
                      title={`Remove ${candidate.storeName}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="mio-card-chip-row">
                    <StoreTypeMark value={candidateStoreType} showLabel />
                    {candidate.shopId && <span className="mio-card-chip">Shop ID {candidate.shopId}</span>}
                  </div>
                  {relatedProducts.length > 0 && (
                    <div className="mio-result-card-description line-clamp-2">
                      {relatedProducts.map((product) => displayProductTitle(product)).join(", ")}
                    </div>
                  )}
                  <a className="mio-result-card-link break-all" href={candidate.storeUrl} target="_blank" rel="noreferrer">
                    {candidate.storeUrl}
                  </a>
                </div>
              </article>
            );
          })}
          {!addingStore && (
            <button className="mio-result-card flex min-h-[280px] items-center justify-center gap-2 border-dashed text-sm font-medium text-signal-blue" type="button" onClick={() => setAddingStore(true)}>
              <Plus size={20} />
              <span>Add Store Page</span>
            </button>
          )}
        </div>
      )}
      {addingStore && (
        <div className="mio-add-store-form mt-4">
          <div className="mio-add-store-form-title">Add store page</div>
          <div className="mio-add-store-fields">
            <label>
              <span>Store name</span>
              <Input value={manualStoreName} onChange={(event) => setManualStoreName(event.target.value)} placeholder="Official store name" />
            </label>
            <label>
              <span>Shopee store URL</span>
              <Input value={manualStoreUrl} onChange={(event) => setManualStoreUrl(event.target.value)} placeholder="https://shopee.co.id/store-name" />
            </label>
            <div className="mio-add-store-actions">
            <button className="primary-button h-10 w-auto px-4" type="button" onClick={addManualStore} disabled={!manualStoreName.trim() || !manualStoreUrl.trim()}>
              <Plus size={15} />
              Add
            </button>
            <button className="secondary-button h-10 w-auto px-4" type="button" onClick={() => setAddingStore(false)}>
              Cancel
            </button>
            </div>
          </div>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs leading-5 text-ink-500">
          {candidates.length > 0
            ? `${candidates.length} Key Store Page${candidates.length === 1 ? "" : "s"} will be collected independently.`
            : "Add at least one Key Store Page to continue."}
        </div>
        <div className="flex items-center gap-2">
          <button className="secondary-button h-10 w-auto px-4" type="button" onClick={onSaveStoreList}>
            <Archive size={15} />
            Save Store List
          </button>
          <button className="primary-button h-10 w-auto px-4" type="button" onClick={onStartKeyStoreCollection} disabled={candidates.length === 0}>
            <Store size={16} />
            {approved ? "Continue Store Collection" : "Approve & Continue"}
          </button>
        </div>
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
    <motion.div
      className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <div
        className={[
          "mio-capture-status-pill pointer-events-auto flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-glow backdrop-blur-2xl",
          status.state === "failed" ? "mio-capture-status-failed" : "",
          status.state === "done" ? "mio-capture-status-done" : "",
          status.state === "working" ? "mio-capture-status-working" : ""
        ].join(" ")}
      >
        <span>{status.message}</span>
        {status.state === "working" && typeof status.progress === "number" && (
          <span className="rounded-full bg-black/15 px-2 py-0.5 tabular-nums">{Math.round(status.progress)}%</span>
        )}
        {status.actionLabel && (
          <button className="rounded-full border border-current/30 px-2 py-1 text-[11px] font-semibold" type="button" onClick={onAction}>
            {status.actionLabel}
          </button>
        )}
      </div>
    </motion.div>
  );
}

function FloatingStepController({
  step,
  viewMode,
  activeSubActionId,
  stepNumber,
  stepTotal,
  stageCollectedCount,
  targetUrl,
  captured,
  subActionCounts,
  subActionStates,
  outcomeMessage,
  saving,
  resetting,
  collapseSignal,
  onOpenTarget,
  onCollect,
  onReset,
  onSelectSubAction,
  onAttachFile,
  onOpenAndroid,
  onPrevious,
  onNext
}: {
  step: CollectionStep;
  viewMode: "desktop" | "mobile";
  activeSubActionId?: string;
  stepNumber: number;
  stepTotal: number;
  stageCollectedCount: number;
  targetUrl?: string;
  captured: boolean;
  subActionCounts?: Record<string, number>;
  subActionStates?: Record<string, "pending" | "collected" | "not-found">;
  outcomeMessage?: string;
  saving: boolean;
  resetting: boolean;
  collapseSignal: number;
  onOpenTarget: (subActionId?: string) => void;
  onCollect: (subActionId?: string) => void;
  onReset: (subActionId?: string) => void;
  onSelectSubAction: (id: string) => void;
  onAttachFile?: () => void;
  onOpenAndroid?: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const [compact, setCompact] = useState(true);
  const [outcomeNotice, setOutcomeNotice] = useState<{ label: string; state: "collected" | "not-found" } | null>(null);
  const outcomeRef = useRef<{ signature?: string }>({});
  const activeSubAction = step.subActions?.find((action) => action.id === activeSubActionId) ?? step.subActions?.[0];
  const activeSubActionCount = activeSubAction ? subActionCounts?.[activeSubAction.id] ?? 0 : 0;
  const activeSubActionMaxed = activeSubAction?.id === "slides" && activeSubActionCount >= 9;
  const activeSubActionState = activeSubAction ? subActionStates?.[activeSubAction.id] ?? "pending" : "pending";
  const activeSubActionFinished = activeSubActionState !== "pending" || activeSubActionMaxed;
  const activeSubActionIndex = activeSubAction ? step.subActions?.findIndex((action) => action.id === activeSubAction.id) ?? -1 : -1;
  const nextSubAction = activeSubActionIndex >= 0
    ? step.subActions?.slice(activeSubActionIndex + 1).find((action) => (subActionStates?.[action.id] ?? "pending") === "pending")
    : undefined;
  const collectLabel = activeSubAction
    ? subActionButtonLabel(activeSubAction, activeSubActionCount)
    : undefined;
  const dataOnlyStep = isDataOnlyEvidenceStep(step, activeSubAction);
  const compactInstruction = step.stage === "PRODUCT_DETAILS"
    ? "Choose the sub-action, confirm the target page, then collect."
    : step.instruction;
  const usesSubActionCollectButtons =
    (step.stage === "PRODUCT_DETAILS" || step.stage === "EVALUATION_KEY_STORE") &&
    Boolean(step.subActions?.length);
  useEffect(() => {
    if (collapseSignal > 0) {
      setCompact(true);
    }
  }, [collapseSignal]);
  useEffect(() => {
    if (viewMode === "mobile") {
      setCompact(true);
    }
  }, [viewMode]);
  useEffect(() => {
    const signature = `${activeSubAction?.id ?? ""}:${activeSubActionState}:${outcomeMessage ?? ""}`;
    if (!activeSubAction?.id || activeSubActionState === "pending" || outcomeRef.current.signature === signature) {
      return;
    }
    outcomeRef.current = { signature };
    const outcomeState = activeSubActionState;
    const showTimer = window.setTimeout(() => {
      setOutcomeNotice({ label: outcomeMessage || activeSubAction?.label || step.label, state: outcomeState });
    }, 500);
    const hideTimer = window.setTimeout(() => setOutcomeNotice(null), 3_500);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [activeSubAction?.id, activeSubAction?.label, activeSubActionState, outcomeMessage, step.label]);

  function advanceCollector() {
    onNext();
  }

  if (compact) {
    return (
      <>
        <motion.div
          className={[
            "mio-floating-collector mio-floating-collector-compact absolute top-2 z-20 rounded-full border border-white/14 bg-ink-950/72 px-3 py-2 shadow-glow backdrop-blur-2xl",
            viewMode === "mobile" ? "left-2 right-2" : "left-4 max-w-[430px]"
          ].join(" ")}
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
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
            {activeSubAction && viewMode !== "mobile" && <div className="truncate text-[10px] text-ink-400">{activeSubAction.label}</div>}
          </div>
          <span className={["shrink-0 rounded-full px-2 py-1 text-[10px]", step.ready ? "bg-signal-green/15 text-signal-green" : "bg-white/8 text-ink-300"].join(" ")}>
            {captured ? (step.mode === "PROCESS" ? "processed" : "saved") : step.ready ? "ready" : "wait"}
          </span>
          {viewMode === "mobile" && (
            <button
              className="secondary-button mio-round-icon-button h-8 w-8 shrink-0 rounded-full px-0"
              type="button"
              onClick={onPrevious}
              aria-label="Previous step"
              title="Previous step"
            >
              <ChevronLeft size={13} />
            </button>
          )}
          {(!usesSubActionCollectButtons || activeSubAction?.id === "shop-homepage" || step.stage === "EVALUATION_KEY_STORE") && (
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
          )}
          <button
            className="primary-button mio-round-icon-button h-8 w-8 shrink-0 rounded-full px-0"
            type="button"
            disabled={saving || !step.ready || (!usesSubActionCollectButtons && captured) || activeSubActionMaxed || (activeSubAction?.id !== "slides" && activeSubActionFinished)}
            onClick={() => onCollect(activeSubAction?.id)}
            aria-label={step.mode === "PROCESS" ? "Process step" : "Collect step"}
            title={step.mode === "PROCESS" ? "Process step" : "Collect step"}
          >
            {saving ? <span className="mio-spinner" /> : step.mode === "PROCESS" ? <Table2 size={13} /> : <ClipboardCheck size={13} />}
          </button>
          {(activeSubActionFinished || (!usesSubActionCollectButtons && captured)) && (
            <button
              className="secondary-button mio-round-icon-button h-8 w-8 shrink-0 rounded-full px-0"
              type="button"
              disabled={saving || resetting}
              onClick={() => onReset(activeSubAction?.id)}
              aria-label={`Reset ${activeSubAction?.label ?? step.label}`}
              title={`Reset ${activeSubAction?.label ?? step.label}`}
            >
              {resetting ? <span className="mio-spinner" /> : <RefreshCcw size={13} />}
            </button>
          )}
          {(viewMode === "mobile" || (usesSubActionCollectButtons && activeSubActionFinished) || (!usesSubActionCollectButtons && captured && step.mode !== "PROCESS")) && (
            <button
              className="secondary-button mio-round-icon-button h-8 w-8 shrink-0 rounded-full px-0"
              type="button"
              disabled={viewMode === "mobile" && !activeSubActionFinished && !captured}
              onClick={advanceCollector}
              aria-label={nextSubAction ? `Continue to ${nextSubAction.label}` : "Continue to next product"}
              title={nextSubAction ? `Continue to ${nextSubAction.label}` : "Continue to next product"}
            >
              <ChevronRight size={13} />
            </button>
          )}
          </div>
        </motion.div>
        <AnimatePresence>
          {outcomeNotice && (
            <motion.div
              className={[
                "mio-collector-outcome absolute left-6 top-[80px] z-20 flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-glow backdrop-blur-xl",
                outcomeNotice.state === "collected"
                  ? "border-signal-green/30 bg-signal-green/15 text-signal-green"
                  : "border-signal-rose/35 bg-signal-rose/15 text-signal-rose"
              ].join(" ")}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              {outcomeNotice.state === "collected" ? <CheckCircle2 size={14} /> : <X size={14} />}
              <span>{outcomeNotice.label}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <motion.div
      className={[
        "mio-floating-collector mio-floating-collector-expanded absolute top-2 z-20 flex w-[320px] max-w-[calc(100%-1rem)] flex-col rounded-[18px] border border-white/14 bg-ink-950/72 p-3 shadow-glow backdrop-blur-2xl",
        viewMode === "mobile" ? "left-2" : "left-4"
      ].join(" ")}
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
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
              const actionState = subActionStates?.[action.id] ?? "pending";
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
                    <span
                      className={[
                        "rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em]",
                        actionState === "collected" ? "bg-signal-green/15 text-signal-green" : "",
                        actionState === "not-found" ? "bg-signal-rose/15 text-signal-rose" : "",
                        actionState === "pending" ? "bg-white/8 text-ink-500" : ""
                      ].join(" ")}
                    >
                      {actionState === "collected" ? "collected" : actionState === "not-found" ? "not found" : subActionModeLabel(action)}
                    </span>
                  </div>
                  <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[10px] text-ink-500">{action.description}</div>
                      {action.preferredViewMode && (
                        <div className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-ink-400">
                          Recommended: {action.preferredViewMode}
                        </div>
                      )}
                    </div>
                    {(!usesSubActionCollectButtons || action.id === "shop-homepage" || step.stage === "EVALUATION_KEY_STORE") && (
                      <button
                        className="secondary-button mio-round-icon-button h-8 w-8 px-0 text-[10px]"
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
                    )}
                    {usesSubActionCollectButtons && (
                      <button
                        className="secondary-button h-7 w-auto px-3 text-[10px]"
                        type="button"
                        disabled={saving || !step.ready || actionMaxed || (action.id !== "slides" && actionState !== "pending")}
                        onClick={() => {
                          onSelectSubAction(action.id);
                          onCollect(action.id);
                        }}
                      >
                        {saving && activeSubAction?.id === action.id ? <span className="mio-spinner" /> : subActionButtonLabel(action, actionCount)}
                      </button>
                    )}
                    {actionState !== "pending" && (
                      <button
                        className="secondary-button mio-round-icon-button h-8 w-8 px-0"
                        type="button"
                        disabled={saving || resetting}
                        onClick={() => {
                          onSelectSubAction(action.id);
                          onReset(action.id);
                        }}
                        aria-label={`Reset ${action.label}`}
                        title={`Reset ${action.label}`}
                      >
                        {resetting && activeSubAction?.id === action.id ? <span className="mio-spinner" /> : <RefreshCcw size={12} />}
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
        <button className="secondary-button mio-round-icon-button h-9 w-9 px-0" type="button" onClick={onPrevious} aria-label="Previous step">
          <ChevronLeft size={15} />
        </button>
        <button className="secondary-button mio-round-icon-button h-9 w-9 px-0" type="button" onClick={onNext} aria-label="Next step">
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
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <button className="primary-button h-9" type="button" disabled={saving || activeSubActionMaxed} onClick={() => onCollect(activeSubAction?.id)}>
            <ClipboardCheck size={16} />
            {step.mode === "PROCESS"
              ? captured ? "Review Process Again" : "Build Key Product Table"
              : saving ? "Saving Evidence" : captured ? `Collect Again${activeSubAction ? `: ${activeSubAction.label}` : ""}` : collectLabel ?? (dataOnlyStep ? "Collect Data" : "Collect This Step")}
          </button>
          {captured && (
            <button className="secondary-button mio-round-icon-button h-9 w-9 px-0" type="button" disabled={saving || resetting} onClick={() => onReset(activeSubAction?.id)} aria-label={`Reset ${step.label}`} title={`Reset ${step.label}`}>
              {resetting ? <span className="mio-spinner" /> : <RefreshCcw size={14} />}
            </button>
          )}
        </div>
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
  if (action?.kind) {
    return action.kind;
  }
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

function isDataOnlyEvidenceStep(step: CollectionStep, action?: CollectionSubAction): boolean {
  if (action?.mode === "screenshot") {
    return false;
  }
  return action?.metadata?.dataOnly === true ||
    step.metadata?.dataOnly === true ||
    ["STORE_FEATURED_PRODUCTS", "STORE_BEST_SELLER", "STORE_BANNER"].includes(step.kind);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: number | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
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
  onSavingStart,
  onCancel,
  onSave
}: {
  capture: PendingEvidenceCapture;
  saving: boolean;
  onSavingStart: () => void;
  onCancel: () => void;
  onSave: (payload: ManualEvidencePayload) => void;
}) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const panStartRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [selection, setSelection] = useState<CropRect | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [selectionMode, setSelectionMode] = useState(false);
  const [panning, setPanning] = useState(false);

  useEffect(() => {
    setPreviewZoom(1);
    setSelection(null);
  }, [capture.payload.imageDataUrl]);

  function applyPreviewZoom(nextZoom: number) {
    setPreviewZoom(Math.max(1, Math.min(7, Number(nextZoom.toFixed(2)))));
  }

  function handlePreviewWheel(event: WheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.2 : -0.2;
    applyPreviewZoom(previewZoom + delta);
  }

  function pointerPosition(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const target = event.currentTarget;
    return {
      x: Math.max(0, event.clientX - rect.left + target.scrollLeft),
      y: Math.max(0, event.clientY - rect.top + target.scrollTop)
    };
  }

  function startSelection(event: PointerEvent<HTMLDivElement>) {
    if (!selectionMode) {
      if (previewZoom > 1 && previewScrollRef.current) {
        panStartRef.current = {
          x: event.clientX,
          y: event.clientY,
          left: previewScrollRef.current.scrollLeft,
          top: previewScrollRef.current.scrollTop
        };
        setPanning(true);
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      return;
    }
    const point = pointerPosition(event);
    setDragStart(point);
    setSelection({ x: point.x, y: point.y, width: 0, height: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function updateSelection(event: PointerEvent<HTMLDivElement>) {
    if (!selectionMode && panning && panStartRef.current && previewScrollRef.current) {
      previewScrollRef.current.scrollLeft = panStartRef.current.left - (event.clientX - panStartRef.current.x);
      previewScrollRef.current.scrollTop = panStartRef.current.top - (event.clientY - panStartRef.current.y);
      return;
    }
    if (!selectionMode || !dragStart) {
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
    setPanning(false);
    panStartRef.current = null;
  }

  async function saveSelected() {
    onSavingStart();
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
    <div className="mio-screenshot-modal fixed inset-0 z-[200] grid place-items-center overflow-hidden bg-black/55 p-4 backdrop-blur-sm">
      <div className="mio-panel mio-screenshot-dialog flex h-[calc(100vh-32px)] w-full max-w-[calc(100vw-32px)] flex-col rounded-[18px] border p-5 shadow-glow">
        <div className="mio-screenshot-dialog-header mb-4">
          <div>
            <div className="mio-screenshot-title text-sm font-semibold">Review Screenshot</div>
            <div className="mio-screenshot-copy mt-1 text-xs">{capture.stepLabel}</div>
          </div>
          <div className="mio-screenshot-action-toolbar">
            <button className="secondary-button h-9 w-auto px-3" type="button" onClick={() => { onSavingStart(); onSave(capture.payload); }} disabled={saving}>
              Save Full
            </button>
            <button className="primary-button h-9 w-auto px-4" type="button" onClick={() => void saveSelected()} disabled={saving}>
              {saving ? "Saving" : selection ? "Save Selected" : "Save Screenshot"}
            </button>
          </div>
          <div className="mio-screenshot-view-toolbar flex items-center gap-2">
            <button className="secondary-button h-9 w-9 px-0" type="button" onClick={() => applyPreviewZoom(previewZoom - 0.2)} aria-label="Zoom screenshot out" title="Zoom out">
              <ZoomOut size={15} />
            </button>
            <button className="secondary-button h-9 w-auto px-3 text-xs" type="button" onClick={() => applyPreviewZoom(1)}>
              {Math.round(previewZoom * 100)}%
            </button>
            <button className="secondary-button h-9 w-9 px-0" type="button" onClick={() => applyPreviewZoom(previewZoom + 0.2)} aria-label="Zoom screenshot in" title="Zoom in">
              <ZoomIn size={15} />
            </button>
            <button
              className={["secondary-button h-9 w-auto px-3 text-xs", selectionMode ? "border-signal-blue/55 bg-signal-blue/12 text-signal-blue" : ""].join(" ")}
              type="button"
              onClick={() => setSelectionMode((value) => !value)}
            >
              {selectionMode ? "Selecting" : "Select Area"}
            </button>
            <button className="secondary-button h-9 w-auto px-3" type="button" onClick={onCancel} disabled={saving}>
              Redo
            </button>
          </div>
        </div>
        <div
          ref={previewScrollRef}
          className={["mio-screenshot-preview relative min-h-0 flex-1 overflow-auto rounded-xl border border-white/12 bg-black/85", selectionMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"].join(" ")}
          onWheel={handlePreviewWheel}
          onPointerDown={startSelection}
          onPointerMove={updateSelection}
          onPointerUp={endSelection}
          onPointerCancel={endSelection}
        >
          <div className="relative flex min-h-full min-w-full items-start justify-center" style={{ height: `${previewZoom * 100}%` }}>
            <img
              ref={imageRef}
              src={capture.payload.imageDataUrl}
              alt="Captured evidence preview"
              className="block h-full w-auto max-w-none select-none transition-[height] duration-150 ease-out"
              draggable={false}
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
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="mio-screenshot-copy text-xs">
            Scroll to move through the preview. Use zoom buttons or Ctrl/Command + wheel to zoom, then drag to pan. Use Select Area before dragging a crop box.
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectsView() {
  const queryClient = useQueryClient();
  const language = useUiStore((state) => state.language);
  const projectInspectorRequestId = useUiStore((state) => state.projectInspectorRequestId);
  const clearProjectInspectorRequest = useUiStore((state) => state.clearProjectInspectorRequest);
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: apiClient.dashboard });
  const projects = useMemo(() => dashboard.data?.projects ?? [], [dashboard.data?.projects]);
  const [inspectingProjectId, setInspectingProjectId] = useState("");
  const [collectingProject, setCollectingProject] = useState<ProjectSummary | null>(null);
  const [collectionBrowserUrl, setCollectionBrowserUrl] = useState(SHOPEE_HOME_URL);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [projectSearch, setProjectSearch] = useState("");
  const [projectViewMode, setProjectViewMode] = useState<"cards" | "list">("cards");
  const [projectPendingDeletion, setProjectPendingDeletion] = useState<ProjectSummary | null>(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const categories = useMemo(
    () => Array.from(new Set(projects.map((project) => project.productCategory).filter((value): value is string => Boolean(value?.trim())))).sort(),
    [projects]
  );
  const filteredProjects = useMemo(() => {
    const search = projectSearch.trim().toLocaleLowerCase();
    return projects.filter((project) => {
      const categoryMatches = categoryFilter === "all" || project.productCategory === categoryFilter;
      if (!categoryMatches || !search) return categoryMatches;
      return [project.name, project.keyword, project.productCategory, marketplaceLabel(project.marketplace)]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLocaleLowerCase().includes(search));
    });
  }, [categoryFilter, projectSearch, projects]);

  useEffect(() => {
    if (!projectInspectorRequestId) {
      return;
    }

    setCollectingProject(null);
    setInspectingProjectId(projectInspectorRequestId);
    clearProjectInspectorRequest();
  }, [clearProjectInspectorRequest, projectInspectorRequestId]);

  const detail = useQuery({
    queryKey: ["project-detail", inspectingProjectId],
    queryFn: () => apiClient.projectDetail(inspectingProjectId),
    enabled: Boolean(inspectingProjectId),
    staleTime: PROJECT_DETAIL_STALE_TIME_MS,
    gcTime: PROJECT_DETAIL_GC_TIME_MS,
    placeholderData: (previous) => previous
  });

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("mio:project-header-context", {
      detail: inspectingProjectId ? detail.data?.project.name ?? "" : ""
    }));
  }, [detail.data?.project.name, inspectingProjectId]);

  useEffect(() => () => {
    window.dispatchEvent(new CustomEvent("mio:project-header-context", { detail: "" }));
  }, []);

  function prefetchProjectDetail(projectId: string) {
    void queryClient.prefetchQuery({
      queryKey: ["project-detail", projectId],
      queryFn: () => apiClient.projectDetail(projectId),
      staleTime: PROJECT_DETAIL_STALE_TIME_MS
    });
  }
  const deleteProject = useMutation({
    mutationFn: apiClient.deleteProject,
    onSuccess: async () => {
      setInspectingProjectId("");
      setCollectingProject(null);
      setProjectPendingDeletion(null);
      setDeleteConfirmationName("");
      setDeleteError("");
      restoreRendererFocus();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["project-detail"] }),
        queryClient.invalidateQueries({ queryKey: ["reports"] })
      ]);
      restoreRendererFocus();
    },
    onError: (error) => {
      setDeleteError(error instanceof Error ? error.message : "Could not delete this project.");
    }
  });

  function confirmDeleteProject(project: ProjectSummary) {
    setProjectPendingDeletion(project);
    setDeleteConfirmationName("");
    setDeleteError("");
  }

  function closeDeleteProjectDialog() {
    if (deleteProject.isPending) {
      return;
    }
    setProjectPendingDeletion(null);
    setDeleteConfirmationName("");
    setDeleteError("");
  }

  function startProjectCollection(project: ProjectSummary) {
    const collectionState = projectCollectionState(project);
    const platform: ResearchPlatform = project.marketplace === "TIKTOK_SHOP" ? "TIKTOK_SHOP" : "SHOPEE_ID";
    setInspectingProjectId("");
    setCollectingProject(project);
    setCollectionBrowserUrl(collectionState.browserUrl ?? initialPlatformUrl(platform, project.keyword));
  }

  function closeProjectCollection() {
    const projectId = collectingProject?.id;
    setCollectingProject(null);
    if (projectId) {
      setInspectingProjectId(projectId);
    }
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
      <>
        <section className="mio-inspect-page">
          {detail.data ? (
            <ProjectInspectionPanel
              detail={detail.data}
              deleting={deleteProject.isPending}
              onBack={() => setInspectingProjectId("")}
              onDelete={() => confirmDeleteProject(detail.data.project)}
              onContinueCollection={() => startProjectCollection(detail.data.project)}
            />
          ) : (
            <Panel title="Project Inspector" icon={Search}>
              <EmptyState label="Loading project evidence..." />
            </Panel>
          )}
        </section>
        <ProjectDeleteDialog
          project={projectPendingDeletion}
          confirmationName={deleteConfirmationName}
          error={deleteError}
          deleting={deleteProject.isPending}
          onConfirmationNameChange={setDeleteConfirmationName}
          onCancel={closeDeleteProjectDialog}
          onDelete={() => projectPendingDeletion && deleteProject.mutate(projectPendingDeletion.id)}
        />
      </>
    );
  }

  return (
    <>
    <section className="mio-projects-view space-y-5">
      <Panel
        title="Keyword Projects"
        icon={Table2}
        action={
          <div className="flex items-center gap-2">
            <label className="mio-project-search">
              <Search size={15} aria-hidden="true" />
              <input
                value={projectSearch}
                onChange={(event) => setProjectSearch(event.target.value)}
                placeholder={translate(language, "Search projects")}
                aria-label={translate(language, "Search projects")}
              />
              {projectSearch ? (
                <button type="button" onClick={() => setProjectSearch("")} aria-label={translate(language, "Clear search")}>
                  <X size={14} />
                </button>
              ) : null}
            </label>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="input h-9 w-[180px] text-xs">
              <option value="all">{translate(language, "All categories")}</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <ProductViewToggle value={projectViewMode} onChange={setProjectViewMode} />
          </div>
        }
      >
        <div className={projectViewMode === "cards" ? "grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-3" : "space-y-2"}>
          {filteredProjects.map((project) => {
            const collectionState = projectCollectionState(project);
            const completed = isProjectComplete(project);
            return (
              <div
                key={project.id}
                role="button"
                tabIndex={0}
                aria-label={`Inspect ${project.name}`}
                onPointerEnter={() => prefetchProjectDetail(project.id)}
                onFocus={() => prefetchProjectDetail(project.id)}
                onClick={() => setInspectingProjectId(project.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setInspectingProjectId(project.id);
                  }
                }}
                className={[
                  "mio-project-card mio-result-card mio-project-result-card w-full cursor-pointer text-left",
                  completed ? "mio-project-card-completed" : "",
                  projectViewMode === "list" ? "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4" : ""
                ].join(" ")}
              >
                <div className="mio-result-card-body min-w-0">
                  <div className="mio-result-card-title-row">
                    <div className="min-w-0">
                      <div className="mio-project-card-title line-clamp-2 text-white">{project.name}</div>
                      <div className="mt-1 text-xs text-ink-500">{formatDateTime(project.createdAt)}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <ProjectStatusPill completed={completed} />
                      <CircularProgress value={collectionState.progressPercent} />
                    </div>
                  </div>
                  <div className="mio-card-chip-row">
                    <span className="mio-card-chip">{marketplaceLabel(project.marketplace)}</span>
                    <span className="mio-card-chip">{project.keyword}</span>
                    <span className="mio-card-chip">{project.productCategory ?? "No category"}</span>
                    <span className="mio-card-chip">{project.counts.products} products</span>
                    <span className="mio-card-chip">{project.counts.stores} stores</span>
                  </div>
                  <ProjectFilterMetadata project={project} chips />
                  <div className="mio-result-card-description flex items-center justify-between gap-3">
                    <span>{collectionState.stageLabel}</span>
                    <span>{collectionState.progressPercent}% complete</span>
                  </div>
                </div>
                <div className={projectViewMode === "list" ? "mio-result-card-actions flex shrink-0 flex-wrap items-center gap-2" : "mio-result-card-actions flex flex-wrap items-center gap-2"}>
                  <button className="secondary-button h-9 w-auto px-3" type="button" onClick={(event) => { event.stopPropagation(); setInspectingProjectId(project.id); }}>
                    <Search size={14} />
                    {translate(language, "Inspect")}
                  </button>
                  {!completed && (
                    <button className="primary-button h-9 w-auto px-3" type="button" onClick={(event) => { event.stopPropagation(); startProjectCollection(project); }}>
                      <ClipboardCheck size={14} />
                      {translate(language, "Continue Collection")}
                    </button>
                  )}
                  <button
                    className="secondary-button mio-danger-round mio-round-icon-button h-10 w-10 rounded-full px-0"
                    type="button"
                    onClick={(event) => { event.stopPropagation(); confirmDeleteProject(project); }}
                    disabled={deleteProject.isPending}
                    aria-label={`Delete ${project.name}`}
                    title={`Delete ${project.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
          {filteredProjects.length === 0 && <EmptyState label="No keyword projects match the current search and category." />}
        </div>
      </Panel>
    </section>
    <ProjectDeleteDialog
      project={projectPendingDeletion}
      confirmationName={deleteConfirmationName}
      error={deleteError}
      deleting={deleteProject.isPending}
      onConfirmationNameChange={setDeleteConfirmationName}
      onCancel={closeDeleteProjectDialog}
      onDelete={() => projectPendingDeletion && deleteProject.mutate(projectPendingDeletion.id)}
    />
    </>
  );
}

function ProjectDeleteDialog({
  project,
  confirmationName,
  error,
  deleting,
  onConfirmationNameChange,
  onCancel,
  onDelete
}: {
  project: ProjectSummary | null;
  confirmationName: string;
  error: string;
  deleting: boolean;
  onConfirmationNameChange: (value: string) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  useEffect(() => () => restoreRendererFocus(), []);

  if (!project) {
    return null;
  }

  return (
    <Modal
      open
      title="Delete keyword project?"
      description={(
        <span className="mio-delete-dialog-copy">
          This permanently removes the project, evidence, reports, and local files. Type <strong>{project.name}</strong> to confirm.
        </span>
      )}
      onClose={onCancel}
      className="mio-delete-dialog"
      actions={(
        <>
          <Button variant="ghost" onClick={onCancel} disabled={deleting}>Cancel</Button>
          <Button
            variant="danger"
            onClick={onDelete}
            loading={deleting}
            disabled={confirmationName !== project.name}
          >
            <Trash2 size={15} />
            {deleting ? "Deleting" : "Delete"}
          </Button>
        </>
      )}
    >
      <Input
        data-mio-autofocus
        value={confirmationName}
        onChange={(event) => onConfirmationNameChange(event.target.value)}
        aria-label="Project name confirmation"
      />
      {error && <div className="mio-form-error mt-3">{error}</div>}
    </Modal>
  );
}

function ProjectInspectionPanel({
  detail,
  deleting,
  onBack,
  onDelete,
  onContinueCollection
}: {
  detail: ProjectDetailPayload;
  deleting: boolean;
  onBack: () => void;
  onDelete: () => void;
  onContinueCollection: () => void;
}) {
  const language = useUiStore((state) => state.language);
  const evidenceTranslations = useEvidenceTranslations(projectEvidenceTranslationValues(detail), language);
  const queryClient = useQueryClient();
  const marketSummary = useMemo(() => projectMarketSummary(detail), [detail]);
  const collectionState = useMemo(() => projectCollectionState(detail.project), [detail.project]);
  const completed = isProjectComplete(detail.project);
  const outlineItems = useMemo(() => projectOutlineItems(detail), [detail]);
  const [outlineCollapsed, setOutlineCollapsed] = useState(false);
  const [openReportSectionIds, setOpenReportSectionIds] = useState<Set<string>>(() => new Set());
  const settings = useQuery({ queryKey: ["settings"], queryFn: apiClient.settings, staleTime: 60_000 });
  const aiConfigured = Boolean(settings.data?.openAiKeyConfigured || settings.data?.geminiKeyConfigured);
  const requestIntelligenceAnalysis = useMutation({
    mutationFn: () => apiClient.analyzeProject(detail.project.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project-detail", detail.project.id] });
    }
  });
  useEffect(() => {
    setOutlineCollapsed(false);
    setOpenReportSectionIds(new Set());
  }, [detail.project.id]);
  function setReportSectionOpen(id: string, open: boolean) {
    setOpenReportSectionIds((current) => {
      if (current.has(id) === open) return current;
      const next = new Set(current);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }
  function openReportSectionPath(ids: string[]) {
    setOpenReportSectionIds((current) => {
      const next = new Set(current);
      let changed = false;
      for (const id of ids) {
        if (next.has(id)) continue;
        next.add(id);
        changed = true;
      }
      return changed ? next : current;
    });
  }
  return (
    <section className="mio-project-inspector-page space-y-6">
      <div className="mio-project-inspector-back-row">
        <button className="secondary-button h-9 w-auto shrink-0 px-3" type="button" onClick={onBack} aria-label={translate(language, "Back to projects")} title={translate(language, "Back to projects")}>
          <ChevronLeft size={16} />
          {translate(language, "Back to projects")}
        </button>
      </div>

      <div className="mio-inspector-summary-row">
        <div className={["mio-inspector-metrics-grid mio-inspector-market-summary grid grid-cols-2 gap-3", completed ? "mio-completion-highlight" : ""].join(" ")}>
          <Metric
            icon={ShoppingBag}
            label={translate(language, "Price Range")}
            value={marketSummary.priceRange}
            detail={`${marketSummary.pricedProducts} / ${detail.products.length} ${translate(language, "products with price evidence")}`}
          />
          <Metric
            icon={Store}
            label={translate(language, "Stores")}
            value={detail.stores.length}
            detail={translate(language, "collected marketplace stores")}
          />
        </div>

        <div className={["mio-saved-progress-compact rounded-md border border-white/8 bg-white/5 p-3", completed ? "mio-completion-highlight" : ""].join(" ")}>
          <div className="grid items-center gap-4 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.2fr)]">
          <CircularProgress value={collectionState.progressPercent} />
          <div className="min-w-0">
            <div className="text-base font-semibold text-white">{translate(language, "Saved Collection Progress")}</div>
            <div className="mt-1 truncate text-sm text-ink-500">{collectionState.stageLabel}</div>
            <div className="mt-2"><ProjectFilterMetadata project={detail.project} /></div>
            <div className="mt-2 text-xs text-ink-500">{marketplaceLabel(detail.project.marketplace)} · {formatDateTime(detail.project.createdAt)}</div>
          </div>
          <div className="min-w-0 space-y-3">
            {collectionState.browserUrl ? (
              <button className="secondary-button h-8 w-auto max-w-full rounded-full px-3 text-xs" type="button" onClick={() => void apiClient.openUrl(collectionState.browserUrl ?? "")}>
                <span className="truncate">{translate(language, "Saved URL")}</span>
                <ExternalLink size={13} />
              </button>
            ) : (
              <div className="text-xs text-ink-400">{translate(language, "No browser URL saved")}</div>
            )}
            <div className="grid grid-cols-2 gap-3 text-xs text-ink-400">
              <InfoLine label={translate(language, "Current Step")} value={collectionState.currentStepId ?? translate(language, "Not selected")} />
              <InfoLine label={translate(language, "View Mode")} value={collectionState.viewMode ?? translate(language, "Default")} />
            </div>
          </div>
          <div className="mio-saved-progress-actions flex flex-wrap items-center justify-end gap-2 md:col-span-3">
            <button className="primary-button h-10 w-auto px-5" type="button" onClick={onContinueCollection}>
              <ClipboardCheck size={15} />
              {translate(language, completed ? "Collect Again" : "Continue Collection")}
            </button>
            <button className="secondary-button mio-danger-round mio-round-icon-button h-10 w-10 px-0" type="button" onClick={onDelete} disabled={deleting} aria-label="Delete project" title="Delete project">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
      </div>

      <EvidenceTranslationContext.Provider value={evidenceTranslations.text}>
      <ReportSectionExpansionContext.Provider
        value={{
          openSectionIds: openReportSectionIds,
          setSectionOpen: setReportSectionOpen,
          openSectionPath: openReportSectionPath
        }}
      >
        <div className={[
          "mio-project-workspace grid gap-5",
          outlineCollapsed ? "mio-project-workspace-collapsed grid-cols-[48px_minmax(0,1fr)]" : "grid-cols-[260px_minmax(0,1fr)]"
        ].join(" ")}>
          <ProjectOutlineNav
            items={outlineItems}
            collapsed={outlineCollapsed}
            onToggle={() => setOutlineCollapsed((collapsed) => !collapsed)}
          />
          <ProjectReportOutline
            detail={detail}
            intelligenceAnalyzing={requestIntelligenceAnalysis.isPending}
            intelligenceError={requestIntelligenceAnalysis.error instanceof Error ? requestIntelligenceAnalysis.error.message : undefined}
            aiConfigured={aiConfigured}
            onGenerateIntelligence={() => requestIntelligenceAnalysis.mutate()}
            onContinueCollection={onContinueCollection}
          />
        </div>
      </ReportSectionExpansionContext.Provider>
      </EvidenceTranslationContext.Provider>
    </section>
  );
}

function projectEvidenceTranslationValues(detail: ProjectDetailPayload): Array<string | null | undefined> {
  return [
    ...detail.stores.flatMap((store) => [
      store.description,
      ...store.categories.map((category) => parseStoreCategory(category).name),
      ...store.ratingSamples.flatMap((sample) => [
        sample.productTitle,
        sample.productVariation,
        sample.comment,
        sample.sellerResponse
      ])
    ]),
    ...detail.reviews.map((review) => reviewCommentCell(review)),
    ...detail.products.flatMap((product) => [product.description, product.selectionReason]),
    ...detail.analyses.flatMap(analysisTranslationValues),
    projectOverviewText(detail)
  ];
}

function ProjectReportOutline({
  detail,
  intelligenceAnalyzing,
  intelligenceError,
  aiConfigured,
  onGenerateIntelligence,
  onContinueCollection
}: {
  detail: ProjectDetailPayload;
  intelligenceAnalyzing: boolean;
  intelligenceError?: string;
  aiConfigured: boolean;
  onGenerateIntelligence: () => void;
  onContinueCollection: () => void;
}) {
  const language = useUiStore((state) => state.language);
  const evidenceText = useContext(EvidenceTranslationContext);
  const searchFilters = projectCollectionState(detail.project).searchFilters;
  const relevanceProducts = useMemo(
    () => detail.products.filter((product) => product.source === "Relevance"),
    [detail.products]
  );
  const topSalesProducts = useMemo(
    () => detail.products.filter((product) => product.source === "Top Sales"),
    [detail.products]
  );
  const keyProducts = useMemo(
    () => projectSavedKeyProductCandidates(detail),
    [detail]
  );
  const intelligence = useMemo(() => latestProjectCompetitionAnalysis(detail), [detail]);
  const manualKeyProductIds = useMemo(() => manualQualifiedProductIdentities(detail), [detail]);
  const reviewsByProduct = useMemo(() => {
    const grouped = new Map<string, ProjectDetailPayload["reviews"]>();
    for (const review of detail.reviews) {
      const reviews = grouped.get(review.productId) ?? [];
      reviews.push(review);
      grouped.set(review.productId, reviews);
    }
    return grouped;
  }, [detail.reviews]);
  return (
    <div className="space-y-3">
      <ReportOutlineSection id="project-overview" title={translate(language, "Overview")}>
        <div className="rounded-md border border-white/8 bg-white/5 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.1em] text-ink-500">
              {translate(language, detail.analyses.length > 0 ? "AI evidence analysis" : "Evidence-based overview")}
            </span>
            {intelligenceAnalyzing && <span className="text-xs text-signal-blue">{translate(language, "Analyzing current evidence…")}</span>}
          </div>
          {intelligenceAnalyzing ? <LoadingSkeleton lines={4} compact /> : <p className="whitespace-pre-line text-sm leading-6 text-ink-300">{evidenceText(projectOverviewText(detail))}</p>}
        </div>
      </ReportOutlineSection>

      <ReportOutlineSection id="keyword-general" title="Keyword General">
        <div className="mb-3 grid gap-3 rounded-md border border-white/8 bg-white/5 p-3 text-xs sm:grid-cols-2">
          <InfoLine
            label="Shop Type Filters"
            value={
              searchFilters?.shopTypes.length
                ? searchFilters.shopTypes
                    .map((id) => SHOPEE_SHOP_TYPE_OPTIONS.find((option) => option.id === id)?.label ?? id)
                    .join(", ")
                : "All shop types"
            }
          />
          <InfoLine
            label="Price Range"
            value={
              searchFilters?.priceMin !== undefined || searchFilters?.priceMax !== undefined
                ? `${searchFilters.priceMin !== undefined ? formatCurrency(searchFilters.priceMin) : "No minimum"} - ${searchFilters.priceMax !== undefined ? formatCurrency(searchFilters.priceMax) : "No maximum"}`
                : "All prices"
            }
          />
        </div>
        <NestedReportSection id="keyword-relevance" title="Relevance">
          <AssetList assets={detail.assets.filter((asset) => asset.kind === "SEARCH_RESULT")} />
          <ProductCardGrid products={relevanceProducts} />
        </NestedReportSection>
        <NestedReportSection id="keyword-top-sales" title="Top Sales">
          <AssetList assets={detail.assets.filter((asset) => asset.kind === "TOP_SALES")} />
          <ProductCardGrid products={topSalesProducts} />
        </NestedReportSection>
      </ReportOutlineSection>

      <ReportOutlineSection id="key-product" title="Key Product">
        <div className="mb-3 rounded-md border border-white/8 bg-white/5 p-3 text-xs leading-5 text-ink-400">
          Monthly sold only applies to Top Sales result snapshots. Total sold is collected from PDP evidence when visible.
          Rating is the star value; Reviews is the rating/review count. Price ranges are stored as estimated average price.
        </div>
        <div id="key-product-info" className="scroll-mt-20">
          <ProductInfoTable products={keyProducts} manuallyAddedIdentities={manualKeyProductIds} />
        </div>
      </ReportOutlineSection>

      <ReportOutlineSection id="product-detail-qualified" title="Product Detailed Qualified">
        <div className="space-y-3">
          {keyProducts.map((product) => (
            <NestedReportSection key={product.id} id={`product-${product.id}`} title={displayProductTitle(product)}>
              <ProductQualifiedSection
                product={product}
                reviews={reviewsByProduct.get(product.id) ?? []}
                assets={productAssetsForStep(detail, product)}
                sectionIdPrefix={`product-${product.id}`}
              />
            </NestedReportSection>
          ))}
          {keyProducts.length === 0 && <EmptyState label="Capture Relevance and Top Sales first to generate dynamic product detail steps." />}
        </div>
      </ReportOutlineSection>

      <ReportOutlineSection id="key-store-pages" title="Key Store Page List">
        <KeyStorePanel detail={detail} onContinueCollection={onContinueCollection} />
      </ReportOutlineSection>

      <ReportOutlineSection id="competition-matrix" title="Keyword Search Analysis & Top 10 Competition Matrix">
        <ProjectCompetitionMatrix
          analysis={intelligence}
          loading={intelligenceAnalyzing}
          error={intelligenceError}
          aiConfigured={aiConfigured}
          onGenerate={onGenerateIntelligence}
        />
      </ReportOutlineSection>
    </div>
  );
}

function projectOutlineItems(detail: ProjectDetailPayload): Array<{ id: string; label: string; depth: number }> {
  const keyProducts = projectSavedKeyProductCandidates(detail);
  const storeCandidates = projectSavedStoreCandidates(detail);
  return [
    { id: "project-overview", label: "Overview", depth: 0 },
    { id: "keyword-general", label: "Keyword General", depth: 0 },
    { id: "keyword-relevance", label: "Relevance", depth: 1 },
    { id: "keyword-top-sales", label: "Top sales", depth: 1 },
    { id: "key-product", label: "Key Product", depth: 0 },
    { id: "key-product-info", label: "Product info", depth: 1 },
    { id: "product-detail-qualified", label: "Product Detail Qualified", depth: 0 },
    ...keyProducts.flatMap((product, index) => [
      { id: `product-${product.id}`, label: displayProductTitle(product, `Product ${index + 1}`), depth: 1 },
      { id: `product-${product.id}-first-page`, label: "First page", depth: 2 },
      { id: `product-${product.id}-slides`, label: "Slides and images", depth: 2 },
      { id: `product-${product.id}-description`, label: "Description", depth: 2 },
      { id: `product-${product.id}-reviews`, label: "Reviews", depth: 2 },
      { id: `product-${product.id}-media`, label: "Media in user", depth: 2 },
      { id: `product-${product.id}-shop-home`, label: "Shop homepage", depth: 2 }
    ]),
    { id: "key-store-pages", label: "Key Store Page List", depth: 0 },
    ...storeCandidates.flatMap((candidate, index) => [
      { id: `store-${candidate.id}`, label: candidate.storeName || `Store ${index + 1}`, depth: 1 },
      { id: `store-${candidate.id}-overall`, label: "Overall", depth: 2 },
      { id: `store-${candidate.id}-home`, label: "Store Home Page", depth: 2 },
      { id: `store-${candidate.id}-data`, label: "Store Data", depth: 2 },
      { id: `store-${candidate.id}-rating-negative`, label: "1 Star Store Ratings", depth: 2 },
      { id: `store-${candidate.id}-rating-positive`, label: "5 Star Store Ratings", depth: 2 },
      { id: `store-${candidate.id}-categories`, label: "Store Product Categories", depth: 2 },
      { id: `store-${candidate.id}-popular`, label: "Popular Products", depth: 2 },
      { id: `store-${candidate.id}-best-sellers`, label: "Store Best Sellers", depth: 2 },
      { id: `store-${candidate.id}-visual`, label: "Visual Shop Banner", depth: 2 },
      { id: `store-${candidate.id}-tiktok`, label: "TikTok Evidence", depth: 2 }
    ]),
    { id: "competition-matrix", label: "Keyword Search Analysis & Top 10 Competition Matrix", depth: 0 }
  ];
}

type ProjectCompetitionAnalysis = {
  provider: string;
  createdAt: string;
  matrix: AiAnalysisJson["keywordCompetitionMatrix"];
  insights: AiAnalysisJson["synthesizedCategoryInsights"];
};

function latestProjectCompetitionAnalysis(detail: ProjectDetailPayload): ProjectCompetitionAnalysis | null {
  const analyses = [...detail.analyses].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  for (const analysis of analyses) {
    try {
      const parsed = JSON.parse(analysis.resultJson) as Partial<AiAnalysisJson>;
      const matrix = Array.isArray(parsed.keywordCompetitionMatrix)
        ? parsed.keywordCompetitionMatrix.filter((row) =>
            Boolean(row) && typeof row.productName === "string" && typeof row.priceRange === "string" &&
            typeof row.uspKeyClaim === "string" && typeof row.rating === "string" && typeof row.shortDescription === "string"
          ).slice(0, 10)
        : [];
      const insights = Array.isArray(parsed.synthesizedCategoryInsights)
        ? parsed.synthesizedCategoryInsights.filter((item) =>
            Boolean(item) && typeof item.title === "string" && typeof item.insight === "string"
          ).slice(0, 5)
        : [];
      if (matrix.length > 0 || insights.length > 0) {
        return { provider: analysis.provider, createdAt: analysis.createdAt, matrix, insights };
      }
    } catch {
      // Ignore older or incomplete analysis records and continue to the next one.
    }
  }
  return null;
}

function analysisTranslationValues(analysis: ProjectDetailPayload["analyses"][number]): string[] {
  try {
    const parsed = JSON.parse(analysis.resultJson) as Partial<AiAnalysisJson>;
    return [
      ...(parsed.keywordCompetitionMatrix ?? []).flatMap((row) => [row.productName, row.uspKeyClaim, row.shortDescription]),
      ...(parsed.synthesizedCategoryInsights ?? []).flatMap((item) => [item.title, item.insight])
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  } catch {
    return [];
  }
}

function manualQualifiedProductIdentities(detail: ProjectDetailPayload): ReadonlySet<string> {
  const references = projectCollectionState(detail.project).qualifiedProductReferences?.filter((reference) => reference.manuallyAdded) ?? [];
  const identities = new Set<string>();
  for (const product of projectSavedKeyProductCandidates(detail, 120)) {
    const productReference = createQualifiedProductReference(product);
    if (references.some((reference) =>
      (reference.productId && reference.productId === productReference.productId) ||
      (reference.productUrl && reference.productUrl === productReference.productUrl) ||
      (reference.fallbackIdentity && reference.fallbackIdentity === productReference.fallbackIdentity)
    )) {
      identities.add(product.id);
      identities.add(stableProductIdentity(product));
    }
  }
  return identities;
}

function projectMarketSummary(detail: ProjectDetailPayload): { priceRange: string; pricedProducts: number } {
  const pricedProducts = detail.products.filter((product) =>
    typeof product.priceAverage === "number" && Number.isFinite(product.priceAverage) && product.priceAverage > 0
  );
  const minimums = pricedProducts
    .map((product) => product.priceAverage)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);
  const maximums = pricedProducts
    .map((product) => product.priceAverage)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);
  if (minimums.length === 0 || maximums.length === 0) {
    return { priceRange: "-", pricedProducts: 0 };
  }
  return {
    priceRange: `${formatCurrency(Math.min(...minimums))} – ${formatCurrency(Math.max(...maximums))}`,
    pricedProducts: pricedProducts.length
  };
}

function ProjectCompetitionMatrix({
  analysis,
  loading,
  error,
  aiConfigured,
  onGenerate
}: {
  analysis: ProjectCompetitionAnalysis | null;
  loading: boolean;
  error?: string;
  aiConfigured: boolean;
  onGenerate: () => void;
}) {
  const language = useUiStore((state) => state.language);
  const evidenceText = useContext(EvidenceTranslationContext);
  return (
    <div className="mio-competition-analysis">
      <div className="mio-competition-analysis-toolbar">
        <div>
          <div className="text-sm font-semibold text-white">{translate(language, "Synthesized marketplace competition evidence")}</div>
          <div className="mt-1 text-xs text-ink-500">
            {analysis
              ? `${translate(language, "Generated with")} ${analysis.provider} · ${formatDateTime(analysis.createdAt)}`
              : translate(language, "Generate this section from the saved project evidence and configured AI provider.")}
          </div>
        </div>
        <button className="primary-button h-9 w-auto px-4" type="button" disabled={!aiConfigured || loading} onClick={onGenerate}>
          <Sparkles size={15} />
          {translate(language, analysis ? "Regenerate" : "Generate")}
        </button>
      </div>
      {!aiConfigured && (
        <div className="mio-inline-error mt-3">
          {translate(language, "Configure an OpenAI or Gemini API key in Settings before generating this AI-only section.")}
        </div>
      )}
      {error && <div className="mio-inline-error mt-3">{error}</div>}
      {loading ? (
        <LoadingSkeleton lines={7} className="mt-4" />
      ) : analysis ? (
        <div className="mio-competition-analysis-grid mt-4">
          <div className="mio-competition-matrix-table-wrap">
            <table className="mio-competition-matrix-table">
              <thead>
                <tr>
                  <th>{translate(language, "Product Name")}</th>
                  <th>{translate(language, "Price Range")}</th>
                  <th>{translate(language, "USP / Key Claim")}</th>
                  <th>{translate(language, "Rating")}</th>
                  <th>{translate(language, "Short Description")}</th>
                </tr>
              </thead>
              <tbody>
                {analysis.matrix.map((row, index) => (
                  <tr key={`${row.productName}-${index}`}>
                    <td><strong>{index + 1}. {evidenceText(row.productName)}</strong></td>
                    <td>{row.priceRange}</td>
                    <td>{evidenceText(row.uspKeyClaim)}</td>
                    <td>{row.rating}</td>
                    <td>{evidenceText(row.shortDescription)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <aside className="mio-competition-insights">
            <h3>{translate(language, "Synthesized Category Insights")}</h3>
            <ol>
              {analysis.insights.map((item, index) => (
                <li key={`${item.title}-${index}`}>
                  <strong>{index + 1}. {evidenceText(item.title)}</strong>
                  <p>{evidenceText(item.insight)}</p>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      ) : (
        <EmptyState
          compact
          title={translate(language, "AI competition analysis is ready to generate")}
          label={translate(language, "The generated matrix and five specialist insights will also be used by report exports.")}
          illustration="search"
        />
      )}
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
  const language = useUiStore((state) => state.language);
  const evidenceText = useContext(EvidenceTranslationContext);
  const candidates = projectSavedStoreCandidates(detail);
  if (candidates.length === 0) {
    return <EmptyState label={translate(language, "No store pages yet. Approve qualified products or add a store page first.")} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/8 bg-white/5 p-3">
        <div>
          <div className="text-xs uppercase tracking-[0.12em] text-ink-500">{translate(language, "Key Store Page List")}</div>
          <div className="mt-1 text-base font-semibold text-white">{candidates.length} {translate(language, "store pages")}</div>
          <div className="mt-1 text-xs text-ink-400">{translate(language, "Each store keeps its own homepage, profile, ratings, categories, products, banner, and TikTok evidence.")}</div>
        </div>
        <button className="primary-button h-9 w-auto px-3" type="button" onClick={onContinueCollection}>
          <ClipboardCheck size={15} />
          {translate(language, "Continue Store Collection")}
        </button>
      </div>

      {candidates.map((candidate) => {
        const store = findCollectedStore(detail, candidate);
        const ratings = store?.ratingSamples ?? [];
        const popularProducts = storeProductsForCandidate(detail, candidate, "Store Products");
        const fallbackProducts = projectSavedKeyProductCandidates(detail, 20)
          .filter((product) => productMatchesCollectionCandidate(product, candidate));
        return (
          <NestedReportSection key={candidate.id} id={`store-${candidate.id}`} title={candidate.storeName}>
            <div className="space-y-3">
              <NestedReportSection id={`store-${candidate.id}-overall`} title="Overall">
                <div className="space-y-2 text-sm leading-6 text-ink-300">
                  {collectedStoreConclusions(candidate, store).map((sentence) => <p key={sentence}>{evidenceText(sentence)}</p>)}
                </div>
              </NestedReportSection>
              <NestedReportSection id={`store-${candidate.id}-home`} title="Store Home Page">
                <AssetList assets={storeAssetsForCandidate(detail, candidate, "STORE_HOME")} limit={12} />
              </NestedReportSection>
              <NestedReportSection id={`store-${candidate.id}-data`} title="Store Data">
                {store ? (
                  <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <InfoLine label={translate(language, "Products")} value={formatOptionalNumber(store.productsCount)} />
                    <InfoLine label={translate(language, "Followers")} value={formatOptionalNumber(store.followers)} />
                    <InfoLine label={translate(language, "Following")} value={formatOptionalNumber(store.following)} />
                    <InfoLine label={translate(language, "Rating")} value={store.rating ? `${store.rating}${store.ratingCount ? ` (${formatOptionalNumber(store.ratingCount)} ${translate(language, "Rating")})` : ""}` : "-"} />
                    <InfoLine label={translate(language, "Chat Performance")} value={sanitizeStoreMetric(store.chatResponse)} />
                    <InfoLine label={translate(language, "Joined")} value={sanitizeStoreMetric(store.joinedDate)} />
                    <div className="sm:col-span-2 lg:col-span-4"><InfoLine label={translate(language, "Description Store")} value={evidenceText(sanitizeStoreDescription(store.description))} /></div>
                  </div>
                ) : <EmptyState label="Store details have not been collected." />}
              </NestedReportSection>
              <NestedReportSection id={`store-${candidate.id}-rating-negative`} title="1 Star Store Ratings">
                <StoreRatingSamples candidate={candidate} samples={ratings.filter((sample) => sample.rating === 1)} />
              </NestedReportSection>
              <NestedReportSection id={`store-${candidate.id}-rating-positive`} title="5 Star Store Ratings">
                <StoreRatingSamples candidate={candidate} samples={ratings.filter((sample) => sample.rating === 5)} />
              </NestedReportSection>
              <NestedReportSection id={`store-${candidate.id}-categories`} title="Store Product Categories">
                {store?.categories?.length ? (
                  <div className="overflow-x-auto rounded-md border border-white/8">
                    <table className="w-full min-w-[420px] text-left text-sm">
                      <thead className="bg-white/[0.04] text-xs text-ink-400">
                              <tr><th className="px-3 py-2">{translate(language, "Category Name")}</th><th className="px-3 py-2 text-right">{translate(language, "Total Product")}</th></tr>
                      </thead>
                      <tbody>
                        {store.categories.map((category) => {
                          const parsed = parseStoreCategory(category);
                          return (
                            <tr key={category} className="border-t border-white/8">
                              <td className="px-3 py-2 text-ink-200">{evidenceText(parsed.name)}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-ink-400">{parsed.total ?? "-"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : <EmptyState label="No store categories collected." />}
              </NestedReportSection>
              <NestedReportSection id={`store-${candidate.id}-popular`} title="Popular Products">
                <ProductCardGrid products={popularProducts.length > 0 ? popularProducts : fallbackProducts} limit={80} />
              </NestedReportSection>
              <NestedReportSection id={`store-${candidate.id}-best-sellers`} title="Store Best Sellers">
                <ProductCardGrid products={storeProductsForCandidate(detail, candidate, "Store Best Sellers")} limit={80} />
              </NestedReportSection>
              <NestedReportSection id={`store-${candidate.id}-visual`} title="Visual Shop Banner">
                <AssetList assets={storeAssetsForCandidate(detail, candidate, "STORE_BANNER")} limit={80} />
              </NestedReportSection>
              <NestedReportSection id={`store-${candidate.id}-tiktok`} title="TikTok Evidence">
                <AssetList assets={storeSocialAssetsForCandidate(detail, candidate)} limit={12} />
              </NestedReportSection>
            </div>
          </NestedReportSection>
        );
      })}
    </div>
  );
}

function StoreRatingSamples({
  candidate,
  samples
}: {
  candidate: StoreCollectionCandidate;
  samples: NonNullable<ProjectDetailPayload["stores"][number]["ratingSamples"]>;
}) {
  const [previewUrl, setPreviewUrl] = useState("");
  const language = useUiStore((state) => state.language);
  const evidenceText = useContext(EvidenceTranslationContext);
  if (samples.length === 0) {
    return <EmptyState label={translate(language, "No store rating samples collected. Desktop view is recommended for this collector.")} />;
  }
  return (
    <>
      <div className="space-y-3">
        <div className="rounded-md border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-ink-500">
          {translate(language, "Desktop view is recommended for collecting store ratings.")}
        </div>
        {samples.slice(0, 5).map((sample, index) => (
          <article key={`${candidate.id}-${sample.rating}-${index}`} className="mio-store-rating-evidence overflow-hidden rounded-md border border-white/8">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-white/[0.04] text-xs text-ink-400">
                <tr>
                  <th className="w-14 px-3 py-2">{translate(language, "No")}</th>
                  <th className="w-[24%] px-3 py-2">{translate(language, "Product")}</th>
                  <th className="w-[40%] px-3 py-2">{translate(language, "Comment")}</th>
                  <th className="px-3 py-2">{translate(language, "Seller response")}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/8 align-top">
                  <td className="px-3 py-3 tabular-nums text-ink-500">{index + 1}</td>
                  <td className="px-3 py-3">
                    {sample.productUrl ? (
                      <button type="button" className="text-left font-medium text-signal-blue hover:underline" onClick={() => void apiClient.openUrl(sample.productUrl!)}>
                         {evidenceText(sample.productTitle) || translate(language, "Open rated product")}
                      </button>
                    ) : <span className="text-ink-500">{evidenceText(sample.productTitle) || translate(language, "Product link unavailable")}</span>}
                    {sample.productVariation && <div className="mt-1 text-xs text-ink-500">{evidenceText(sample.productVariation)}</div>}
                  </td>
                  <td className="px-3 py-3 leading-5 text-ink-300">
                    {sample.reviewerUrl ? (
                      <button type="button" className="font-medium text-signal-blue hover:underline" onClick={() => void apiClient.openUrl(sample.reviewerUrl!)}>
                        {sample.reviewer || "—"}
                      </button>
                    ) : <div className="font-medium text-ink-100">{sample.reviewer || "—"}</div>}
                    <div className="mb-2 mt-0.5 text-xs text-ink-500">{sample.capturedAt ?? "—"}</div>
                    <div className="whitespace-pre-line">{evidenceText(sample.comment) || "—"}</div>
                  </td>
                  <td className="px-3 py-3">
                    {sample.sellerResponse ? (
                      <div className="rounded-md border border-white/8 bg-white/[0.04] px-3 py-2 text-xs leading-5 text-ink-300">
                        {evidenceText(sample.sellerResponse)}
                      </div>
                    ) : <span className="text-ink-500">—</span>}
                  </td>
                </tr>
              </tbody>
              </table>
            </div>
            {sample.mediaUrls.length > 0 && (
              <div className="mio-store-rating-media border-t border-white/8 px-3 py-3">
                <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500">{translate(language, "Attached media")}</div>
                <div className="flex flex-wrap gap-2">
                  {sample.mediaUrls.slice(0, 6).map((url) => isVideoMediaUrl(url) ? (
                    <video key={url} src={imageSource(url)} controls preload="metadata" className="h-24 w-24 rounded-md bg-black object-cover" />
                  ) : (
                    <button key={url} type="button" className="overflow-hidden rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-blue/60" onClick={() => setPreviewUrl(url)}>
                      <img src={imageSource(url)} alt={`${sample.reviewer || "Store"} rating evidence`} loading="lazy" decoding="async" className="h-24 w-24 object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
      <Modal open={Boolean(previewUrl)} title="Rating evidence" onClose={() => setPreviewUrl("")} className="mio-file-preview-modal">
        {previewUrl ? <div className="mio-file-preview-image"><img src={imageSource(previewUrl)} alt="Store rating evidence preview" /></div> : null}
      </Modal>
    </>
  );
}

function isVideoMediaUrl(value: string): boolean {
  return /(?:\.mp4|\.webm|\.mov|\.m3u8)(?:$|[?#])|\bvideo\b/iu.test(value);
}

function findCollectedStore(detail: ProjectDetailPayload, candidate: StoreCollectionCandidate) {
  return detail.stores.find((store) =>
    Boolean(candidate.shopId && store.marketplaceStoreId === candidate.shopId) ||
    Boolean(store.url && candidate.storeUrl && sameStoreIntent(store.url, candidate.storeUrl)) ||
    normalizeComparableStoreName(store.name) === normalizeComparableStoreName(candidate.storeName)
  );
}

function collectedStoreConclusions(
  candidate: StoreCollectionCandidate,
  store: ProjectDetailPayload["stores"][number] | undefined
): string[] {
  if (!store) {
    return [`${candidate.storeName} is queued for structured store collection. Complete its store data, ratings, categories, product matrix, and visual evidence.`];
  }
  const summary = `${store.name} has ${formatOptionalNumber(store.productsCount)} total products and currently stands at ${store.rating ?? "-"}${store.ratingCount ? ` from ${formatOptionalNumber(store.ratingCount)} ratings` : " rating"}, ${formatOptionalNumber(store.followers)} followers, and chat performance ${sanitizeStoreMetric(store.chatResponse)}${sanitizeStoreMetric(store.joinedDate) !== "-" ? `. The store joined ${sanitizeStoreMetric(store.joinedDate)}` : ""}.`;
  const description = sanitizeStoreDescription(store.description);
  return limitWords([
    summary,
    description !== "-" ? description : "This summary is based on the collected profile, ratings, categories, products, promotions, and visual evidence."
  ].join("\n\n"), 1500).split("\n\n");
}

function projectOverviewText(detail: ProjectDetailPayload): string {
  const latestAnalysis = [...detail.analyses]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .find((analysis) => {
      try {
        const value = JSON.parse(analysis.resultJson) as Record<string, unknown>;
        return typeof value.executiveSummary === "string" && value.executiveSummary.trim().length > 0;
      } catch {
        return false;
      }
    });
  if (latestAnalysis) {
    try {
      const value = JSON.parse(latestAnalysis.resultJson) as Record<string, unknown>;
      if (typeof value.executiveSummary === "string") {
        return limitCharacters(value.executiveSummary, 2500);
      }
    } catch {
      // Fall through to the deterministic evidence summary.
    }
  }
  const completedStores = detail.stores.filter((store) =>
    [store.productsCount, store.followers, store.rating, store.chatResponse, store.description]
      .some((value) => value !== null && value !== undefined && value !== "")
  );
  const topSalesCount = detail.products.filter((product) => product.source === "Top Sales").length;
  const relevanceCount = detail.products.filter((product) => product.source === "Relevance").length;
  const leadingStore = [...completedStores].sort((left, right) => (right.followers ?? 0) - (left.followers ?? 0))[0];
  return limitCharacters([
    `${detail.project.name} currently contains ${detail.products.length} collected products, including ${relevanceCount} relevance results and ${topSalesCount} top-sales results, supported by ${detail.assets.length} evidence files and ${detail.reviews.length} review records.`,
    completedStores.length > 0
      ? `${completedStores.length} store profiles have structured evidence${leadingStore ? `; ${leadingStore.name} currently leads the collected set with ${formatOptionalNumber(leadingStore.followers)} followers and a ${leadingStore.rating ?? "-"} rating` : ""}.`
      : "Store-level conclusions will become more specific as profile, rating, category, product, and visual evidence is collected.",
    "This local overview is tied directly to saved marketplace evidence and will be replaced automatically by the configured AI analysis when available."
  ].join("\n\n"), 2500);
}

function limitCharacters(value: string, maximum: number): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  return normalized.length <= maximum ? normalized : `${normalized.slice(0, Math.max(0, maximum - 1)).trimEnd()}…`;
}

function sanitizeStoreMetric(value?: string | null): string {
  const normalized = value?.replace(/\s+/gu, " ").trim() ?? "";
  return normalized && normalized.length <= 120 ? normalized : "-";
}

function sanitizeStoreDescription(value?: string | null): string {
  const source = value?.trim() ?? "";
  if (!source) {
    return "-";
  }
  const explicit = source.match(/(?:Description Store|Store Description|Deskripsi Toko)\s*:?\s*([\s\S]{20,2400})/iu)?.[1];
  const officialAccount = source.match(/([^\n]{0,160}(?:adalah akun resmi|is the official (?:store|account))[^\n]{20,1200})/iu)?.[1];
  const candidate = explicit || officialAccount || source;
  const normalized = candidate.replace(/\s+/gu, " ").trim();
  if (normalized.length > 2400 || /(shopping cart|seller centre|customer service help centre).*(all rights reserved)/iu.test(normalized)) {
    return "-";
  }
  return normalized;
}

function parseStoreCategory(value: string): { name: string; total?: number } {
  const match = value.trim().match(/^(.*?)\s*\(\s*(\d+)\s*\)\s*$/u);
  return match ? { name: match[1].trim(), total: Number(match[2]) } : { name: value.trim() };
}

function limitWords(value: string, maximumWords: number): string {
  const words = value.trim().split(/\s+/u);
  return words.length <= maximumWords ? value.trim() : `${words.slice(0, maximumWords).join(" ")}…`;
}

function storeProductsForCandidate(
  detail: ProjectDetailPayload,
  candidate: StoreCollectionCandidate,
  prefix: "Store Products" | "Store Best Sellers"
) {
  return detail.products.filter((product) =>
    product.source?.startsWith(prefix) &&
    (product.source === `${prefix}:${candidate.id}` || productMatchesCollectionCandidate(product, candidate))
  );
}

function storeAssetsForCandidate(
  detail: ProjectDetailPayload,
  candidate: StoreCollectionCandidate,
  kind: "STORE_HOME" | "STORE_BANNER"
) {
  return detail.assets.filter((asset) =>
    asset.kind === kind &&
    (
      asset.ownerId === candidate.id ||
      Boolean(asset.sourceUrl && candidate.storeUrl && sameStoreIntent(asset.sourceUrl, candidate.storeUrl))
    )
  );
}

function storeSocialAssetsForCandidate(
  detail: ProjectDetailPayload,
  candidate: StoreCollectionCandidate
) {
  const candidateName = normalizeComparableStoreName(candidate.storeName);
  return detail.assets.filter((asset) =>
    asset.kind === "SOCIAL_ACCOUNT" &&
    (
      asset.ownerId === candidate.id ||
      Boolean(candidateName && normalizeComparableStoreName(asset.label).includes(candidateName))
    )
  );
}

function productMatchesCollectionCandidate(
  product: ProjectProductEvidence,
  candidate: StoreCollectionCandidate
): boolean {
  return Boolean(
    product.storeUrl && candidate.storeUrl && sameStoreIntent(product.storeUrl, candidate.storeUrl)
  ) || normalizeComparableStoreName(product.storeName) === normalizeComparableStoreName(candidate.storeName);
}

function normalizeComparableStoreName(value?: string | null): string {
  return value?.trim().toLocaleLowerCase().replace(/\s+/gu, " ") ?? "";
}

function ProjectOutlineNav({
  items,
  collapsed,
  onToggle
}: {
  items: Array<{ id: string; label: string; depth: number }>;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const groups = useMemo(() => groupProjectOutlineItems(items), [items]);
  const [activeTargetId, setActiveTargetId] = useState(items[0]?.id ?? "");
  const sectionExpansion = useContext(ReportSectionExpansionContext);
  function outlinePath(id: string): string[] {
    for (const group of groups) {
      if (group.id === id) return [group.id];
      for (const item of group.children) {
        if (item.id === id) return [group.id, item.id];
        if (item.children.some((child) => child.id === id)) return [group.id, item.id, id];
      }
    }
    return [id];
  }
  function outlineSubtreeIds(id: string): string[] {
    for (const group of groups) {
      if (group.id === id) {
        return [
          group.id,
          ...group.children.flatMap((item) => [item.id, ...item.children.map((child) => child.id)])
        ];
      }
      for (const item of group.children) {
        if (item.id === id) return [item.id, ...item.children.map((child) => child.id)];
        if (item.children.some((child) => child.id === id)) return [id];
      }
    }
    return [id];
  }
  function openOutlineTarget(id: string) {
    setActiveTargetId(id);
    const path = outlinePath(id);
    sectionExpansion.openSectionPath(path);
    const openPathItem = (index: number, attempts = 0) => {
      const target = document.getElementById(path[index]);
      if (!target) {
        if (attempts < 20) {
          window.requestAnimationFrame(() => openPathItem(index, attempts + 1));
        }
        return;
      }
      if (index < path.length - 1) {
        window.requestAnimationFrame(() => openPathItem(index + 1, 0));
        return;
      }
      window.requestAnimationFrame(() => target.scrollIntoView({ behavior: "smooth", block: "start" }));
    };
    openPathItem(0);
  }
  function handleOutlineSummaryClick(event: ReactMouseEvent<HTMLElement>, targetId: string) {
    event.preventDefault();
    event.stopPropagation();
    setActiveTargetId(targetId);
    const willOpen = !sectionExpansion.openSectionIds.has(targetId);
    if (!willOpen) {
      for (const sectionId of outlineSubtreeIds(targetId)) {
        sectionExpansion.setSectionOpen(sectionId, false);
      }
      return;
    }
    sectionExpansion.setSectionOpen(targetId, true);
    window.requestAnimationFrame(() => {
      openOutlineTarget(targetId);
    });
  }
  function handleOutlineLinkClick(event: ReactMouseEvent<HTMLAnchorElement>, targetId: string) {
    event.preventDefault();
    setActiveTargetId(targetId);
    const willOpen = !sectionExpansion.openSectionIds.has(targetId);
    if (willOpen) openOutlineTarget(targetId);
    else sectionExpansion.setSectionOpen(targetId, false);
  }
  if (collapsed) {
    return (
      <nav className="mio-inspector-nav sticky top-20 self-start rounded-md border border-white/8 bg-white/5 p-2 text-sm">
        <button className="secondary-button mio-round-icon-button h-8 w-8 rounded-full px-0" type="button" onClick={onToggle} aria-label="Show project outline" title="Show project outline">
          <PanelLeftOpen size={15} />
        </button>
      </nav>
    );
  }
  return (
    <nav className="mio-inspector-nav sticky top-20 max-h-[calc(100vh-96px)] self-start overflow-auto rounded-md border border-white/8 bg-white/5 p-3 text-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="font-semibold text-white">Project sections</div>
        <button className="secondary-button mio-round-icon-button h-8 w-8 rounded-full px-0" type="button" onClick={onToggle} aria-label="Hide project outline" title="Hide project outline">
          <PanelLeftClose size={15} />
        </button>
      </div>
      <div className="space-y-1">
        {groups.map((group) => group.children.length > 0 ? (
          <details key={`${group.id}-${group.label}`} open={sectionExpansion.openSectionIds.has(group.id)} className="mio-outline-group rounded-md">
            <summary aria-current={activeTargetId === group.id ? "location" : undefined} onClick={(event) => handleOutlineSummaryClick(event, group.id)} className="mio-outline-link cursor-pointer select-none rounded px-2 py-1.5 text-sm font-semibold text-ink-200">
              {group.label}
            </summary>
            <div className="mt-1 space-y-1">
              {group.children.map((item) => item.children.length > 0 ? (
                <details key={`${item.id}-${item.label}`} open={sectionExpansion.openSectionIds.has(item.id)} className="mio-outline-subgroup ml-3 rounded-md">
                  <summary aria-current={activeTargetId === item.id ? "location" : undefined} onClick={(event) => handleOutlineSummaryClick(event, item.id)} className="mio-outline-link cursor-pointer select-none rounded px-2 py-1.5 text-xs font-medium text-ink-300">
                    {item.label}
                  </summary>
                  <div className="mt-1 space-y-1">
                    {item.children.map((child) => (
                      <a
                        key={`${child.id}-${child.label}`}
                        href={`#${child.id}`}
                        aria-current={activeTargetId === child.id ? "location" : undefined}
                        onClick={(event) => handleOutlineLinkClick(event, child.id)}
                        className="mio-outline-link block rounded px-2 py-1.5 pl-5 text-xs text-ink-400"
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
                  aria-current={activeTargetId === item.id ? "location" : undefined}
                  onClick={(event) => handleOutlineLinkClick(event, item.id)}
                  className="mio-outline-link ml-3 block rounded px-2 py-1.5 text-xs text-ink-400"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </details>
        ) : (
          <a
            key={`${group.id}-${group.label}`}
            href={`#${group.id}`}
            aria-current={activeTargetId === group.id ? "location" : undefined}
            onClick={(event) => handleOutlineLinkClick(event, group.id)}
            className="mio-outline-link block rounded px-2 py-1.5 text-sm font-semibold text-ink-200"
          >
            {group.label}
          </a>
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

function ReportOutlineSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const sectionExpansion = useContext(ReportSectionExpansionContext);
  const open = sectionExpansion.openSectionIds.has(id);
  return (
    <details
      id={id}
      open={open}
      data-expanded={open ? "true" : "false"}
      className="mio-report-section scroll-mt-4 rounded-md border border-white/8 bg-white/5 p-4"
    >
      <summary
        className="cursor-pointer select-none text-sm font-semibold text-white"
        onClick={(event) => {
          event.preventDefault();
          sectionExpansion.setSectionOpen(id, !open);
        }}
      >
        {title}
      </summary>
      {open ? <div className="mio-lazy-section-body mt-4">{children}</div> : null}
    </details>
  );
}

function NestedReportSection({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  const sectionExpansion = useContext(ReportSectionExpansionContext);
  const open = id ? sectionExpansion.openSectionIds.has(id) : false;
  return (
    <details
      id={id}
      open={open}
      data-expanded={open ? "true" : "false"}
      className="mb-3 scroll-mt-20 rounded-md border border-white/8 bg-white/[0.04] p-3"
    >
      <summary
        className="cursor-pointer select-none text-xs font-semibold uppercase tracking-[0.08em] text-ink-300"
        onClick={(event) => {
          if (!id) return;
          event.preventDefault();
          sectionExpansion.setSectionOpen(id, !open);
        }}
      >
        {title}
      </summary>
      {open ? <div className="mio-lazy-section-body mt-3">{children}</div> : null}
    </details>
  );
}

function AssetList({ assets, limit = 24 }: { assets: ProjectDetailPayload["assets"]; limit?: number }) {
  const [preview, setPreview] = useState<{
    asset: ProjectDetailPayload["assets"][number];
    loading: boolean;
    error?: string;
    mimeType?: string;
    dataUrl?: string;
    documentBlocks?: Array<{ kind: "heading" | "paragraph"; text: string; level?: number }>;
  } | null>(null);

  async function openAssetPreview(asset: ProjectDetailPayload["assets"][number]) {
    const extension = asset.path.match(/\.[^.\\/]+$/u)?.[0]?.toLocaleLowerCase() ?? "";
    if (extension === ".html" || extension === ".htm") {
      await apiClient.openPath(asset.path);
      return;
    }
    const readPreviewFile = window.marketplaceOS?.platform?.readPreviewFile;
    if (!readPreviewFile) {
      await apiClient.openPath(asset.path);
      return;
    }
    setPreview({ asset, loading: true });
    try {
      const result = await readPreviewFile(asset.path);
      if (result.extension === ".docx") {
        const documentBlocks = await readDocxPreviewBlocks(result.dataBase64);
        setPreview({ asset, loading: false, mimeType: result.mimeType, documentBlocks });
        return;
      }
      setPreview({
        asset,
        loading: false,
        mimeType: result.mimeType,
        dataUrl: `data:${result.mimeType};base64,${result.dataBase64}`
      });
    } catch (error) {
      setPreview({ asset, loading: false, error: error instanceof Error ? error.message : "Could not preview this file." });
    }
  }

  if (assets.length === 0) {
    return <EmptyState label="No collected data yet for this section." />;
  }
  return (
    <>
    <div className="grid grid-cols-3 gap-3">
      {assets.slice(0, limit).map((asset) => (
        <button key={asset.id} type="button" className="rounded-md border border-white/8 bg-white/5 p-2 text-left hover:bg-white/8" onClick={() => void openAssetPreview(asset)}>
          <div className="aspect-video overflow-hidden rounded bg-white/10">
            {asset.mimeType.startsWith("image/") ? <img src={toFileImageSrc(asset.path)} alt={asset.label} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : null}
          </div>
          <div className="mt-2 truncate text-xs font-medium text-white">{asset.label}</div>
          <div className="mt-1 truncate text-[11px] text-ink-500">{asset.kind}</div>
        </button>
      ))}
    </div>
    <Modal
      open={Boolean(preview)}
      title={preview?.asset.label ?? "File preview"}
      description={preview?.asset.kind}
      className="mio-file-preview-modal"
      onClose={() => setPreview(null)}
      actions={preview ? (
        <Button variant="secondary" onClick={() => void window.marketplaceOS?.platform?.showItemInFolder(preview.asset.path)}>
          <FolderOpen size={15} />
          Show in folder
        </Button>
      ) : undefined}
    >
      {preview?.loading ? <EmptyState label="Preparing preview..." /> : null}
      {preview?.error ? <div className="mio-inline-error">{preview.error}</div> : null}
      {preview?.dataUrl && preview.mimeType?.startsWith("image/") ? (
        <div className="mio-file-preview-image"><img src={preview.dataUrl} alt={preview.asset.label} /></div>
      ) : null}
      {preview?.dataUrl && preview.mimeType === "application/pdf" ? (
        <object className="mio-file-preview-pdf" data={preview.dataUrl} type="application/pdf">
          <EmptyState label="The PDF preview could not be displayed." />
        </object>
      ) : null}
      {preview?.documentBlocks ? (
        <article className="mio-docx-preview" aria-label="DOCX document preview">
          {preview.documentBlocks.map((block, index) => block.kind === "heading"
            ? <h3 key={`${index}-${block.text}`} data-level={block.level}>{block.text}</h3>
            : <p key={`${index}-${block.text}`}>{block.text}</p>)}
        </article>
      ) : null}
    </Modal>
    </>
  );
}

async function readDocxPreviewBlocks(dataBase64: string): Promise<Array<{ kind: "heading" | "paragraph"; text: string; level?: number }>> {
  const archive = await JSZip.loadAsync(dataBase64, { base64: true });
  const documentXml = await archive.file("word/document.xml")?.async("string");
  if (!documentXml) throw new Error("The DOCX document body is missing.");
  const xml = new DOMParser().parseFromString(documentXml, "application/xml");
  const paragraphs = Array.from(xml.getElementsByTagNameNS("*", "p"));
  return paragraphs.flatMap((paragraph) => {
    const text = Array.from(paragraph.getElementsByTagNameNS("*", "t"))
      .map((node) => node.textContent ?? "")
      .join("")
      .trim();
    if (!text) return [];
    const style = paragraph.getElementsByTagNameNS("*", "pStyle")[0]
      ?.getAttributeNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "val")
      ?? paragraph.getElementsByTagNameNS("*", "pStyle")[0]?.getAttribute("w:val")
      ?? "";
    const headingMatch = /heading\s*([1-6])?/iu.exec(style);
    return [{
      kind: headingMatch ? "heading" as const : "paragraph" as const,
      text,
      level: headingMatch ? Number(headingMatch[1] || 2) : undefined
    }];
  });
}

function ProductCardGrid({ products, limit = 80 }: { products: ProjectProductEvidence[]; limit?: number }) {
  const [view, setView] = useState<"cards" | "list">("cards");
  const evidenceText = useContext(EvidenceTranslationContext);
  if (products.length === 0) {
    return <EmptyState label="No rendered product rows extracted yet." />;
  }
  if (view === "list") {
    return (
      <div>
        <ProductViewToggle value={view} onChange={setView} />
        <div className="mio-result-list mt-3 overflow-hidden">
          {products.slice(0, limit).map((product) => (
            <button key={product.id} type="button" className="mio-result-list-row grid w-full grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 text-left" onClick={() => void apiClient.openUrl(product.productUrl)}>
              <ResultCardMedia imageUrl={product.imageUrl} alt={displayProductTitle(product)} variant="product" />
              <div className="min-w-0">
                <div className="line-clamp-1 text-sm font-medium text-white">{displayProductTitle(product)}</div>
                <div className="mio-card-chip-row">
                  <span className="mio-card-chip">{formatCurrency(product.priceAverage)}</span>
                  <span className="mio-card-chip">Rating {productRatingText(product)}</span>
                  <span className="mio-card-chip">{productSoldMetricLabel(product)} {productSoldMetricText(product)}</span>
                  <StoreTypeMark value={product.storeType} showLabel />
                </div>
              </div>
              <div className="text-right text-xs text-ink-500">
                <div>{productSourcePlacement(product)}</div>
                <div className="mt-1 max-w-44 truncate">{product.storeName ?? "Store pending"}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div>
      <ProductViewToggle value={view} onChange={setView} />
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {products.slice(0, limit).map((product) => (
          <button key={product.id} type="button" className="mio-result-card mio-product-result-card text-left" onClick={() => void apiClient.openUrl(product.productUrl)}>
            <ResultCardMedia imageUrl={product.imageUrl} alt={displayProductTitle(product)} variant="product">
              <span className="mio-card-chip">{productSourcePlacement(product)}</span>
            </ResultCardMedia>
            <div className="mio-result-card-body min-w-0">
              <div className="mio-result-card-title-row">
                <div className="line-clamp-2 text-sm font-medium text-white">{displayProductTitle(product)}</div>
                <span className="mio-card-action-pill">Open</span>
              </div>
              <div className="mio-card-chip-row">
                <span className="mio-card-chip">{formatCurrency(product.priceAverage)}</span>
                <span className="mio-card-chip">Rating {productRatingText(product)}</span>
                <span className="mio-card-chip">{productSoldMetricLabel(product)} {productSoldMetricText(product)}</span>
              </div>
              <div className="mio-result-card-description">
                {evidenceText(product.selectionReason) || product.storeName || "Marketplace product evidence"}
              </div>
              <div className="mio-result-card-footer">
                <span className="truncate">{product.storeName ?? "Store pending"}</span>
                <StoreTypeMark value={product.storeType} />
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
      <button className={["secondary-button mio-round-icon-button h-8 w-8 px-0", value === "cards" ? "border-signal-blue/45 bg-signal-blue/12 text-signal-blue" : ""].join(" ")} type="button" onClick={() => onChange("cards")} aria-label="Card view" title="Card view">
        <LayoutGrid size={14} />
      </button>
      <button className={["secondary-button mio-round-icon-button h-8 w-8 px-0", value === "list" ? "border-signal-blue/45 bg-signal-blue/12 text-signal-blue" : ""].join(" ")} type="button" onClick={() => onChange("list")} aria-label="List view" title="List view">
        <Rows3 size={14} />
      </button>
    </div>
  );
}

function ProductInfoTable({
  products,
  manuallyAddedIdentities = new Set<string>(),
  onRemoveProduct,
  checkedProductIds,
  onToggleProduct
}: {
  products: ProjectProductEvidence[];
  manuallyAddedIdentities?: ReadonlySet<string>;
  onRemoveProduct?: (productId: string) => void;
  checkedProductIds?: string[];
  onToggleProduct?: (productId: string) => void;
}) {
  const evidenceText = useContext(EvidenceTranslationContext);
  if (products.length === 0) {
    return <EmptyState label="Product info table is empty. Capture Relevance and Top Sales pages first." />;
  }
  return (
    <div className="overflow-auto rounded-md border border-white/8">
      <table className="min-w-[1160px] text-left text-xs">
        <thead className="bg-white/8 text-ink-500">
          <tr>
            {onToggleProduct && <th className="w-10 px-3 py-2">Select</th>}
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
            {onRemoveProduct && <th className="w-12 px-3 py-2" aria-label="Actions" />}
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => (
            <tr key={product.id} className="border-t border-white/8">
              {onToggleProduct && (
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={checkedProductIds?.includes(product.id) ?? false}
                    onChange={() => onToggleProduct(product.id)}
                    aria-label={`Select ${displayProductTitle(product)}`}
                  />
                </td>
              )}
              <td className="px-3 py-2">{index + 1}</td>
              <td className="px-3 py-2">{productSourcePlacement(product)}</td>
              <td className="px-3 py-2">{evidenceText(qualifiedProductRankingReason(product, manuallyAddedIdentities.has(product.id) || manuallyAddedIdentities.has(stableProductIdentity(product))))}</td>
              <td className="px-3 py-2">{displayProductTitle(product)}</td>
              <td className="px-3 py-2">{product.productType ?? inferredProductTypeLabel(displayProductTitle(product))}</td>
              <td className="px-3 py-2">{product.monthlySoldText ?? formatOptionalNumber(product.monthlySold)}</td>
              <td className="px-3 py-2">{product.storeName ?? "-"}</td>
              <td className="px-3 py-2">
                <StoreTypeMark value={product.storeType} />
              </td>
              <td className="px-3 py-2">{formatCurrency(product.priceAverage)}</td>
              <td className="px-3 py-2">{productRatingText(product)}</td>
              <td className="px-3 py-2">{product.reviewText ?? formatOptionalNumber(product.reviewCount)}</td>
              <td className="px-3 py-2">{product.totalSoldText ?? formatOptionalNumber(product.totalSold)}</td>
              {onRemoveProduct && (
                <td className="px-3 py-2">
                  <button
                    className="secondary-button mio-round-icon-button h-8 w-8 px-0 text-signal-red"
                    type="button"
                    onClick={() => onRemoveProduct(product.id)}
                    aria-label={`Remove ${displayProductTitle(product)}`}
                    title="Remove product"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KeyProductTableReview({
  products,
  availableProducts,
  totalProducts,
  approved,
  onBackToBrowser,
  onRemoveProduct,
  onAddProduct,
  onExcludeProducts,
  onAddProducts,
  onApprove,
  onNext
}: {
  products: ProjectProductEvidence[];
  availableProducts: ProjectProductEvidence[];
  totalProducts: number;
  approved: boolean;
  onBackToBrowser: () => void;
  onRemoveProduct: (productId: string) => void;
  onAddProduct: (productId: string) => void;
  onExcludeProducts: (productIds: string[]) => void;
  onAddProducts: (productIds: string[]) => void;
  onApprove: () => void;
  onNext: () => void;
}) {
  const [productToAdd, setProductToAdd] = useState("");
  const [selectedQualifiedIds, setSelectedQualifiedIds] = useState<string[]>([]);
  const [selectedAvailableIds, setSelectedAvailableIds] = useState<string[]>([]);
  const toggleId = (ids: string[], id: string) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
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
        Product Qualified starts with Top Sales evidence, then uses Relevance evidence to enrich and rank commercially valid products.
        GIMMICK, NOT FOR SALE, FREE GIFT, irrelevant, and duplicate rows are excluded. Review up to 20 products before approval.
        Showing {products.length} selected product{products.length === 1 ? "" : "s"} from {totalProducts} extracted row{totalProducts === 1 ? "" : "s"}.
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <strong className="text-sm text-ink-200">{products.length} / 20 selected</strong>
        <button
          className="secondary-button h-9 w-auto px-3"
          type="button"
          disabled={selectedQualifiedIds.length === 0}
          onClick={() => {
            onExcludeProducts(selectedQualifiedIds);
            setSelectedQualifiedIds([]);
          }}
        >
          Exclude selected
        </button>
      </div>
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label className="min-w-[280px] flex-1 text-xs font-medium text-ink-400">
          Add another qualified product
          <select
            className="input mt-1"
            value={productToAdd}
            onChange={(event) => setProductToAdd(event.target.value)}
            disabled={products.length >= 20 || availableProducts.length === 0}
          >
            <option value="">Select product</option>
            {availableProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {productSourcePlacement(product)} - {displayProductTitle(product)}
              </option>
            ))}
          </select>
        </label>
        <button
          className="secondary-button h-10 w-auto px-4"
          type="button"
          disabled={!productToAdd || products.length >= 20}
          onClick={() => {
            onAddProduct(productToAdd);
            setProductToAdd("");
          }}
        >
          <Plus size={16} />
          Add Product
        </button>
        <button
          className="secondary-button h-10 w-auto px-4"
          type="button"
          disabled={products.length >= 20 || availableProducts.length === 0}
          onClick={() => {
            const remainingSlots = Math.max(0, 20 - products.length);
            onAddProducts(availableProducts.slice(0, Math.min(5, remainingSlots)).map((product) => product.id));
          }}
        >
          <Plus size={16} />
          Add 5 more product
        </button>
        <span className="pb-3 text-xs text-ink-500">{products.length}/20</span>
      </div>
      <ProductInfoTable
        products={products}
        onRemoveProduct={onRemoveProduct}
        checkedProductIds={selectedQualifiedIds}
        onToggleProduct={(id) => setSelectedQualifiedIds((current) => toggleId(current, id))}
      />
      {availableProducts.length > 0 && (
        <div className="mt-4 rounded-md border border-white/8 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <strong className="text-sm text-ink-200">Available products</strong>
            <button
              className="secondary-button h-9 w-auto px-3"
              type="button"
              disabled={selectedAvailableIds.length === 0 || products.length >= 20}
              onClick={() => {
                onAddProducts(selectedAvailableIds);
                setSelectedAvailableIds([]);
              }}
            >
              Add selected
            </button>
          </div>
          <div className="grid max-h-64 gap-2 overflow-auto md:grid-cols-2">
            {availableProducts.map((product) => (
              <label key={product.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-white/8 p-2 text-xs">
                <input
                  type="checkbox"
                  checked={selectedAvailableIds.includes(product.id)}
                  onChange={() => setSelectedAvailableIds((current) => toggleId(current, product.id))}
                />
                <div className="mio-available-product-thumb shrink-0">
                  <ResultCardMedia imageUrl={product.imageUrl ?? product.images[0]} alt={displayProductTitle(product)} variant="product" />
                </div>
                <span className="min-w-0">
                  <span className="block font-medium text-ink-200">{displayProductTitle(product)}</span>
                  <span className="text-ink-500">{productSourcePlacement(product)} · {storeTypeLabel(product)}</span>
                </span>
              </label>
            ))}
          </div>
          {products.length >= 20 && <p className="mt-2 text-xs text-signal-red">Maximum 20 qualified products reached.</p>}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs leading-5 text-ink-500">
          Store Name, Total Sold, review detail, slides, description, and shop homepage are enriched during Product Detail Qualified collection.
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="secondary-button h-10 w-auto px-4" type="button" onClick={onApprove} disabled={products.length === 0 || approved}>
            <CheckCircle2 size={16} />
            {approved ? "Product Qualified Approved" : "Approve Product Qualified"}
          </button>
          <button className="primary-button h-10 w-auto px-4" type="button" onClick={onNext} disabled={!approved || products.length === 0}>
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </Panel>
  );
}

function ProductQualifiedSection({
  product,
  reviews,
  assets,
  sectionIdPrefix
}: {
  product: ProjectProductEvidence;
  reviews: ProjectDetailPayload["reviews"];
  assets: ProjectDetailPayload["assets"];
  sectionIdPrefix: string;
}) {
  const evidenceText = useContext(EvidenceTranslationContext);
  const firstPageAssets = assets.filter((asset) => asset.kind === "PRODUCT_PAGE");
  const shopHomeAssets = assets.filter((asset) => asset.kind === "STORE_HOME");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <InfoLine label="Price" value={formatCurrency(product.priceAverage)} />
        <InfoLine label="Store Name" value={product.storeName ?? "-"} />
        <div>
          <div className="text-[10px] uppercase text-ink-500">Store Type</div>
          <StoreTypeMark value={product.storeType} showLabel className="mt-1" />
        </div>
        <InfoLine label="GMV ETA" value={formatCurrency((product.priceAverage ?? 0) * (product.monthlySold ?? product.totalSold ?? 0))} />
      </div>

      <NestedReportSection id={`${sectionIdPrefix}-first-page`} title="1st Page">
        <AssetList assets={firstPageAssets} />
      </NestedReportSection>

      <NestedReportSection id={`${sectionIdPrefix}-slides`} title="Slides">
        <ProductImageGrid images={(product.images.length > 0 ? product.images : product.imageUrl ? [product.imageUrl] : []).slice(0, product.videos.length > 0 ? 8 : 9)} />
        {product.videos.length > 0 && (
          <div className="mt-3">
            <ProductVideoGrid videos={product.videos} limit={1} />
          </div>
        )}
      </NestedReportSection>

      <NestedReportSection id={`${sectionIdPrefix}-description`} title="Description">
        <div className="rounded-md border border-white/8 bg-white/[0.04] p-3">
          <p className="whitespace-pre-wrap text-sm leading-6 text-ink-300">
            {evidenceText(product.description) || "No browser-readable product description captured yet."}
          </p>
        </div>
        {product.descriptionImages.length > 0 && (
          <div className="mt-3">
            <ProductImageGrid images={product.descriptionImages} />
          </div>
        )}
        <ProductPromotionSignals product={product} />
      </NestedReportSection>

      <NestedReportSection id={`${sectionIdPrefix}-reviews`} title="Reviews">
        <ReviewEvidenceTable reviews={reviews} />
      </NestedReportSection>

      <NestedReportSection id={`${sectionIdPrefix}-media`} title="Media in User">
        <ProductImageGrid images={product.reviewMediaImages} />
        <div className="mt-3">
          <ProductVideoGrid videos={product.reviewMediaVideos} />
        </div>
      </NestedReportSection>

      <NestedReportSection id={`${sectionIdPrefix}-shop-home`} title="Shop Home Page">
        <AssetList assets={shopHomeAssets} />
      </NestedReportSection>
    </div>
  );
}

function productAssetsForStep(detail: ProjectDetailPayload, product: ProjectProductEvidence): ProjectDetailPayload["assets"] {
  const productAssets = detail.assets.filter((asset) => asset.ownerType === "PRODUCT" && asset.ownerId === product.id);
  const productStoreUrl = canonicalStoreUrl(product.storeUrl);
  const matchingShopProductIds = detail.products
    .filter((item) => normalizeStoreKey(item) === normalizeStoreKey(product))
    .map((item) => item.id);
  const sharedProductShopHomeAssets = detail.assets.filter((asset) =>
    asset.kind === "STORE_HOME" &&
    asset.ownerType === "PRODUCT" &&
    Boolean(asset.ownerId && matchingShopProductIds.includes(asset.ownerId)) &&
    !productAssets.some((productAsset) => productAsset.id === asset.id)
  );
  const legacyShopHomeAssets = productStoreUrl
    ? detail.assets.filter((asset) =>
        asset.kind === "STORE_HOME" &&
        asset.ownerType === "STORE" &&
        asset.sourceUrl &&
        sameStoreIntent(asset.sourceUrl, productStoreUrl) &&
        !productAssets.some((productAsset) => productAsset.id === asset.id)
      )
    : [];
  return [...productAssets, ...sharedProductShopHomeAssets, ...legacyShopHomeAssets];
}

function reusableKeyStoreHomepageAsset(
  detail: ProjectDetailPayload,
  storeUrl?: string
): ProjectDetailPayload["assets"][number] | undefined {
  const canonicalTarget = canonicalStoreUrl(storeUrl);
  if (!canonicalTarget) {
    return undefined;
  }
  return detail.assets
    .filter((asset) =>
      asset.kind === "STORE_HOME" &&
      Boolean(asset.sourceUrl && sameStoreIntent(asset.sourceUrl, canonicalTarget))
    )
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
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

function isDisplayableProductMediaUrl(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) {
    return false;
  }
  const lower = normalized.toLowerCase();
  if (/data:image\/svg|sprite|favicon|placeholder|default-avatar|avatar|profile|logo-shopee|shopee-logo|icon|arrow|chevron|next|previous|rating|star|cart|chat|help|verify|seller-centre|notification/iu.test(lower)) {
    return false;
  }
  if (/\/(?:icons?|sprites?|avatars?)\//iu.test(lower)) {
    return false;
  }
  return /^(https?:|file:|data:image\/(?:png|jpe?g|webp|avif|gif|bmp))/iu.test(normalized);
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
  const visibleImages = uniqueMediaValues(images).filter((image) => isDisplayableProductMediaUrl(image) && !brokenImages.has(image));
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
              loading="lazy"
              decoding="async"
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

function ProductVideoGrid({ videos, limit = 9 }: { videos: string[]; limit?: number }) {
  const visibleVideos = uniqueMediaValues(videos);
  if (visibleVideos.length === 0) {
    return <EmptyState label="No product video URLs captured yet." />;
  }
  return (
    <div className="grid grid-cols-3 gap-3">
      {visibleVideos.slice(0, limit).map((video, index) => (
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

function sanitizeShopeeReviewComment(comment: string): string {
  const output: string[] = [];
  for (const rawLine of comment.replace(/\r\n?/gu, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const cutoffIndex = line.search(/(?:Seller'?s? Response|Respon(?:s)? Penjual|Respons(?:e)? Penjual|Penjual Membalas|Tanggapan Penjual|Report Abuse|Laporkan Penyalahgunaan)\b/iu);
    const content = (cutoffIndex >= 0 ? line.slice(0, cutoffIndex) : line).trim();
    if (content && !/^(?:Helpful\??|Membantu\??|Like|Share)(?:\s*[\d.,kkrb]*)?$/iu.test(content)) {
      output.push(content);
    }
    if (cutoffIndex >= 0) break;
  }
  return output.join("\n").trim().slice(0, 900);
}

function isReadableShopeeReview(comment: string): boolean {
  const value = sanitizeShopeeReviewComment(comment);
  return value.length >= 20 &&
    /\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}(?:\s+\d{1,2}:\d{2})?\b/u.test(value) &&
    !/^https?:\/\//iu.test(value) &&
    !/(product ratings|all\s*\(|semua\s*\(|comments?\s*\(|with media|dengan media|repeat purchase|shop vouchers|bundle deals|barcode|bpom sesuai|dermatologically tested|add to cart|buy now)/iu.test(value);
}

function reviewCommentCell(review: ProjectDetailPayload["reviews"][number]): string {
  const commentLines = sanitizeShopeeReviewComment(review.comment)
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const comment = commentLines.join("\n");
  const hasDate = review.reviewDate ? comment.includes(review.reviewDate) : /\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}/u.test(comment);
  const hasVariation = review.variation ? comment.toLowerCase().includes(review.variation.toLowerCase()) : false;
  const prefix: string[] = [];
  if (!hasDate && review.reviewDate) {
    prefix.push(`${review.reviewDate}${review.variation && !hasVariation ? ` | variation : ${review.variation}` : ""}`);
  } else if (review.variation && !hasVariation) {
    prefix.push(`variation : ${review.variation}`);
  }
  return [...prefix, ...commentLines].join("\n");
}

function ReviewEvidenceTable({ reviews }: { reviews: ProjectDetailPayload["reviews"] }) {
  const curatedReviews = curatedShopeeReviews(reviews);
  const evidenceText = useContext(EvidenceTranslationContext);
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
              <td className="whitespace-pre-line px-3 py-2 leading-5">
                {evidenceText(reviewCommentCell(review))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type BulkReportHistoryEntry = {
  id: string;
  category: string;
  zipPath: string;
  fileCount: number;
  projectCount: number;
  generatedAt: string;
};

const BULK_REPORT_HISTORY_KEY = "mio.bulk-report-history.v1";

export function LegacyBulkReportWizard({ projects, themeMode }: { projects: ProjectSummary[]; themeMode: ThemeMode }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("");
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [formats, setFormats] = useState<BulkReportFormat[]>(["PDF"]);
  const [bulkSections, setBulkSections] = useState<ReportSectionConfig[]>(DEFAULT_REPORT_SECTIONS);
  const [progress, setProgress] = useState(0);
  const [history, setHistory] = useState<BulkReportHistoryEntry[]>(() => {
    try {
      const value = window.localStorage.getItem(BULK_REPORT_HISTORY_KEY);
      return value ? JSON.parse(value) as BulkReportHistoryEntry[] : [];
    } catch {
      return [];
    }
  });
  const categories = useMemo(
    () => Array.from(new Set(projects.map((project) => project.productCategory?.trim() || "Uncategorized"))).sort(),
    [projects]
  );
  const eligibleProjects = useMemo(
    () => projects.filter((project) => (project.productCategory?.trim() || "Uncategorized") === category),
    [category, projects]
  );
  const generateBulk = useMutation({
    mutationFn: apiClient.generateBulkReports,
    onMutate: () => setProgress(4),
    onSuccess: (result) => {
      setProgress(100);
      const entry: BulkReportHistoryEntry = {
        id: `${Date.now()}-${result.zipPath}`,
        category: category || "Uncategorized",
        zipPath: result.zipPath,
        fileCount: result.fileCount,
        projectCount: projectIds.length,
        generatedAt: new Date().toISOString()
      };
      setHistory((current) => {
        const next = [entry, ...current].slice(0, 30);
        window.localStorage.setItem(BULK_REPORT_HISTORY_KEY, JSON.stringify(next));
        return next;
      });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => setProgress(0)
  });

  useEffect(() => {
    if (!generateBulk.isPending) {
      return;
    }
    const timer = window.setInterval(() => {
      setProgress((current) => Math.min(94, current + (current < 50 ? 6 : current < 80 ? 3 : 1)));
    }, 500);
    return () => window.clearInterval(timer);
  }, [generateBulk.isPending]);

  function selectCategory(nextCategory: string) {
    setCategory(nextCategory);
    setProjectIds([]);
  }

  function toggleProject(id: string) {
    setProjectIds((current) => current.includes(id) ? current.filter((projectId) => projectId !== id) : [...current, id]);
  }

  function toggleFormat(format: BulkReportFormat) {
    setFormats((current) => current.includes(format) ? current.filter((item) => item !== format) : [...current, format]);
  }

  function canContinue() {
    if (step === 1) return Boolean(category);
    if (step === 2) return projectIds.length > 0;
    if (step === 3) return formats.length > 0;
    return bulkSections.some((section) => section.enabled);
  }

  function generate() {
    if (!category || projectIds.length === 0 || formats.length === 0) {
      return;
    }
    generateBulk.mutate({
      category,
      projectIds,
      formats,
      templateId: "marketplace-research-os-v1",
      theme: themeMode,
      sections: bulkSections
    });
  }

  const stepLabels = ["Category", "Projects", "Formats", "Sections"];
  return (
    <Panel title="Bulk Report Generation" icon={Archive}>
      <div className="mb-5 grid grid-cols-4 gap-2" aria-label="Bulk report steps">
        {stepLabels.map((label, index) => (
          <button
            key={label}
            type="button"
            className={`mio-bulk-step rounded-full px-3 py-2 text-xs font-medium transition ${step === index + 1 ? "bg-signal-blue text-white" : "bg-white/7 text-ink-500"}`}
            onClick={() => index + 1 <= step && setStep(index + 1)}
          >
            {index + 1}. {label}
          </button>
        ))}
      </div>

      {step === 1 && (
        <Field label="Select by category">
          <select value={category} onChange={(event) => selectCategory(event.target.value)} className="input">
            <option value="">Choose a category</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 text-xs text-ink-500">
            <span>Select multiple projects from {category}</span>
            <button className="secondary-button h-8 w-auto px-3 text-xs" type="button" onClick={() => setProjectIds(eligibleProjects.map((project) => project.id))}>Select all</button>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {eligibleProjects.map((project) => {
              const selected = projectIds.includes(project.id);
              return (
                <button
                  type="button"
                  key={project.id}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${selected ? "border-signal-blue/45 bg-signal-blue/12" : "border-white/8 bg-white/5"}`}
                  onClick={() => toggleProject(project.id)}
                >
                  <span className="min-w-0 truncate text-sm font-medium text-white">{project.name}</span>
                  {selected ? <CheckCircle2 size={17} className="shrink-0 text-signal-blue" /> : <Circle size={17} className="shrink-0 text-ink-500" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid grid-cols-3 gap-3">
          {(["DOCX", "PDF", "HTML"] as BulkReportFormat[]).map((format) => {
            const selected = formats.includes(format);
            return (
              <button key={format} type="button" className={`rounded-2xl border p-4 text-center text-sm font-semibold transition ${selected ? "border-signal-blue/45 bg-signal-blue/12 text-white" : "border-white/8 bg-white/5 text-ink-500"}`} onClick={() => toggleFormat(format)}>
                {format}
              </button>
            );
          })}
        </div>
      )}

      {step === 4 && (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {bulkSections.map((section) => (
            <button
              type="button"
              key={section.id}
              className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${section.enabled ? "border-signal-blue/40 bg-signal-blue/10 text-white" : "border-white/8 bg-white/5 text-ink-500"}`}
              onClick={() => setBulkSections((current) => current.map((item) => item.id === section.id ? { ...item, enabled: !item.enabled } : item))}
            >
              <span>{section.label}</span>
              {section.enabled ? <CheckCircle2 size={16} className="shrink-0 text-signal-blue" /> : <Circle size={16} className="shrink-0" />}
            </button>
          ))}
        </div>
      )}

      {(generateBulk.isPending || progress > 0) && (
        <div className="mt-4 rounded-2xl border border-white/8 bg-white/5 p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-ink-500">{generateBulk.isPending ? `Packaging ${projectIds.length} reports` : "Bulk report ready"}</span>
            <span className="font-semibold text-signal-blue">{progress}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>
      )}
      {generateBulk.data && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-signal-green/25 bg-signal-green/10 p-3 text-sm text-signal-green">
          <span>{generateBulk.data.fileCount} files packaged in {generateBulk.data.zipPath}</span>
          <button className="secondary-button h-8 w-auto px-3 text-xs" type="button" onClick={() => void apiClient.openPath(generateBulk.data.zipPath)}>Open ZIP</button>
        </div>
      )}
      {generateBulk.error && <div className="mt-4 rounded-2xl bg-signal-rose/12 p-3 text-sm text-signal-rose">{generateBulk.error.message}</div>}

      <div className="mt-5 flex justify-between gap-3">
        <button className="secondary-button h-10 w-auto rounded-full px-5" type="button" disabled={step === 1 || generateBulk.isPending} onClick={() => setStep((current) => Math.max(1, current - 1))}>
          <ChevronLeft size={16} /> Back
        </button>
        {step < 4 ? (
          <button className="primary-button h-10 w-auto rounded-full px-5" type="button" disabled={!canContinue()} onClick={() => setStep((current) => Math.min(4, current + 1))}>
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button className="primary-button h-10 w-auto rounded-full px-5" type="button" disabled={!canContinue() || generateBulk.isPending} onClick={generate}>
            <Archive size={16} /> {generateBulk.isPending ? "Generating ZIP" : "Generate ZIP"}
          </button>
        )}
      </div>
      <div className="mt-6 border-t border-white/8 pt-5">
        <div className="mb-3 text-sm font-semibold text-white">Bulk Report History</div>
        <div className="space-y-2">
          {history.map((entry) => (
            <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/5 p-3">
              <div>
                <div className="text-sm font-semibold text-white">{entry.category}</div>
                <div className="mt-1 text-xs text-ink-500">{entry.projectCount} projects · {entry.fileCount} files · {formatDateTime(entry.generatedAt)}</div>
              </div>
              <button className="secondary-button h-9 w-auto rounded-full px-4 text-xs" type="button" onClick={() => void apiClient.openPath(entry.zipPath)}>
                <Archive size={14} /> Open ZIP
              </button>
            </div>
          ))}
          {history.length === 0 && <EmptyState label="No bulk report ZIP generated yet." />}
        </div>
      </div>
    </Panel>
  );
}

function ReportsView({ themeMode }: { themeMode: ThemeMode }) {
  const queryClient = useQueryClient();
  const language = useUiStore((state) => state.language);
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: apiClient.dashboard });
  const reports = useQuery({ queryKey: ["reports"], queryFn: apiClient.reports });
  const settings = useQuery({ queryKey: ["settings"], queryFn: apiClient.settings });
  const [projectId, setProjectId] = useState("");
  const [sections, setSections] = useState<ReportSectionConfig[]>(DEFAULT_REPORT_SECTIONS);
  const [reportPage, setReportPage] = useState<"generator" | "content">("generator");
  const [formats, setFormats] = useState<BulkReportFormat[]>(["PDF"]);
  const [reportDestination, setReportDestination] = useState("");
  const [groupOrder, setGroupOrder] = useState<ReportSectionGroupId[]>(
    REPORT_SECTION_GROUPS.map((group) => group.id)
  );
  const [draggedGroupId, setDraggedGroupId] = useState<ReportSectionGroupId | null>(null);
  const [reportFileName, setReportFileName] = useState("");
  const [filenameTemplate, setFilenameTemplate] = useState("{projectName}_{storeType}_{priceRange}_{date}_{time}");
  const [previewReport, setPreviewReport] = useState<ReportHtmlPayload | null>(null);
  const [reportProgress, setReportProgress] = useState(0);
  const [reportMode, setReportMode] = useState<"single" | "bulk">("single");
  const [reportLanguage, setReportLanguage] = useState<AppLanguage>(() => {
    const saved = window.localStorage.getItem("mio.report-language.v1");
    return saved === "id-ID" || saved === "zh-CN" || saved === "en-US" ? saved : language;
  });
  const selectedProject = dashboard.data?.projects.find((project) => project.id === projectId);
  const aiConfigured = Boolean(settings.data?.openAiKeyConfigured || settings.data?.geminiKeyConfigured);
  const generateReport = useMutation({
    mutationFn: apiClient.generateReport,
    onMutate: () => {
      setReportProgress(8);
    },
    onSuccess: () => {
      setReportProgress(100);
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: () => {
      setReportProgress(0);
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
  const saveReportPreferences = useMutation({
    mutationFn: apiClient.saveSettings,
    onSuccess: (result) => {
      queryClient.setQueryData(["settings"], result);
    }
  });

  useEffect(() => {
    if (!generateReport.isPending) {
      return;
    }
    const timer = window.setInterval(() => {
      setReportProgress((current) => Math.min(94, current + (current < 55 ? 9 : current < 80 ? 5 : 2)));
    }, 700);
    return () => window.clearInterval(timer);
  }, [generateReport.isPending]);

  useEffect(() => {
    if (!settings.data) {
      return;
    }
    setFilenameTemplate(settings.data.reportFilenameTemplate);
    const savedOrder = settings.data.reportSectionOrder;
    let savedSections: ReportSectionConfig[] | null = null;
    try {
      const stored = window.localStorage.getItem("mio.report-content-settings.v2");
      const parsed = stored ? JSON.parse(stored) as unknown : null;
      if (Array.isArray(parsed)) {
        savedSections = parsed.filter((section): section is ReportSectionConfig =>
          Boolean(section) && typeof section === "object" && "id" in section && "enabled" in section
        );
      }
    } catch {
      savedSections = null;
    }
    const currentSections = normalizeReportSections(savedSections, savedOrder);
    setSections(currentSections);
    setGroupOrder(orderReportSectionGroups(currentSections.map((section) => section.id)));
    setReportDestination((current) => current || settings.data.exportFolder);
  }, [settings.data]);

  useEffect(() => {
    if (!selectedProject) {
      setReportFileName("");
      return;
    }
    setReportFileName(buildReportFileName(selectedProject, filenameTemplate));
  }, [filenameTemplate, selectedProject]);

  function persistReportPreferences(nextSections: ReportSectionConfig[], nextTemplate = filenameTemplate) {
    if (!settings.data) {
      return;
    }
    const {
      openAiKeyConfigured: _openAiKeyConfigured,
      geminiKeyConfigured: _geminiKeyConfigured,
      ...persistedSettings
    } = settings.data;
    saveReportPreferences.mutate({
      ...persistedSettings,
      reportFilenameTemplate: nextTemplate,
      reportSectionOrder: nextSections.map((section) => section.id)
    });
  }

  function moveReportGroup(targetGroupId: ReportSectionGroupId) {
    if (!draggedGroupId || draggedGroupId === targetGroupId) {
      return;
    }
    const nextGroupOrder = [...groupOrder];
    const sourceIndex = nextGroupOrder.indexOf(draggedGroupId);
    const targetIndex = nextGroupOrder.indexOf(targetGroupId);
    nextGroupOrder.splice(sourceIndex, 1);
    nextGroupOrder.splice(targetIndex, 0, draggedGroupId);
    const nextSections = flattenReportSectionsByGroup(sections, nextGroupOrder);
    setGroupOrder(nextGroupOrder);
    setSections(nextSections);
    setDraggedGroupId(null);
    persistReportPreferences(nextSections);
  }

  function toggleReportSection(sectionId: ReportSectionId) {
    setSections((current) =>
      current.map((item) => (item.id === sectionId ? { ...item, enabled: !item.enabled } : item))
    );
  }

  function saveReportContentSettings(nextSections: ReportSectionConfig[]) {
    setSections(nextSections);
    setGroupOrder(orderReportSectionGroups(nextSections.map((section) => section.id)));
    window.localStorage.setItem("mio.report-content-settings.v2", JSON.stringify(nextSections));
    persistReportPreferences(nextSections);
  }

  function changeReportLanguage(nextLanguage: AppLanguage) {
    setReportLanguage(nextLanguage);
    window.localStorage.setItem("mio.report-language.v1", nextLanguage);
  }

  function toggleReportFormat(format: BulkReportFormat) {
    setFormats((current) =>
      current.includes(format)
        ? current.filter((item) => item !== format)
        : [...current, format]
    );
  }

  async function chooseReportDestination() {
    const selected = await window.marketplaceOS?.platform?.pickFolder();
    if (selected) {
      setReportDestination(selected);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!projectId || !selectedProject) {
      return;
    }
    generateReport.mutate({
      projectId,
      templateId: "marketplace-research-os-v1",
      theme: themeMode,
      sections,
      formats,
      language: reportLanguage,
      fileName: reportFileName,
      exportFolder: reportDestination || selectedProject?.exportFolder || settings.data?.exportFolder
    });
  }

  function confirmDeleteReport(report: ReportSummary) {
    if (window.confirm(`Delete report for "${report.projectName}"? The saved PDF/HTML files will be removed where possible.`)) {
      deleteReport.mutate(report.id);
    }
  }

  if (reportPage === "content") {
    return (
      <ReportContentSettingsPage
        language={language}
        previewLanguage={reportLanguage}
        sections={sections}
        projectName={selectedProject?.name}
        aiConfigured={aiConfigured}
        saving={saveReportPreferences.isPending}
        onBack={() => setReportPage("generator")}
        onSave={saveReportContentSettings}
      />
    );
  }

  return (
    <section className="mio-reports-view space-y-5">
      <LoadingProgressModal
        open={generateReport.isPending}
        title={translate(language, "Generating Report")}
        label={translate(language, "Rendering report and export files")}
        progress={reportProgress}
        detail={selectedProject ? `${selectedProject.name} · ${formats.join(", ")}` : undefined}
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xl font-semibold tracking-[-0.02em] text-white">{translate(language, "Report Generator")}</div>
          <div className="mt-1 text-sm text-ink-400">{translate(language, "Generate reports from saved marketplace evidence.")}</div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <SegmentedControl
            value={reportMode}
            options={[
              { value: "single", label: translate(language, "Single Report") },
              { value: "bulk", label: translate(language, "Bulk Report") }
            ]}
            onChange={setReportMode}
            label="Report mode"
          />
        </div>
      </div>
      {reportMode === "bulk" ? (
        <BulkReportWorkspace
          projects={dashboard.data?.projects ?? []}
          themeMode={themeMode}
          language={language}
          outputLanguage={reportLanguage}
          onOutputLanguageChange={changeReportLanguage}
          sections={sections}
          defaultExportFolder={reportDestination || settings.data?.exportFolder || ""}
          onEditContent={() => setReportPage("content")}
        />
      ) : (
      <div className="mio-reports-grid grid items-start gap-5">
      <div className="mio-report-primary-layout space-y-5">
        <Panel title={"1. " + translate(language, "Project")} icon={Settings}>
          <form className="space-y-4" onSubmit={submit}>
            <Field label={translate(language, "Project")}>
              <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="input">
                <option value="">{translate(language, dashboard.data?.projects[0] ? "Select a project" : "No project")}</option>
                {(dashboard.data?.projects ?? []).map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </Field>
            {selectedProject && (
              <div className="rounded-md border border-white/8 bg-white/5 p-3 text-xs text-ink-400">
                <ProjectFilterMetadata project={selectedProject} />
              </div>
            )}
            <Field label={translate(language, "Report language")}>
              <select className="input" value={reportLanguage} onChange={(event) => changeReportLanguage(event.target.value as AppLanguage)}>
                {APP_LANGUAGES.map((option) => <option key={option.id} value={option.id}>{option.nativeLabel}</option>)}
              </select>
            </Field>
            <Field label={translate(language, "File types")}>
              <div className="mio-report-format-grid">
                {(["DOCX", "PDF", "HTML"] as BulkReportFormat[]).map((format) => {
                  const selected = formats.includes(format);
                  return (
                    <button
                      key={format}
                      type="button"
                      className="mio-report-format-option"
                      aria-pressed={selected}
                      onClick={() => toggleReportFormat(format)}
                    >
                      <span>{format}</span>
                      {selected ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label={translate(language, "Where to save")}>
              <div className="flex min-w-0 gap-2">
                <input
                  className="input min-w-0 flex-1"
                  value={reportDestination || selectedProject?.exportFolder || settings.data?.exportFolder || ""}
                  readOnly
                  title={reportDestination || selectedProject?.exportFolder || settings.data?.exportFolder}
                />
                <button className="secondary-button mio-round-icon-button h-10 w-10 shrink-0 px-0" type="button" onClick={() => void chooseReportDestination()} aria-label={translate(language, "Choose folder")} title={translate(language, "Choose folder")}>
                  <FolderOpen size={16} />
                </button>
              </div>
            </Field>
            <div className="mio-report-content-summary">
              <div>
                <div className="text-sm font-medium text-white">{translate(language, "Report content settings")}</div>
                <div className="mt-1 text-xs text-ink-500">{sections.filter((section) => section.enabled).length} / {sections.length} {translate(language, "sections enabled")}</div>
              </div>
              <button className="secondary-button h-9 w-auto px-3 text-xs" type="button" onClick={() => setReportPage("content")}>
                <ListChecks size={14} />
                {translate(language, "Edit")}
              </button>
            </div>
            <button className="primary-button" type="submit" disabled={!selectedProject || formats.length === 0 || generateReport.isPending}>
              <FileDown size={16} />
              {generateReport.isPending ? translate(language, "Generating Report") : translate(language, "Generate Report")}
            </button>
            {!generateReport.isPending && reportProgress > 0 && (
              <div className="rounded-md border border-white/8 bg-white/5 p-3">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-ink-400">{translate(language, generateReport.isPending ? "Rendering report and export files" : "Report generation complete")}</span>
                  <span className="font-semibold text-signal-blue">{reportProgress}%</span>
                </div>
                <ProgressBar value={reportProgress} />
              </div>
            )}
            {generateReport.data && (
              <div className="rounded-md border border-signal-green/25 bg-signal-green/10 p-3 text-sm text-signal-green">
                Report generated at {generateReport.data.pdfPath}
              </div>
            )}
          </form>
        </Panel>
        <Panel title={translate(language, "Generated Reports")} icon={Archive}>
          <div className="mio-report-history-list max-h-[520px] space-y-3 overflow-auto pr-1">
            {(reports.data ?? []).map((report) => {
              const reportFormats = report.formats?.length ? report.formats : ["PDF", "HTML"] as BulkReportFormat[];
              const primaryPath =
                (reportFormats.includes("PDF") ? report.pdfPath : null) ||
                (reportFormats.includes("DOCX") ? report.docxPath : null) ||
                report.htmlPath ||
                report.pdfPath;
              return (
              <div key={report.id} className="mio-generated-report-row">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{report.projectName}</div>
                    <div className="text-xs text-ink-500">
                      {formatDateTime(report.generatedAt ?? report.updatedAt)} · {reportFormats.join(", ")}
                    </div>
                  </div>
                </div>
                {report.status === "DRAFT" && (
                  <div className="mb-3 rounded-md border border-white/8 bg-white/5 p-2 text-xs text-ink-500">
                    {translate(language, "This report is still being prepared. Final export actions will become available when generation completes.")}
                  </div>
                )}
                <div className="mio-report-history-actions flex items-center gap-2">
                  <button className="secondary-button mio-round-icon-button h-9 w-9 px-0" type="button" disabled={report.status === "DRAFT" || !report.htmlPath || loadReportPreview.isPending} onClick={() => loadReportPreview.mutate(report.id)} aria-label={translate(language, "Preview")} title={translate(language, "Preview")}>
                    <Eye size={14} />
                  </button>
                  <button className="secondary-button mio-round-icon-button h-9 w-9 px-0" type="button" disabled={report.status === "DRAFT" || !primaryPath} onClick={() => primaryPath && void apiClient.revealPath(primaryPath)} aria-label={translate(language, "Locate")} title={translate(language, "Locate")}>
                    <FolderOpen size={14} />
                  </button>
                  <button className="secondary-button h-9 w-auto px-4 text-xs" type="button" disabled={report.status === "DRAFT" || !primaryPath} onClick={() => primaryPath && void apiClient.openPath(primaryPath)}>
                    {translate(language, "Open")}
                  </button>
                  <button className="secondary-button mio-danger-round mio-round-icon-button ml-auto h-9 w-9 px-0" type="button" disabled={deleteReport.isPending} onClick={() => confirmDeleteReport(report)} aria-label={translate(language, "Delete")} title={translate(language, "Delete")}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );})}
            {(reports.data ?? []).length === 0 && <EmptyState label={translate(language, "No generated reports yet.")} />}
          </div>
        </Panel>
      </div>
      <Panel title="2. Choose Report Content" icon={ListChecks} className="mio-report-inline-content-hidden">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/8 bg-white/[0.04] px-3 py-2 text-xs">
          <span className="text-ink-400">Enable the sections needed in the final report. Drag section groups to reorder them.</span>
          <span className="rounded-full bg-white/8 px-2.5 py-1 font-medium text-ink-200">
            {sections.filter((section) => section.enabled).length} of {sections.length} enabled
          </span>
        </div>
        <div className="space-y-3">
          {groupOrder.map((groupId) => {
            const group = REPORT_SECTION_GROUPS.find((item) => item.id === groupId);
            if (!group) return null;
            const children = group.sectionIds
              .map((sectionId) => sections.find((section) => section.id === sectionId))
              .filter((section): section is ReportSectionConfig => Boolean(section));
            return (
              <section
                id={`report-group-${group.id}`}
                key={group.id}
                draggable
                onDragStart={() => setDraggedGroupId(group.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => moveReportGroup(group.id)}
                className="scroll-mt-24 rounded-md border border-white/8 bg-white/5 p-3"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{group.title}</div>
                    <div className="mt-1 text-xs text-ink-500">Drag this parent section to change report order.</div>
                  </div>
                  <Rows3 size={16} className="cursor-grab text-ink-500" aria-label={`Reorder ${group.title}`} />
                </div>
                <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                  {children.map((section) => (
                    <button
                      type="button"
                      key={section.id}
                      className={[
                        "rounded-md border p-3 text-left transition",
                        section.enabled ? "border-signal-blue/35 bg-signal-blue/10" : "border-white/8 bg-white/5 text-ink-500"
                      ].join(" ")}
                      onClick={() => toggleReportSection(section.id)}
                    >
                      <div className="mb-1 flex items-center justify-between text-sm font-medium">
                        {section.label}
                        {section.enabled && <CheckCircle2 size={16} className="text-signal-blue" />}
                      </div>
                      <div className="text-xs leading-5 text-ink-500">{section.requiredEvidence.slice(0, 3).join(", ")}</div>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </Panel>
      </div>
      )}
      {previewReport && <ReportPreviewModal report={previewReport} onClose={() => setPreviewReport(null)} />}
    </section>
  );
}

type ReportPreviewHeading = {
  id: string;
  label: string;
  level: number;
};

function prepareContinuousReportPreview(html: string): { html: string; headings: ReportPreviewHeading[] } {
  const documentNode = new DOMParser().parseFromString(html, "text/html");
  const headings = Array.from(documentNode.querySelectorAll("h1, h2, h3, summary"))
    .map((heading, index) => {
      const label = heading.textContent?.replace(/\s+/gu, " ").trim().slice(0, 100) ?? "";
      if (!label) {
        return undefined;
      }
      const id = heading.id || `mio-report-heading-${index + 1}`;
      heading.id = id;
      return {
        id,
        label,
        level: heading.tagName === "H1" ? 1 : heading.tagName === "H2" || heading.tagName === "SUMMARY" ? 2 : 3
      } satisfies ReportPreviewHeading;
    })
    .filter((heading): heading is ReportPreviewHeading => Boolean(heading))
    .filter((heading, index, entries) => index === 0 || heading.label.toLocaleLowerCase() !== entries[index - 1]?.label.toLocaleLowerCase());
  const previewStyle = documentNode.createElement("style");
  previewStyle.textContent = `
    html { scroll-behavior: smooth; }
    body { max-width: 980px !important; min-height: 100vh; margin: 0 auto !important; padding: 24px !important; box-shadow: none !important; }
    .report-shell { overflow: hidden; border: 1px solid rgba(127, 127, 127, 0.18); border-radius: 12px; background: var(--report-panel, #fff); }
    .inspector-header { margin: 0 !important; border: 0 !important; border-radius: 0 !important; padding: 28px 30px !important; box-shadow: none !important; }
    .page, .report-section, details.page, section.page {
      min-height: 0 !important;
      margin: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      break-before: auto !important;
      break-after: auto !important;
      page-break-before: auto !important;
      page-break-after: auto !important;
    }
    details.report-section {
      margin: 0 !important;
      border: 0 !important;
      border-top: 1px solid rgba(127, 127, 127, 0.18) !important;
      border-radius: 0 !important;
      padding: 22px 30px !important;
      background: transparent !important;
      box-shadow: none !important;
    }
    details.store-report { box-shadow: none !important; }
    [id^="mio-report-heading-"] { scroll-margin-top: 28px; }
    @media print { body { max-width: none !important; } }
  `;
  documentNode.head.append(previewStyle);
  return { html: `<!doctype html>${documentNode.documentElement.outerHTML}`, headings };
}

function ReportPreviewModal({ report, onClose }: { report: ReportHtmlPayload; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const preview = useMemo(() => prepareContinuousReportPreview(report.html), [report.html]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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

  function goToHeading(id: string) {
    iframeRef.current?.contentDocument?.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const modal = (
    <div
      className="mio-report-preview-overlay fixed inset-0 z-[150] overflow-y-auto bg-black/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Report preview"
    >
      <div className="flex min-h-full items-start justify-center">
        <div className="mio-panel mio-report-preview-modal flex h-[calc(100dvh-32px)] w-[min(1180px,calc(100vw-32px))] min-w-0 flex-col overflow-hidden rounded-[18px] border border-white/12 bg-ink-900/95 shadow-glow">
          <div className="mio-report-preview-header sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/12 bg-ink-900/95 p-4 backdrop-blur-xl">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">Report Preview</div>
              <div className="mt-1 truncate text-xs text-ink-500">{report.htmlPath}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button className="secondary-button h-9 w-auto px-3 text-xs" type="button" onClick={() => void copyReport()}>
                <Copy size={14} />
                {copied ? "Copied" : "Copy Report"}
              </button>
              <button className="secondary-button h-9 w-auto px-3 text-xs" type="button" onClick={() => void apiClient.openPath(report.htmlPath)}>
                <FileText size={14} />
                Open HTML
              </button>
              <button className="secondary-button mio-round-icon-button h-9 w-9 px-0" type="button" onClick={onClose} aria-label="Close report preview">
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="mio-report-preview-workspace min-h-0 flex-1">
            <aside className="mio-report-preview-outline" aria-label="Report headings">
              <div className="mio-report-preview-outline-title">Contents</div>
              <nav>
                {preview.headings.map((heading) => (
                  <button
                    key={heading.id}
                    type="button"
                    className="mio-report-preview-outline-item"
                    style={{ paddingInlineStart: `${10 + (heading.level - 1) * 12}px` }}
                    onClick={() => goToHeading(heading.id)}
                  >
                    {heading.label}
                  </button>
                ))}
              </nav>
            </aside>
            <div className="mio-report-preview-document-shell">
              <iframe ref={iframeRef} title="Report preview" srcDoc={preview.html} className="mio-report-preview-frame h-full min-h-0 w-full border-0 bg-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, appPortalRoot());
}

function PlatformButton({
  active,
  icon: Icon,
  label,
  badge,
  disabled,
  onClick
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  badge?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        "mio-platform-tile",
        active ? "mio-platform-tile-active" : "",
        disabled ? "mio-platform-tile-disabled" : ""
      ].join(" ")}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={17} strokeWidth={1.65} />
      <span className="truncate">{label}</span>
      {badge && <span className="mio-platform-badge">{badge}</span>}
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
    <Chip
      active={active}
      className={compact ? "mio-chip-compact" : ""}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={15} />
      {children}
    </Chip>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: ReactNode; detail?: string }) {
  return (
    <div className="mio-metric-card rounded-md border border-white/8 bg-white/6 p-4">
      <div className="mb-4 flex items-center justify-between text-ink-500">
        <span className="text-xs uppercase tracking-[0.14em]">{label}</span>
        <Icon size={17} />
      </div>
      <div className="mio-metric-value text-3xl font-semibold text-white">{value}</div>
      {detail && <div className="mt-2 text-[11px] leading-4 text-ink-500">{detail}</div>}
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

function ProjectStatusPill({ completed }: { completed: boolean }) {
  const language = useUiStore((state) => state.language);
  return (
    <span className={["shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold", completed ? "bg-signal-green/15 text-signal-green" : "bg-signal-amber/15 text-signal-amber"].join(" ")}>
      {translate(language, completed ? "Completed" : "Incomplete")}
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
      className="mio-circular-progress relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
      style={{ "--mio-progress-angle": `${normalized * 3.6}deg` } as CSSProperties}
      aria-label={`${normalized}% complete`}
    >
      <span className="relative">{normalized}%</span>
    </div>
  );
}

function collectionStageLabel(stage: CollectionStage): string {
  switch (stage) {
    case "PRODUCT_DETAILS":
      return "Part 2 - Product Details";
    case "EVALUATION_KEY_STORE":
      return "Part 3 - Key Store Pages";
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
    stageCompleted: {},
    searchFilters: {
      shopTypes: []
    },
    qualifiedProductIds: [],
    qualifiedProductReferences: [],
    qualifiedProductsInitialized: false,
    qualifiedProductsApproved: false,
    storeCollectionCandidates: [],
    storeListInitialized: false,
    storeListApproved: false
  };
}

function projectCollectionState(project: ProjectSummary): CollectionState {
  return (project as ProjectSummary & { collectionState?: CollectionState }).collectionState ?? defaultCollectionState();
}

function projectFilterMetadata(project: ProjectSummary): { storeType: string; priceRange: string } {
  const filters = projectCollectionState(project).searchFilters;
  const labels = (filters?.shopTypes ?? []).map(
    (shopType) => SHOPEE_SHOP_TYPE_OPTIONS.find((option) => option.id === shopType)?.label ?? shopType
  );
  const priceMin = filters?.priceMin;
  const priceMax = filters?.priceMax;
  return {
    storeType: labels.length > 0 ? labels.join(", ") : "All shop types",
    priceRange:
      priceMin !== undefined && priceMax !== undefined
        ? `${formatCurrency(priceMin)} - ${formatCurrency(priceMax)}`
        : priceMin !== undefined
          ? `From ${formatCurrency(priceMin)}`
          : priceMax !== undefined
            ? `Up to ${formatCurrency(priceMax)}`
            : "All prices"
  };
}

function ProjectFilterMetadata({ project, chips = false }: { project: ProjectSummary; chips?: boolean }) {
  const metadata = projectFilterMetadata(project);
  return (
    <div className={chips ? "mio-card-chip-row" : "mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-400"}>
      <span className={chips ? "mio-card-chip" : "truncate"}>{metadata.storeType}</span>
      <span className={chips ? "mio-card-chip" : "truncate"}>{metadata.priceRange}</span>
    </div>
  );
}

function orderReportSections(
  sections: ReportSectionConfig[],
  savedOrder: ReportSectionId[]
): ReportSectionConfig[] {
  const positions = new Map(savedOrder.map((id, index) => [id, index]));
  return [...sections].sort(
    (left, right) =>
      (positions.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (positions.get(right.id) ?? Number.MAX_SAFE_INTEGER)
  );
}

function normalizeReportSections(
  savedSections: ReportSectionConfig[] | null,
  savedOrder: ReportSectionId[]
): ReportSectionConfig[] {
  if (!savedSections?.length) {
    return DEFAULT_REPORT_SECTIONS.map((section) => ({ ...section }));
  }
  const savedById = new Map(savedSections?.map((section) => [section.id, section]) ?? []);
  const currentSections = DEFAULT_REPORT_SECTIONS.map((defaultSection) => {
    const saved = savedById.get(defaultSection.id);
    return saved ? { ...defaultSection, enabled: saved.enabled } : { ...defaultSection };
  });
  const currentIds = new Set(currentSections.map((section) => section.id));
  const currentSavedOrder = savedOrder.filter((sectionId) => currentIds.has(sectionId));
  return orderReportSections(currentSections, currentSavedOrder);
}

function orderReportSectionGroups(savedOrder: ReportSectionId[]): ReportSectionGroupId[] {
  const positions = new Map(savedOrder.map((id, index) => [id, index]));
  return [...REPORT_SECTION_GROUPS]
    .sort((left, right) => {
      const leftPosition = Math.min(
        ...left.sectionIds.map((id) => positions.get(id) ?? Number.MAX_SAFE_INTEGER)
      );
      const rightPosition = Math.min(
        ...right.sectionIds.map((id) => positions.get(id) ?? Number.MAX_SAFE_INTEGER)
      );
      return leftPosition - rightPosition;
    })
    .map((group) => group.id);
}

function flattenReportSectionsByGroup(
  sections: ReportSectionConfig[],
  groupOrder: ReportSectionGroupId[]
): ReportSectionConfig[] {
  const groupedIds = new Set<ReportSectionId>();
  const ordered = groupOrder.flatMap((groupId) => {
    const group = REPORT_SECTION_GROUPS.find((item) => item.id === groupId);
    if (!group) {
      return [];
    }
    const groupSectionIds = new Set<ReportSectionId>(group.sectionIds);
    group.sectionIds.forEach((sectionId) => groupedIds.add(sectionId));
    return sections.filter((section) => groupSectionIds.has(section.id));
  });
  return [...ordered, ...sections.filter((section) => !groupedIds.has(section.id))];
}

function sanitizeReportFileName(value: string): string {
  const withoutControlCharacters = Array.from(value, (character) =>
    character.charCodeAt(0) <= 31 ? "-" : character,
  ).join("");
  const sanitized = withoutControlCharacters
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/[.\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return `${sanitized.replace(/(?:\.pdf)+$/i, "") || "marketplace-report"}.pdf`;
}

function buildReportFileName(project: ProjectSummary, template: string): string {
  const metadata = projectFilterMetadata(project);
  const timestamp = new Date();
  const replacements: Record<string, string> = {
    projectName: project.name,
    storeType: metadata.storeType,
    priceRange: metadata.priceRange,
    date: [
      timestamp.getFullYear(),
      String(timestamp.getMonth() + 1).padStart(2, "0"),
      String(timestamp.getDate()).padStart(2, "0")
    ].join("-"),
    time: [
      String(timestamp.getHours()).padStart(2, "0"),
      String(timestamp.getMinutes()).padStart(2, "0")
    ].join("-")
  };
  const resolved = template.replace(
    /\{(projectName|storeType|priceRange|date|time)\}/g,
    (_match, key: string) => replacements[key] ?? ""
  );
  return sanitizeReportFileName(resolved);
}

function isProjectComplete(project: ProjectSummary): boolean {
  return projectCollectionState(project).progressPercent >= 100;
}

function stageCompletionButtonLabel(stage: CollectionStage): string {
  switch (stage) {
    case "KEYWORD_GENERAL":
      return "Done";
    case "PRODUCT_DETAILS":
      return "Collection Complete";
    case "EVALUATION_KEY_STORE":
      return "Store Page List";
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

function collectionSubActionStates(
  step: CollectionStep,
  stepAssetPaths: Record<string, string>,
  counts: Record<string, number>
): Record<string, "pending" | "collected" | "not-found"> {
  const states: Record<string, "pending" | "collected" | "not-found"> = {};
  for (const action of step.subActions ?? []) {
    const saved = Boolean(stepAssetPaths[stepProgressKey(step, action.id)]);
    if (!saved) {
      states[action.id] = "pending";
      continue;
    }
    if (action.mode === "screenshot") {
      states[action.id] = "collected";
      continue;
    }
    states[action.id] = (counts[action.id] ?? 0) > 0 ? "collected" : "not-found";
  }
  if (states["description-promotions"] && states["description-promotions"] !== "pending") {
    states.description = (counts.description ?? 0) > 0 ? "collected" : "not-found";
    states["shop-vouchers"] = (counts["shop-vouchers"] ?? 0) > 0 ? "collected" : "not-found";
    states["bundle-deals"] = (counts["bundle-deals"] ?? 0) > 0 ? "collected" : "not-found";
  }
  return states;
}

function isCollectionStepComplete(step: CollectionStep, stepAssetPaths: Record<string, string>): boolean {
  if (stepAssetPaths[step.id]) {
    return true;
  }
  if (!step.subActions?.length) {
    return false;
  }
  return step.subActions
    .filter((action) => action.metadata?.optional !== true)
    .every((action) => Boolean(stepAssetPaths[stepProgressKey(step, action.id)]));
}

function relatedShopHomepageProgressKeys(
  ownerProductId: string,
  steps: CollectionStep[],
  detail?: ProjectDetailPayload
): string[] {
  const sourceProduct = detail?.products.find((product) => product.id === ownerProductId);
  if (!sourceProduct) {
    return [];
  }
  if (!sourceProduct.storeUrl && !sourceProduct.storeName) {
    return [];
  }
  const sourceKey = normalizeStoreKey(sourceProduct);
  return steps
    .filter((step) => step.stage === "PRODUCT_DETAILS" && step.ownerType === "PRODUCT" && step.ownerId)
    .filter((step) => {
      const product = detail?.products.find((item) => item.id === step.ownerId);
      return Boolean(product && normalizeStoreKey(product) === sourceKey);
    })
    .map((step) => stepProgressKey(step, "shop-homepage"));
}

function buildCollectionSteps(
  project: ProjectSummary,
  platform: ResearchPlatform,
  currentUrl: string,
  viewMode: PlatformViewMode,
  detail?: ProjectDetailPayload,
  storeCollectionCandidates: StoreCollectionCandidate[] = []
): CollectionStep[] {
  return platform === "SHOPEE_ID"
    ? buildShopeeSteps(project, currentUrl, viewMode, detail, storeCollectionCandidates)
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
  viewMode: PlatformViewMode,
  detail?: ProjectDetailPayload,
  storeCollectionCandidates: StoreCollectionCandidate[] = []
): CollectionStep[] {
  const products = detail?.products ?? [];
  const collectionState = projectCollectionState(project);
  const searchFilters = collectionState.searchFilters;
  const relevanceUrl = buildShopeeSearchUrl(project.keyword, "relevancy", searchFilters);
  const salesUrl = buildShopeeSearchUrl(project.keyword, "sales", searchFilters);
  const productReady = isShopeeProductPage(currentUrl);
  const storeReady = isShopeeStorePage(currentUrl);
  const hasRelevanceProducts = products.some((product) => product.source === "Relevance");
  const hasTopSalesProducts = products.some((product) => product.source === "Top Sales");
  const selectableKeyProducts = allKeyProductCandidates(products, project.keyword);
  const rankedKeyProducts = rankQualifiedProducts(selectableKeyProducts).slice(0, 120);
  const selectableById = new Map(selectableKeyProducts.map((product) => [product.id, product]));
  const keyProducts = collectionState.qualifiedProductReferences?.length
    ? resolveQualifiedProductReferences(selectableKeyProducts, collectionState.qualifiedProductReferences)
    : collectionState.qualifiedProductsInitialized
      ? (collectionState.qualifiedProductIds ?? [])
          .map((productId) => selectableById.get(productId))
          .filter((product): product is ProjectProductEvidence => Boolean(product))
      : rankedKeyProducts.slice(0, 10);
  const legacyStores = (detail?.stores ?? []).map((store) => ({
    id: store.id,
    storeName: store.name,
    storeUrl: store.url,
    storeType: store.storeType,
    shopId: store.marketplaceStoreId
  }));
  const candidateStores = resolveCanonicalStoreList(
    keyProducts,
    storeCollectionCandidates,
    Boolean(collectionState.storeListInitialized),
    legacyStores
  ).map((candidate) => {
    const collectedStore = detail ? findCollectedStore(detail, candidate) : undefined;
    return collectedStore?.marketplaceStoreId && !candidate.shopId
      ? { ...candidate, shopId: collectedStore.marketplaceStoreId }
      : candidate;
  });

  const discoverySteps: CollectionStep[] = [
    {
      id: "keyword-relevance",
      stage: "KEYWORD_GENERAL",
      section: "Keyword as Title",
      label: "Relevance first page screenshot",
      kind: "SEARCH_RESULT",
      targetSelector: "section.shopee-search-item-result, section[aria-label].shopee-search-item-result",
      instruction: "Open the Shopee relevance result page for the desired keyword and capture the visible first page.",
      targetUrl: relevanceUrl,
      ready: sameUrlIntent(currentUrl, relevanceUrl)
    },
    {
      id: "keyword-top-sales",
      stage: "KEYWORD_GENERAL",
      section: "Keyword as Title",
      label: "Top sales first page screenshot",
      kind: "TOP_SALES",
      targetSelector: "section.shopee-search-item-result, section[aria-label].shopee-search-item-result",
      instruction: "Open the Shopee top-sales result page for the desired keyword and capture the visible first page.",
      targetUrl: salesUrl,
      ready: sameUrlIntent(currentUrl, salesUrl)
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
    const productUrl = withShopeeProductDisplayModel(product.productUrl, viewMode);
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
        "First page",
        "Slides / video",
        "Description",
        "Positive reviews",
        "Negative reviews",
        "Media in user",
        "Shop vouchers",
        "Bundle deals",
        "Shop Home Page"
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
          id: "description-promotions",
          label: "Description, vouchers, bundle deals",
          mode: "background",
          collectLabel: "Collect Data",
          description: "Sync description, mini vouchers, and Bundle Deals from readable HTML."
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

  const storeSteps = candidateStores.map((candidate) =>
    buildShopeeStoreCollectionStep(candidate, currentUrl, storeReady)
  );

  return [...discoverySteps, ...genericProductSteps, ...productSteps, ...storeSteps];
}

function buildShopeeStoreCollectionStep(
  candidate: StoreCollectionCandidate,
  currentUrl: string,
  storeReady: boolean
): CollectionStep {
  const homepageUrl = storeHomepageUrl(candidate);
  const commonMetadata = {
    storeCandidateId: candidate.id,
    storeName: candidate.storeName,
    shopId: candidate.shopId,
    canonicalStoreUrl: homepageUrl
  };
  const action = (
    id: string,
    label: string,
    mode: CollectionSubAction["mode"],
    kind: ManualEvidenceKind,
    targetUrl: string,
    storeEvidenceType: string,
    description: string,
    options: Partial<CollectionSubAction> = {}
  ): CollectionSubAction => ({
    id,
    label,
    mode,
    kind,
    targetUrl,
    description,
    ...options,
    metadata: {
      ...commonMetadata,
      storeEvidenceType,
      ...(options.metadata ?? {})
    }
  });
  const actions: CollectionSubAction[] = [
    action(
      "store-homepage",
      "Store Home Page",
      "screenshot",
      "STORE_HOME",
      homepageUrl,
      "homepage",
      "Capture the store homepage as evidence for this store.",
      {
        collectLabel: "Capture Store Page",
        captureMode: "full-page",
        captureStrategy: "top-through-selector",
        targetSelector: ".shop-decoration"
      }
    ),
    action(
      "store-details",
      "Store Data",
      "collect",
      "STORE_HOME",
      homepageUrl,
      "details",
      "Collect products, followers, following, rating, chat performance, joined date, and description from the visible store homepage.",
      {
        collectLabel: "Collect Store Data",
        guidance: "Collect the visible profile metrics in either view. Switch to Mobile when you also need the Store Description.",
        metadata: { dataOnly: true, descriptionViewMode: "mobile" }
      }
    ),
    action(
      "store-rating-negative",
      "1 Star Store Ratings",
      "collect",
      "REVIEW_SECTION",
      storeRatingsUrl(candidate, 1),
      "rating-1",
      "Collect up to five 1-star store ratings that include both review text and customer image or video proof.",
      { collectLabel: "Collect 1 Star", preferredViewMode: "desktop", metadata: { dataOnly: true, requestedRating: 1 } }
    ),
    action(
      "store-rating-positive",
      "5 Star Store Ratings",
      "collect",
      "REVIEW_SECTION",
      storeRatingsUrl(candidate, 5),
      "rating-5",
      "Collect up to five 5-star store ratings that include both review text and customer image or video proof.",
      { collectLabel: "Collect 5 Star", preferredViewMode: "desktop", metadata: { dataOnly: true, requestedRating: 5 } }
    ),
    action(
      "store-categories",
      "Store Categories",
      "collect",
      "STORE_HOME",
      storeCategoriesUrl(candidate),
      "categories",
      "Collect the visible store category names and product counts.",
      { collectLabel: "Collect Categories", preferredViewMode: "mobile", metadata: { dataOnly: true } }
    )
  ];
  actions.push(action(
    "store-popular",
    "Popular Products",
    "collect",
    "STORE_FEATURED_PRODUCTS",
    storeProductsUrl(candidate, "pop"),
    "popular-products",
    "Collect the full first page of store products sorted by Popular.",
    {
      collectLabel: "Add Popular Products",
      targetSelector: ".shop-page__all-products-section",
      metadata: { dataOnly: true }
    }
  ));
  actions.push(action(
    "store-best-seller",
    "Store Best Sellers",
    "collect",
    "STORE_BEST_SELLER",
    storeProductsUrl(candidate, "sales"),
    "best-sellers",
    "Collect the full first page of store products sorted by Top Sales.",
    {
      collectLabel: "Collect Best Sellers",
      targetSelector: ".shop-page__all-products-section",
      metadata: { dataOnly: true }
    }
  ));
  actions.push(action(
    "store-banner",
    "Visual Shop Banner",
    "download",
    "STORE_BANNER",
    homepageUrl,
    "banner",
    "Download banner and carousel images from shop-decoration while excluding product-card images.",
    {
      collectLabel: "Add Shop Banners",
      targetSelector: ".shop-decoration",
      metadata: { dataOnly: true }
    }
  ));
  const tiktokTarget = `https://www.tiktok.com/search?q=${encodeURIComponent(candidate.storeName)}`;
  actions.push(action(
    "store-tiktok",
    "TikTok Evidence",
    "screenshot",
    "SOCIAL_ACCOUNT",
    tiktokTarget,
    "tiktok",
    `Open TikTok search for ${candidate.storeName}, then capture or attach cross-platform evidence.`,
    { collectLabel: "Capture TikTok" }
  ));
  return {
    id: `${candidate.id}-store`,
    stage: "EVALUATION_KEY_STORE",
    section: "Key Store Page List",
    label: candidate.storeName,
    kind: "STORE_HOME",
    ownerType: "STORE",
    ownerId: candidate.id,
    targetUrl: actions[0]?.targetUrl,
    instruction: `Collect store evidence for ${candidate.storeName}.`,
    substeps: actions.map((item) => item.label),
    subActions: actions,
    ready: storeReady && sameUrlIntent(currentUrl, homepageUrl),
    metadata: commonMetadata
  };
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

function initialPlatformUrl(
  platform: ResearchPlatform,
  keyword: string,
  searchFilters?: ShopeeSearchFilters
): string {
  if (platform === "TIKTOK_SHOP") {
    return TIKTOK_SHOP_URL;
  }
  return buildShopeeSearchUrl(keyword, "relevancy", searchFilters);
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
  return matchesShopeeSearchIntent(current, target);
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

function canonicalStoreUrl(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  try {
    const source = new URL(normalizeUrl(value));
    const canonical = new URL(`${source.origin}${source.pathname.replace(/\/+$/u, "") || "/"}`);
    const categoryId = source.searchParams.get("categoryId");
    if (categoryId) {
      canonical.searchParams.set("categoryId", categoryId);
    }
    return canonical.toString().replace(/\/$/u, "");
  } catch {
    return normalizeUrl(value).split("#")[0];
  }
}

function sameStoreIntent(left?: string | null, right?: string | null): boolean {
  const leftCanonical = canonicalStoreUrl(left);
  const rightCanonical = canonicalStoreUrl(right);
  return Boolean(leftCanonical && rightCanonical && leftCanonical.toLowerCase() === rightCanonical.toLowerCase());
}

function matchesStoreCollectionTarget(
  currentUrl: string,
  targetUrl?: string,
  canonicalUrl?: string,
  shopId?: string
): boolean {
  if (!isShopeeStorePage(currentUrl) && !/shopee\.co\.id\/(?:buyer|shop)\//iu.test(currentUrl)) {
    return false;
  }
  const currentShopId = extractShopeeShopId(currentUrl);
  const expectedShopId = shopId || extractShopeeShopId(targetUrl) || extractShopeeShopId(canonicalUrl);
  if (currentShopId && expectedShopId) {
    return currentShopId === expectedShopId;
  }
  return sameStoreIntent(currentUrl, canonicalUrl) || sameStoreIntent(currentUrl, targetUrl);
}

function shopeeProductIdentity(value: string): string | undefined {
  const match = /(?:-i\.|i\.|product\/)(\d+)[./](\d+)/u.exec(value);
  return match ? `${match[1]}:${match[2]}` : undefined;
}

function allKeyProductCandidates(
  products: ProjectProductEvidence[],
  keyword = ""
): ProjectProductEvidence[] {
  const merged = new Map<string, ProjectProductEvidence>();
  for (const rawProduct of products.filter(isQualifiedProductSource)) {
    const product = normalizeProductSelectionSignals(rawProduct);
    if (isExcludedCommerceProductTitle(product.title)) {
      continue;
    }
    const key = normalizeProductKey(product);
    const current = merged.get(key);
    if (!current || productQualityScore(product) > productQualityScore(current)) {
      merged.set(key, mergeProductSignals(current, product));
    } else {
      merged.set(key, mergeProductSignals(product, current));
    }
  }
  const candidates = Array.from(merged.values()).filter(
    (product) => product.title && product.productUrl
  );
  return candidates.map((product) => ({
      ...product,
      selectionReason: selectionReasonForDisplay(product, candidates, keyword)
    }));
}

function projectSavedKeyProductCandidates(detail: ProjectDetailPayload, limit = 10): ProjectProductEvidence[] {
  const selectable = allKeyProductCandidates(detail.products, detail.project.keyword);
  const ranked = rankQualifiedProducts(selectable).slice(0, 120);
  const state = projectCollectionState(detail.project);
  if (state.qualifiedProductReferences?.length) {
    return resolveQualifiedProductReferences(selectable, state.qualifiedProductReferences);
  }
  if (!state.qualifiedProductsInitialized) return ranked.slice(0, limit);

  const productsById = new Map<string, ProjectProductEvidence>();
  for (const product of selectable) productsById.set(product.id, product);
  return (state.qualifiedProductIds ?? [])
    .map((id) => productsById.get(id))
    .filter((product): product is ProjectProductEvidence => Boolean(product));
}

function projectSavedStoreCandidates(detail: ProjectDetailPayload): StoreCollectionCandidate[] {
  const state = projectCollectionState(detail.project);
  const legacyStores = detail.stores.map((store) => ({
    id: store.id,
    storeName: store.name,
    storeUrl: store.url,
    storeType: store.storeType,
    shopId: store.marketplaceStoreId
  }));
  return resolveCanonicalStoreList(
    projectSavedKeyProductCandidates(detail, 20),
    state.storeCollectionCandidates ?? [],
    Boolean(state.storeListInitialized),
    legacyStores
  );
}

function isExcludedCommerceProductTitle(title: string): boolean {
  return /\b(?:GIMMICK|NOT\s+FOR\s+SALE|FREE\s+GIFT)\b/iu.test(title);
}

function isQualifiedProductSource(product: ProjectProductEvidence): boolean {
  return !product.source?.startsWith("Store Products") && !product.source?.startsWith("Store Best Sellers");
}

function normalizeProductSelectionSignals(product: ProjectProductEvidence): ProjectProductEvidence {
  if (product.source === "Top Sales" && !hasPdpDetailSignal(product)) {
    return {
      ...product,
      totalSold: undefined,
      totalSoldText: undefined
    };
  }
  if (product.source === "Relevance") {
    return {
      ...product,
      monthlySold: undefined,
      monthlySoldText: undefined
    };
  }
  return product;
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
  const topSalesSignals = [preferred, base].find((product) => product.source === "Top Sales");
  const relevanceSignals = [preferred, base].find((product) => product.source === "Relevance");
  const pdpTotalSignals = [preferred, base].find(hasPdpDetailSignal);
  return {
    ...preferred,
    sourcePlacement: mergePlacementLabels([productSourcePlacement(preferred), productSourcePlacement(base)]),
    selectionReason: mergeReasonLabels(preferred.selectionReason, base.selectionReason),
    productType: preferred.productType ?? base.productType,
    storeType: mergeStoreType(base, preferred),
    ratingText: mergeRatingText(base, preferred),
    reviewText: preferred.reviewText ?? base.reviewText,
    monthlySoldText: topSalesSignals?.monthlySoldText ?? preferred.monthlySoldText ?? base.monthlySoldText,
    totalSoldText: relevanceSignals?.totalSoldText ?? pdpTotalSignals?.totalSoldText,
    monthlySold: topSalesSignals?.monthlySold ?? preferred.monthlySold ?? base.monthlySold,
    totalSold: relevanceSignals?.totalSold ?? pdpTotalSignals?.totalSold,
    reviewCount: preferred.reviewCount ?? base.reviewCount,
    rating: mergeRatingValue(base, preferred),
    storeName: preferred.storeName ?? base.storeName,
    storeUrl: preferred.storeUrl ?? base.storeUrl,
    storeBadgeImageUrl: storeTypeImage(mergeStoreType(base, preferred)) ?? undefined,
    imageUrl: preferred.imageUrl ?? base.imageUrl,
    images: preferred.images.length > 0 ? preferred.images : base.images,
    videos: preferred.videos.length > 0 ? preferred.videos : base.videos,
    descriptionImages: preferred.descriptionImages.length > 0 ? preferred.descriptionImages : base.descriptionImages,
    reviewMediaImages: preferred.reviewMediaImages.length > 0 ? preferred.reviewMediaImages : base.reviewMediaImages,
    reviewMediaVideos: preferred.reviewMediaVideos.length > 0 ? preferred.reviewMediaVideos : base.reviewMediaVideos
  };
}

function hasPdpDetailSignal(product: ProjectProductEvidence): boolean {
  return Boolean(product.storeName || product.reviewText || product.description || product.images.length || product.videos.length);
}

function mergeStoreType(base: ProjectProductEvidence | undefined, preferred: ProjectProductEvidence): StoreType | undefined {
  const detectedTypes = [
    normalizeStoreTypeValue(preferred.storeBadgeImageUrl),
    normalizeStoreTypeValue(preferred.storeType),
    normalizeStoreTypeValue(base?.storeBadgeImageUrl),
    normalizeStoreTypeValue(base?.storeType),
  ].filter((value): value is StoreType => Boolean(value));

  if (detectedTypes.includes("shopee_mall")) return "shopee_mall";
  if (detectedTypes.includes("star_plus")) return "star_plus";
  if (detectedTypes.includes("star")) return "star";
  return undefined;
}

function strongestStoreType(values: Array<StoreType | string | null | undefined>): StoreType | undefined {
  const normalized = values
    .map((value) => normalizeStoreTypeValue(value))
    .filter((value): value is StoreType => Boolean(value));
  if (normalized.includes("shopee_mall")) return "shopee_mall";
  if (normalized.includes("star_plus")) return "star_plus";
  if (normalized.includes("star")) return "star";
  return undefined;
}

function mergeRatingText(base: ProjectProductEvidence | undefined, preferred: ProjectProductEvidence): string | undefined {
  const values = [preferred.ratingText, base?.ratingText].filter((value): value is string => Boolean(value));
  return values.find((value) => /[,.]/u.test(value)) ?? values.find((value) => Number(value.replace(",", ".")) >= 3.5) ?? values[0];
}

function mergeRatingValue(base: ProjectProductEvidence | undefined, preferred: ProjectProductEvidence): number | undefined {
  const values: Array<{ value: number; text?: string | null }> = [];
  if (typeof preferred.rating === "number") {
    values.push({ value: preferred.rating, text: preferred.ratingText });
  }
  if (typeof base?.rating === "number") {
    values.push({ value: base.rating, text: base.ratingText });
  }
  return values.find((item) => item.text && /[,.]/u.test(item.text))?.value ??
    values.find((item) => item.value >= 3.5)?.value ??
    values[0]?.value;
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

function selectionReasonForDisplay(product: ProjectProductEvidence, pool: ProjectProductEvidence[], keyword = ""): string {
  const diagnostics = selectionDiagnostics(product, pool, keyword);
  const priority = diagnostics.classification;
  if (priority === "Priority") {
    return `Premium-priced product with strong monthly and historical demand (${diagnostics.finalScore}/100).`;
  }
  if (priority === "High") {
    return `Accessible price supported by strong monthly and historical demand (${diagnostics.finalScore}/100).`;
  }
  if (priority === "Average - Emerging Product") {
    return `Emerging product with strong current momentum and developing historical sales (${diagnostics.finalScore}/100).`;
  }
  if (priority === "Average - Established but Slowing") {
    return `Established premium product whose historical sales exceed recent demand (${diagnostics.finalScore}/100).`;
  }
  if (priority === "Not Recommended") {
    return "Not recommended because current and historical demand are both weak.";
  }
  if (priority === "Platform recommended") {
    return `Relevant marketplace placement supported by sales and visual quality (${diagnostics.finalScore}/100).`;
  }
  return "Selected for keyword relevance and commercial potential.";
}

function isPlatformRecommendedProduct(product: ProjectProductEvidence): boolean {
  return product.source === "Relevance" || /platform recommended/iu.test(product.selectionReason ?? "");
}

function selectionDiagnostics(product: ProjectProductEvidence, pool: ProjectProductEvidence[], keyword = ""): ProductSelectionDiagnostics {
  const priceLevel = percentileLevel(product.priceAverage, pool.map((item) => item.priceAverage));
  const monthlySalesLevel = percentileLevel(product.monthlySold, pool.map((item) => item.monthlySold));
  const totalSalesLevel = percentileLevel(product.totalSold, pool.map((item) => item.totalSold));
  const relevanceScore = relevanceScoreForProduct(product, keyword);
  const monthlySalesScore = normalizedSignalScore(product.monthlySold, pool.map((item) => item.monthlySold));
  const totalSalesScore = normalizedSignalScore(product.totalSold, pool.map((item) => item.totalSold));
  const thumbnailScore = thumbnailHeuristicScore(product, keyword);
  const commercialValueScore = commercialScore(priceLevel, monthlySalesLevel, totalSalesLevel, product);
  const classification = productClassification(priceLevel, monthlySalesLevel, totalSalesLevel, product, keyword);
  const adjustment = classificationAdjustment(classification);
  const confidence = dataConfidence(product);
  const confidencePenalty = confidence === "High" ? 0 : confidence === "Medium" ? 4 : 10;
  const finalScore = Math.max(0, Math.min(100, Math.round(
    relevanceScore * 0.3 +
    monthlySalesScore * 0.25 +
    totalSalesScore * 0.2 +
    commercialValueScore * 0.15 +
    thumbnailScore * 0.1 +
    adjustment -
    confidencePenalty
  )));
  return {
    classification,
    finalScore,
    relevanceScore,
    monthlySalesScore,
    totalSalesScore,
    commercialValueScore,
    thumbnailScore,
    confidence,
    priceLevel,
    monthlySalesLevel,
    totalSalesLevel,
    clickPotential: clickPotentialFromThumbnail(thumbnailScore)
  };
}

function productClassification(
  priceLevel: ProductSelectionDiagnostics["priceLevel"],
  monthlySalesLevel: ProductSelectionDiagnostics["monthlySalesLevel"],
  totalSalesLevel: ProductSelectionDiagnostics["totalSalesLevel"],
  product: ProjectProductEvidence,
  keyword = ""
): ProductSelectionClassification {
  if (monthlySalesLevel === "low" && totalSalesLevel === "low") {
    return "Not Recommended";
  }
  if (priceLevel === "high" && monthlySalesLevel === "high" && totalSalesLevel === "high") {
    return "Priority";
  }
  if (priceLevel === "low" && monthlySalesLevel === "high" && totalSalesLevel === "high") {
    return "High";
  }
  if (priceLevel === "medium" && monthlySalesLevel === "high" && (totalSalesLevel === "low" || totalSalesLevel === "medium")) {
    return "Average - Emerging Product";
  }
  if (priceLevel === "high" && monthlySalesLevel === "low" && totalSalesLevel === "high") {
    return "Average - Established but Slowing";
  }
  if (isPlatformRecommendedProduct(product) && relevanceScoreForProduct(product, keyword) >= 58) {
    return "Platform recommended";
  }
  return "Review";
}

function classificationAdjustment(classification: ProductSelectionClassification): number {
  switch (classification) {
    case "Priority":
      return 10;
    case "High":
      return 7;
    case "Average - Emerging Product":
      return 4;
    case "Average - Established but Slowing":
      return 2;
    case "Not Recommended":
      return -15;
    default:
      return 0;
  }
}

function commercialScore(
  priceLevel: ProductSelectionDiagnostics["priceLevel"],
  monthlySalesLevel: ProductSelectionDiagnostics["monthlySalesLevel"],
  totalSalesLevel: ProductSelectionDiagnostics["totalSalesLevel"],
  product: ProjectProductEvidence
): number {
  const levelScore = {
    unknown: 38,
    low: 42,
    medium: 66,
    high: 88
  } satisfies Record<ProductSelectionDiagnostics["priceLevel"], number>;
  let score = Math.round(levelScore[monthlySalesLevel] * 0.5 + levelScore[totalSalesLevel] * 0.32 + levelScore[priceLevel] * 0.18);
  if (priceLevel === "high" && monthlySalesLevel === "high" && totalSalesLevel === "high") {
    score = 100;
  } else if (priceLevel === "low" && monthlySalesLevel === "high" && totalSalesLevel === "high") {
    score = 86;
  } else if (monthlySalesLevel === "low" && totalSalesLevel === "low") {
    score = 18;
  }
  if (!product.priceAverage || !product.monthlySold || !product.totalSold) {
    score -= 8;
  }
  return Math.max(0, Math.min(100, score));
}

function percentileLevel(value: number | null | undefined, values: Array<number | null | undefined>): "low" | "medium" | "high" | "unknown" {
  if (typeof value !== "number" || value <= 0) {
    return "unknown";
  }
  const usable = values.filter((item): item is number => typeof item === "number" && item > 0).sort((left, right) => left - right);
  if (usable.length < 3) {
    return "medium";
  }
  const lowerIndex = Math.max(0, Math.floor((usable.length - 1) * 0.33));
  const upperIndex = Math.max(lowerIndex, Math.floor((usable.length - 1) * 0.67));
  const lower = usable[lowerIndex] ?? value;
  const upper = usable[upperIndex] ?? value;
  if (value <= lower) {
    return "low";
  }
  if (value >= upper) {
    return "high";
  }
  return "medium";
}

function normalizedSignalScore(value: number | null | undefined, values: Array<number | null | undefined>): number {
  if (typeof value !== "number" || value <= 0) {
    return 30;
  }
  const usable = values.filter((item): item is number => typeof item === "number" && item > 0);
  if (usable.length === 0) {
    return 50;
  }
  const max = Math.max(...usable, 1);
  return Math.round(Math.max(0, Math.min(100, (Math.log10(value + 1) / Math.log10(max + 1)) * 100)));
}

function relevanceScoreForProduct(product: ProjectProductEvidence, keyword = ""): number {
  const terms = normalizeSearchTerms(keyword);
  if (terms.length === 0) {
    return product.source === "Relevance" ? 78 : 62;
  }
  const title = [product.title, product.productType, product.selectionReason].filter(Boolean).join(" ").toLowerCase();
  const matched = terms.filter((term) => title.includes(term)).length;
  const ratio = matched / terms.length;
  const placementBoost = product.source === "Relevance" ? 16 : 6;
  const rankBoost = product.rank ? Math.max(0, 12 - Math.min(product.rank, 12)) : 0;
  return Math.max(0, Math.min(100, Math.round(42 + ratio * 42 + placementBoost + rankBoost)));
}

function normalizeSearchTerms(keyword: string): string[] {
  return keyword
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/u)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
}

function thumbnailHeuristicScore(product: ProjectProductEvidence, keyword = ""): number {
  let score = 48;
  if (product.imageUrl) {
    score += 20;
  }
  if (product.storeType) {
    score += 8;
  }
  if (product.rating && product.rating >= 4.7) {
    score += 5;
  }
  if (product.title && normalizeSearchTerms(keyword).some((term) => product.title.toLowerCase().includes(term))) {
    score += 8;
  }
  if (/(promo|bundle|gratis|free|official|mall|ori|star)/iu.test([product.title, product.selectionReason, product.storeType].filter(Boolean).join(" "))) {
    score += 5;
  }
  if (/(unknown|shopping cart|icon|placeholder)/iu.test(product.title)) {
    score -= 28;
  }
  return Math.max(0, Math.min(100, score));
}

function clickPotentialFromThumbnail(score: number): ProductSelectionDiagnostics["clickPotential"] {
  if (score >= 86) return "Very High";
  if (score >= 72) return "High";
  if (score >= 56) return "Medium";
  if (score >= 38) return "Low";
  return "Very Low";
}

function dataConfidence(product: ProjectProductEvidence): ProductSelectionDiagnostics["confidence"] {
  const present = [
    product.priceAverage,
    product.monthlySold,
    product.totalSold,
    product.imageUrl,
    product.productUrl
  ].filter(Boolean).length;
  if (present >= 5) {
    return "High";
  }
  if (present >= 3) {
    return "Medium";
  }
  return "Low";
}

function productSourcePlacement(product: ProjectProductEvidence): string {
  const fallback = product.source && product.rank ? `${product.source} ${product.rank}` : product.source ?? "-";
  return formatSourcePlacement(product.sourcePlacement ?? fallback, product.source);
}

function mergePlacementLabels(values: Array<string | null | undefined>): string {
  return uniqueInlineLabels(values).join(" / ");
}

function formatSourcePlacement(value: string, source?: string | null): string {
  const parts = uniqueInlineLabels(String(value || "").split("/"));
  if (parts.length === 0) {
    return "-";
  }
  return parts
    .map((part, index) => formatSourcePlacementToken(part, source, index))
    .join(" / ");
}

function formatSourcePlacementToken(value: string, source: string | null | undefined, index: number): string {
  const text = value.trim();
  if (/top\s+\d+\s+in\s+/iu.test(text)) {
    return text;
  }
  const rank = text.match(/\d+/u)?.[0] ?? "-";
  if (/relevance|relevancy|search/iu.test(text)) {
    return `Top ${rank} in relevance`;
  }
  if (/store\s*(popular|products)|popular|pop\b/iu.test(text)) {
    return `Top ${rank} in store popular`;
  }
  if (/store\s*(best|sales)|best\s*seller|top\s*sales|sales/iu.test(text)) {
    return `Top ${rank} in sales`;
  }
  const context = `${source ?? ""} ${text}`.toLowerCase();
  if (/store\s*(best|sales)|best\s*seller|top\s*sales|sales/iu.test(context)) {
    return `Top ${rank} in sales`;
  }
  if (/store\s*(popular|products)|popular|pop\b/iu.test(context)) {
    return `Top ${rank} in store popular`;
  }
  if (/relevance|relevancy|search/iu.test(context)) {
    return `Top ${rank} in relevance`;
  }
  if (index === 0 && source !== "Relevance") {
    return `Top ${rank} in sales`;
  }
  if (index === 1) {
    return `Top ${rank} in relevance`;
  }
  return text || "-";
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
  return storeTypeDisplayLabel(product.storeType);
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

function productSoldMetricText(product: ProjectProductEvidence): string {
  if (isMonthlySoldProductSource(product.source)) {
    return product.monthlySoldText ?? formatOptionalNumber(product.monthlySold) ?? product.totalSoldText ?? formatOptionalNumber(product.totalSold);
  }
  return product.totalSoldText ?? formatOptionalNumber(product.totalSold) ?? product.monthlySoldText ?? formatOptionalNumber(product.monthlySold);
}

function productSoldMetricLabel(product: ProjectProductEvidence): string {
  return isMonthlySoldProductSource(product.source) ? "Sold/month" : "Sold";
}

function isMonthlySoldProductSource(source?: string | null): boolean {
  return source === "Top Sales" || Boolean(source?.startsWith("Store Best Sellers"));
}

function normalizeStoreKey(product: ProjectProductEvidence): string {
  return (canonicalStoreUrl(product.storeUrl) ?? product.storeName ?? product.title).toLowerCase().replace(/\s+/g, "-");
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

function marketplaceLabel(value: ProjectSummary["marketplace"]): string {
  switch (value) {
    case "SHOPEE_ID":
      return "Shopee";
    case "TIKTOK_SHOP":
      return "TikTok Shop";
    default:
      return value;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${Math.round(bytes / (1024 * 1024))} MB`;
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

async function extractRenderedPageSnapshot(
  webview: WebviewElement,
  productScopeSelector?: string,
  options: { includeHtml?: boolean; requestedStoreRating?: number; viewMode?: PlatformViewMode } = {}
): Promise<{
  html: string;
  visibleText: string;
  products: ExtractedPageProduct[];
  productDetail: RenderedProductDetailSnapshot;
  storeProfile: RenderedStoreProfileSnapshot;
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
      storeProfile: {
        categories: [],
        ratingSamples: [],
        bannerUrls: []
      },
      storeDecorationImages: []
    };
  }
  const extraction = webview.executeJavaScript<{
    html: string;
    visibleText: string;
    products: ExtractedPageProduct[];
    productDetail: RenderedProductDetailSnapshot;
    storeProfile: RenderedStoreProfileSnapshot;
    storeDecorationImages: string[];
  }>(`
    (async () => {
      const storeTypeImages = ${JSON.stringify(STORE_TYPE_IMAGES)};
      const requestedStoreRating = ${Number.isFinite(options.requestedStoreRating)
        ? Math.max(1, Math.min(5, Number(options.requestedStoreRating)))
        : "undefined"};
      const capturedViewMode = ${JSON.stringify(options.viewMode ?? "desktop")};
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
        const input = String(value || "");
        const complete = input.match(/Rp\\s*\\d{1,3}(?:[.\\s]\\d{3})+(?:,\\d+)?/gi) || [];
        const matches = complete.length ? complete : input.match(/Rp\\s*\\d+(?:[.,]\\d+)?|\\d{1,3}(?:[.\\s]\\d{3})+(?:,\\d+)?|\\d+(?:[.,]\\d+)?/gi) || [];
        const first = matches
          .map((item) => Number(item.replace(/[^\\d]/g, "")))
          .find((item) => Number.isFinite(item) && item > 0);
        return first ? Math.round(first) : undefined;
      };
      const extractPriceText = (value) => {
        const input = String(value || "");
        const complete = input.match(/Rp\\s*\\d{1,3}(?:[.\\s]\\d{3})+(?:,\\d+)?/gi) || [];
        if (complete.length) return compact(complete[0]);
        return compact((input.match(/Rp\\s*\\d+(?:[.,]\\d+)?/i) || [])[0] || "");
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
      const productScopeSelector = ${JSON.stringify(productScopeSelector ?? "")};
      const includeHtml = ${JSON.stringify(options.includeHtml !== false)};
      const productScopeRoot = productScopeSelector ? document.querySelector(productScopeSelector) || htmlRoot : htmlRoot;
      const isStoreProductScope = /shop-page__all-products-section/i.test(productScopeSelector);
      const isSearchProductScope = /shopee-search-item-result/i.test(productScopeSelector);
      const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
      const hydrateProductScope = async () => {
        if (!productScopeSelector || !productScopeRoot) return;
        if (!isStoreProductScope && !isSearchProductScope) return;
        const root = document.scrollingElement || document.documentElement || document.body;
        const originalScrollY = window.scrollY || root.scrollTop || 0;
        productScopeRoot.scrollIntoView({ block: "start", inline: "nearest" });
        await wait(250);
        let previousCount = 0;
        let stablePasses = 0;
        const passes = 10;
        for (let index = 0; index < passes; index += 1) {
          const currentCount = productScopeRoot.querySelectorAll('a[href*="-i."], a[href*="/product/"], a[href*="i."]').length;
          const elementCanScroll = productScopeRoot.scrollHeight > productScopeRoot.clientHeight + 24;
          if (elementCanScroll) {
            productScopeRoot.scrollTop = Math.min(productScopeRoot.scrollHeight, productScopeRoot.scrollTop + Math.max(360, productScopeRoot.clientHeight * 0.72));
          } else {
            window.scrollBy(0, Math.max(420, window.innerHeight * 0.64));
          }
          productScopeRoot.dispatchEvent?.(new Event("scroll", { bubbles: true }));
          window.dispatchEvent(new Event("scroll"));
          await wait(140);
          if (isStoreProductScope || isSearchProductScope) {
            stablePasses = currentCount === previousCount ? stablePasses + 1 : 0;
            const targetCount = isStoreProductScope ? 60 : 80;
            if (currentCount >= targetCount && stablePasses >= 2) {
              break;
            }
            if (stablePasses >= 4 && index >= 6 && currentCount >= 24) {
              break;
            }
          }
          if (!isStoreProductScope && !isSearchProductScope && currentCount === previousCount && index >= 3) {
            break;
          }
          previousCount = currentCount;
        }
        if (!isStoreProductScope && !isSearchProductScope) {
          window.scrollTo({ top: originalScrollY });
        }
      };
      await hydrateProductScope();
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
      const inferStoreType = (text, imageUrl) => {
        const url = String(imageUrl || "").toLowerCase();
        if (url.includes("id-11134258-7r98o-lyam4dmlnqcoba")) return "star";
        if (url.includes("id-11134258-7r98r-lyalscj1g30l0b")) return "star_plus";
        if (url.includes("id-11134258-7r98z-lykpu80ygbvs76")) return "shopee_mall";
        const value = compact(text).toLowerCase();
        if (/\\b(star\\s*\\+|starplus|star-plus|preferred\\s*plus)\\b/u.test(value)) return "star_plus";
        if (/\\b(mall\\s*ori|shopee\\s*mall|official\\s*mall)\\b/u.test(value)) return "shopee_mall";
        if (/\\b(star|preferred)\\b/u.test(value)) return "star";
        return undefined;
      };
      const findStoreBadgeImage = (card, productImageUrl, titleElement) => {
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
              imageCandidate.parentElement?.getAttribute("aria-label"),
              imageCandidate.parentElement?.getAttribute("data-testid"),
              imageCandidate.parentElement?.className
            ].filter(Boolean).join(" "));
            const explicit = inferStoreType(descriptor, candidateUrl);
            if (explicit) {
              const distance = titleElement
                ? Math.abs((titleElement.getBoundingClientRect?.().top || 0) - (rect?.top || 0))
                : 0;
              candidates.push({ image: imageCandidate, storeType: explicit, score: 1000 - distance });
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
        return matches.find((candidate) => /[,.]/u.test(candidate)) || matches[0];
      };
      const ratingTokenFromMetricLine = (value) => {
        const line = compact(value);
        const explicit =
          line.match(/(?:rating\\b|bintang)\\s*:?\\s*([1-5](?:[.,]\\d)?)/iu)?.[1] ||
          line.match(/([1-5](?:[.,]\\d)?)\\s*(?:\\/\\s*5|★|⭐|bintang|star)/iu)?.[1] ||
          line.match(/(?:★|⭐)\\s*([1-5](?:[.,]\\d)?)/iu)?.[1];
        if (explicit) return explicit;
        const token = firstRatingToken(line);
        if (token && /[,.]/u.test(token)) return token;
        return undefined;
      };
      const extractRatingFromRoot = (root, text, soldText) => {
        if (!root?.querySelectorAll) return undefined;
        const candidates = [];
        for (const element of root.querySelectorAll("span, div, strong, p")) {
          const value = compact(element.textContent || "");
          if (!/^[1-5](?:[.,]\\d)?$/u.test(value)) continue;
          const numeric = Number(value.replace(",", "."));
          if (numeric < 1 || numeric > 5) continue;
          const parent = element.parentElement;
          const grandParent = parent?.parentElement;
          const descriptor = compact([
            element.className,
            element.getAttribute?.("aria-label"),
            element.getAttribute?.("title"),
            parent?.className,
            parent?.getAttribute?.("aria-label"),
            parent?.getAttribute?.("title"),
            grandParent?.className
          ].filter(Boolean).join(" "));
          const context = compact(parent?.innerText || grandParent?.innerText || "");
          const hasNamedContext = /(rating|ratings|penilaian|ulasan|bintang)/iu.test(descriptor + " " + context);
          const hasStarVisual = Boolean(parent?.querySelector?.('[class*="star" i], [aria-label*="star" i], [title*="star" i], svg, path')) || /(★|⭐)/u.test(context);
          let color = "";
          try {
            color = String(getComputedStyle(element).color || "");
          } catch {}
          const score =
            (/[,.]/u.test(value) ? 45 : 0) +
            (/(rating|ratings|penilaian|ulasan|bintang)/iu.test(descriptor) ? 70 : 0) +
            (hasNamedContext ? 35 : 0) +
            (hasStarVisual ? 45 : 0) +
            (/(255,\\s*(?:1[2-9]\\d|2\\d{2}),\\s*0|orange|gold)/iu.test(color) ? 15 : 0);
          if (score >= 45) candidates.push({ value, score });
        }
        const selected = candidates.sort((left, right) => right.score - left.score || Number(right.value.replace(",", ".")) - Number(left.value.replace(",", ".")))[0]?.value;
        return selected || extractRatingText(text, soldText);
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
        const metricLine = rawLines.find((line) => /(★|⭐|bintang)/iu.test(line) && ratingTokenFromMetricLine(line)) ||
          rawLines.find((line) => /(ratings?|reviews?|penilaian|ulasan)/iu.test(line) && ratingTokenFromMetricLine(line)) ||
          rawLines.find((line) => /(sold|terjual)/iu.test(line) && /[1-5][.,]\\d/u.test(line) && ratingTokenFromMetricLine(line));
        if (metricLine) {
          return ratingTokenFromMetricLine(metricLine);
        }
        const metricText = compact(text);
        const searchable = soldText && metricText.includes(soldText) ? metricText.slice(0, metricText.indexOf(soldText)) : metricText;
        if (!/(★|⭐|rating|ratings?|penilaian|ulasan|bintang)/iu.test(searchable)) {
          return undefined;
        }
        return ratingTokenFromMetricLine(searchable);
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
        let best = anchor.closest?.("[data-sqe='item'], [class*='shop-search-result-view'], [class*='product-card'], [class*='item-card']") || anchor;
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
      const seen = new Set();
      const products = [];
      const capturedProductCardHtml = [];
      const collectVisibleProductRows = async () => {
        const scanRoots = [
          productScopeRoot,
          ...(isStoreProductScope || isSearchProductScope ? [document] : [])
        ].filter(Boolean);
        const anchorCandidates = scanRoots.flatMap((scanRoot) => [
          ...Array.from(scanRoot.querySelectorAll('a[href]')),
          ...Array.from(scanRoot.querySelectorAll("div.p-2, [data-sqe='item'], [class*='shop-search-result-view'], [class*='product-card'], [class*='item-card']"))
            .flatMap((card) => [
              card.closest?.('a[href*="-i."], a[href*="/product/"], a[href*="i."]'),
              card.querySelector?.('a[href*="-i."], a[href*="/product/"], a[href*="i."]')
            ])
        ]).filter(Boolean);
        const anchors = Array.from(new Set(anchorCandidates))
          .filter((anchor) => /(?:-i\\.|\\/product\\/|i\\.)/i.test(anchor.getAttribute("href") || ""))
          .filter((anchor) => !/cart|checkout|help|seller/i.test(anchor.getAttribute("href") || ""));
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
          if (card?.outerHTML) capturedProductCardHtml.push(card.outerHTML);
          const titleElement = Array.from(dataRoot.querySelectorAll("div, span"))
            .find((element) => compact(element.textContent || "") === title);
          const badgeImage = findStoreBadgeImage(card, productImageUrl, titleElement || anchor);
          const badgeImageUrl = imageUrlFrom(badgeImage);
          const badgeText = compact([badgeImage?.alt, badgeImage?.getAttribute("aria-label"), badgeImage?.title].filter(Boolean).join(" "));
          const storeTypeLabel = Array.from(dataRoot.querySelectorAll("span, div"))
            .map((element) => compact(element.textContent || ""))
            .find((value) => /^(mall\\s*ori|shopee\\s*mall|star\\s*\\+|starplus|star-plus|star)$/iu.test(value));
          const storeType = inferStoreType(
            [badgeText, storeTypeLabel, card.getAttribute("aria-label")].filter(Boolean).join(" "),
            badgeImageUrl
          );
          const priceText = extractPriceText(text);
          const soldText = extractSoldText(text);
          const ratingText = extractRatingFromRoot(dataRoot, text, soldText);
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
            storeBadgeImageUrl: storeType ? storeTypeImages[storeType] : undefined,
            sourcePlacement: String(products.length + 1),
            mallStatus: storeType === "shopee_mall",
            officialStatus: /official|resmi/i.test(cardText),
            starSeller: storeType === "star" || storeType === "star_plus",
            rawText: compact(cardText).slice(0, 1200)
          });
        }
      };
      const collectProductRowsAcrossPage = async () => {
        if (!isStoreProductScope && !isSearchProductScope) {
          await collectVisibleProductRows();
          return;
        }
        const root = document.scrollingElement || document.documentElement || document.body;
        const originalScrollY = window.scrollY || root.scrollTop || 0;
        const rect = productScopeRoot.getBoundingClientRect();
        const startY = Math.max(0, rect.top + (window.scrollY || root.scrollTop || 0) - 80);
        const step = Math.max(320, window.innerHeight * (isStoreProductScope ? 0.58 : 0.72));
        const targetCount = isStoreProductScope ? 60 : 80;
        const passLimit = isStoreProductScope ? 60 : 80;
        let stablePasses = 0;
        let lastCount = -1;
        window.scrollTo({ top: startY, behavior: "auto" });
        await wait(180);
        for (let pass = 0; pass < passLimit; pass += 1) {
          await collectVisibleProductRows();
          if (products.length === lastCount) {
            stablePasses += 1;
          } else {
            stablePasses = 0;
          }
          lastCount = products.length;
          if (products.length >= targetCount && stablePasses >= 3) {
            break;
          }
          if (stablePasses >= 8 && pass >= 16 && (products.length >= 36 || pass >= passLimit - 6)) {
            break;
          }
          const nextTop = Math.min(
            Math.max(root.scrollHeight - window.innerHeight, startY),
            (window.scrollY || root.scrollTop || startY) + step
          );
          const currentTop = window.scrollY || root.scrollTop || startY;
          if (nextTop <= currentTop + 4) {
            stablePasses += 1;
          } else {
            window.scrollTo({ top: nextTop, behavior: "auto" });
            productScopeRoot.dispatchEvent?.(new Event("scroll", { bubbles: true }));
            window.dispatchEvent(new Event("scroll"));
          }
          await wait(180);
        }
        await collectVisibleProductRows();
        window.scrollTo({ top: originalScrollY, behavior: "auto" });
      };
      await collectProductRowsAcrossPage();
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
      const productPageText = textFrom(productPageRoot);
      const productTitleText = meaningfulTitle(productPageText, "");
      const titleElement = Array.from((productPageRoot || document.body).querySelectorAll("h1, h2, div, span"))
        .find((element) => {
          const value = compact(element.textContent || "");
          return Boolean(value && productTitleText && (value === productTitleText || value.includes(productTitleText.slice(0, 48))));
        });
      const pdpBadgeRoots = [
        shopSection,
        titleElement?.parentElement,
        titleElement?.closest?.("section"),
        titleElement?.closest?.("div")
      ].filter(Boolean);
      const pdpBadgeImage = pdpBadgeRoots
        .map((root) => findStoreBadgeImage(root, undefined, titleElement))
        .find(Boolean);
      const pdpStoreTypeLabel = pdpBadgeRoots.flatMap((root) => Array.from(root.querySelectorAll?.("span, div") || []))
        .map((element) => compact(element.textContent || ""))
        .find((value) => /^(mall\\s*ori|shopee\\s*mall|star\\s*\\+|starplus|star-plus|star)$/iu.test(value));
      const storeType = inferStoreType(
        compact([pdpBadgeImage?.alt, pdpBadgeImage?.title, pdpBadgeImage?.getAttribute?.("aria-label")].filter(Boolean).join(" ")) || pdpStoreTypeLabel,
        imageUrlFrom(pdpBadgeImage)
      );
      const pdpSoldText = extractSoldText(productPageText);
      const pdpRatingText = extractRatingFromRoot(productPageRoot, productPageText, pdpSoldText);
      const pdpReviewText = extractReviewText(productPageText);
      const voucherRoot = document.querySelector("section.mini-vouchers .mini-vouchers-with-popover") || document.querySelector("section.mini-vouchers");
      const shopVouchers = unique(textFrom(voucherRoot).split(/\\n|\\s{2,}|(?=Rp\\s)|(?=Diskon)|(?=Voucher)|(?=Cashback)/iu))
        .filter((value) => value.length >= 3)
        .filter((value) => /voucher|diskon|cashback|off|rp\\s*\\d|%/iu.test(value))
        .slice(0, 12);
      const bundleSection = Array.from(document.querySelectorAll("section"))
        .find((section) => /^(bundle deals|paket hemat|bundling)$/iu.test(compact(section.querySelector("h2")?.textContent || "")) ||
          /bundle deals|paket hemat|bundling/iu.test(compact(section.querySelector("h2")?.textContent || "")));
      const bundleDeals = unique(textFrom(bundleSection).split(/\\n|\\s{2,}/u))
        .filter((value) => value.length >= 3)
        .filter((value) => !/^(bundle deals|paket hemat|bundling)$/iu.test(value))
        .filter((value) => /rp\\s*\\d|\\d+\\s*%|off|discount|diskon|bundle|paket|hemat|beli|buy|gratis|free|spend|min(?:imum)?|purchase|gift|hadiah/iu.test(value))
        .slice(0, 12);
      const minimumPurchaseDeals = unique(Array.from(document.querySelectorAll("section, div"))
        .map((element) => textFrom(element))
        .filter((value) => /spend\\s*rp\\s*\\d|minimum\\s+(?:purchase|spend)|min(?:imum)?\\.?\\s*(?:belanja|pembelian)|gift\\(s\\)|hadiah|free\\s+gift/iu.test(value))
        .flatMap((value) => value.split(/\\n|\\s{2,}/u))
        .map(compact)
        .filter((value) => value.length >= 6 && value.length <= 160)
        .filter((value) => /rp\\s*\\d|gift|hadiah|free|gratis|spend|min(?:imum)?|purchase|belanja|pembelian/iu.test(value)))
        .slice(0, 8);
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
      const isUsableProductGalleryMediaElement = (element, url) => {
        if (!url) return false;
        const lowerUrl = String(url).toLowerCase();
        if (/data:image\\/svg|sprite|favicon|placeholder|default-avatar|avatar|profile|logo-shopee|shopee-logo|icon|arrow|chevron|next|previous|rating|star|cart|chat|help|verify|seller-centre|notification/i.test(lowerUrl)) return false;
        const control = element?.closest?.("[class*='arrow'], [class*='chevron'], [class*='next'], [class*='prev'], [aria-label*='next' i], [aria-label*='previous' i]");
        const controlText = compact([control?.className, control?.getAttribute?.("aria-label"), control?.getAttribute?.("title"), control?.textContent].filter(Boolean).join(" "));
        if (/arrow|chevron|next|prev|previous|selanjutnya|sebelumnya/i.test(controlText)) return false;
        const visualElement = element?.tagName === "PICTURE" ? element.querySelector("img") || element : element;
        const rect = visualElement?.getBoundingClientRect?.();
        const width = Math.round(rect?.width || visualElement?.naturalWidth || 0);
        const height = Math.round(rect?.height || visualElement?.naturalHeight || 0);
        return width >= 120 && height >= 120;
      };
      const selectedProductImage = Array.from(galleryRoot?.querySelectorAll?.("picture._displayContents_, picture, img[srcset], img[data-srcset], img[src], img[data-src]") || [])
        .filter((element) => !isReviewMediaElement(element))
        .map((element) => ({
          url: imageUrlFrom(element),
          element,
          score: visibleMediaScore(element.tagName === "PICTURE" ? element.querySelector("img") || element : element)
        }))
        .filter((item) => item.url && item.score > 0 && isUsableProductGalleryMediaElement(item.element, item.url))
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
      const reviewMediaRootSelector = [
        ".rating-media-list-image-carousel__item-list-wrapper",
        "[class*='rating-media-list-image-carousel__item-list-wrapper']",
        "[class*='rating-media-list']",
        "[class*='rating-media']",
        "[class*='review-media']",
        "[class*='comment-media']"
      ].join(", ");
      const reviewMediaRoots = Array.from(document.querySelectorAll(reviewMediaRootSelector));
      const isUsableReviewMediaElement = (element, url) => {
        if (!url || !element?.closest?.(reviewMediaRootSelector)) return false;
        const reviewRow = element.closest(".shopee-product-rating, [class*='product-rating'], [class*='comment-list'] > div");
        if (!reviewRow) return false;
        if (element.closest("[class*='avatar'], [class*='profile'], [class*='user-avatar'], [class*='author'], [class*='account']")) return false;
        const identityText = compact([
          element.getAttribute?.("alt"),
          element.getAttribute?.("aria-label"),
          element.getAttribute?.("class"),
          element.parentElement?.getAttribute?.("class")
        ].filter(Boolean).join(" "));
        if (/avatar|profile|user[-\\s]?avatar|default[-\\s]?avatar|customer[-\\s]?avatar|author|account/iu.test(String(url) + " " + identityText)) return false;
        const visual = element.tagName === "SOURCE"
          ? element.closest("picture")?.querySelector("img") || element.parentElement?.querySelector("img") || element
          : element.tagName === "PICTURE"
            ? element.querySelector("img") || element
            : element;
        const rect = visual?.getBoundingClientRect?.();
        const width = Math.round(rect?.width || visual?.naturalWidth || 0);
        const height = Math.round(rect?.height || visual?.naturalHeight || 0);
        return width >= 48 && height >= 48;
      };
      const reviewMediaImages = unique(reviewMediaRoots.flatMap((mediaRoot) =>
        Array.from(mediaRoot.querySelectorAll("picture, source[srcset], img[srcset], img[src]"))
          .filter((element) => !isProductGalleryElement(element))
          .map((element) => ({ element, url: imageUrlFrom(element) }))
          .filter((item) => isUsableReviewMediaElement(item.element, item.url))
          .map((item) => item.url)
      ));
      const reviewMediaVideos = unique(reviewMediaRoots.flatMap((mediaRoot) =>
        Array.from(mediaRoot.querySelectorAll("video"))
          .filter((element) => !isProductGalleryElement(element) && Boolean(element.closest(".shopee-product-rating, [class*='product-rating'], [class*='comment-list'] > div")))
          .map((video) => absoluteUrl(video.currentSrc || video.src || video.getAttribute("src") || ""))
          .filter(Boolean)
      ));
      const looksLikeReviewRow = (element) => {
        const text = textFrom(element);
        if (text.length < 20) return false;
        if (!/\\b20\\d{2}[-/]\\d{1,2}[-/]\\d{1,2}(?:\\s+\\d{1,2}:\\d{2})?\\b/u.test(text)) return false;
        if (/^https?:\\/\\//iu.test(text)) return false;
        if (/(product ratings|all\\s*\\(|semua\\s*\\(|with media|dengan media|repeat purchase|comments?\\s*\\(|filter|urutkan|sort by|rating overview|shop vouchers|bundle deals|add to cart|buy now)/iu.test(text)) return false;
        return true;
      };
      const cleanReviewComment = (value) => {
        const rawLines = String(value || "")
          .replace(/(?:Seller'?s? Response|Respon(?:s)? Penjual|Respons(?:e)? Penjual|Penjual Membalas|Tanggapan Penjual)\\s*:?[\\s\\S]*$/iu, "")
          .replace(/\\r\\n?/g, "\\n")
          .split("\\n")
          .map((line) => compact(line))
          .filter(Boolean);
        const dateLineIndex = rawLines.findIndex((line) => /\\b20\\d{2}[-/]\\d{1,2}[-/]\\d{1,2}(?:\\s+\\d{1,2}:\\d{2})?\\b/u.test(line));
        const sourceLines = dateLineIndex >= 0 ? rawLines : compact(value).split(/(?=\\b20\\d{2}[-/]\\d{1,2}[-/]\\d{1,2})/u).map(compact).filter(Boolean);
        const effectiveDateIndex = dateLineIndex >= 0 ? dateLineIndex : sourceLines.findIndex((line) => /\\b20\\d{2}[-/]\\d{1,2}[-/]\\d{1,2}/u.test(line));
        const author = effectiveDateIndex > 0
          ? sourceLines
              .slice(Math.max(0, effectiveDateIndex - 4), effectiveDateIndex)
              .reverse()
              .find((line) =>
                line.length >= 2 &&
                line.length <= 48 &&
                !/(seller|penjual|ratings?|reviews?|star|bintang|helpful|membantu|variation|variasi|quality|kualitas|performa|efek|kemasan|manfaat)/iu.test(line) &&
                !/^\\d+(?:[.,]\\d+)?/u.test(line)
              )
          : undefined;
        const bodyLines = (effectiveDateIndex >= 0 ? sourceLines.slice(effectiveDateIndex) : sourceLines)
          .filter((line) => !/^\\*{2,}$|^[★\\s]+$/u.test(line));
        const trimmedLines = [];
        for (const line of bodyLines) {
          const cutoffIndex = line.search(/(?:Seller'?s? Response|Respon(?:s)? Penjual|Respons(?:e)? Penjual|Penjual Membalas|Tanggapan Penjual|Report Abuse|Laporkan Penyalahgunaan)\\b/iu);
          const content = compact(cutoffIndex >= 0 ? line.slice(0, cutoffIndex) : line);
          if (content && !/^(Helpful\\??|Membantu\\??)(?:\\s*[\\d.,kkrb]*)?$/iu.test(content) && !/^(Like|Share)$/iu.test(content)) {
            trimmedLines.push(content);
          }
          if (cutoffIndex >= 0) break;
        }
        const output = [
          author,
          ...trimmedLines
        ].filter(Boolean).join("\\n").trim();
        return output.slice(0, 900);
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
        ...reviewRows.map((row) => cleanReviewComment(blockTextFromHtml(row))),
        ...reviewChunksFromText(commentRoot?.innerText || "").map(cleanReviewComment)
      ].filter(isCleanReviewComment)).slice(0, 8);
      const toReview = (type, rating, comment) => {
        const normalized = String(comment || "")
          .replace(/\\r\\n?/g, "\\n")
          .split("\\n")
          .map((line) => compact(line))
          .filter(Boolean)
          .join("\\n");
        const searchable = compact(normalized);
        const dateMatch = normalized.match(/\\b20\\d{2}[-/]\\d{1,2}[-/]\\d{1,2}(?:\\s+\\d{1,2}:\\d{2})?\\b/u);
        const variationMatch = searchable.match(/(?:Variasi|Variation|variation)\\s*:\\s*([^|\\n]+)/iu);
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
        images: productImages.slice(0, 9),
        videos: productVideos.slice(0, 1),
        description: blockTextFromHtml(descriptionRoot).slice(0, 8000) || undefined,
        descriptionImages: descriptionImages.slice(0, 24),
        shopVouchers,
        bundleDeals: unique([...bundleDeals, ...minimumPurchaseDeals]).slice(0, 12),
        promotionCount: shopVouchers.length + bundleDeals.length + minimumPurchaseDeals.length,
        reviews: [...positiveReviews.slice(0, 3), ...negativeReviews.slice(0, 2)],
        reviewMediaImages: reviewMediaImages.slice(0, 30),
        reviewMediaVideos: reviewMediaVideos.slice(0, 12)
      };
      const storeDecorationRoot = document.querySelector(".shop-decoration");
      const observedDecorationMedia = [];
      const rememberDecorationMedia = () => {
        if (!storeDecorationRoot) return;
        for (const element of storeDecorationRoot.querySelectorAll("picture, source[srcset], source[data-srcset], source[scrset], img[srcset], img[data-srcset], img[src], img[data-src]")) {
          const visual = element.tagName === "SOURCE"
            ? element.closest("picture")?.querySelector("img") || element.closest("picture") || element
            : element.tagName === "PICTURE"
              ? element.querySelector("img") || element
              : element;
          const rect = visual.getBoundingClientRect?.();
          observedDecorationMedia.push({
            element: visual,
            url: imageUrlFrom(element),
            width: Math.round(rect?.width || visual.naturalWidth || 0),
            height: Math.round(rect?.height || visual.naturalHeight || 0),
            trustedContext: Boolean(element.closest(".image-carousel, .image-carousel__item-list-wrapper, .image-carousel__item, a"))
          });
        }
      };
      const hydrateStoreDecorationRoot = async () => {
        if (!storeDecorationRoot) return;
        storeDecorationRoot.scrollIntoView({ block: "start", inline: "nearest" });
        await wait(300);
        rememberDecorationMedia();
        const clickCandidates = Array.from(storeDecorationRoot.querySelectorAll("button, [role='button'], [aria-label], [class*='next'], [class*='arrow'], [class*='carousel']"))
          .filter((element) => {
            const text = compact([
              element.getAttribute?.("aria-label"),
              element.getAttribute?.("title"),
              element.className,
              element.textContent
            ].filter(Boolean).join(" "));
            const rect = element.getBoundingClientRect?.();
            return /next|selanjutnya|arrow|carousel|slide|right/i.test(text) &&
              !/prev|previous|sebelumnya|left/i.test(text) &&
              (!rect || (rect.width <= 90 && rect.height <= 90));
          });
        for (let index = 0; index < 12 && clickCandidates.length > 0; index += 1) {
          const target = clickCandidates[index % clickCandidates.length];
          try {
            target?.dispatchEvent?.(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
          } catch {
            // Ignore carousel controls that Shopee blocks from synthetic events.
          }
          await wait(220);
          rememberDecorationMedia();
        }
      };
      await hydrateStoreDecorationRoot();
      const isProductCardDecorationImage = (element) => {
        const card = element.closest?.('a[href*="-i."], a[href*="/product/"], [class*="product-card"], [class*="item-card"], [class*="shop-search-result-view"]');
        return Boolean(card && /(rp\\s*[\\d.]|sold|terjual|rating|penilaian)/iu.test(textFrom(card)));
      };
      const isDecorationCarouselImage = (element) => Boolean(element.closest?.(".image-carousel, .image-carousel__item-list-wrapper, .image-carousel__item-list, .image-carousel__item"));
      const isDirectDecorationImage = (element) => {
        const link = element.closest?.("a");
        return Boolean(link && storeDecorationRoot.contains(link) && !isProductCardDecorationImage(element));
      };
      const isUsefulDecorationImage = (element, url, width, height) => {
        if (!url || isProductCardDecorationImage(element)) return false;
        const lowerUrl = String(url).toLowerCase();
        if (/sprite|icon|avatar|profile|rating|star|cart|chat|help|logo-shopee|favicon|arrow|chevron|next|prev|previous/iu.test(lowerUrl)) return false;
        if (width >= 260 && height >= 80 && (isDecorationCarouselImage(element) || isDirectDecorationImage(element))) return true;
        if (width >= 160 && height >= 120 && /banner|decoration|carousel|shop|voucher|promo|campaign/iu.test(lowerUrl)) return true;
        return /shop[-_/.]?decoration|banner|carousel|campaign|voucher|promo/iu.test(lowerUrl) && width >= 120 && height >= 60;
      };
      const decorationMediaCandidate = (element) => {
        const visualElement = element.tagName === "SOURCE"
          ? element.closest("picture")?.querySelector("img") || element.closest("picture") || element
          : element.tagName === "PICTURE"
            ? element.querySelector("img") || element
            : element;
        const rect = visualElement.getBoundingClientRect?.();
        const width = Math.round(rect?.width || visualElement.naturalWidth || 0);
        const height = Math.round(rect?.height || visualElement.naturalHeight || 0);
        const url = imageUrlFrom(element);
        return { element: visualElement, url, width, height };
      };
      const storeDecorationImages = storeDecorationRoot
        ? unique([
            ...Array.from(storeDecorationRoot.querySelectorAll(".image-carousel__item img, .image-carousel img, .image-carousel__item picture, .image-carousel source[srcset], a img, a picture, a source[srcset]"))
              .map(decorationMediaCandidate)
              .filter((item) => isUsefulDecorationImage(item.element, item.url, item.width, item.height))
              .map((item) => item.url),
            ...Array.from(storeDecorationRoot.querySelectorAll("picture, source[srcset], source[data-srcset], source[scrset], img[srcset], img[data-srcset], img[src], img[data-src]"))
              .map(decorationMediaCandidate)
              .filter((item) => isUsefulDecorationImage(item.element, item.url, item.width, item.height))
              .map((item) => item.url),
            ...Array.from(storeDecorationRoot.querySelectorAll("img"))
              .map(decorationMediaCandidate)
              .filter((item) => isUsefulDecorationImage(item.element, item.url, item.width, item.height))
              .map((item) => item.url),
            ...observedDecorationMedia
              .filter((item) => item.trustedContext && isUsefulDecorationImage(item.element, item.url, item.width, item.height))
              .map((item) => item.url),
            ...Array.from(storeDecorationRoot.querySelectorAll("[style*='url(']")).flatMap((element) => {
              const rect = element.getBoundingClientRect?.();
              const width = Math.round(rect?.width || 0);
              const height = Math.round(rect?.height || 0);
              const style = element.getAttribute("style") || "";
              return Array.from(style.matchAll(/url\\((['"]?)(.*?)\\1\\)/giu))
                .map((match) => absoluteUrl(match[2]))
                .filter((url) => isUsefulDecorationImage(element, url, width, height));
            })
          ])
        : [];
      const storePageRoot = document.querySelector(
        ".shop-page, .shop-detail, [class*='shop-detail'], [class*='shop-page'], [class*='shop-info']"
      ) || document.body;
      const storePageText = blockTextFromHtml(storePageRoot);
      const storePageLines = storePageText
        .split("\\n")
        .map(compact)
        .filter(Boolean);
      const storeMetricText = compact(storePageText);
      const metricNumber = (match) => match
        ? parseHumanNumber(String(match[1] || "") + String(match[2] || ""))
        : undefined;
      const productsMetricMatch = storeMetricText.match(/(?:Products?|Produk)\\s*:?\\s*([\\d.,]+)\\s*(rb|ribu|k|jt|juta|m)?/iu);
      const followersMetricMatch = storeMetricText.match(/(?:Followers?|Pengikut)\\s*:?\\s*([\\d.,]+)\\s*(rb|ribu|k|jt|juta|m)?/iu);
      const followingMetricMatch = storeMetricText.match(/(?:Following|Mengikuti)\\s*:?\\s*([\\d.,]+)\\s*(rb|ribu|k|jt|juta|m)?/iu);
      const ratingMetricMatch = storeMetricText.match(/(?:Rating|Penilaian)\\s*:?\\s*([1-5](?:[.,]\\d+)?)\\s*(?:\\(([\\d.,]+)\\s*(rb|ribu|k|jt|juta|m)?\\s*(?:Ratings?|Penilaian)?\\))?/iu);
      const chatMetricMatch = storeMetricText.match(/(?:Chat\\s*(?:Performance|Response)|Performa\\s*Chat|Respon\\s*Chat)\\s*:?\\s*([\\d.,]+%?(?:\\s*\\([^)]{1,80}\\))?)/iu);
      const joinedMetricMatch = storeMetricText.match(/(?:Joined|Bergabung)\\s*:?\\s*(.{1,80}?)(?=\\s+(?:Home|Beranda|All Products|Semua Produk|Categories|Kategori|Follow|Chat|Products?|Followers?|Rating|$))/iu);
      const normalizeJoinedAge = (value) => {
        const normalized = compact(value);
        const match = normalized.match(/([\\d.,]+)\\s*(months?|bulan|years?|tahun)\\b/iu);
        if (!match) return normalized.slice(0, 80) || undefined;
        const amount = String(match[1]).replace(",", ".");
        const singular = Number(amount) === 1;
        const monthUnit = /month|bulan/iu.test(match[2]);
        return amount + " " + (monthUnit ? (singular ? "Month" : "Months") : (singular ? "Year" : "Years"));
      };
      const currentUrl = new URL(location.href);
      const marketplaceStoreId = currentUrl.searchParams.get("shopid") ||
        currentUrl.pathname.match(/\\/(?:shop|buyer)\\/(\\d+)/iu)?.[1] ||
        Array.from(document.querySelectorAll('a[href*="shopid="], a[href*="/shop/"], a[href*="/buyer/"]'))
          .map((anchor) => {
            try {
              const target = new URL(anchor.href, location.href);
              return target.searchParams.get("shopid") || target.pathname.match(/\\/(?:shop|buyer)\\/(\\d+)/iu)?.[1];
            } catch {
              return undefined;
            }
          })
          .find(Boolean) ||
        document.documentElement?.innerHTML.match(/["']?(?:shopid|shop_id)["']?\\s*[:=]\\s*["']?(\\d{5,})/iu)?.[1];
      const profileNameCandidates = [
        textFrom(document.querySelector("[class*='shop-name'], [class*='ShopName']")),
        textFrom(document.querySelector(".shop-detail h1, .shop-page h1, [class*='shop-info'] h1")),
        document.querySelector("meta[property='og:title']")?.getAttribute("content"),
        document.title?.replace(/\\s*[|\\-]\\s*Shopee.*$/iu, "")
      ].filter(Boolean);
      const profileName = unique(profileNameCandidates)
        .map(cleanStoreNameCandidate)
        .find(isGoodStoreName) || storeName;
      const explicitDescription = textFrom(document.querySelector(
        "[class*='shop-description'], [class*='ShopDescription'], [data-testid*='description'], [class*='shop-info'] [class*='description']"
      ));
      const profileDescriptionIndex = storePageLines.findIndex((line) => /^(description|deskripsi)\\b/iu.test(line));
      const lineDescription = profileDescriptionIndex >= 0
        ? storePageLines
            .slice(profileDescriptionIndex, profileDescriptionIndex + 8)
            .map((line, index) => index === 0 ? line.replace(/^(description|deskripsi)\\s*:?\\s*/iu, "") : line)
            .filter((line) => line && !/^(shop link|tautan toko|verified accounts?|akun terverifikasi|view all products?|lihat semua produk)/iu.test(line))
            .join("\\n")
            .slice(0, 2400)
        : undefined;
      const descriptionMatch = storeMetricText.match(/(?:Description Store|Store Description|Description|Deskripsi Toko|Deskripsi)\\s*:?\\s*(.{20,2400}?)(?=\\s+(?:Shop Link|Tautan Toko|Verified Accounts?|Akun Terverifikasi|View All Products?|Lihat Semua Produk|Customer Service|Pusat Bantuan|$))/iu);
      const profileDescription = capturedViewMode === "mobile"
        ? compact(explicitDescription || lineDescription || descriptionMatch?.[1] || "").slice(0, 2400) || undefined
        : undefined;
      const categoryCandidates = [
        ...Array.from(document.querySelectorAll(
        "a[href*='tab=category'], [class*='category'] a, [class*='category'] [role='button'], [class*='category'] li"
        )).map((element) => textFrom(element)),
        ...Array.from(storePageText.matchAll(/([A-Za-z][A-Za-z0-9 &+/'-]{1,80})\\s*\\((\\d{1,5})\\)/gu))
          .map((match) => compact(match[1]) + " (" + match[2] + ")")
      ]
        .filter((value) => value.length >= 2 && value.length <= 120)
        .filter((value) => !/^(category|categories|kategori|products?|produk|shop|toko|home|beranda)$/iu.test(value))
        .filter((value) => !/(rating|penilaian|within minutes|dalam hitungan menit)/iu.test(value))
        .filter((value) => /\\(\\s*\\d+\\s*\\)/u.test(value) || currentUrl.searchParams.get("tab") === "category");
      const exactStoreRatingRows = Array.from(document.querySelectorAll(".A7MThp"))
        .filter((row) => !row.parentElement?.closest?.(".A7MThp"));
      const productReviewAnchorFrom = (element) => Array.from(element?.querySelectorAll?.("a[href]") || [])
        .find((anchor) => /(?:-i\\.\\d+\\.\\d+|\\/product\\/|itemid=)/iu.test(anchor.getAttribute("href") || ""));
      const semanticStoreRatingRows = Array.from(new Set(Array.from(document.querySelectorAll(".icon-rating-solid"))
        .map((star) => {
          let current = star.parentElement;
          while (current && current !== document.body && current !== document.documentElement) {
            const solidCount = current.querySelectorAll(".icon-rating-solid").length;
            if ((solidCount === 1 || solidCount === 5) && productReviewAnchorFrom(current)) {
              return current;
            }
            current = current.parentElement;
          }
          return undefined;
        })
        .filter(Boolean)));
      const genericStoreRatingRows = Array.from(document.querySelectorAll(
        ".shopee-product-rating, [class*='shop-rating'], [class*='product-rating'], [class*='rating-item'], [class*='review-item']"
      ));
      const storeRatingRowCandidates = exactStoreRatingRows.length > 0
        ? exactStoreRatingRows
        : semanticStoreRatingRows.length > 0
          ? semanticStoreRatingRows
          : genericStoreRatingRows;
      const seenStoreRatingSamples = new Set();
      const storeRatingSamples = storeRatingRowCandidates
        .map((row, sourceIndex) => {
          const rowText = blockTextFromHtml(row);
          const rowLines = rowText.split("\\n").map(compact).filter(Boolean);
          const productAnchor = row.querySelector("a.h3xEIM[href]") || productReviewAnchorFrom(row);
          const knownReviewMediaElements = Array.from(row.querySelectorAll(".rating-media-list__zoomed-image-item, .rating-media-list__image-wrapper--image"));
          const mediaElements = knownReviewMediaElements.length > 0
            ? knownReviewMediaElements
            : Array.from(row.querySelectorAll("video, picture, img[src], img[srcset], source[srcset]"));
          const mediaUrls = unique(mediaElements
            .filter((element) => !productAnchor?.contains?.(element))
            .filter((element) => !element.closest("[class*='avatar'], [class*='profile'], [class*='user-avatar']"))
            .map((element) => element.tagName === "VIDEO" || element.tagName === "SOURCE"
              ? absoluteUrl(element.currentSrc || element.src || element.getAttribute("src") || "")
              : absoluteUrl(element.getAttribute("src") || imageUrlFrom(element) || ""))
            .map((value) => value?.replace(/@resize_[^/?#]+/iu, ""))
            .filter((value) => value && !/(avatar|profile|default[-_]?avatar|sprite|icon)/iu.test(value)));
          const detectedRating = row.querySelectorAll(".icon-rating-solid").length;
          const productUrl = productAnchor ? absoluteUrl(productAnchor.getAttribute("href") || productAnchor.href || "") : undefined;
          const productTitle = compact(
            textFrom(row.querySelector(".EQ3yLe, [class*='product-name'], [class*='item-name'], [class*='product-title']")) ||
            textFrom(productAnchor) ||
            productAnchor?.getAttribute("title") ||
            productAnchor?.querySelector("img")?.getAttribute("alt") ||
            ""
          ).slice(0, 300) || undefined;
          const productVariation = compact(textFrom(row.querySelector(".TaSogz"))) || undefined;
          const reviewerAnchor = row.querySelector("a.InK5kS[href], .d72He7 a[href*='/shop/']");
          const reviewer = compact(textFrom(reviewerAnchor)) || rowLines.find((line) =>
            line.length >= 2 &&
            line.length <= 80 &&
            !/^\\d|^(variation|variasi|quality|kualitas|effect|efek|performance|performa|texture|tekstur)/iu.test(line)
          ) || "";
          const reviewerUrl = reviewerAnchor
            ? absoluteUrl(reviewerAnchor.getAttribute("href") || reviewerAnchor.href || "")
            : undefined;
          const capturedAt = compact(textFrom(row.querySelector(".XYk98l"))) ||
            rowText.match(/\\b20\\d{2}[-/]\\d{1,2}[-/]\\d{1,2}(?:\\s+\\d{1,2}:\\d{2})?\\b/u)?.[0];
          const exactCommentRoot = row.querySelector(".meQyXP");
          const comment = exactCommentRoot
            ? blockTextFromHtml(exactCommentRoot).slice(0, 900)
            : cleanReviewComment(rowText);
          const sellerResponseElement = row.querySelector(
            ".QSiE2A, [class*='seller-response'], [class*='seller-reply'], [class*='shop-reply'], [class*='reply-content']"
          );
          const sellerResponseMatch = rowText.match(
            /(?:Seller'?s? Response|Respon(?:s)? Penjual|Respons(?:e)? Penjual|Penjual Membalas|Tanggapan Penjual)\\s*:?\\s*([\\s\\S]+?)(?=(?:Report Abuse|Laporkan Penyalahgunaan|Helpful|Membantu)\\b|$)/iu
          );
          const sellerResponse = compact(textFrom(sellerResponseElement) || sellerResponseMatch?.[1] || "");
          return {
            rating: detectedRating,
            reviewer,
            reviewerUrl,
            comment,
            productTitle,
            productUrl,
            productVariation,
            sellerResponse: sellerResponse || undefined,
            mediaUrls,
            capturedAt,
            sourceIndex
          };
        })
        .filter((sample) => sample.rating === 1 || sample.rating === 5)
        .filter((sample) => Boolean(sample.productTitle || sample.productUrl))
        .filter((sample) => !requestedStoreRating || sample.rating === requestedStoreRating)
        .filter((sample) => {
          const key = [sample.rating, sample.productUrl || sample.productTitle || "", sample.reviewer, sample.capturedAt || "", sample.comment, sample.sellerResponse || ""]
            .map(compact)
            .join(":")
            .toLocaleLowerCase();
          if (seenStoreRatingSamples.has(key)) return false;
          seenStoreRatingSamples.add(key);
          return true;
        })
        .sort((left, right) => {
          const priority = (sample) => {
            const seller = Boolean(sample.sellerResponse?.trim());
            const comment = Boolean(sample.comment.trim());
            const media = sample.mediaUrls.length > 0;
            if (seller && media && comment) return 1;
            if (seller && media && !comment) return 2;
            if (seller && comment && !media) return 3;
            if (comment && media && !seller) return 4;
            if (comment && !seller && !media) return 5;
            if (seller && !media && !comment) return 6;
            if (media && !seller && !comment) return 7;
            return 8;
          };
          const meaningfulLength = (value) => compact(value || "").length;
          return priority(left) - priority(right) ||
            right.mediaUrls.length - left.mediaUrls.length ||
            meaningfulLength(right.comment) - meaningfulLength(left.comment) ||
            meaningfulLength(right.sellerResponse) - meaningfulLength(left.sellerResponse) ||
            left.sourceIndex - right.sourceIndex;
        })
        .slice(0, 5)
        .map(({ sourceIndex, ...sample }) => sample);
      const storeProfile = {
        name: profileName,
        url: location.href,
        marketplaceStoreId: marketplaceStoreId || undefined,
        storeType: (() => {
          const profileHeader = document.querySelector(
            ".shop-page__info, .shop-detail__info, [class*='shop-header'], [class*='ShopHeader'], [class*='shop-info']"
          ) || storePageRoot;
          const profileBadge = findStoreBadgeImage(profileHeader, undefined, profileHeader);
          const exactTypeLabel = Array.from(profileHeader.querySelectorAll?.("span, div") || [])
            .map((element) => compact(element.textContent || ""))
            .find((value) => /^(mall\\s*ori|shopee\\s*mall|star\\s*\\+|starplus|star-plus|star)$/iu.test(value));
          return inferStoreType(
            compact([profileBadge?.alt, profileBadge?.title, profileBadge?.getAttribute?.("aria-label"), exactTypeLabel].filter(Boolean).join(" ")),
            imageUrlFrom(profileBadge)
          ) || storeType;
        })(),
        followers: metricNumber(followersMetricMatch),
        following: metricNumber(followingMetricMatch),
        productsCount: metricNumber(productsMetricMatch),
        rating: ratingMetricMatch ? Number(ratingMetricMatch[1].replace(",", ".")) : undefined,
        ratingCount: ratingMetricMatch?.[2]
          ? parseHumanNumber(String(ratingMetricMatch[2]) + String(ratingMetricMatch[3] || ""))
          : undefined,
        chatResponse: compact(chatMetricMatch?.[1] || "") || undefined,
        joinedDate: normalizeJoinedAge(joinedMetricMatch?.[1]),
        description: profileDescription || undefined,
        categories: unique(categoryCandidates).slice(0, 60),
        ratingSamples: storeRatingSamples,
        bannerUrls: storeDecorationImages.slice(0, 40)
      };
      const capturedProductCards = capturedProductCardHtml.length > 0
        ? \`<section data-mio-captured-product-cards="true">\${capturedProductCardHtml.join("")}</section>\`
        : "";
      const requestedRatingRows = requestedStoreRating
        ? storeRatingRowCandidates
            .filter((row) => row.querySelectorAll(".rGdC5O .icon-rating-solid, .icon-rating-solid").length === requestedStoreRating)
            .slice(0, 30)
            .map((row) => row.outerHTML || "")
            .filter(Boolean)
        : [];
      const focusedRatingHtml = requestedRatingRows.length > 0
        ? \`<main data-mio-store-rating="\${requestedStoreRating}">\${requestedRatingRows.join("")}</main>\`
        : "";
      const rawHtml = focusedRatingHtml || \`\${htmlRoot.outerHTML || document.documentElement?.outerHTML || ""}\${capturedProductCards}\`;
      // Keep the archival HTML useful without posting an unbounded marketplace DOM
      // through Electron's local HTTP bridge. Structured records above remain complete.
      const html = includeHtml ? rawHtml.slice(0, 8_000_000) : "";
      const visibleTextSource = htmlRoot.innerText || document.body?.innerText || "";
      const visibleText = [document.title || "", location.href, compact(visibleTextSource).slice(0, 24000)]
        .filter(Boolean)
        .join("\\n");
      return {
        html,
        visibleText,
        products,
        productDetail,
        storeProfile,
        storeDecorationImages: storeDecorationImages.slice(0, 40)
      };
    })();
  `);
  const timeout = new Promise<never>((_resolve, reject) => {
    window.setTimeout(() => reject(new Error("Rendered page extraction timed out after 30 seconds. Scroll the target section into view and retry.")), 30_000);
  });
  return Promise.race([extraction, timeout]);
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

async function waitForRenderedProductRows(
  webview: WebviewElement,
  selector: string | undefined,
  label: string,
  timeoutMs = 20_000
): Promise<void> {
  if (!webview.executeJavaScript) {
    throw new Error("The embedded browser cannot inspect marketplace results in the current runtime.");
  }
  const deadline = Date.now() + timeoutMs;
  let consecutiveReadyChecks = 0;
  while (Date.now() < deadline) {
    const state = await webview.executeJavaScript<{ readyState: string; productCount: number }>(`
      (() => {
        const selector = ${JSON.stringify(selector ?? "")};
        const target = selector ? document.querySelector(selector) : document;
        const scope = target || document;
        const productSelector = 'a[href*="-i."], a[href*="/product/"], a[href*="i."]';
        const scopedCount = scope.querySelectorAll(productSelector).length;
        const documentCount = target ? 0 : document.querySelectorAll(productSelector).length;
        return {
          readyState: document.readyState,
          productCount: Math.max(scopedCount, documentCount)
        };
      })();
    `).catch(() => undefined);
    if (state && state.readyState !== "loading" && state.productCount > 0) {
      consecutiveReadyChecks += 1;
      if (consecutiveReadyChecks >= 2) {
        return;
      }
    } else {
      consecutiveReadyChecks = 0;
    }
    await new Promise<void>((resolve) => window.setTimeout(resolve, 300));
  }
  throw new Error(`${label} is not ready because no rendered marketplace product rows were found.`);
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

async function captureTopThroughElementScreenshot(webview: WebviewElement, selector: string): Promise<FullPageScreenshot> {
  const initialMetrics = await readScrollablePageMetrics(webview);
  const initialRect = await readElementPageRect(webview, selector);
  if (!initialRect || initialRect.height < 8) {
    return captureFullPageScreenshot(webview);
  }

  await scrollEmbeddedPage(webview, 0);
  await waitForFramePaint();
  const targetRect = await readElementPageRect(webview, selector) ?? initialRect;
  const screenshot = await captureFullPageScreenshot(webview);
  const topThroughRect: ElementPageRect = {
    ...targetRect,
    x: 0,
    y: 0,
    width: targetRect.viewportWidth,
    height: Math.max(1, Math.min(targetRect.pageHeight, targetRect.y + targetRect.height))
  };
  const cropped = await cropFullPageScreenshotToRect(screenshot, topThroughRect);
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
