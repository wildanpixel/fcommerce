import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";
import type { ProjectSummary } from "../../shared/contracts.js";
import type { ReportWorkspace } from "../../application/services/ReportService.js";
import type { WorkspaceLocator } from "../../application/services/IntelligenceWorkflow.js";
import { getPlatformService } from "../platform/PlatformService.js";

export class ProjectWorkspace implements WorkspaceLocator, ReportWorkspace {
  constructor(
    private readonly screenshotRoot = getPlatformService().info.directories.screenshots,
    private readonly exportRoot = getPlatformService().info.directories.reports
  ) {}

  async projectFolder(project: ProjectSummary): Promise<string> {
    const folder = resolve(
      project.screenshotFolder ?? this.screenshotRoot,
      `${slug(project.keyword)}-${project.id.slice(0, 8)}`
    );
    await mkdir(folder, { recursive: true });
    await mkdir(resolve(folder, "search"), { recursive: true });
    await mkdir(resolve(folder, "products"), { recursive: true });
    await mkdir(resolve(folder, "stores"), { recursive: true });
    return folder;
  }

  async ensureReportPaths(projectId: string, templateId: string, options?: {
    fileName?: string;
    exportFolder?: string;
  }): Promise<{
    htmlPath: string;
    pdfPath: string;
  }> {
    const folder = resolve(options?.exportFolder ?? this.exportRoot, projectId);
    await mkdir(folder, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const requestedName = options?.fileName?.trim();
    const withoutExtension = requestedName
      ? basename(requestedName, extname(requestedName))
      : `${slug(templateId)}-${timestamp}`;
    const base = sanitizeReportFileName(withoutExtension);
    return {
      htmlPath: resolve(folder, `${base}.html`),
      pdfPath: resolve(folder, `${base}.pdf`)
    };
  }

  async writeHtml(path: string, html: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, html, "utf8");
  }
}

export function sanitizeReportFileName(value: string): string {
  const cleaned = value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/[. ]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned.slice(0, 180) : "marketplace-report";
}

export function slug(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.length > 0 ? cleaned.slice(0, 80) : "untitled";
}
