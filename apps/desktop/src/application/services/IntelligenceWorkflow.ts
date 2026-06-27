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
import type { ProductDetail, ReviewEvidence, StoreProfile } from "../../domain/models.js";

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

    const selectedProducts = topSales.products.length > 0 ? topSales.products : relevance.products;
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
}
