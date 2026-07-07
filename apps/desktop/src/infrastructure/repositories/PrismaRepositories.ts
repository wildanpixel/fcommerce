import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CollectionState,
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
        collectionStateJson: JSON.stringify(defaultCollectionState()),
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
    const [products, stores, assets, reviews, analyses, reports] = await Promise.all([
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
      this.db.review.findMany({
        where: { product: { projectId: id } },
        orderBy: { createdAt: "desc" },
        take: 120
      }),
      this.db.analysis.findMany({
        where: { projectId: id },
        orderBy: { createdAt: "desc" },
        take: 20
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
        productType: product.productType,
        storeType: extractProductStoreType(product.rawJson),
        sourcePlacement: extractProductSourcePlacement(product.rawJson),
        ratingText: extractProductString(product.rawJson, "ratingText"),
        reviewText: extractProductString(product.rawJson, "reviewText"),
        monthlySoldText: extractProductString(product.rawJson, "monthlySoldText"),
        totalSoldText: extractProductString(product.rawJson, "totalSoldText"),
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
        stock: product.stock,
        storeName: product.storeName,
        storeUrl: product.storeUrl,
        voucherText: product.voucherText,
        shippingText: product.shippingText,
        shopVouchers: extractProductStringArray(product.rawJson, "shopVouchers"),
        bundleDeals: extractProductStringArray(product.rawJson, "bundleDeals"),
        promotionCount: extractProductNumber(product.rawJson, "promotionCount"),
        description: product.description,
        variants: parseJsonArray(product.variantsJson),
        specifications: parseStringRecord(product.specificationsJson),
        images: extractProductImages(product.rawJson),
        videos: extractProductVideos(product.rawJson),
        reviewMediaImages: extractProductStringArray(product.rawJson, "reviewMediaImages"),
        reviewMediaVideos: extractProductStringArray(product.rawJson, "reviewMediaVideos"),
        productUrl: product.productUrl,
        createdAt: product.createdAt.toISOString()
      })),
      stores: stores.map((store) => ({
        id: store.id,
        name: store.name,
        url: store.url,
        followers: store.followers,
        following: store.following,
        productsCount: store.productsCount,
        rating: store.rating,
        ratingCount: store.ratingCount,
        chatResponse: store.chatResponse,
        joinedDate: store.joinedDate,
        categories: parseJsonArray(store.categoriesJson),
        voucherCount: store.voucherCount,
        voucherTypes: parseJsonArray(store.voucherTypesJson),
        visualTheme: parseVisualTheme(store.visualThemeJson),
        createdAt: store.createdAt.toISOString()
      })),
      assets: assets.map(toAssetSummary),
      reviews: reviews.map((review) => ({
        id: review.id,
        productId: review.productId,
        sentiment: review.sentiment,
        rating: review.rating,
        comment: review.comment,
        variation: review.variation,
        reviewDate: review.reviewDate,
        createdAt: review.createdAt.toISOString()
      })),
      analyses: analyses.map((analysis) => ({
        id: analysis.id,
        subjectType: analysis.subjectType,
        subjectId: analysis.subjectId,
        provider: analysis.provider,
        resultJson: analysis.resultJson,
        createdAt: analysis.createdAt.toISOString()
      })),
      reports: reports.map(toReportSummary)
    };
  }

  async updateCollectionState(id: string, state: CollectionState): Promise<ProjectSummary> {
    const project = await this.db.project.update({
      where: { id },
      data: {
        collectionStateJson: JSON.stringify({
          ...state,
          savedAt: state.savedAt ?? new Date().toISOString()
        })
      },
      include: projectInclude
    });
    return toProjectSummary(project);
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
        productType: typeof product.raw.productType === "string" && product.raw.productType.trim()
          ? product.raw.productType
          : inferProductType(product.title),
        priceMin: product.price.min,
        priceMax: product.price.max,
        priceAverage: product.price.average,
        originalPrice: product.price.original,
        discount: product.discount,
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
    collectionState: parseCollectionState(project.collectionStateJson),
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

function defaultCollectionState(): CollectionState {
  return {
    stage: "KEYWORD_GENERAL",
    stageLabel: "Part 1 - Keyword General",
    progressPercent: 0,
    completedStepIds: [],
    stepAssetPaths: {},
    stageCompleted: {}
  };
}

function parseCollectionState(value: string): CollectionState {
  const parsed = parseJsonObject(value);
  const rawStage = parsed.stage;
  const stage = typeof rawStage === "string" && isCollectionStage(rawStage)
    ? rawStage
    : "KEYWORD_GENERAL";
  const completedStepIds = Array.isArray(parsed.completedStepIds)
    ? parsed.completedStepIds.filter((item): item is string => typeof item === "string")
    : [];
  const stepAssetPaths = parseUnknownStringRecord(parsed.stepAssetPaths);
  const stageCompleted = parseStageCompleted(parsed.stageCompleted);
  return {
    stage,
    stageLabel: typeof parsed.stageLabel === "string" ? parsed.stageLabel : collectionStageLabel(stage),
    progressPercent: typeof parsed.progressPercent === "number" ? Math.max(0, Math.min(100, Math.round(parsed.progressPercent))) : 0,
    completedStepIds,
    stepAssetPaths,
    stageCompleted,
    currentStepId: typeof parsed.currentStepId === "string" ? parsed.currentStepId : undefined,
    browserUrl: typeof parsed.browserUrl === "string" ? parsed.browserUrl : undefined,
    viewMode: parsed.viewMode === "mobile" || parsed.viewMode === "desktop" ? parsed.viewMode : undefined,
    savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : undefined
  };
}

function isCollectionStage(value: string): value is CollectionState["stage"] {
  return ["KEYWORD_GENERAL", "PRODUCT_DETAILS", "EVALUATION_KEY_STORE"].includes(value);
}

function collectionStageLabel(stage: CollectionState["stage"]): string {
  switch (stage) {
    case "PRODUCT_DETAILS":
      return "Part 2 - Product Details";
    case "EVALUATION_KEY_STORE":
      return "Part 3 - Evaluation and Key Store";
    case "KEYWORD_GENERAL":
    default:
      return "Part 1 - Keyword General";
  }
}

function parseStageCompleted(value: unknown): Partial<Record<CollectionState["stage"], boolean>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const record = value as Record<string, unknown>;
  return {
    KEYWORD_GENERAL: record.KEYWORD_GENERAL === true,
    PRODUCT_DETAILS: record.PRODUCT_DETAILS === true,
    EVALUATION_KEY_STORE: record.EVALUATION_KEY_STORE === true
  };
}

function parseUnknownStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
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

function extractProductImages(rawJson: string): string[] {
  const raw = parseJsonObject(rawJson);
  const images = raw.images;
  if (Array.isArray(images)) {
    return images.filter((image): image is string => typeof image === "string");
  }
  const imageUrl = raw.imageUrl;
  return typeof imageUrl === "string" ? [imageUrl] : [];
}

function extractProductVideos(rawJson: string): string[] {
  const raw = parseJsonObject(rawJson);
  const videos = raw.videos;
  return Array.isArray(videos) ? videos.filter((video): video is string => typeof video === "string") : [];
}

function extractProductStringArray(rawJson: string, key: string): string[] {
  const raw = parseJsonObject(rawJson);
  const values = raw[key];
  return Array.isArray(values) ? values.filter((value): value is string => typeof value === "string") : [];
}

function extractProductStoreType(rawJson: string): string | undefined {
  const raw = parseJsonObject(rawJson);
  const storeType = raw.storeType;
  return typeof storeType === "string" && storeType.trim() ? storeType : undefined;
}

function extractProductString(rawJson: string, key: string): string | undefined {
  const raw = parseJsonObject(rawJson);
  const value = raw[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function extractProductNumber(rawJson: string, key: string): number | undefined {
  const raw = parseJsonObject(rawJson);
  const value = raw[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function extractProductSourcePlacement(rawJson: string): string | undefined {
  const raw = parseJsonObject(rawJson);
  const sourcePlacement = raw.sourcePlacement;
  return typeof sourcePlacement === "string" && sourcePlacement.trim() ? sourcePlacement : undefined;
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseStringRecord(value: string): Record<string, string> {
  const parsed = parseJsonObject(value);
  return Object.fromEntries(
    Object.entries(parsed)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

function parseVisualTheme(value: string): {
  dominantColors: string[];
  typographySignals: string[];
  bannerStyle: string[];
} {
  const parsed = parseJsonObject(value);
  return {
    dominantColors: Array.isArray(parsed.dominantColors) ? parsed.dominantColors.filter((item): item is string => typeof item === "string") : [],
    typographySignals: Array.isArray(parsed.typographySignals) ? parsed.typographySignals.filter((item): item is string => typeof item === "string") : [],
    bannerStyle: Array.isArray(parsed.bannerStyle) ? parsed.bannerStyle.filter((item): item is string => typeof item === "string") : []
  };
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}
