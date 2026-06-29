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
  createdAt: string;
  updatedAt: string;
  counts: {
    jobs: number;
    products: number;
    stores: number;
    reports: number;
  };
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
  sourceUrl?: string;
  imageDataUrl: string;
  width?: number;
  height?: number;
  note?: string;
  metadata?: Record<string, unknown>;
};

export type ManualEvidenceResult = {
  ok: true;
  stepId: string;
  assetPath: string;
};
