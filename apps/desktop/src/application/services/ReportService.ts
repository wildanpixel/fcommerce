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
    collectionStateJson: string;
    createdAt: Date;
  };
  products: Array<{
    id: string;
    rank?: number | null;
    source?: string | null;
    selectionReason?: string | null;
    title: string;
    priceAverage?: number | null;
    rating?: number | null;
    reviewCount?: number | null;
    monthlySold?: number | null;
    totalSold?: number | null;
    storeName?: string | null;
    storeUrl?: string | null;
    productType?: string | null;
    productUrl: string;
    mallStatus: boolean;
    officialStatus: boolean;
    starSeller: boolean;
    description?: string | null;
    variantsJson: string;
    specificationsJson: string;
    rawJson: string;
  }>;
  stores: Array<{
    id: string;
    marketplaceStoreId?: string | null;
    name: string;
    url: string;
    followers?: number | null;
    following?: number | null;
    productsCount?: number | null;
    rating?: number | null;
    ratingCount?: number | null;
    chatResponse?: string | null;
    joinedDate?: string | null;
    categoriesJson: string;
    voucherCount?: number | null;
    visualThemeJson: string;
    rawJson: string;
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
  ensureReportPaths(projectId: string, templateId: string, options?: {
    fileName?: string;
    exportFolder?: string;
  }): Promise<{
    htmlPath: string;
    pdfPath: string;
  }>;
  writeHtml(path: string, html: string): Promise<void>;
}

export type ReportTextTranslator = {
  translateTexts(
    texts: string[],
    language: "id-ID" | "en-US" | "zh-CN"
  ): Promise<{ translations: string[] }>;
};

export class ReportService {
  constructor(
    private readonly reports: ReportRepository,
    private readonly loader: ReportDataLoader,
    private readonly renderer: HtmlReportRenderer,
    private readonly exporter: PdfExporter,
    private readonly workspace: ReportWorkspace,
    private readonly translator?: ReportTextTranslator
  ) {}

  async generate(payload: ReportGenerationPayload): Promise<ReportGenerationResult> {
    const reportId = await this.reports.create(payload);
    try {
      const sourceData = await this.loader.load(payload.projectId);
      const data = await translateReportData(sourceData, payload.language, this.translator);
      const html = await this.renderer.render(data, payload);
      const paths = await this.workspace.ensureReportPaths(payload.projectId, payload.templateId, {
        fileName: payload.fileName,
        exportFolder: payload.exportFolder
      });
      await this.workspace.writeHtml(paths.htmlPath, html);
      await this.exporter.export(html, paths.pdfPath);
      await this.reports.markGenerated(reportId, paths.htmlPath, paths.pdfPath);
      return {
        reportId,
        htmlPath: paths.htmlPath,
        pdfPath: paths.pdfPath,
        formats: payload.formats ?? ["PDF", "HTML"]
      };
    } catch (error) {
      await this.reports.markFailed(reportId);
      throw error;
    }
  }
}

export async function translateReportData(
  data: ReportData,
  language: ReportGenerationPayload["language"],
  translator?: ReportTextTranslator
): Promise<ReportData> {
  if (!translator || !language || language === "en-US") return data;
  const sources = Array.from(new Set([
    ...data.products.flatMap((product) => [product.title, product.selectionReason, product.description, product.productType]),
    ...data.reviews.flatMap((review) => [review.comment, review.variation])
  ].map((value) => value?.trim() ?? "").filter(Boolean)));
  const translated = new Map<string, string>();
  for (let index = 0; index < sources.length; index += 80) {
    const batch = sources.slice(index, index + 80);
    const result = await translator.translateTexts(batch, language);
    batch.forEach((source, batchIndex) => translated.set(source, result.translations[batchIndex] ?? source));
  }
  const text = (value?: string | null) => value ? translated.get(value.trim()) ?? value : value;
  return {
    ...data,
    products: data.products.map((product) => ({
      ...product,
      title: text(product.title) ?? product.title,
      selectionReason: text(product.selectionReason),
      description: text(product.description),
      productType: text(product.productType)
    })),
    reviews: data.reviews.map((review) => ({
      ...review,
      comment: text(review.comment) ?? review.comment,
      variation: text(review.variation)
    }))
  };
}
