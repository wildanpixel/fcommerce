import type { AIAnalysisService } from "./AIAnalysisService.js";
import type { MarketplaceAdapter } from "../../domain/marketplace/MarketplaceAdapter.js";
import type {
  IntelligenceRepository,
  JobRepository,
  LogRepository,
  MarketplaceAdapterRegistry,
  ProjectRepository
} from "../../domain/repositories.js";
import type { CreateJobPayload, ProjectSummary } from "../../shared/contracts.js";
import type {
  KeywordCollectionResult,
  ProductCard,
  ProductDetail,
  ReviewEvidence,
  StoreProfile
} from "../../domain/models.js";

export type WorkspaceLocator = {
  projectFolder(project: ProjectSummary): Promise<string>;
};

export class IntelligenceWorkflow {
  constructor(
    private readonly adapters: MarketplaceAdapterRegistry,
    private readonly projects: ProjectRepository,
    private readonly jobs: JobRepository,
    private readonly intelligence: IntelligenceRepository,
    private readonly ai: AIAnalysisService,
    private readonly workspace: WorkspaceLocator,
    private readonly logs: LogRepository
  ) {}

  async run(jobId: string, payload: CreateJobPayload): Promise<void> {
    const project = await this.projects.get(payload.projectId);
    if (!project) {
      throw new Error(`Project ${payload.projectId} was not found.`);
    }

    const adapter = this.adapters.get(payload.marketplace);
    const projectFolder = await this.workspace.projectFolder(project);
    const products: ProductDetail[] = [];
    const stores: StoreProfile[] = [];
    const reviews: ReviewEvidence[] = [];
    const screenshotPaths: string[] = [];

    await this.transition(jobId, payload.projectId, "RUNNING", 5, "Keyword job started", {
      keyword: payload.keyword,
      marketplace: payload.marketplace
    });

    const relevance = await adapter.searchKeyword({
      keyword: payload.keyword,
      limit: payload.limit,
      sort: "RELEVANCE",
      projectFolder,
      captureScreenshots: payload.captureScreenshots
    });
    screenshotPaths.push(...relevance.screenshots.map((screenshot) => screenshot.path));
    await this.intelligence.saveScreenshots(
      payload.projectId,
      "JOB",
      jobId,
      relevance.screenshots
    );
    await this.logWarnings(payload.projectId, jobId, adapter, relevance.warnings);
    await this.logSearchSummary(payload.projectId, jobId, "RELEVANCE", relevance);
    await this.jobs.updateStatus(jobId, "RUNNING", 20);

    const topSales = payload.includeTopSales
      ? await adapter.searchKeyword({
          keyword: payload.keyword,
          limit: payload.limit,
          sort: "TOP_SALES",
          projectFolder,
          captureScreenshots: payload.captureScreenshots
        })
      : relevance;
    screenshotPaths.push(...topSales.screenshots.map((screenshot) => screenshot.path));
    if (payload.includeTopSales) {
      await this.intelligence.saveScreenshots(
        payload.projectId,
        "JOB",
        jobId,
        topSales.screenshots
      );
    }
    await this.logWarnings(payload.projectId, jobId, adapter, topSales.warnings);
    await this.logSearchSummary(payload.projectId, jobId, "TOP_SALES", topSales);
    await this.logWarnings(
      payload.projectId,
      jobId,
      adapter,
      payload.includeTopSales ? this.validateTopSalesExtraction(relevance, topSales) : []
    );

    const selectedProducts = selectKeyProducts(relevance, topSales, payload.limit);
    if (selectedProducts.length === 0) {
      const message = "Shopee search produced no browser-readable products from relevance or top-sales extraction.";
      await this.logs.write({
        projectId: payload.projectId,
        jobId,
        level: "ERROR",
        message,
        context: {
          keyword: payload.keyword,
          marketplace: adapter.id,
          relevanceWarnings: relevance.warnings,
          topSalesWarnings: topSales.warnings
        }
      });
      throw new Error(message);
    }
    const denominator = Math.max(selectedProducts.length, 1);

    for (const [index, product] of selectedProducts.entries()) {
      await this.logs.write({
        projectId: payload.projectId,
        jobId,
        level: "INFO",
        message: `Collecting product ${index + 1} of ${selectedProducts.length}`,
        context: { title: product.title, url: product.url }
      });

      const detail = await adapter.collectProduct({
        product,
        projectFolder,
        collectReviews: payload.collectReviews,
        captureScreenshots: payload.captureScreenshots
      });
      products.push(detail.detail);
      reviews.push(...detail.reviews);
      screenshotPaths.push(...detail.screenshots.map((screenshot) => screenshot.path));
      const productId = await this.intelligence.saveProduct(payload.projectId, detail.detail);
      await this.intelligence.saveReviews(productId, detail.reviews);
      await this.intelligence.saveScreenshots(
        payload.projectId,
        "PRODUCT",
        productId,
        detail.screenshots
      );
      await this.logWarnings(payload.projectId, jobId, adapter, detail.warnings);

      if (payload.collectStores && detail.detail.storeUrl) {
        const store = await this.collectStore(adapter, payload, jobId, projectFolder, detail.detail.storeUrl);
        stores.push(store.store);
        screenshotPaths.push(...store.screenshots.map((screenshot) => screenshot.path));
        const storeId = await this.intelligence.saveStore(payload.projectId, store.store);
        await this.intelligence.saveScreenshots(
          payload.projectId,
          "STORE",
          storeId,
          store.screenshots
        );
        await this.logWarnings(payload.projectId, jobId, adapter, store.warnings);
      }

      const progress = 25 + Math.round(((index + 1) / denominator) * 55);
      await this.jobs.updateStatus(jobId, "RUNNING", progress);
    }

    const analysis = await this.ai.analyze({
      projectId: payload.projectId,
      subjectType: "PROJECT",
      keyword: payload.keyword,
      products,
      stores,
      reviews,
      screenshotPaths,
      language: project.language
    });
    await this.intelligence.saveAnalysis(payload.projectId, analysis);
    await this.transition(jobId, payload.projectId, "COMPLETED", 100, "Keyword job completed", {
      products: products.length,
      stores: stores.length,
      reviews: reviews.length
    });
  }

  private async collectStore(
    adapter: MarketplaceAdapter,
    payload: CreateJobPayload,
    jobId: string,
    projectFolder: string,
    storeUrl: string
  ) {
    await this.logs.write({
      projectId: payload.projectId,
      jobId,
      level: "INFO",
      message: "Collecting store profile",
      context: { storeUrl }
    });
    return adapter.collectStore({
      storeUrl,
      projectFolder,
      captureScreenshots: payload.captureScreenshots
    });
  }

  private async transition(
    jobId: string,
    projectId: string,
    status: "RUNNING" | "COMPLETED",
    progress: number,
    message: string,
    context: Record<string, unknown>
  ): Promise<void> {
    await this.jobs.updateStatus(jobId, status, progress);
    await this.logs.write({
      projectId,
      jobId,
      level: "INFO",
      message,
      context
    });
  }

  private async logWarnings(
    projectId: string,
    jobId: string,
    adapter: MarketplaceAdapter,
    warnings: string[]
  ): Promise<void> {
    await Promise.all(
      warnings.map((warning) =>
        this.logs.write({
          projectId,
          jobId,
          level: "WARN",
          message: warning,
          context: { marketplace: adapter.id }
        })
      )
    );
  }

  private async logSearchSummary(
    projectId: string,
    jobId: string,
    sort: "RELEVANCE" | "TOP_SALES",
    result: KeywordCollectionResult
  ): Promise<void> {
    await this.logs.write({
      projectId,
      jobId,
      level: "INFO",
      message: `${sort === "TOP_SALES" ? "Top-sales" : "Relevance"} search extraction completed`,
      context: {
        sort,
        productCount: result.products.length,
        screenshotCount: result.screenshots.length,
        warningCount: result.warnings.length,
        firstProductUrl: result.products[0]?.url,
        sourceSorts: [...new Set(result.products.map((product) => product.raw.sourceSort).filter(Boolean))]
      }
    });
  }

  private validateTopSalesExtraction(
    relevance: KeywordCollectionResult,
    topSales: KeywordCollectionResult
  ): string[] {
    if (topSales.products.length === 0) {
      return [
        "[SHOPEE_TOP_SALES_EMPTY] Top-sales extraction returned no browser-readable products; relevance results were used as fallback."
      ];
    }

    const relevanceUrls = relevance.products.map((product) => product.url);
    const topSalesUrls = topSales.products.map((product) => product.url);
    const comparableLength = Math.min(relevanceUrls.length, topSalesUrls.length);
    const sameOrder =
      comparableLength > 1 &&
      relevanceUrls.slice(0, comparableLength).every((url, index) => url === topSalesUrls[index]);

    if (sameOrder) {
      return [
        "[SHOPEE_TOP_SALES_UNCHANGED] Top-sales results matched relevance ordering; Shopee may have ignored the sort parameter or served a personalized result set."
      ];
    }

    return [];
  }
}

function selectKeyProducts(
  relevance: KeywordCollectionResult,
  topSales: KeywordCollectionResult,
  limit: number
): ProductCard[] {
  const keyed = new Map<string, ProductCard & { relevanceRank?: number; salesRank?: number }>();
  for (const product of relevance.products) {
    keyed.set(product.url, {
      ...product,
      relevanceRank: product.rank,
      source: `Relevance #${product.rank}`
    });
  }
  for (const product of topSales.products) {
    const existing = keyed.get(product.url);
    if (existing) {
      keyed.set(product.url, {
        ...existing,
        monthlySold: product.monthlySold ?? existing.monthlySold,
        totalSold: product.totalSold ?? existing.totalSold,
        rating: product.rating ?? existing.rating,
        reviewCount: product.reviewCount ?? existing.reviewCount,
        salesRank: product.rank,
        source: `Relevance #${existing.relevanceRank ?? existing.rank} / Top Sales #${product.rank}`
      });
      continue;
    }
    keyed.set(product.url, {
      ...product,
      salesRank: product.rank,
      source: `Top Sales #${product.rank}`
    });
  }

  return [...keyed.values()]
    .sort((left, right) => productPriority(left) - productPriority(right))
    .slice(0, Math.min(Math.max(limit, 1), 12))
    .map((product, index, all) => ({
      ...product,
      rank: index + 1,
      selectionReason: selectionReason(product, all)
    }));
}

function productPriority(product: ProductCard & { relevanceRank?: number; salesRank?: number }): number {
  const relevanceScore = product.relevanceRank ? product.relevanceRank * 1.1 : 999;
  const salesScore = product.salesRank ? product.salesRank : 999;
  const trustBonus = product.mallStatus || product.officialStatus || product.starSeller ? -2 : 0;
  return Math.min(relevanceScore, salesScore) + trustBonus;
}

function selectionReason(
  product: ProductCard & { relevanceRank?: number; salesRank?: number },
  cohort: ProductCard[]
): string {
  const reasons: string[] = [];
  if (product.relevanceRank) {
    reasons.push("platform recommended");
  }
  if (product.salesRank || product.monthlySold || product.totalSold) {
    reasons.push(product.salesRank && product.salesRank <= 5 ? "best selling" : "sales");
  }
  const prices = cohort.map((item) => item.price.average).filter((value): value is number => Boolean(value));
  if (product.price.average && prices.length > 1) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const span = Math.max(max - min, 1);
    const position = (product.price.average - min) / span;
    if (position <= 0.33) {
      reasons.push("cheap");
    } else if (position >= 0.72) {
      reasons.push("high price");
    } else {
      reasons.push("mid price");
    }
  }
  if (product.imageUrl) {
    reasons.push("strong visual");
  }
  return [...new Set(reasons)].join(" / ") || "platform recommended";
}
