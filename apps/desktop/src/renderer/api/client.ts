import type {
  BrowserOption,
  AndroidApkCandidate,
  AndroidEvidencePayload,
  AndroidInstallPayload,
  AndroidStartPayload,
  AndroidToolStatus,
  AndroidVisibleTextResult,
  CollectionState,
  CreateJobPayload,
  DashboardSnapshot,
  HealthPayload,
  HtmlSnapshotPayload,
  HtmlSnapshotResult,
  ManualEvidencePayload,
  ManualEvidenceResult,
  ManualFileEvidencePayload,
  NewProjectInput,
  PlatformPayload,
  ProjectDetailPayload,
  ReportGenerationPayload,
  ReportGenerationResult,
  ReportDocxResult,
  ReportHtmlPayload,
  ReportSummary,
  SaveSettingsPayload,
  SettingsPayload
} from "../../shared/contracts.js";
import type { ReportSectionConfig } from "../../shared/reportSections.js";

const apiBaseUrl =
  window.marketplaceOS?.apiBaseUrl ??
  new URLSearchParams(window.location.search).get("apiBaseUrl") ??
  import.meta.env.VITE_API_BASE_URL ??
  "http://127.0.0.1:4123/api";

export type MarketplaceOption = {
  id: string;
  displayName: string;
  enabled: boolean;
  capabilities: Record<string, boolean>;
};

export const apiClient = {
  health: () => request<HealthPayload>("/health"),
  dashboard: () => request<DashboardSnapshot>("/dashboard"),
  platform: () => request<PlatformPayload>("/platform"),
  browsers: () => request<BrowserOption[]>("/browsers"),
  androidStatus: () => request<AndroidToolStatus>("/android/status"),
  androidApkCandidates: () => request<AndroidApkCandidate[]>("/android/apk-candidates"),
  startAndroidEmulator: (payload: AndroidStartPayload) =>
    request<{ ok: true }>("/android/start", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  installAndroidApk: (payload: AndroidInstallPayload) =>
    request<{ ok: true }>("/android/install", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  openTikTokAndroid: () =>
    request<{ ok: true }>("/android/open-tiktok", {
      method: "POST",
      body: JSON.stringify({})
    }),
  recoverTikTokAndroid: () =>
    request<{ ok: true }>("/android/recover-tiktok", {
      method: "POST",
      body: JSON.stringify({})
    }),
  androidVisibleText: () => request<AndroidVisibleTextResult>("/android/visible-text"),
  captureAndroidEvidence: (payload: AndroidEvidencePayload) =>
    request<ManualEvidenceResult>("/android/capture-evidence", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  marketplaces: () => request<MarketplaceOption[]>("/marketplaces"),
  settings: () => request<SettingsPayload>("/settings"),
  saveSettings: (payload: SaveSettingsPayload) =>
    request<SettingsPayload>("/settings", {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  createProject: (payload: NewProjectInput) =>
    request<DashboardSnapshot["projects"][number]>("/projects", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  projectDetail: (projectId: string) => request<ProjectDetailPayload>(`/projects/${projectId}/detail`),
  saveCollectionState: (projectId: string, payload: CollectionState) =>
    request<DashboardSnapshot["projects"][number]>(`/projects/${projectId}/collection-state`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  analyzeProject: (projectId: string) =>
    request<{ ok: true; analysisId: string; provider: string }>(`/projects/${projectId}/analyze`, {
      method: "POST",
      body: JSON.stringify({})
    }),
  deleteProject: (projectId: string) =>
    request<{ ok: true }>(`/projects/${projectId}`, {
      method: "DELETE"
    }),
  createJob: (payload: CreateJobPayload) =>
    request<DashboardSnapshot["jobs"][number]>("/jobs", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  saveManualEvidence: (payload: ManualEvidencePayload) =>
    request<ManualEvidenceResult>("/manual-evidence", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  saveManualFileEvidence: (payload: ManualFileEvidencePayload) =>
    request<ManualEvidenceResult>("/manual-file-evidence", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  saveHtmlSnapshot: (payload: HtmlSnapshotPayload) =>
    request<HtmlSnapshotResult>("/html-snapshot", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  reportSections: () => request<ReportSectionConfig[]>("/report-sections"),
  generateReport: (payload: ReportGenerationPayload) =>
    request<ReportGenerationResult>("/reports", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  reports: () => request<ReportSummary[]>("/reports"),
  reportHtml: (reportId: string) => request<ReportHtmlPayload>(`/reports/${reportId}/html`),
  exportReportDocx: (reportId: string) =>
    request<ReportDocxResult>(`/reports/${reportId}/docx`, {
      method: "POST",
      body: JSON.stringify({})
    }),
  deleteReport: (reportId: string) =>
    request<{ ok: true }>(`/reports/${reportId}`, {
      method: "DELETE"
    }),
  openPath: (path: string) =>
    request<{ ok: true }>("/platform/open-path", {
      method: "POST",
      body: JSON.stringify({ path })
    }),
  openUrl: (url: string) =>
    request<{ ok: true }>("/platform/open-url", {
      method: "POST",
      body: JSON.stringify({ url })
    })
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({ error: response.statusText }))) as {
      error?: string;
    };
    throw new Error(body.error ?? response.statusText);
  }
  return (await response.json()) as T;
}
