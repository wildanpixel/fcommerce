import type { Prisma, PrismaClient } from "@prisma/client";
import { access, readFile } from "node:fs/promises";
import type {
  CollectionState,
  BulkReportFormat,
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
import { DEFAULT_REPORT_SECTIONS, type ReportSectionConfig } from "../../shared/reportSections.js";
import {
  normalizeStoreType,
  STORE_TYPE_IMAGES,
  storeTypeFromCapturedProductHtml,
  type StoreType
} from "../../shared/storeTypes.js";
import { LocalSecretStore } from "../security/LocalSecretStore.js";
import { getPlatformService } from "../platform/PlatformService.js";
import { mergeStoreRatingBuckets } from "../../shared/storeRatingPersistence.js";

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
    reportFilenameTemplate: "{projectName}_{storeType}_{priceRange}_{date}_{time}",
    reportSectionOrder: DEFAULT_REPORT_SECTIONS.map((section) => section.id),
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
        collectionStateJson: JSON.stringify(defaultCollectionState(input.searchFilters)),
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
        take: 500
      }),
      this.db.store.findMany({
        where: { projectId: id },
        orderBy: { createdAt: "asc" },
        take: 50
      }),
      this.db.asset.findMany({
        where: { projectId: id },
        orderBy: { createdAt: "desc" },
        take: 500
      }),
      this.db.review.findMany({
        where: { product: { projectId: id } },
        orderBy: { createdAt: "desc" },
        take: 300
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
    const recoveredStoreTypes = await recoverProductStoreTypes(products);
    return {
      project: toProjectSummary(project),
      products: products.map((product) => ({
        id: product.id,
        title: product.title,
        imageUrl: extractProductImageUrl(product.rawJson),
        storeBadgeImageUrl: extractProductString(product.rawJson, "storeBadgeImageUrl") ??
          (recoveredStoreTypes.get(product.id) ? STORE_TYPE_IMAGES[recoveredStoreTypes.get(product.id)!] : null),
        productType: product.productType,
        storeType: extractProductStoreType(product.rawJson) ?? recoveredStoreTypes.get(product.id) ?? null,
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
        stock: databaseBigIntToNumber(product.stock),
        storeName: product.storeName,
        storeUrl: product.storeUrl,
        voucherText: product.voucherText,
        shippingText: product.shippingText,
        shopVouchers: extractProductStringArray(product.rawJson, "shopVouchers"),
        bundleDeals: extractProductStringArray(product.rawJson, "bundleDeals"),
        promotionCount: extractProductNumber(product.rawJson, "promotionCount"),
        description: product.description,
        descriptionImages: extractProductStringArray(product.rawJson, "descriptionImages"),
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
        marketplaceStoreId: store.marketplaceStoreId,
        storeType: normalizeStoreType(extractProductString(store.rawJson, "storeType")) ?? null,
        name: store.name,
        url: store.url,
        followers: store.followers,
        following: store.following,
        productsCount: store.productsCount,
        rating: store.rating,
        ratingCount: store.ratingCount,
        chatResponse: store.chatResponse,
        joinedDate: store.joinedDate,
        description: extractProductString(store.rawJson, "description"),
        categories: parseJsonArray(store.categoriesJson),
        ratingSamples: extractStoreRatingSamples(store.rawJson),
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
    const products = await this.db.product.findMany({
      where: { projectId: id },
      select: { id: true }
    });
    const productIds = products.map((product) => product.id);
    await this.db.$transaction([
      ...(productIds.length > 0 ? [this.db.review.deleteMany({ where: { productId: { in: productIds } } })] : []),
      this.db.logEntry.deleteMany({ where: { projectId: id } }),
      this.db.researchJob.deleteMany({ where: { projectId: id } }),
      this.db.asset.deleteMany({ where: { projectId: id } }),
      this.db.analysis.deleteMany({ where: { projectId: id } }),
      this.db.report.deleteMany({ where: { projectId: id } }),
      this.db.product.deleteMany({ where: { projectId: id } }),
      this.db.store.deleteMany({ where: { projectId: id } }),
      this.db.project.delete({ where: { id } })
    ]);
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
        stock: toDatabaseBigInt(product.stock),
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
    const stableStoreId = `${projectId}:${store.marketplaceStoreId || store.url}`;
    const existing = await this.db.store.findFirst({
      where: {
        projectId,
        OR: [
          ...(store.marketplaceStoreId ? [{ marketplaceStoreId: store.marketplaceStoreId }] : []),
          { url: store.url }
        ]
      }
    });
    const existingRaw = parseJsonRecord(existing?.rawJson);
    const currentRatingBuckets = extractStoreRatingBuckets(existing?.rawJson);
    const ratingBuckets = mergeStoreRatingBuckets(currentRatingBuckets, store.ratingSamples);
    const mergedRaw = {
      ...existingRaw,
      ...store.raw,
      description: store.description ?? extractProductString(existing?.rawJson, "description"),
      oneStarRatingSamples: ratingBuckets.oneStar,
      fiveStarRatingSamples: ratingBuckets.fiveStar,
      ratingSamples: [...ratingBuckets.oneStar, ...ratingBuckets.fiveStar]
    };
    const saved = await this.db.store.upsert({
      where: {
        id: existing?.id ?? stableStoreId
      },
      create: {
        id: stableStoreId,
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
        rawJson: JSON.stringify(mergedRaw)
      },
      update: {
        marketplaceStoreId: store.marketplaceStoreId ?? existing?.marketplaceStoreId,
        name: store.name || existing?.name,
        url: store.url || existing?.url,
        followers: store.followers ?? existing?.followers,
        following: store.following ?? existing?.following,
        productsCount: store.productsCount ?? existing?.productsCount,
        rating: store.rating ?? existing?.rating,
        ratingCount: store.ratingCount ?? existing?.ratingCount,
        chatResponse: store.chatResponse ?? existing?.chatResponse,
        joinedDate: store.joinedDate ?? existing?.joinedDate,
        categoriesJson: JSON.stringify(mergeUniqueStrings(parseJsonArray(existing?.categoriesJson), store.categories)),
        voucherCount: store.voucherCount ?? existing?.voucherCount,
        voucherTypesJson: JSON.stringify(mergeUniqueStrings(parseJsonArray(existing?.voucherTypesJson), store.voucherTypes)),
        visualThemeJson: JSON.stringify(mergeVisualThemes(parseVisualTheme(existing?.visualThemeJson), store.visualTheme)),
        rawJson: JSON.stringify(mergedRaw)
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
        sectionsJson: JSON.stringify({
          sections: payload.sections,
          formats: payload.formats ?? ["PDF", "HTML"],
          language: payload.language
        }),
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
    const defaults = defaultSettings();
    return {
      ...value,
      exportFolder: await accessibleFolder(value.exportFolder, defaults.exportFolder),
      screenshotFolder: await accessibleFolder(value.screenshotFolder, defaults.screenshotFolder),
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
      concurrency: settings.concurrency,
      reportFilenameTemplate: settings.reportFilenameTemplate,
      reportSectionOrder: settings.reportSectionOrder
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

async function accessibleFolder(value: string, fallback: string): Promise<string> {
  try {
    await access(value);
    return value;
  } catch {
    return fallback;
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

function defaultCollectionState(searchFilters?: NewProjectInput["searchFilters"]): CollectionState {
  return {
    stage: "KEYWORD_GENERAL",
    stageLabel: "Part 1 - Keyword General",
    progressPercent: 0,
    completedStepIds: [],
    stepAssetPaths: {},
    stageCompleted: {},
    searchFilters
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
    searchFilters: parseShopeeSearchFilters(parsed.searchFilters),
    qualifiedProductIds: Array.isArray(parsed.qualifiedProductIds)
      ? parsed.qualifiedProductIds.filter((item): item is string => typeof item === "string").slice(0, 20)
      : undefined,
    qualifiedProductReferences: parseQualifiedProductReferences(parsed.qualifiedProductReferences),
    qualifiedProductsInitialized: parsed.qualifiedProductsInitialized === true || (
      parsed.qualifiedProductsInitialized !== false &&
      Array.isArray(parsed.qualifiedProductIds) &&
      parsed.qualifiedProductIds.length > 0
    ),
    qualifiedProductsApproved: parsed.qualifiedProductsApproved === true,
    storeCollectionCandidates: parseStoreCollectionCandidates(parsed.storeCollectionCandidates),
    storeListInitialized: parsed.storeListInitialized === true,
    storeListApproved: parsed.storeListApproved === true,
    savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : undefined
  };
}

function parseQualifiedProductReferences(value: unknown): CollectionState["qualifiedProductReferences"] {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }
    const record = item as Record<string, unknown>;
    if (typeof record.fallbackIdentity !== "string" || !record.fallbackIdentity.trim()) {
      return [];
    }
    return [{
      productId: typeof record.productId === "string" ? record.productId : undefined,
      productUrl: typeof record.productUrl === "string" ? record.productUrl : undefined,
      fallbackIdentity: record.fallbackIdentity,
      manuallyAdded: record.manuallyAdded === true
    }];
  }).slice(0, 20);
}

function parseShopeeSearchFilters(value: unknown): CollectionState["searchFilters"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const allowed = new Set([
    "service_by_shopee_product_label_filter",
    "OFFICIAL_MALL",
    "PREFERRED_PLUS",
    "PREFERRED"
  ]);
  const shopTypes = Array.isArray(record.shopTypes)
    ? record.shopTypes.filter((item): item is NonNullable<CollectionState["searchFilters"]>["shopTypes"][number] =>
        typeof item === "string" && allowed.has(item)
      )
    : [];
  const priceMin = typeof record.priceMin === "number" && record.priceMin >= 0 ? record.priceMin : undefined;
  const priceMax = typeof record.priceMax === "number" && record.priceMax >= 0 ? record.priceMax : undefined;
  return { shopTypes, priceMin, priceMax };
}

function parseStoreCollectionCandidates(value: unknown): CollectionState["storeCollectionCandidates"] {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }
    const record = item as Record<string, unknown>;
    if (typeof record.id !== "string" || typeof record.storeName !== "string" || typeof record.storeUrl !== "string") {
      return [];
    }
    return [{
      id: record.id,
      storeName: record.storeName,
      storeUrl: record.storeUrl,
      shopId: typeof record.shopId === "string" ? record.shopId : undefined,
      storeType: normalizeStoreType(record.storeType) ?? undefined,
      sourceProductIds: Array.isArray(record.sourceProductIds)
        ? record.sourceProductIds.filter((item): item is string => typeof item === "string").slice(0, 20)
        : undefined,
      includePopularProducts: record.includePopularProducts === true,
      includeShopBanner: record.includeShopBanner === true
    }];
  }).slice(0, 50);
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

function toDatabaseBigInt(value: number | null | undefined): bigint | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return BigInt(Math.trunc(value));
}

function databaseBigIntToNumber(value: bigint | number | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  return Number(value);
}

function toReportSummary(report: ReportWithProject): ReportSummary {
  const metadata = parseReportMetadata(report.sectionsJson);
  return {
    id: report.id,
    projectId: report.projectId,
    projectName: report.project.name,
    templateId: report.templateId,
    status: report.status,
    sections: metadata.sections,
    formats: metadata.formats,
    language: metadata.language,
    docxPath: report.htmlPath && metadata.formats.includes("DOCX")
      ? report.htmlPath.replace(/\.html$/iu, ".docx")
      : null,
    htmlPath: report.htmlPath,
    pdfPath: report.pdfPath,
    generatedAt: report.generatedAt?.toISOString() ?? null,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString()
  };
}

function parseReportMetadata(value: string): {
  sections: ReportSectionConfig[];
  formats: BulkReportFormat[];
  language?: "id-ID" | "en-US" | "zh-CN";
} {
  try {
    const parsed = JSON.parse(value) as unknown;
    const rawSections = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && "sections" in parsed && Array.isArray(parsed.sections)
        ? parsed.sections
        : [];
    const sections = rawSections.filter((section): section is ReportSectionConfig =>
      Boolean(section) &&
      typeof section === "object" &&
      "id" in section &&
      "label" in section &&
      "enabled" in section &&
      "requiredEvidence" in section &&
      typeof (section as ReportSectionConfig).id === "string" &&
      typeof (section as ReportSectionConfig).label === "string" &&
      typeof (section as ReportSectionConfig).enabled === "boolean" &&
      Array.isArray((section as ReportSectionConfig).requiredEvidence)
    );
    const rawFormats = !Array.isArray(parsed) && parsed && typeof parsed === "object" && "formats" in parsed && Array.isArray(parsed.formats)
      ? parsed.formats
      : ["PDF", "HTML"];
    const formats = rawFormats.filter((format): format is BulkReportFormat =>
      format === "DOCX" || format === "PDF" || format === "HTML"
    );
    const language = !Array.isArray(parsed) && parsed && typeof parsed === "object" && "language" in parsed &&
      (parsed.language === "id-ID" || parsed.language === "en-US" || parsed.language === "zh-CN")
      ? parsed.language
      : undefined;
    return {
      sections: sections.length > 0 ? sections : DEFAULT_REPORT_SECTIONS,
      formats: formats.length > 0 ? formats : ["PDF", "HTML"],
      language
    };
  } catch {
    return { sections: DEFAULT_REPORT_SECTIONS, formats: ["PDF", "HTML"] };
  }
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
  const evidencePlan = raw.evidencePlan;
  const productVideos = evidencePlan && typeof evidencePlan === "object" && !Array.isArray(evidencePlan)
    ? (evidencePlan as Record<string, unknown>).productVideos
    : undefined;
  return Array.isArray(productVideos) ? productVideos.filter((video): video is string => typeof video === "string") : [];
}

function extractProductStringArray(rawJson: string, key: string): string[] {
  const raw = parseJsonObject(rawJson);
  const values = raw[key];
  return Array.isArray(values) ? values.filter((value): value is string => typeof value === "string") : [];
}

function extractProductStoreType(rawJson: string): StoreType | undefined {
  const raw = parseJsonObject(rawJson);
  const storeType = raw.storeType;
  return normalizeStoreType(typeof storeType === "string" ? storeType : undefined) ?? undefined;
}

async function recoverProductStoreTypes(
  products: Array<{ id: string; productUrl: string; rawJson: string }>
): Promise<Map<string, StoreType>> {
  const recovered = new Map<string, StoreType>();
  const productsByHtmlPath = new Map<string, Array<{ id: string; productUrl: string }>>();

  for (const product of products) {
    if (extractProductStoreType(product.rawJson)) continue;
    const htmlPath = extractProductString(product.rawJson, "htmlPath");
    if (!htmlPath) continue;
    const group = productsByHtmlPath.get(htmlPath) ?? [];
    group.push({ id: product.id, productUrl: product.productUrl });
    productsByHtmlPath.set(htmlPath, group);
  }

  await Promise.all(Array.from(productsByHtmlPath.entries()).map(async ([htmlPath, groupedProducts]) => {
    const html = await readFile(htmlPath, "utf8").catch(() => "");
    if (!html) return;
    for (const product of groupedProducts) {
      const storeType = storeTypeFromCapturedProductHtml(html, product.productUrl);
      if (storeType) recovered.set(product.id, storeType);
    }
  }));

  return recovered;
}

function extractProductString(rawJson: string | null | undefined, key: string): string | undefined {
  if (!rawJson) {
    return undefined;
  }
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

function parseJsonArray(value?: string | null): string[] {
  if (!value) {
    return [];
  }
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

function parseVisualTheme(value?: string | null): {
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

function parseJsonObject(value?: string | null): Record<string, unknown> {
  if (!value) {
    return {};
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function parseJsonRecord(value?: string | null): Record<string, unknown> {
  return parseJsonObject(value);
}

function extractStoreRatingSamples(value?: string | null): StoreProfile["ratingSamples"] {
  const buckets = extractStoreRatingBuckets(value);
  return [...buckets.oneStar, ...buckets.fiveStar];
}

function extractStoreRatingBuckets(value?: string | null): {
  oneStar: StoreProfile["ratingSamples"];
  fiveStar: StoreProfile["ratingSamples"];
} {
  const raw = parseJsonObject(value);
  const hasBuckets = Array.isArray(raw.oneStarRatingSamples) || Array.isArray(raw.fiveStarRatingSamples);
  if (hasBuckets) {
    return {
      oneStar: parseStoreRatingSampleArray(raw.oneStarRatingSamples).filter((sample) => sample.rating === 1),
      fiveStar: parseStoreRatingSampleArray(raw.fiveStarRatingSamples).filter((sample) => sample.rating === 5)
    };
  }
  const legacy = parseStoreRatingSampleArray(raw.ratingSamples);
  return {
    oneStar: legacy.filter((sample) => sample.rating === 1),
    fiveStar: legacy.filter((sample) => sample.rating === 5)
  };
}

function parseStoreRatingSampleArray(samples: unknown): StoreProfile["ratingSamples"] {
  if (!Array.isArray(samples)) {
    return [];
  }
  return samples
    .filter((sample): sample is Record<string, unknown> => Boolean(sample && typeof sample === "object" && !Array.isArray(sample)))
    .map((sample) => ({
      rating: typeof sample.rating === "number" ? sample.rating : Number(sample.rating),
      reviewer: typeof sample.reviewer === "string" ? sample.reviewer : "",
      reviewerUrl: typeof sample.reviewerUrl === "string" ? sample.reviewerUrl : undefined,
      comment: typeof sample.comment === "string" ? sample.comment : "",
      productTitle: typeof sample.productTitle === "string" ? sample.productTitle : undefined,
      productUrl: typeof sample.productUrl === "string" ? sample.productUrl : undefined,
      productVariation: typeof sample.productVariation === "string" ? sample.productVariation : undefined,
      sellerResponse: typeof sample.sellerResponse === "string" ? sample.sellerResponse : undefined,
      mediaUrls: Array.isArray(sample.mediaUrls)
        ? sample.mediaUrls.filter((item): item is string => typeof item === "string")
        : [],
      capturedAt: typeof sample.capturedAt === "string" ? sample.capturedAt : undefined
    }))
    .filter((sample) => Number.isFinite(sample.rating) && Boolean(sample.comment.trim() || sample.productTitle || sample.sellerResponse || sample.mediaUrls.length));
}

function mergeUniqueStrings(current: string[], incoming: string[]): string[] {
  return [...new Set([...current, ...incoming].map((item) => item.trim()).filter(Boolean))];
}

function mergeVisualThemes(
  current: StoreProfile["visualTheme"],
  incoming: StoreProfile["visualTheme"]
): StoreProfile["visualTheme"] {
  return {
    dominantColors: mergeUniqueStrings(current.dominantColors, incoming.dominantColors),
    typographySignals: mergeUniqueStrings(current.typographySignals, incoming.typographySignals),
    bannerStyle: mergeUniqueStrings(current.bannerStyle, incoming.bannerStyle)
  };
}
