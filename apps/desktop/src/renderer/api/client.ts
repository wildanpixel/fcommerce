import type {
  BrowserOption,
  CreateJobPayload,
  DashboardSnapshot,
  NewProjectInput,
  PlatformPayload,
  ReportGenerationPayload,
  ReportGenerationResult,
  SaveSettingsPayload,
  SettingsPayload
} from "../../shared/contracts.js";
import type { ReportSectionConfig } from "../../shared/reportSections.js";

const apiBaseUrl =
  window.marketplaceOS?.apiBaseUrl ??
  import.meta.env.VITE_API_BASE_URL ??
  "http://127.0.0.1:4123/api";

export type MarketplaceOption = {
  id: string;
  displayName: string;
  enabled: boolean;
  capabilities: Record<string, boolean>;
};

export const apiClient = {
  dashboard: () => request<DashboardSnapshot>("/dashboard"),
  platform: () => request<PlatformPayload>("/platform"),
  browsers: () => request<BrowserOption[]>("/browsers"),
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
  createJob: (payload: CreateJobPayload) =>
    request<DashboardSnapshot["jobs"][number]>("/jobs", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  reportSections: () => request<ReportSectionConfig[]>("/report-sections"),
  generateReport: (payload: ReportGenerationPayload) =>
    request<ReportGenerationResult>("/reports", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  openPath: (path: string) =>
    request<{ ok: true }>("/platform/open-path", {
      method: "POST",
      body: JSON.stringify({ path })
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
