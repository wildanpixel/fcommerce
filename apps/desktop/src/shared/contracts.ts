import type { ReportSectionConfig } from "./reportSections.js";

export const MARKETPLACES = [
  "SHOPEE_ID",
  "TIKTOK_SHOP",
  "TOKOPEDIA",
  "LAZADA",
  "AMAZON",
  "ALIBABA"
] as const;

export type MarketplaceId = (typeof MARKETPLACES)[number];

export type JobStatus =
  | "PENDING"
  | "RUNNING"
  | "PAUSED"
  | "RETRY"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type ProjectStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type BrowserPreference = "chromium" | "chrome" | "edge" | "brave";
export type CollectionStage = "KEYWORD_GENERAL" | "PRODUCT_DETAILS" | "EVALUATION_KEY_STORE";

export type CollectionState = {
  stage: CollectionStage;
  stageLabel: string;
  progressPercent: number;
  completedStepIds: string[];
  stepAssetPaths: Record<string, string>;
  stageCompleted: Partial<Record<CollectionStage, boolean>>;
  currentStepId?: string;
  browserUrl?: string;
  viewMode?: "desktop" | "mobile";
  savedAt?: string;
};

export type NewProjectInput = {
  name: string;
  keyword: string;
  marketplace: MarketplaceId;
  language: string;
  productCategory?: string;
  exportFolder?: string;
  screenshotFolder?: string;
};

export type ProjectSummary = {
  id: string;
  name: string;
  keyword: string;
  marketplace: MarketplaceId;
  status: ProjectStatus;
  language: string;
  productCategory?: string | null;
  exportFolder?: string | null;
  screenshotFolder?: string | null;
  collectionState: CollectionState;
  createdAt: string;
  updatedAt: string;
  counts: {
    jobs: number;
    products: number;
    stores: number;
    reports: number;
  };
};

export type EvidenceAssetSummary = {
  id: string;
  projectId: string;
  ownerType: string;
  ownerId?: string | null;
  kind: ManualEvidenceKind | "REPORT";
  label: string;
  path: string;
  sourceUrl?: string | null;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ProjectDetailPayload = {
  project: ProjectSummary;
  products: Array<{
    id: string;
    title: string;
    imageUrl?: string | null;
    productType?: string | null;
    storeType?: string | null;
    sourcePlacement?: string | null;
    ratingText?: string | null;
    reviewText?: string | null;
    monthlySoldText?: string | null;
    totalSoldText?: string | null;
    rank?: number | null;
    source?: string | null;
    selectionReason?: string | null;
    priceAverage?: number | null;
    originalPrice?: number | null;
    discount?: string | null;
    rating?: number | null;
    reviewCount?: number | null;
    monthlySold?: number | null;
    totalSold?: number | null;
    stock?: number | null;
    storeName?: string | null;
    storeUrl?: string | null;
    voucherText?: string | null;
    shippingText?: string | null;
    description?: string | null;
    variants: string[];
    specifications: Record<string, string>;
    images: string[];
    videos: string[];
    reviewMediaImages: string[];
    reviewMediaVideos: string[];
    productUrl: string;
    createdAt: string;
  }>;
  stores: Array<{
    id: string;
    name: string;
    url: string;
    followers?: number | null;
    following?: number | null;
    productsCount?: number | null;
    rating?: number | null;
    ratingCount?: number | null;
    chatResponse?: string | null;
    joinedDate?: string | null;
    categories: string[];
    voucherCount?: number | null;
    voucherTypes: string[];
    visualTheme: {
      dominantColors: string[];
      typographySignals: string[];
      bannerStyle: string[];
    };
    createdAt: string;
  }>;
  assets: EvidenceAssetSummary[];
  reviews: Array<{
    id: string;
    productId: string;
    sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
    rating?: number | null;
    comment: string;
    variation?: string | null;
    reviewDate?: string | null;
    createdAt: string;
  }>;
  analyses: Array<{
    id: string;
    subjectType: string;
    subjectId?: string | null;
    provider: string;
    resultJson: string;
    createdAt: string;
  }>;
  reports: ReportSummary[];
};

export type JobSummary = {
  id: string;
  projectId: string;
  keyword: string;
  marketplace: MarketplaceId;
  status: JobStatus;
  progress: number;
  etaSeconds?: number | null;
  errorMessage?: string | null;
  updatedAt: string;
};

export type DashboardSnapshot = {
  projects: ProjectSummary[];
  jobs: JobSummary[];
  metrics: {
    activeProjects: number;
    completedReports: number;
    runningJobs: number;
    collectedProducts: number;
  };
};

export type SettingsPayload = {
  marketplace: MarketplaceId;
  theme: "dark" | "light" | "system";
  browser: BrowserPreference;
  exportFolder: string;
  screenshotFolder: string;
  language: string;
  concurrency: number;
  openAiKeyConfigured: boolean;
  geminiKeyConfigured: boolean;
};

export type SaveSettingsPayload = Omit<
  SettingsPayload,
  "openAiKeyConfigured" | "geminiKeyConfigured"
> & {
  openAiApiKey?: string;
  geminiApiKey?: string;
};

export type PlatformPayload = {
  os: "windows" | "macos" | "linux";
  isPackaged: boolean;
  shortcutModifier: "Ctrl" | "Command";
  directories: {
    appData: string;
    data: string;
    settings: string;
    screenshots: string;
    reports: string;
    logs: string;
    cache: string;
    browserProfiles: string;
  };
};

export type BrowserOption = {
  id: BrowserPreference;
  name: string;
  available: boolean;
  profilePath: string;
  fallbackReason?: string;
};

export type HealthPayload = {
  ok: true;
  product: "Marketplace Intelligence OS";
  version: string;
};

export type CreateJobPayload = {
  projectId: string;
  keyword: string;
  marketplace: MarketplaceId;
  limit: number;
  includeTopSales: boolean;
  collectReviews: boolean;
  collectStores: boolean;
  captureScreenshots: boolean;
};

export type ReportGenerationPayload = {
  projectId: string;
  templateId: string;
  sections: ReportSectionConfig[];
};

export type ReportGenerationResult = {
  reportId: string;
  htmlPath: string;
  pdfPath: string;
};

export type ReportSummary = {
  id: string;
  projectId: string;
  projectName: string;
  templateId: string;
  status: "DRAFT" | "GENERATED" | "FAILED";
  htmlPath?: string | null;
  pdfPath?: string | null;
  generatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ManualEvidenceKind =
  | "SEARCH_RESULT"
  | "TOP_SALES"
  | "PRODUCT_PAGE"
  | "PRODUCT_IMAGE"
  | "PRODUCT_VIDEO"
  | "PRODUCT_DESCRIPTION"
  | "REVIEW_SECTION"
  | "REVIEW_IMAGE"
  | "STORE_HOME"
  | "STORE_VOUCHER"
  | "STORE_BANNER"
  | "STORE_FEATURED_PRODUCTS"
  | "STORE_BEST_SELLER"
  | "STORE_PROMOTION"
  | "SOCIAL_ACCOUNT";

export type ManualEvidencePayload = {
  projectId: string;
  stepId: string;
  label: string;
  kind: ManualEvidenceKind;
  ownerType?: "MANUAL_STEP" | "PRODUCT" | "STORE" | "PROJECT";
  ownerId?: string;
  sourceUrl?: string;
  imageDataUrl: string;
  width?: number;
  height?: number;
  note?: string;
  pageHtml?: string;
  visibleText?: string;
  pagePdfDataUrl?: string;
  extractedProducts?: ExtractedPageProduct[];
  metadata?: Record<string, unknown>;
};

export type ManualFileEvidencePayload = {
  projectId: string;
  stepId: string;
  label: string;
  kind: ManualEvidenceKind;
  ownerType?: "MANUAL_STEP" | "PRODUCT" | "STORE" | "PROJECT";
  ownerId?: string;
  sourcePath: string;
  sourceUrl?: string;
  note?: string;
  metadata?: Record<string, unknown>;
};

export type ManualEvidenceResult = {
  ok: true;
  stepId: string;
  assetPath: string;
  htmlPath?: string;
  textPath?: string;
  pdfPath?: string;
  extractedProductCount?: number;
};

export type ExtractedPageProduct = {
  rank: number;
  title: string;
  url: string;
  imageUrl?: string;
  priceText?: string;
  priceAverage?: number;
  originalPrice?: number;
  discount?: string;
  rating?: number;
  reviewCount?: number;
  soldCount?: number;
  productType?: string;
  storeType?: string;
  storeBadgeImageUrl?: string;
  sourcePlacement?: string;
  ratingText?: string;
  reviewText?: string;
  soldText?: string;
  storeName?: string;
  storeUrl?: string;
  mallStatus?: boolean;
  officialStatus?: boolean;
  starSeller?: boolean;
  rawText?: string;
};

export type AndroidDeviceInfo = {
  id: string;
  state: string;
  model?: string;
  product?: string;
  bootCompleted?: boolean;
};

export type AndroidAvdInfo = {
  name: string;
};

export type AndroidToolStatus = {
  adbPath?: string;
  emulatorPath?: string;
  sdkManagerPath?: string;
  avdManagerPath?: string;
  sdkRoot?: string;
  javaAvailable: boolean;
  devices: AndroidDeviceInfo[];
  avds: AndroidAvdInfo[];
  tiktokInstalled: boolean;
  tiktokPackage?: string;
  tiktokRuntime?: AndroidAppRuntimeStatus;
  ready: boolean;
  diagnostics: string[];
};

export type AndroidApkCandidate = {
  path: string;
  name: string;
  sizeBytes: number;
  modifiedAt: string;
};

export type AndroidStartPayload = {
  avdName?: string;
};

export type AndroidInstallPayload = {
  apkPath: string;
};

export type AndroidEvidencePayload = {
  projectId: string;
  stepId: string;
  label: string;
  kind: ManualEvidenceKind;
  note?: string;
  metadata?: Record<string, unknown>;
};

export type AndroidVisibleTextResult = {
  ok: true;
  text: string;
};

export type AndroidAppRuntimeStatus = {
  packageName?: string;
  state: "not-installed" | "not-running" | "starting" | "responding" | "not-responding";
  activeAnr: boolean;
  focusedPackage?: string;
  focusedActivity?: string;
  lastAnrAt?: string;
  lastAnrReason?: string;
  packageVersion?: string;
  packageAbi?: string;
  deviceAbi?: string;
};
