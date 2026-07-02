import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreateJobPayload,
  JobSummary,
  NewProjectInput,
  ProjectDetailPayload,
  ProjectSummary,
  ReportGenerationPayload,
  ReportSummary,
  SettingsPayload
} from "../../shared/contracts.js";
import type {
  IntelligenceRepository,
  JobRepository,
  LogRepository,
  ProjectRepository,
  ReportRepository,
  SettingsRepository
} from "../../domain/repositories.js";
import type {
  AiAnalysisJson,
  ProductDetail,
  ReviewEvidence,
  ScreenshotEvidence,
  StoreProfile
} from "../../domain/models.js";
import { LocalSecretStore } from "../security/LocalSecretStore.js";
import { getPlatformService } from "../platform/PlatformService.js";

function defaultSettings(): SettingsPayload {
  const directories = getPlatformService().info.directories;
  return {
    marketplace: "SHOPEE_ID",
    theme: "dark",
    browser: "chromium",
    exportFolder: directories.reports,
    screenshotFolder: directories.screenshots,
    language: "id-ID",
    concurrency: 1,
    openAiKeyConfigured: false,
    geminiKeyConfigured: false
  };
}

export class PrismaProjectRepository implements ProjectRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: NewProjectInput): Promise<ProjectSummary> {
    const project = await this.db.project.create({
      data: {
        name: input.name,
        keyword: input.keyword,
        marketplace: input.marketplace,
        language: input.language,
        productCategory: input.productCategory,
        exportFolder: input.exportFolder,
        screenshotFolder: input.screenshotFolder,
        status: "ACTIVE"
      },
      include: projectInclude
    });
    return toProjectSummary(project);
  }

  async list(): Promise<ProjectSummary[]> {
    const projects = await this.db.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: projectInclude
    });
    return projects.map(toProjectSummary);
  }

  async get(id: string): Promise<ProjectSummary | null> {
    const project = await this.db.project.findUnique({
      where: { id },
      include: projectInclude
    });
    return project ? toProjectSummary(project) : null;
  }

  async getDetail(id: string): Promise<ProjectDetailPayload | null> {
    const project = await this.db.project.findUnique({
      where: { id },
      include: projectInclude
    });
    if (!project) {
      return null;
    }
    const [products, stores, assets, reports] = await Promise.all([
      this.db.product.findMany({
        where: { projectId: id },
        orderBy: [{ rank: "asc" }, { createdAt: "asc" }],
        take: 50
      }),
      this.db.store.findMany({
        where: { projectId: id },
        orderBy: { createdAt: "asc" },
        take: 50
      }),
      this.db.asset.findMany({
        where: { projectId: id },
        orderBy: { createdAt: "desc" },
        take: 120
      }),
      this.db.report.findMany({
        where: { projectId: id },
        orderBy: { updatedAt: "desc" },
        include: { project: { select: { name: true } } }
      })
    ]);
    return {
      project: toProjectSummary(project),
      products: products.map((product) => ({
        id: product.id,
        title: product.title,
        imageUrl: extractProductImageUrl(product.rawJson),
        rank: product.rank,
        source: product.source,
        selectionReason: product.selectionReason,
        priceAverage: product.priceAverage,
        originalPrice: product.originalPrice,
        discount: product.discount,
        rating: product.rating,
        reviewCount: product.reviewCount,
        monthlySold: product.monthlySold,
        totalSold: product.totalSold,
        storeName: product.storeName,
        storeUrl: product.storeUrl,
        productUrl: product.productUrl,
        createdAt: product.createdAt.toISOString()
      })),
      stores: stores.map((store) => ({
        id: store.id,
        name: store.name,
        url: store.url,
        followers: store.followers,
        productsCount: store.productsCount,
        rating: store.rating,
        voucherCount: store.voucherCount,
        createdAt: store.createdAt.toISOString()
      })),
      assets: assets.map(toAssetSummary),
      reports: reports.map(toReportSummary)
    };
  }

  async delete(id: string): Promise<void> {
    await this.db.project.delete({ where: { id } });
  }
}

export class PrismaJobRepository implements JobRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(payload: CreateJobPayload): Promise<JobSummary> {
    const job = await this.db.researchJob.create({
      data: {
        projectId: payload.projectId,
        keyword: payload.keyword,
        marketplace: payload.marketplace,
        status: "PENDING",
        progress: 0,
        configJson: JSON.stringify(payload)
      }
    });
    return toJobSummary(job);
  }

  async listRecent(limit: number): Promise<JobSummary[]> {
    const jobs = await this.db.researchJob.findMany({
      orderBy: { updatedAt: "desc" },
      take: limit
    });
    return jobs.map(toJobSummary);
  }

  async get(id: string): Promise<JobSummary | null> {
    const job = await this.db.researchJob.findUnique({ where: { id } });
    return job ? toJobSummary(job) : null;
  }

  async updateStatus(
    id: string,
    status: JobSummary["status"],
    progress: number,
    errorMessage?: string
  ): Promise<JobSummary> {
    const job = await this.db.researchJob.update({
      where: { id },
      data: {
        status,
        progress,
        errorMessage,
        startedAt: status === "RUNNING" ? new Date() : undefined,
        completedAt: ["COMPLETED", "FAILED", "CANCELLED"].includes(status) ? new Date() : undefined
      }
    });
    return toJobSummary(job);
  }
}

export class PrismaIntelligenceRepository implements IntelligenceRepository {
  constructor(private readonly db: PrismaClient) {}

  async saveProduct(projectId: string, product: ProductDetail): Promise<string> {
    const saved = await this.db.product.create({
      data: {
        projectId,
        marketplace: product.marketplace,
        marketplaceProductId: product.marketplaceProductId,
        rank: product.rank,
        source: product.source,
        selectionReason: product.selectionReason,
        title: product.title,
        productType: inferProductType(product.title),
        priceMin: product.price.min,
        priceMax: product.price.max,
        priceAverage: product.price.average,
        originalPrice: product.price.original,
        rating: product.rating,
        reviewCount: product.reviewCount,
        monthlySold: product.monthlySold,
        totalSold: product.totalSold,
        stock: product.stock,
        productUrl: product.url,
        storeName: product.storeName,
        storeUrl: product.storeUrl,
        mallStatus: product.mallStatus,
        officialStatus: product.officialStatus,
        starSeller: product.starSeller,
        voucherText: product.voucherText,
        shippingText: product.shippingText,
        variantsJson: JSON.stringify(product.variants),
        specificationsJson: JSON.stringify(product.specifications),
        description: product.description,
        rawJson: JSON.stringify(product.raw)
      }
    });
    return saved.id;
  }

  async saveStore(projectId: string, store: StoreProfile): Promise<string> {
    const saved = await this.db.store.upsert({
      where: {
        id: `${projectId}:${store.url}`
      },
      create: {
        id: `${projectId}:${store.url}`,
        projectId,
        marketplace: store.marketplace,
        marketplaceStoreId: store.marketplaceStoreId,
        name: store.name,
        url: store.url,
        followers: store.followers,
        following: store.following,
        productsCount: store.productsCount,
        rating: store.rating,
        ratingCount: store.ratingCount,
        chatResponse: store.chatResponse,
        joinedDate: store.joinedDate,
        categoriesJson: JSON.stringify(store.categories),
        voucherCount: store.voucherCount,
        voucherTypesJson: JSON.stringify(store.voucherTypes),
        visualThemeJson: JSON.stringify(store.visualTheme),
        rawJson: JSON.stringify(store.raw)
      },
      update: {
        followers: store.followers,
        following: store.following,
        productsCount: store.productsCount,
        rating: store.rating,
        ratingCount: store.ratingCount,
        chatResponse: store.chatResponse,
        joinedDate: store.joinedDate,
        categoriesJson: JSON.stringify(store.categories),
        voucherCount: store.voucherCount,
        voucherTypesJson: JSON.stringify(store.voucherTypes),
        visualThemeJson: JSON.stringify(store.visualTheme),
        rawJson: JSON.stringify(store.raw)
      }
    });
    return saved.id;
  }

  async saveReviews(productId: string, reviews: ReviewEvidence[]): Promise<void> {
    if (reviews.length === 0) {
      return;
    }
    await this.db.review.createMany({
      data: reviews.map((review) => ({
        productId,
        sentiment: review.sentiment,
        rating: review.rating,
        comment: review.comment,
        variation: review.variation,
        reviewDate: review.reviewDate,
        mediaAssetIdsJson: JSON.stringify(review.mediaUrls),
        rawJson: JSON.stringify(review.raw)
      }))
    });
  }

  async saveScreenshots(
    projectId: string,
    ownerType: string,
    ownerId: string | undefined,
    screenshots: ScreenshotEvidence[]
  ): Promise<void> {
    if (screenshots.length === 0) {
      return;
    }
    await this.db.asset.createMany({
      data: screenshots.map((screenshot) => ({
        projectId,
        ownerType,
        ownerId,
        kind: screenshot.kind,
        label: screenshot.label,
        path: screenshot.path,
        sourceUrl: screenshot.sourceUrl,
        mimeType: screenshot.mimeType ?? "image/png",
        width: screenshot.width,
        height: screenshot.height,
        metadataJson: JSON.stringify(screenshot.metadata ?? {})
      }))
    });
  }

  async saveAnalysis(projectId: string, analysis: AiAnalysisJson): Promise<string> {
    const saved = await this.db.analysis.create({
      data: {
        projectId,
        subjectType: analysis.subjectType,
        subjectId: analysis.subjectId,
        provider: analysis.provider,
        schemaVersion: analysis.schemaVersion,
        resultJson: JSON.stringify(analysis)
      }
    });
    return saved.id;
  }
}

export class PrismaReportRepository implements ReportRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(payload: ReportGenerationPayload): Promise<string> {
    const report = await this.db.report.create({
      data: {
        projectId: payload.projectId,
        templateId: payload.templateId,
        sectionsJson: JSON.stringify(payload.sections),
        status: "DRAFT"
      }
    });
    return report.id;
  }

  async list(): Promise<ReportSummary[]> {
    const reports = await this.db.report.findMany({
      orderBy: { updatedAt: "desc" },
      include: { project: { select: { name: true } } }
    });
    return reports.map(toReportSummary);
  }

  async get(id: string): Promise<ReportSummary | null> {
    const report = await this.db.report.findUnique({
      where: { id },
      include: { project: { select: { name: true } } }
    });
    return report ? toReportSummary(report) : null;
  }

  async delete(id: string): Promise<ReportSummary | null> {
    const report = await this.get(id);
    if (!report) {
      return null;
    }
    await this.db.report.delete({ where: { id } });
    return report;
  }

  async markGenerated(reportId: string, htmlPath: string, pdfPath: string): Promise<void> {
    await this.db.report.update({
      where: { id: reportId },
      data: {
        htmlPath,
        pdfPath,
        status: "GENERATED",
        generatedAt: new Date()
      }
    });
  }

  async markFailed(reportId: string): Promise<void> {
    await this.db.report.update({
      where: { id: reportId },
      data: { status: "FAILED" }
    });
  }
}

export class PrismaSettingsRepository implements SettingsRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly secrets = new LocalSecretStore()
  ) {}

  async get(): Promise<SettingsPayload> {
    const row = await this.db.appSetting.findUnique({ where: { key: "settings" } });
    const value = row
      ? ({ ...defaultSettings(), ...JSON.parse(row.valueJson) } as SettingsPayload)
      : defaultSettings();
    return {
      ...value,
      openAiKeyConfigured: Boolean(await this.secrets.get("openai")),
      geminiKeyConfigured: Boolean(await this.secrets.get("gemini"))
    };
  }

  async save(settings: SettingsPayload): Promise<SettingsPayload> {
    const valueJson = JSON.stringify({
      marketplace: settings.marketplace,
      theme: settings.theme,
      browser: settings.browser,
      exportFolder: settings.exportFolder,
      screenshotFolder: settings.screenshotFolder,
      language: settings.language,
      concurrency: settings.concurrency
    });
    await this.db.appSetting.upsert({
      where: { key: "settings" },
      create: { key: "settings", valueJson },
      update: { valueJson }
    });
    return this.get();
  }

  async saveSecret(name: "openai" | "gemini", value: string): Promise<void> {
    if (value.trim().length > 0) {
      await this.secrets.save(name, value.trim());
    }
  }

  async getSecret(name: "openai" | "gemini"): Promise<string | null> {
    return this.secrets.get(name);
  }
}

export class PrismaLogRepository implements LogRepository {
  constructor(private readonly db: PrismaClient) {}

  async write(input: {
    projectId: string;
    jobId?: string;
    level: "DEBUG" | "INFO" | "WARN" | "ERROR";
    message: string;
    context?: Record<string, unknown>;
  }): Promise<void> {
    await this.db.logEntry.create({
      data: {
        projectId: input.projectId,
        jobId: input.jobId,
        level: input.level,
        message: input.message,
        contextJson: JSON.stringify(input.context ?? {})
      }
    });
  }
}

export class PrismaReportDataLoader {
  constructor(private readonly db: PrismaClient) {}

  async load(projectId: string) {
    const project = await this.db.project.findUniqueOrThrow({ where: { id: projectId } });
    const [products, stores, reviews, assets, analyses] = await Promise.all([
      this.db.product.findMany({ where: { projectId }, orderBy: [{ rank: "asc" }, { createdAt: "asc" }] }),
      this.db.store.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } }),
      this.db.review.findMany({
        where: { product: { projectId } },
        orderBy: { createdAt: "asc" }
      }),
      this.db.asset.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } }),
      this.db.analysis.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } })
    ]);
    return { project, products, stores, reviews, assets, analyses };
  }
}

const projectInclude = {
  _count: {
    select: {
      jobs: true,
      products: true,
      stores: true,
      reports: true
    }
  }
} satisfies Prisma.ProjectInclude;

type ProjectWithCounts = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;
type AssetRecord = Prisma.AssetGetPayload<Record<string, never>>;
type ReportWithProject = Prisma.ReportGetPayload<{
  include: { project: { select: { name: true } } };
}>;

function toProjectSummary(project: ProjectWithCounts): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    keyword: project.keyword,
    marketplace: project.marketplace,
    status: project.status,
    language: project.language,
    productCategory: project.productCategory,
    exportFolder: project.exportFolder,
    screenshotFolder: project.screenshotFolder,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    counts: {
      jobs: project._count.jobs,
      products: project._count.products,
      stores: project._count.stores,
      reports: project._count.reports
    }
  };
}

function toAssetSummary(asset: AssetRecord) {
  return {
    id: asset.id,
    projectId: asset.projectId,
    ownerType: asset.ownerType,
    ownerId: asset.ownerId,
    kind: asset.kind,
    label: asset.label,
    path: asset.path,
    sourceUrl: asset.sourceUrl,
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    metadata: parseJsonObject(asset.metadataJson),
    createdAt: asset.createdAt.toISOString()
  };
}

function toReportSummary(report: ReportWithProject): ReportSummary {
  return {
    id: report.id,
    projectId: report.projectId,
    projectName: report.project.name,
    templateId: report.templateId,
    status: report.status,
    htmlPath: report.htmlPath,
    pdfPath: report.pdfPath,
    generatedAt: report.generatedAt?.toISOString() ?? null,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString()
  };
}

type JobRecord = Prisma.ResearchJobGetPayload<Record<string, never>>;

function toJobSummary(job: JobRecord): JobSummary {
  return {
    id: job.id,
    projectId: job.projectId,
    keyword: job.keyword,
    marketplace: job.marketplace,
    status: job.status,
    progress: job.progress,
    etaSeconds: job.etaSeconds,
    errorMessage: job.errorMessage,
    updatedAt: job.updatedAt.toISOString()
  };
}

function inferProductType(title: string): string {
  const normalized = title.toLowerCase();
  if (normalized.includes("lash") || normalized.includes("bulu mata")) {
    return "false eyelashes";
  }
  return "marketplace product";
}

function extractProductImageUrl(rawJson: string): string | undefined {
  const raw = parseJsonObject(rawJson);
  const imageUrl = raw.imageUrl;
  if (typeof imageUrl === "string") {
    return imageUrl;
  }
  const images = raw.images;
  if (Array.isArray(images) && typeof images[0] === "string") {
    return images[0];
  }
  return undefined;
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}
