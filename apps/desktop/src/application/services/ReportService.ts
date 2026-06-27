import type { ReportGenerationPayload, ReportGenerationResult } from "../../shared/contracts.js";
import type { ReportRepository } from "../../domain/repositories.js";

export type ReportDataLoader = {
  load(projectId: string): Promise<ReportData>;
};

export type ReportAsset = {
  id: string;
  kind: string;
  ownerType: string;
  ownerId?: string | null;
  label: string;
  path: string;
  sourceUrl?: string | null;
};

export type ReportData = {
  project: {
    id: string;
    name: string;
    keyword: string;
    marketplace: string;
    language: string;
    createdAt: Date;
  };
  products: Array<{
    id: string;
    rank?: number | null;
    title: string;
    priceAverage?: number | null;
    rating?: number | null;
    reviewCount?: number | null;
    monthlySold?: number | null;
    totalSold?: number | null;
    storeName?: string | null;
    productUrl: string;
    description?: string | null;
    variantsJson: string;
    specificationsJson: string;
  }>;
  stores: Array<{
    id: string;
    name: string;
    url: string;
    followers?: number | null;
    productsCount?: number | null;
    rating?: number | null;
    chatResponse?: string | null;
    voucherCount?: number | null;
    visualThemeJson: string;
  }>;
  reviews: Array<{
    id: string;
    productId: string;
    sentiment: string;
    rating?: number | null;
    comment: string;
    variation?: string | null;
    reviewDate?: string | null;
  }>;
  assets: ReportAsset[];
  analyses: Array<{
    id: string;
    subjectType: string;
    subjectId?: string | null;
    provider: string;
    resultJson: string;
  }>;
};

export interface HtmlReportRenderer {
  render(data: ReportData, payload: ReportGenerationPayload): Promise<string>;
}

export interface PdfExporter {
  export(html: string, outputPath: string): Promise<void>;
}

export interface ReportWorkspace {
  ensureReportPaths(projectId: string, templateId: string): Promise<{
    htmlPath: string;
    pdfPath: string;
  }>;
  writeHtml(path: string, html: string): Promise<void>;
}

export class ReportService {
  constructor(
    private readonly reports: ReportRepository,
    private readonly loader: ReportDataLoader,
    private readonly renderer: HtmlReportRenderer,
    private readonly exporter: PdfExporter,
    private readonly workspace: ReportWorkspace
  ) {}

  async generate(payload: ReportGenerationPayload): Promise<ReportGenerationResult> {
    const reportId = await this.reports.create(payload);
    try {
      const data = await this.loader.load(payload.projectId);
      const html = await this.renderer.render(data, payload);
      const paths = await this.workspace.ensureReportPaths(payload.projectId, payload.templateId);
      await this.workspace.writeHtml(paths.htmlPath, html);
      await this.exporter.export(html, paths.pdfPath);
      await this.reports.markGenerated(reportId, paths.htmlPath, paths.pdfPath);
      return {
        reportId,
        htmlPath: paths.htmlPath,
        pdfPath: paths.pdfPath
      };
    } catch (error) {
      await this.reports.markFailed(reportId);
      throw error;
    }
  }
}
