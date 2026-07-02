import type {
  CreateJobPayload,
  JobSummary,
  MarketplaceId,
  NewProjectInput,
  ProjectDetailPayload,
  ProjectSummary,
  ReportGenerationPayload,
  ReportSummary,
  SettingsPayload
} from "../shared/contracts.js";
import type {
  AiAnalysisJson,
  ProductDetail,
  ReviewEvidence,
  ScreenshotEvidence,
  StoreProfile
} from "./models.js";

export interface ProjectRepository {
  create(input: NewProjectInput): Promise<ProjectSummary>;
  list(): Promise<ProjectSummary[]>;
  get(id: string): Promise<ProjectSummary | null>;
  getDetail(id: string): Promise<ProjectDetailPayload | null>;
  delete(id: string): Promise<void>;
}

export interface JobRepository {
  create(payload: CreateJobPayload): Promise<JobSummary>;
  listRecent(limit: number): Promise<JobSummary[]>;
  get(id: string): Promise<JobSummary | null>;
  updateStatus(
    id: string,
    status: JobSummary["status"],
    progress: number,
    errorMessage?: string
  ): Promise<JobSummary>;
}

export interface IntelligenceRepository {
  saveProduct(projectId: string, product: ProductDetail): Promise<string>;
  saveStore(projectId: string, store: StoreProfile): Promise<string>;
  saveReviews(productId: string, reviews: ReviewEvidence[]): Promise<void>;
  saveScreenshots(
    projectId: string,
    ownerType: string,
    ownerId: string | undefined,
    screenshots: ScreenshotEvidence[]
  ): Promise<void>;
  saveAnalysis(projectId: string, analysis: AiAnalysisJson): Promise<string>;
}

export interface ReportRepository {
  create(payload: ReportGenerationPayload): Promise<string>;
  list(): Promise<ReportSummary[]>;
  get(id: string): Promise<ReportSummary | null>;
  delete(id: string): Promise<ReportSummary | null>;
  markGenerated(reportId: string, htmlPath: string, pdfPath: string): Promise<void>;
  markFailed(reportId: string): Promise<void>;
}

export interface SettingsRepository {
  get(): Promise<SettingsPayload>;
  save(settings: SettingsPayload): Promise<SettingsPayload>;
  saveSecret(name: "openai" | "gemini", value: string): Promise<void>;
  getSecret(name: "openai" | "gemini"): Promise<string | null>;
}

export interface LogRepository {
  write(input: {
    projectId: string;
    jobId?: string;
    level: "DEBUG" | "INFO" | "WARN" | "ERROR";
    message: string;
    context?: Record<string, unknown>;
  }): Promise<void>;
}

export type MarketplaceAdapterRegistry = {
  get(id: MarketplaceId): import("./marketplace/MarketplaceAdapter.js").MarketplaceAdapter;
  list(): Array<{
    id: MarketplaceId;
    displayName: string;
    enabled: boolean;
    capabilities: Record<string, boolean>;
  }>;
};
