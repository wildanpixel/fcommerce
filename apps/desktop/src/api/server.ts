import http from "node:http";
import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import express, { type Express, type Request, type Response } from "express";
import sharp from "sharp";
import { z } from "zod";
import { DEFAULT_REPORT_SECTIONS } from "../shared/reportSections.js";
import type {
  BrowserOption,
  AndroidApkCandidate,
  AndroidEvidencePayload,
  AndroidInstallPayload,
  AndroidStartPayload,
  AndroidVisibleTextResult,
  CollectionState,
  CreateJobPayload,
  ExtractedPageProduct,
  HtmlSnapshotPayload,
  ManualEvidencePayload,
  ManualFileEvidencePayload,
  NewProjectInput,
  PlatformPayload,
  ReportGenerationPayload,
  ReportHtmlPayload,
  SaveSettingsPayload
} from "../shared/contracts.js";
import type { ProductDetail, ReviewEvidence, StoreProfile } from "../domain/models.js";
import { ProjectService } from "../application/services/ProjectService.js";
import { JobQueue } from "../application/services/JobQueue.js";
import { IntelligenceWorkflow } from "../application/services/IntelligenceWorkflow.js";
import { ReportService } from "../application/services/ReportService.js";
import type { ReportData } from "../application/services/ReportService.js";
import type { AnalysisInput } from "../application/services/AIAnalysisService.js";
import { prisma } from "../infrastructure/db/prismaClient.js";
import { ensureDatabaseSchema } from "../infrastructure/db/bootstrapSql.js";
import {
  PrismaIntelligenceRepository,
  PrismaJobRepository,
  PrismaLogRepository,
  PrismaProjectRepository,
  PrismaReportDataLoader,
  PrismaReportRepository,
  PrismaSettingsRepository
} from "../infrastructure/repositories/PrismaRepositories.js";
import { DefaultMarketplaceRegistry } from "../infrastructure/marketplaces/MarketplaceRegistry.js";
import { CompositeAIAnalysisService } from "../infrastructure/ai/AnalysisProviders.js";
import {
  ConsultingHtmlReportRenderer,
  PrismaReportDataAdapter
} from "../infrastructure/report/HtmlReportRenderer.js";
import { PuppeteerPdfExporter } from "../infrastructure/report/PdfReportExporter.js";
import { ProjectWorkspace, slug } from "../infrastructure/files/ProjectWorkspace.js";
import { BrowserDiscoveryService } from "../infrastructure/browser/BrowserDiscovery.js";
import { getPlatformService } from "../infrastructure/platform/PlatformService.js";
import { NoopUpdateService } from "../application/services/UpdateService.js";
import { AndroidToolingService } from "../infrastructure/android/AndroidToolingService.js";
import { AdbAndroidAutomationAdapter } from "../infrastructure/android/AdbAndroidAutomationAdapter.js";

const marketplaceSchema = z.enum([
  "SHOPEE_ID",
  "TIKTOK_SHOP",
  "TOKOPEDIA",
  "LAZADA",
  "AMAZON",
  "ALIBABA"
]);

const projectSchema = z.object({
  name: z.string().min(2),
  keyword: z.string().min(2),
  marketplace: marketplaceSchema,
  language: z.string().min(2),
  productCategory: z.string().optional(),
  exportFolder: z.string().optional(),
  screenshotFolder: z.string().optional()
});

const jobSchema = z.object({
  projectId: z.string().uuid(),
  keyword: z.string().min(2),
  marketplace: marketplaceSchema,
  limit: z.number().int().min(1).max(50),
  includeTopSales: z.boolean(),
  collectReviews: z.boolean(),
  collectStores: z.boolean(),
  captureScreenshots: z.boolean()
});

const settingsSchema = z.object({
  marketplace: marketplaceSchema,
  theme: z.enum(["dark", "light", "system"]),
  browser: z.enum(["chromium", "chrome", "edge", "brave"]),
  exportFolder: z.string().min(1),
  screenshotFolder: z.string().min(1),
  language: z.string().min(2),
  concurrency: z.number().int().min(1).max(5),
  openAiApiKey: z.string().optional(),
  geminiApiKey: z.string().optional()
});

const reportSchema = z.object({
  projectId: z.string().uuid(),
  templateId: z.string().min(2),
  sections: z.array(
    z.object({
      id: z.enum([
        "cover",
        "keywordRelevance",
        "topSales",
        "keyProductTable",
        "productDossiers",
        "reviewEvidence",
        "storeOverview",
        "storeDossiers",
        "visualStyle",
        "crossPlatformEvidence",
        "aiRecommendations"
      ]),
      label: z.string(),
      enabled: z.boolean(),
      requiredEvidence: z.array(z.string())
    })
  )
});

const manualEvidenceKindSchema = z.enum([
  "SEARCH_RESULT",
  "TOP_SALES",
  "PRODUCT_PAGE",
  "PRODUCT_IMAGE",
  "PRODUCT_VIDEO",
  "PRODUCT_DESCRIPTION",
  "REVIEW_SECTION",
  "REVIEW_IMAGE",
  "STORE_HOME",
  "STORE_VOUCHER",
  "STORE_BANNER",
  "STORE_FEATURED_PRODUCTS",
  "STORE_BEST_SELLER",
  "STORE_PROMOTION",
  "SOCIAL_ACCOUNT"
]);

const evidenceOwnerTypeSchema = z.enum(["MANUAL_STEP", "PRODUCT", "STORE", "PROJECT"]);
const collectionStageSchema = z.enum(["KEYWORD_GENERAL", "PRODUCT_DETAILS", "EVALUATION_KEY_STORE"]);

const extractedPageProductSchema = z.object({
  rank: z.number().int().positive(),
  title: z.string().min(1),
  url: z.string().min(1),
  imageUrl: z.string().optional(),
  priceText: z.string().optional(),
  priceAverage: z.number().optional(),
  originalPrice: z.number().optional(),
  discount: z.string().optional(),
  rating: z.number().optional(),
  reviewCount: z.number().int().optional(),
  soldCount: z.number().int().optional(),
  ratingText: z.string().optional(),
  reviewText: z.string().optional(),
  soldText: z.string().optional(),
  productType: z.string().optional(),
  storeType: z.string().optional(),
  storeBadgeImageUrl: z.string().optional(),
  sourcePlacement: z.string().optional(),
  storeName: z.string().optional(),
  storeUrl: z.string().optional(),
  mallStatus: z.boolean().optional(),
  officialStatus: z.boolean().optional(),
  starSeller: z.boolean().optional(),
  rawText: z.string().optional()
});

const manualEvidenceSchema = z.object({
  projectId: z.string().uuid(),
  stepId: z.string().min(2),
  label: z.string().min(2),
  kind: manualEvidenceKindSchema,
  ownerType: evidenceOwnerTypeSchema.optional(),
  ownerId: z.string().optional(),
  sourceUrl: z.string().optional(),
  imageDataUrl: z.string().min(20),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  note: z.string().optional(),
  pageHtml: z.string().optional(),
  visibleText: z.string().optional(),
  pagePdfDataUrl: z.string().optional(),
  extractedProducts: z.array(extractedPageProductSchema).optional(),
  metadata: z.record(z.unknown()).optional()
});

const htmlSnapshotSchema = z.object({
  projectId: z.string().uuid(),
  label: z.string().min(2),
  sourceUrl: z.string().optional(),
  pageHtml: z.string().min(1),
  visibleText: z.string().optional()
});

const collectionStateSchema = z.object({
  stage: collectionStageSchema,
  stageLabel: z.string().min(2),
  progressPercent: z.number().min(0).max(100),
  completedStepIds: z.array(z.string()),
  stepAssetPaths: z.record(z.string()),
  stageCompleted: z.record(z.boolean()).optional(),
  currentStepId: z.string().optional(),
  browserUrl: z.string().optional(),
  viewMode: z.enum(["desktop", "mobile"]).optional(),
  savedAt: z.string().optional()
});

const manualFileEvidenceSchema = z.object({
  projectId: z.string().uuid(),
  stepId: z.string().min(2),
  label: z.string().min(2),
  kind: manualEvidenceKindSchema,
  ownerType: evidenceOwnerTypeSchema.optional(),
  ownerId: z.string().optional(),
  sourcePath: z.string().min(1),
  sourceUrl: z.string().optional(),
  note: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

const androidStartSchema = z.object({
  avdName: z.string().optional()
});

const androidInstallSchema = z.object({
  apkPath: z.string().min(1)
});

const androidEvidenceSchema = z.object({
  projectId: z.string().uuid(),
  stepId: z.string().min(2),
  label: z.string().min(2),
  kind: manualEvidenceKindSchema,
  note: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export type ApiServer = {
  app: Express;
  server: http.Server;
  port: number;
  close(): Promise<void>;
};

export function createApp(): Express {
  const dependencies = createDependencies();
  const app = express();

  app.use(express.json({ limit: "80mb" }));
  app.use((request, response, next) => {
    response.header("Access-Control-Allow-Origin", request.headers.origin ?? "*");
    response.header("Access-Control-Allow-Headers", "Content-Type");
    response.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    if (request.method === "OPTIONS") {
      response.sendStatus(204);
      return;
    }
    next();
  });

  app.get("/api/health", (_request, response) => {
    response.json({
      ok: true,
      product: "MarketPlace Keyword Competitor Analysis",
      version: process.env.MIO_APP_VERSION ?? "1.0.0"
    });
  });

  app.get("/api/marketplaces", (_request, response) => {
    response.json(dependencies.marketplaces.list());
  });

  app.get("/api/platform", (_request, response) => {
    response.json(toPlatformPayload(dependencies.platform.info));
  });

  app.get("/api/browsers", asyncRoute(async (_request, response) => {
    const browsers = await dependencies.browsers.discover();
    response.json(
      browsers.map(
        (browser): BrowserOption => ({
          id: browser.id,
          name: browser.name,
          available: browser.available,
          profilePath: browser.profilePath,
          fallbackReason: browser.fallbackReason
        })
      )
    );
  }));

  app.get("/api/android/status", asyncRoute(async (_request, response) => {
    response.json(await dependencies.android.status());
  }));

  app.get("/api/android/apk-candidates", asyncRoute(async (_request, response) => {
    response.json(await dependencies.android.findApkCandidates() satisfies AndroidApkCandidate[]);
  }));

  app.post("/api/android/start", asyncRoute(async (request, response) => {
    const input = androidStartSchema.parse(request.body) satisfies AndroidStartPayload;
    await dependencies.android.startEmulator(input.avdName);
    response.json({ ok: true });
  }));

  app.post("/api/android/install", asyncRoute(async (request, response) => {
    const input = androidInstallSchema.parse(request.body) satisfies AndroidInstallPayload;
    await dependencies.android.installApk(input.apkPath);
    response.json({ ok: true });
  }));

  app.post("/api/android/open-tiktok", asyncRoute(async (_request, response) => {
    await dependencies.android.openTikTok();
    response.json({ ok: true });
  }));

  app.post("/api/android/recover-tiktok", asyncRoute(async (_request, response) => {
    await dependencies.android.recoverTikTok();
    response.json({ ok: true });
  }));

  app.get("/api/android/visible-text", asyncRoute(async (_request, response) => {
    const text = await dependencies.androidAdapter.extractVisibleText();
    response.json({ ok: true, text } satisfies AndroidVisibleTextResult);
  }));

  app.get("/api/updates/status", asyncRoute(async (_request, response) => {
    response.json(await dependencies.updates.getStatus());
  }));

  app.post("/api/platform/open-path", asyncRoute(async (request, response) => {
    const input = z.object({ path: z.string().min(1) }).parse(request.body);
    await dependencies.platform.openPath(input.path);
    response.json({ ok: true });
  }));

  app.post("/api/platform/open-url", asyncRoute(async (request, response) => {
    const input = z.object({ url: z.string().url() }).parse(request.body);
    await dependencies.platform.openExternal(input.url);
    response.json({ ok: true });
  }));

  app.get("/api/dashboard", asyncRoute(async (_request, response) => {
    response.json(await dependencies.projects.dashboard());
  }));

  app.get("/api/projects/:id/detail", asyncRoute(async (request, response) => {
    const input = z.object({ id: z.string().uuid() }).parse(request.params);
    await repairMissingProductStoresFromCapturedHtml(input.id);
    const detail = await dependencies.projectRepository.getDetail(input.id);
    if (!detail) {
      response.status(404).json({ error: "Project not found" });
      return;
    }
    response.json(detail);
  }));

  app.put("/api/projects/:id/collection-state", asyncRoute(async (request, response) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const input = collectionStateSchema.parse(request.body);
    const existing = await dependencies.projectRepository.get(params.id);
    if (!existing) {
      response.status(404).json({ error: "Project not found" });
      return;
    }
    const state: CollectionState = {
      stage: input.stage,
      stageLabel: input.stageLabel,
      progressPercent: input.progressPercent,
      completedStepIds: input.completedStepIds,
      stepAssetPaths: input.stepAssetPaths,
      stageCompleted: {
        KEYWORD_GENERAL: input.stageCompleted?.KEYWORD_GENERAL === true,
        PRODUCT_DETAILS: input.stageCompleted?.PRODUCT_DETAILS === true,
        EVALUATION_KEY_STORE: input.stageCompleted?.EVALUATION_KEY_STORE === true
      },
      currentStepId: input.currentStepId,
      browserUrl: input.browserUrl,
      viewMode: input.viewMode,
      savedAt: input.savedAt ?? new Date().toISOString()
    };
    response.json(await dependencies.projectRepository.updateCollectionState(params.id, state));
  }));

  app.post("/api/projects/:id/analyze", asyncRoute(async (request, response) => {
    const input = z.object({ id: z.string().uuid() }).parse(request.params);
    const project = await dependencies.projectRepository.get(input.id);
    if (!project) {
      response.status(404).json({ error: "Project not found" });
      return;
    }
    const data = await dependencies.reportDataLoader.load(input.id);
    const analysis = await dependencies.ai.analyze(toAnalysisInput(data));
    const analysisId = await dependencies.intelligenceRepository.saveAnalysis(input.id, analysis);
    await dependencies.logRepository.write({
      projectId: input.id,
      level: "INFO",
      message: "AI key-store evaluation generated.",
      context: {
        analysisId,
        provider: analysis.provider,
        confidence: analysis.confidence
      }
    });
    response.status(201).json({ ok: true, analysisId, provider: analysis.provider });
  }));

  app.post("/api/projects", asyncRoute(async (request, response) => {
    const input = projectSchema.parse(request.body) satisfies NewProjectInput;
    response.status(201).json(await dependencies.projects.createProject(input));
  }));

  app.delete("/api/projects/:id", asyncRoute(async (request, response) => {
    const input = z.object({ id: z.string().uuid() }).parse(request.params);
    const detail = await dependencies.projectRepository.getDetail(input.id);
    if (!detail) {
      response.status(404).json({ error: "Project not found" });
      return;
    }
    await dependencies.projectRepository.delete(input.id);
    await safeRemoveFiles([
      ...detail.assets.map((asset) => asset.path),
      ...detail.reports.flatMap((report) => [report.htmlPath, report.pdfPath])
    ]);
    response.json({ ok: true });
  }));

  app.post("/api/manual-evidence", asyncRoute(async (request, response) => {
    const input = manualEvidenceSchema.parse(request.body) satisfies ManualEvidencePayload;
    const project = await dependencies.projectRepository.get(input.projectId);
    if (!project) {
      response.status(404).json({ error: "Project not found" });
      return;
    }

    const image = decodeDataUrl(input.imageDataUrl);
    const projectFolder = await dependencies.workspace.projectFolder(project);
    const evidenceFolder = resolve(projectFolder, "manual-evidence");
    await mkdir(evidenceFolder, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const baseName = `${timestamp}-${slug(input.stepId)}`;
    const processedInput = await localizeManualEvidenceImages(input, evidenceFolder, baseName);
    const assetPath = resolve(evidenceFolder, `${baseName}.png`);
    await writeFile(assetPath, image.buffer);
    const htmlPath = processedInput.pageHtml ? resolve(evidenceFolder, `${baseName}.html`) : undefined;
    const textPath = processedInput.visibleText ? resolve(evidenceFolder, `${baseName}.txt`) : undefined;
    const pdfPath = processedInput.pagePdfDataUrl ? resolve(evidenceFolder, `${baseName}.pdf`) : undefined;
    if (htmlPath && processedInput.pageHtml) {
      await writeFile(htmlPath, processedInput.pageHtml, "utf8");
    }
    if (textPath && processedInput.visibleText) {
      await writeFile(textPath, processedInput.visibleText, "utf8");
    }
    if (pdfPath && processedInput.pagePdfDataUrl) {
      const pdf = decodeDataUrl(processedInput.pagePdfDataUrl);
      await writeFile(pdfPath, pdf.buffer);
    }
    const normalizedEvidence = await persistCapturedPageData(
      dependencies.intelligenceRepository,
      project.id,
      processedInput,
      {
        htmlPath,
        textPath,
        pdfPath
      }
    );
    const evidenceOwnerType = normalizedEvidence.ownerType ?? processedInput.ownerType ?? "MANUAL_STEP";
    const evidenceOwnerId = normalizedEvidence.ownerId ?? processedInput.ownerId ?? processedInput.stepId;

    await dependencies.intelligenceRepository.saveScreenshots(project.id, evidenceOwnerType, evidenceOwnerId, [
      {
        kind: processedInput.kind,
        label: processedInput.label,
        path: assetPath,
        sourceUrl: processedInput.sourceUrl,
        width: processedInput.width,
        height: processedInput.height,
        metadata: {
          source: "guided-manual-collector",
          stepId: processedInput.stepId,
          note: processedInput.note,
          mimeType: image.mimeType,
          htmlPath,
          textPath,
          pdfPath,
          extractedProductCount: normalizedEvidence.extractedProductCount,
          normalizedRecordCount: normalizedEvidence.normalizedRecordCount,
          reviewCount: normalizedEvidence.reviewCount,
          storeId: normalizedEvidence.storeId,
          ...(processedInput.metadata ?? {})
        }
      }
    ]);

    await dependencies.logRepository.write({
      projectId: project.id,
      level: "INFO",
      message: `Manual evidence captured: ${processedInput.label}`,
      context: {
        stepId: processedInput.stepId,
        sourceUrl: processedInput.sourceUrl,
        assetPath
      }
    });

    response.status(201).json({
      ok: true,
      stepId: processedInput.stepId,
      assetPath,
      htmlPath,
      textPath,
      pdfPath,
      extractedProductCount: normalizedEvidence.extractedProductCount
    });
  }));

  app.post("/api/html-snapshot", asyncRoute(async (request, response) => {
    const input = htmlSnapshotSchema.parse(request.body) satisfies HtmlSnapshotPayload;
    const project = await dependencies.projectRepository.get(input.projectId);
    if (!project) {
      response.status(404).json({ error: "Project not found" });
      return;
    }

    const projectFolder = await dependencies.workspace.projectFolder(project);
    const evidenceFolder = resolve(projectFolder, "manual-evidence");
    await mkdir(evidenceFolder, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const baseName = `${timestamp}-${slug(input.label)}`;
    const htmlPath = resolve(evidenceFolder, `${baseName}.html`);
    const textPath = input.visibleText ? resolve(evidenceFolder, `${baseName}.txt`) : undefined;

    await writeFile(htmlPath, input.pageHtml, "utf8");
    if (textPath && input.visibleText) {
      await writeFile(textPath, input.visibleText, "utf8");
    }

    await dependencies.logRepository.write({
      projectId: project.id,
      level: "INFO",
      message: "Browser HTML snapshot saved",
      context: {
        sourceUrl: input.sourceUrl,
        htmlPath,
        textPath
      }
    });

    response.status(201).json({
      ok: true,
      projectId: project.id,
      htmlPath,
      textPath
    });
  }));

  app.post("/api/manual-file-evidence", asyncRoute(async (request, response) => {
    const input = manualFileEvidenceSchema.parse(request.body) satisfies ManualFileEvidencePayload;
    const project = await dependencies.projectRepository.get(input.projectId);
    if (!project) {
      response.status(404).json({ error: "Project not found" });
      return;
    }

    const sourcePath = resolve(input.sourcePath);
    const sourceStat = await stat(sourcePath).catch(() => undefined);
    if (!sourceStat?.isFile()) {
      response.status(400).json({ error: "Selected evidence file was not found." });
      return;
    }
    const mimeType = imageMimeType(sourcePath);
    if (!mimeType) {
      response.status(400).json({ error: "Manual evidence file must be a PNG, JPG, JPEG, or WebP image." });
      return;
    }

    const projectFolder = await dependencies.workspace.projectFolder(project);
    const evidenceFolder = resolve(projectFolder, "manual-evidence");
    await mkdir(evidenceFolder, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const assetPath = resolve(evidenceFolder, `${timestamp}-${slug(input.stepId)}${extname(sourcePath).toLowerCase()}`);
    await copyFile(sourcePath, assetPath);

    await dependencies.intelligenceRepository.saveScreenshots(project.id, input.ownerType ?? "MANUAL_STEP", input.ownerId ?? input.stepId, [
      {
        kind: input.kind,
        label: input.label,
        path: assetPath,
        sourceUrl: input.sourceUrl,
        mimeType,
        metadata: {
          source: "manual-file-evidence",
          sourcePath,
          stepId: input.stepId,
          note: input.note,
          ...(input.metadata ?? {})
        }
      }
    ]);

    await dependencies.logRepository.write({
      projectId: project.id,
      level: "INFO",
      message: `Manual screenshot attached: ${input.label}`,
      context: {
        stepId: input.stepId,
        sourcePath,
        assetPath
      }
    });

    response.status(201).json({ ok: true, stepId: input.stepId, assetPath });
  }));

  app.post("/api/android/capture-evidence", asyncRoute(async (request, response) => {
    const input = androidEvidenceSchema.parse(request.body) satisfies AndroidEvidencePayload;
    const project = await dependencies.projectRepository.get(input.projectId);
    if (!project) {
      response.status(404).json({ error: "Project not found" });
      return;
    }

    const projectFolder = await dependencies.workspace.projectFolder(project);
    const evidenceFolder = resolve(projectFolder, "android-evidence");
    const assetPath = await dependencies.android.captureScreenshot(evidenceFolder, input.label);
    const visibleText = await dependencies.android.extractVisibleText().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Android visible text extraction failed.";
      return `Visible text unavailable: ${message}`;
    });
    await dependencies.intelligenceRepository.saveScreenshots(project.id, "ANDROID_STEP", input.stepId, [
      {
        kind: input.kind,
        label: input.label,
        path: assetPath,
        sourceUrl: "android://emulator",
        metadata: {
          source: "android-emulator",
          stepId: input.stepId,
          note: input.note,
          visibleText,
          ...(input.metadata ?? {})
        }
      }
    ]);
    await dependencies.logRepository.write({
      projectId: project.id,
      level: "INFO",
      message: `Android evidence captured: ${input.label}`,
      context: {
        stepId: input.stepId,
        assetPath
      }
    });
    response.status(201).json({ ok: true, stepId: input.stepId, assetPath });
  }));

  app.post("/api/jobs", asyncRoute(async (request, response) => {
    const input = jobSchema.parse(request.body) satisfies CreateJobPayload;
    response.status(202).json(await dependencies.queue.enqueue(input));
  }));

  app.get("/api/settings", asyncRoute(async (_request, response) => {
    response.json(await dependencies.projects.getSettings());
  }));

  app.put("/api/settings", asyncRoute(async (request, response) => {
    const input = settingsSchema.parse(request.body) satisfies SaveSettingsPayload;
    if (input.openAiApiKey) {
      await dependencies.settings.saveSecret("openai", input.openAiApiKey);
    }
    if (input.geminiApiKey) {
      await dependencies.settings.saveSecret("gemini", input.geminiApiKey);
    }
    const saved = await dependencies.settings.save({
      marketplace: input.marketplace,
      theme: input.theme,
      browser: input.browser,
      exportFolder: input.exportFolder,
      screenshotFolder: input.screenshotFolder,
      language: input.language,
      concurrency: input.concurrency,
      openAiKeyConfigured: Boolean(input.openAiApiKey),
      geminiKeyConfigured: Boolean(input.geminiApiKey)
    });
    dependencies.queue.setConcurrency(saved.concurrency);
    response.json(saved);
  }));

  app.get("/api/report-sections", (_request, response) => {
    response.json(DEFAULT_REPORT_SECTIONS);
  });

  app.post("/api/reports", asyncRoute(async (request, response) => {
    const input = reportSchema.parse(request.body) satisfies ReportGenerationPayload;
    response.status(201).json(await dependencies.reports.generate(input));
  }));

  app.get("/api/reports", asyncRoute(async (_request, response) => {
    response.json(await dependencies.reportRepository.list());
  }));

  app.get("/api/reports/:id/html", asyncRoute(async (request, response) => {
    const input = z.object({ id: z.string().uuid() }).parse(request.params);
    const report = await dependencies.reportRepository.get(input.id);
    if (!report?.htmlPath) {
      response.status(404).json({ error: "Report HTML not found" });
      return;
    }
    const html = await readFile(report.htmlPath, "utf8");
    response.json({
      reportId: report.id,
      htmlPath: report.htmlPath,
      html,
      text: htmlToPlainText(html)
    } satisfies ReportHtmlPayload);
  }));

  app.post("/api/reports/:id/docx", asyncRoute(async (request, response) => {
    const input = z.object({ id: z.string().uuid() }).parse(request.params);
    const report = await dependencies.reportRepository.get(input.id);
    if (!report?.htmlPath) {
      response.status(404).json({ error: "Report HTML not found" });
      return;
    }
    const html = await readFile(report.htmlPath, "utf8");
    const docxPath = report.htmlPath.replace(/\.html$/iu, ".docx");
    await writeFile(docxPath, createDocxFromHtml(html));
    response.json({ ok: true, reportId: report.id, docxPath });
  }));

  app.delete("/api/reports/:id", asyncRoute(async (request, response) => {
    const input = z.object({ id: z.string().uuid() }).parse(request.params);
    const deleted = await dependencies.reportRepository.delete(input.id);
    if (!deleted) {
      response.status(404).json({ error: "Report not found" });
      return;
    }
    await safeRemoveFiles([
      deleted.htmlPath,
      deleted.pdfPath,
      deleted.htmlPath ? deleted.htmlPath.replace(/\.html$/iu, ".docx") : undefined
    ]);
    response.json({ ok: true });
  }));

  app.use((error: unknown, _request: Request, response: Response, _next: () => void) => {
    const status = error instanceof z.ZodError ? 400 : 500;
    response.status(status).json({
      error: error instanceof Error ? error.message : "Unexpected server error"
    });
  });

  return app;
}

export async function startApiServer(preferredPort = 4123): Promise<ApiServer> {
  await ensureDatabaseSchema(prisma);
  const app = createApp();
  const server = http.createServer(app);
  const port = await listenOnAvailablePort(server, preferredPort);
  return {
    app,
    server,
    port,
    close: () =>
      new Promise((resolveClose, rejectClose) => {
        server.close((error) => (error ? rejectClose(error) : resolveClose()));
      })
  };
}

function createDependencies() {
  const projectRepository = new PrismaProjectRepository(prisma);
  const jobRepository = new PrismaJobRepository(prisma);
  const intelligenceRepository = new PrismaIntelligenceRepository(prisma);
  const reportRepository = new PrismaReportRepository(prisma);
  const settingsRepository = new PrismaSettingsRepository(prisma);
  const logRepository = new PrismaLogRepository(prisma);
  const marketplaces = new DefaultMarketplaceRegistry(settingsRepository);
  const platform = getPlatformService();
  const browsers = new BrowserDiscoveryService();
  const android = new AndroidToolingService();
  const androidAdapter = new AdbAndroidAutomationAdapter(android);
  const workspace = new ProjectWorkspace();
  const ai = new CompositeAIAnalysisService(settingsRepository);
  const reportDataLoader = new PrismaReportDataLoader(prisma);
  const workflow = new IntelligenceWorkflow(
    marketplaces,
    projectRepository,
    jobRepository,
    intelligenceRepository,
    ai,
    workspace,
    logRepository
  );
  const queue = new JobQueue(jobRepository, workflow, logRepository, 1);
  return {
    platform,
    browsers,
    android,
    androidAdapter,
    marketplaces,
    projectRepository,
    intelligenceRepository,
    logRepository,
    workspace,
    settings: settingsRepository,
    updates: new NoopUpdateService("1.0.0"),
    projects: new ProjectService(projectRepository, jobRepository, settingsRepository),
    queue,
    reports: new ReportService(
      reportRepository,
      new PrismaReportDataAdapter(reportDataLoader),
      new ConsultingHtmlReportRenderer(),
      new PuppeteerPdfExporter(),
      workspace
    ),
    ai,
    reportDataLoader,
    reportRepository
  };
}

function toAnalysisInput(data: ReportData): AnalysisInput {
  return {
    projectId: data.project.id,
    subjectType: "PROJECT",
    keyword: data.project.keyword,
    language: data.project.language,
    screenshotPaths: data.assets
      .filter((asset) => asset.path.toLowerCase().endsWith(".png"))
      .map((asset) => asset.path),
    products: data.products.map((product, index) => ({
      marketplace: "SHOPEE_ID",
      rank: product.rank ?? index + 1,
      source: product.source ?? undefined,
      selectionReason: product.selectionReason ?? undefined,
      title: product.title,
      url: product.productUrl,
      price: {
        average: product.priceAverage ?? undefined,
        currency: "IDR"
      },
      rating: product.rating ?? undefined,
      reviewCount: product.reviewCount ?? undefined,
      monthlySold: product.monthlySold ?? undefined,
      totalSold: product.totalSold ?? undefined,
      storeName: product.storeName ?? undefined,
      storeUrl: product.storeUrl ?? undefined,
      mallStatus: product.mallStatus,
      officialStatus: product.officialStatus,
      starSeller: product.starSeller,
      variants: safeParseJson<string[]>(product.variantsJson, []),
      description: product.description ?? undefined,
      specifications: safeParseJson<Record<string, string>>(product.specificationsJson, {}),
      images: safeParseJson<{ images?: string[]; imageUrl?: string }>(product.rawJson, {}).images ?? [],
      videos: safeParseJson<{ videos?: string[] }>(product.rawJson, {}).videos ?? [],
      raw: safeParseJson<Record<string, unknown>>(product.rawJson, {})
    })),
    stores: data.stores.map((store) => ({
      marketplace: "SHOPEE_ID",
      name: store.name,
      url: store.url,
      followers: store.followers ?? undefined,
      productsCount: store.productsCount ?? undefined,
      rating: store.rating ?? undefined,
      chatResponse: store.chatResponse ?? undefined,
      voucherCount: store.voucherCount ?? undefined,
      categories: [],
      voucherTypes: [],
      featuredProducts: [],
      bestSellers: [],
      visualTheme: safeParseJson<StoreProfile["visualTheme"]>(store.visualThemeJson, {
        dominantColors: [],
        typographySignals: [],
        bannerStyle: []
      }),
      raw: {}
    })),
    reviews: data.reviews.map((review) => ({
      sentiment: review.sentiment === "NEGATIVE" ? "NEGATIVE" : review.sentiment === "POSITIVE" ? "POSITIVE" : "NEUTRAL",
      rating: review.rating ?? undefined,
      comment: review.comment,
      variation: review.variation ?? undefined,
      reviewDate: review.reviewDate ?? undefined,
      mediaUrls: [],
      raw: {}
    }))
  };
}

function safeParseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function htmlToPlainText(html: string): string {
  return decodeHtmlText(html
    .replace(/<script\b[\s\S]*?<\/script>/giu, "")
    .replace(/<style\b[\s\S]*?<\/style>/giu, "")
    .replace(/<\/(?:h1|h2|h3|h4|p|li|tr|details|section|div)>/giu, "\n")
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<[^>]+>/gu, " ")
    .replace(/[ \t\f\v]+/gu, " ")
    .replace(/\n[ \t]+/gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim());
}

function createDocxFromHtml(html: string): Buffer {
  const paragraphs = htmlToPlainText(html)
    .split(/\n{1,}/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 900)
    .map((line) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`)
    .join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs || "<w:p><w:r><w:t>No report content available.</w:t></w:r></w:p>"}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr>
  </w:body>
</w:document>`;
  return createStoredZip([
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
    },
    {
      name: "word/document.xml",
      data: documentXml
    }
  ]);
}

function createStoredZip(entries: Array<{ name: string; data: string | Buffer }>): Buffer {
  const chunks: Buffer[] = [];
  const centralDirectory: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const data = typeof entry.data === "string" ? Buffer.from(entry.data, "utf8") : entry.data;
    const checksum = crc32(data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    chunks.push(localHeader, name, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralDirectory.push(centralHeader, name);
    offset += localHeader.length + name.length + data.length;
  }
  const centralSize = centralDirectory.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...chunks, ...centralDirectory, end]);
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&apos;");
}

async function repairMissingProductStoresFromCapturedHtml(projectId: string): Promise<number> {
  const products = await prisma.product.findMany({
    where: {
      projectId,
      OR: [
        { storeName: null },
        { storeUrl: null }
      ]
    }
  });
  if (products.length === 0) {
    return 0;
  }

  const productsById = new Map(products.map((product) => [product.id, product]));
  const assets = await prisma.asset.findMany({
    where: {
      projectId,
      ownerType: "PRODUCT",
      ownerId: { not: null },
      kind: { in: ["PRODUCT_PAGE", "PRODUCT_DESCRIPTION", "REVIEW_SECTION"] }
    },
    orderBy: { createdAt: "desc" }
  });
  const repairedProductIds = new Set<string>();

  for (const asset of assets) {
    const productId = asset.ownerId;
    if (!productId || repairedProductIds.has(productId)) {
      continue;
    }
    const product = productsById.get(productId);
    if (!product || (product.storeName && product.storeUrl)) {
      continue;
    }
    const metadata = safeParseJson<Record<string, unknown>>(asset.metadataJson, {});
    const htmlPath = typeof metadata.htmlPath === "string" ? metadata.htmlPath : undefined;
    if (!htmlPath) {
      continue;
    }
    const html = await readFile(htmlPath, "utf8").catch(() => undefined);
    if (!html) {
      continue;
    }
    const storeInfo = extractPdpStoreInfoFromHtml(html);
    if (!storeInfo.storeName && !storeInfo.storeUrl && !storeInfo.storeType) {
      continue;
    }
    const currentRaw = safeParseJson<Record<string, unknown>>(product.rawJson, {});
    await prisma.product.update({
      where: { id: product.id },
      data: {
        storeName: product.storeName ?? storeInfo.storeName,
        storeUrl: product.storeUrl ?? storeInfo.storeUrl,
        mallStatus: storeInfo.storeType === "Mall ORI" ? true : product.mallStatus,
        officialStatus: storeInfo.storeType === "Mall ORI" ? true : product.officialStatus,
        starSeller: storeInfo.storeType === "Star" || storeInfo.storeType === "Star+" ? true : product.starSeller,
        rawJson: JSON.stringify({
          ...currentRaw,
          storeType: storeInfo.storeType ?? currentRaw.storeType,
          storeName: product.storeName ?? storeInfo.storeName ?? currentRaw.storeName,
          storeUrl: product.storeUrl ?? storeInfo.storeUrl ?? currentRaw.storeUrl,
          storeRepair: {
            source: "captured-pdp-html",
            assetId: asset.id,
            htmlPath,
            repairedAt: new Date().toISOString()
          }
        })
      }
    });
    repairedProductIds.add(product.id);
  }

  return repairedProductIds.size;
}

async function localizeManualEvidenceImages(
  input: ManualEvidencePayload,
  evidenceFolder: string,
  baseName: string
): Promise<ManualEvidencePayload> {
  const imageFolder = resolve(evidenceFolder, `${baseName}-images`);
  const products: ExtractedPageProduct[] = [];
  let localizedImageCount = 0;

  for (const [index, product] of (input.extractedProducts ?? []).entries()) {
    if (product.imageUrl && index < 80 && shouldLocalizeImageUrl(product.imageUrl)) {
      const localImageUrl = await downloadImageAsJpeg(product.imageUrl, imageFolder, `${String(index + 1).padStart(2, "0")}-${slug(product.title).slice(0, 48)}`);
      if (localImageUrl) {
        localizedImageCount += 1;
        products.push({
          ...product,
          imageUrl: localImageUrl,
          rawText: [product.rawText, `Original thumbnail: ${product.imageUrl}`].filter(Boolean).join("\n")
        });
        continue;
      }
    }
    products.push(product);
  }

  const structured = readStructuredProductDetail(input.metadata);
  const localizedStructured = structured
    ? {
        ...structured,
        images: await localizeImageArray(structured.images, imageFolder, "product-slide", 24),
        descriptionImages: await localizeImageArray(structured.descriptionImages, imageFolder, "description-image", 24),
        reviewMediaImages: await localizeImageArray(structured.reviewMediaImages, imageFolder, "review-media", 30)
      }
    : undefined;
  if (structured && localizedStructured) {
    localizedImageCount +=
      localizedStructured.images.filter((image, index) => image !== structured.images[index]).length +
      localizedStructured.descriptionImages.filter((image, index) => image !== structured.descriptionImages[index]).length +
      localizedStructured.reviewMediaImages.filter((image, index) => image !== structured.reviewMediaImages[index]).length;
  }

  return {
    ...input,
    extractedProducts: products.length > 0 ? products : input.extractedProducts,
    metadata: {
      ...(input.metadata ?? {}),
      ...(localizedStructured ? { structuredProductDetail: localizedStructured } : {}),
      localizedImageCount
    }
  };
}

async function localizeImageArray(values: string[], folder: string, prefix: string, limit: number): Promise<string[]> {
  const output: string[] = [];
  for (const [index, value] of values.entries()) {
    if (index >= limit || !shouldLocalizeImageUrl(value)) {
      output.push(value);
      continue;
    }
    const localImageUrl = await downloadImageAsJpeg(value, folder, `${prefix}-${String(index + 1).padStart(2, "0")}`);
    output.push(localImageUrl ?? value);
  }
  return output;
}

function shouldLocalizeImageUrl(value: string): boolean {
  return /^https?:\/\//iu.test(value) && /\.webp(?:$|[?#])/iu.test(value);
}

async function downloadImageAsJpeg(imageUrl: string, folder: string, fileName: string): Promise<string | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    await mkdir(folder, { recursive: true });
    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "user-agent": "Mozilla/5.0 Marketplace Intelligence OS"
      }
    });
    if (!response.ok) {
      return undefined;
    }
    const source = Buffer.from(await response.arrayBuffer());
    const outputPath = resolve(folder, `${fileName || "thumbnail"}.jpg`);
    await sharp(source).jpeg({ quality: 88, mozjpeg: true }).toFile(outputPath);
    return pathToFileURL(outputPath).toString();
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

type EvidencePersistenceResult = {
  extractedProductCount: number;
  normalizedRecordCount: number;
  reviewCount?: number;
  storeId?: string;
  ownerType?: "PRODUCT" | "STORE";
  ownerId?: string;
};

type StructuredProductDetail = {
  storeName?: string;
  storeUrl?: string;
  storeType?: string;
  rating?: number;
  ratingText?: string;
  reviewText?: string;
  totalSoldText?: string;
  activeReviewFilter?: string;
  images: string[];
  videos: string[];
  description?: string;
  descriptionImages: string[];
  shopVouchers: string[];
  bundleDeals: string[];
  promotionCount?: number;
  reviews: Array<{
    type: "Positive Reviews" | "Negative Reviews";
    rating: number;
    ratingLabel?: string;
    comment: string;
    reviewDate?: string;
    variation?: string;
  }>;
  reviewMediaImages: string[];
  reviewMediaVideos: string[];
};

async function persistCapturedPageData(
  intelligenceRepository: {
    saveProduct(projectId: string, product: ProductDetail): Promise<string>;
    saveStore(projectId: string, store: StoreProfile): Promise<string>;
    saveReviews(productId: string, reviews: ReviewEvidence[]): Promise<void>;
  },
  projectId: string,
  input: ManualEvidencePayload,
  files: {
    htmlPath?: string;
    textPath?: string;
    pdfPath?: string;
  }
): Promise<EvidencePersistenceResult> {
  const extractedProductCount = await persistExtractedProducts(intelligenceRepository, projectId, input, files);
  const result: EvidencePersistenceResult = {
    extractedProductCount,
    normalizedRecordCount: extractedProductCount
  };

  if (input.ownerType === "PRODUCT" && input.ownerId && isProductEvidenceKind(input.kind)) {
    const product = await prisma.product.findFirst({
      where: {
        id: input.ownerId,
        projectId
      }
    });
    if (product) {
      const enrichment = extractProductEnrichment(input, files, product);
      const currentRaw = safeParseJson<Record<string, unknown>>(product.rawJson, {});
      const currentVariants = safeParseJson<string[]>(product.variantsJson, []);
      const currentSpecifications = safeParseJson<Record<string, string>>(product.specificationsJson, {});
      const mergedImages = mergeUnique([
        ...extractRawImages(currentRaw),
        ...enrichment.images
      ]).slice(0, 9);
      const mergedVideos = mergeUnique([
        ...extractStringArray(currentRaw.videos),
        ...enrichment.videos
      ]).slice(0, 8);
      const mergedReviewMediaImages = mergeUnique([
        ...extractStringArray(currentRaw.reviewMediaImages),
        ...enrichment.reviewMediaImages
      ]).slice(0, 40);
      const mergedReviewMediaVideos = mergeUnique([
        ...extractStringArray(currentRaw.reviewMediaVideos),
        ...enrichment.reviewMediaVideos
      ]).slice(0, 16);
      const mergedDescriptionImages = mergeUnique([
        ...extractStringArray(currentRaw.descriptionImages),
        ...enrichment.descriptionImages
      ]).slice(0, 24);

      await prisma.product.update({
        where: { id: product.id },
        data: {
          title: enrichment.title ?? safeExistingProductTitle(product.title, product.productUrl),
          priceMin: enrichment.priceMin ?? product.priceMin,
          priceMax: enrichment.priceMax ?? product.priceMax,
          priceAverage: enrichment.priceAverage ?? product.priceAverage,
          originalPrice: enrichment.originalPrice ?? product.originalPrice,
          discount: enrichment.discount ?? product.discount,
          rating: enrichment.rating ?? product.rating,
          reviewCount: enrichment.reviewCount ?? product.reviewCount,
          totalSold: enrichment.totalSold ?? product.totalSold,
          storeName: enrichment.storeName ?? product.storeName,
          storeUrl: enrichment.storeUrl ?? product.storeUrl,
          mallStatus: enrichment.storeType === "Mall ORI" ? true : product.mallStatus,
          officialStatus: enrichment.storeType === "Mall ORI" ? true : product.officialStatus,
          starSeller: enrichment.storeType === "Star" || enrichment.storeType === "Star+" ? true : product.starSeller,
          stock: enrichment.stock ?? product.stock,
          voucherText: enrichment.voucherText ?? enrichment.shopVouchers[0] ?? product.voucherText,
          shippingText: enrichment.shippingText ?? product.shippingText,
          variantsJson: JSON.stringify(mergeUnique([...currentVariants, ...enrichment.variants])),
          specificationsJson: JSON.stringify({
            ...currentSpecifications,
            ...enrichment.specifications
          }),
          description: enrichment.description ?? product.description,
          rawJson: JSON.stringify({
            ...currentRaw,
            images: mergedImages,
            videos: mergedVideos,
            descriptionImages: mergedDescriptionImages,
            reviewMediaImages: mergedReviewMediaImages,
            reviewMediaVideos: mergedReviewMediaVideos,
            imageUrl: mergedImages[0] ?? currentRaw.imageUrl,
            ratingText: enrichment.ratingText ?? currentRaw.ratingText,
            reviewText: enrichment.reviewText ?? currentRaw.reviewText,
            totalSoldText: enrichment.totalSoldText ?? currentRaw.totalSoldText,
            storeType: enrichment.storeType ?? currentRaw.storeType,
            monthlySoldText: currentRaw.monthlySoldText,
            shopVouchers: mergeUnique([
              ...extractStringArray(currentRaw.shopVouchers),
              ...enrichment.shopVouchers
            ]),
            bundleDeals: mergeUnique([
              ...extractStringArray(currentRaw.bundleDeals),
              ...enrichment.bundleDeals
            ]),
            promotionCount: enrichment.promotionCount ?? currentRaw.promotionCount,
            evidencePlan: {
              ...(isRecord(currentRaw.evidencePlan) ? currentRaw.evidencePlan : {}),
              latestCaptureKind: input.kind,
              latestCaptureStepId: input.stepId,
              htmlPath: files.htmlPath,
              textPath: files.textPath,
              pdfPath: files.pdfPath,
              capturedAt: new Date().toISOString()
            },
            capturedDetails: mergeUnique([
              ...extractStringArray(currentRaw.capturedDetails),
              input.kind
            ]),
            visibleTextPreview: normalizeEvidenceText(input.visibleText).slice(0, 2400)
          })
        }
      });

      const productDetailAction = productDetailSubAction(input.metadata);
      const shouldSaveProductReviews = input.kind === "REVIEW_SECTION" ||
        (metadataFlag(input.metadata, "syncProductDetail") &&
          (!productDetailAction || productDetailAction === "positive-reviews" || productDetailAction === "negative-reviews"));
      if (shouldSaveProductReviews) {
        const reviews = enrichment.reviews.length > 0
          ? enrichment.reviews
          : productDetailAction === "positive-reviews" || productDetailAction === "negative-reviews"
            ? []
            : parseReviewEvidence(input.visibleText ?? "");
        const existingReviews = await prisma.review.findMany({ where: { productId: product.id } });
        const existingKeys = new Set(existingReviews.map((reviewRow) => reviewDedupeKey({
          sentiment: reviewRow.sentiment as ReviewEvidence["sentiment"],
          rating: reviewRow.rating ?? undefined,
          comment: reviewRow.comment,
          mediaUrls: [],
          raw: {}
        })));
        const newReviews = reviews.filter((reviewItem) => {
          const key = reviewDedupeKey(reviewItem);
          if (existingKeys.has(key)) {
            return false;
          }
          existingKeys.add(key);
          return true;
        });
        await intelligenceRepository.saveReviews(product.id, newReviews);
        result.reviewCount = existingReviews.length + newReviews.length;
      }

      result.normalizedRecordCount += 1;
      result.ownerType = "PRODUCT";
      result.ownerId = product.id;
    }
  }

  if (isStoreEvidenceKind(input.kind)) {
    const store = extractStoreProfile(input, projectId);
    const storeId = await intelligenceRepository.saveStore(projectId, store);
    result.normalizedRecordCount += 1;
    result.storeId = storeId;
    if (input.ownerType === "PRODUCT" && input.ownerId) {
      result.ownerType = "PRODUCT";
      result.ownerId = input.ownerId;
    } else {
      result.ownerType = "STORE";
      result.ownerId = storeId;
    }
  }

  return result;
}

async function persistExtractedProducts(
  intelligenceRepository: {
    saveProduct(projectId: string, product: ProductDetail): Promise<string>;
    saveStore(projectId: string, store: StoreProfile): Promise<string>;
  },
  projectId: string,
  input: ManualEvidencePayload,
  files: {
    htmlPath?: string;
    textPath?: string;
    pdfPath?: string;
  }
): Promise<number> {
  if (!["SEARCH_RESULT", "TOP_SALES"].includes(input.kind) || !input.extractedProducts?.length) {
    return 0;
  }

  const source = input.kind === "TOP_SALES" ? "Top Sales" : "Relevance";
  const uniqueProducts = uniqueExtractedProducts(input.extractedProducts).slice(0, 80);
  const medianPrice = median(uniqueProducts.map((product) => product.priceAverage ?? parsePrice(product.priceText)).filter(isFiniteNumber));

  await prisma.product.deleteMany({
    where: {
      projectId,
      source
    }
  });

  const savedStores = new Set<string>();
  for (const product of uniqueProducts) {
    if (product.storeName && product.storeUrl && !savedStores.has(product.storeUrl)) {
      savedStores.add(product.storeUrl);
      await intelligenceRepository.saveStore(projectId, toStoreProfile(product));
    }
    await intelligenceRepository.saveProduct(
      projectId,
      toProductDetail(product, {
        source,
        stepId: input.stepId,
        sourceUrl: input.sourceUrl,
        htmlPath: files.htmlPath,
        textPath: files.textPath,
        pdfPath: files.pdfPath,
        medianPrice
      })
    );
  }

  return uniqueProducts.length;
}

function uniqueExtractedProducts(products: ExtractedPageProduct[]): ExtractedPageProduct[] {
  const seen = new Set<string>();
  const unique: ExtractedPageProduct[] = [];
  for (const product of products) {
    const key = normalizeUrl(product.url || product.title);
    if (!product.title || !product.url || seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(product);
  }
  return unique.map((product, index) => ({ ...product, rank: product.rank || index + 1 }));
}

function toProductDetail(
  product: ExtractedPageProduct,
  context: {
    source: string;
    stepId: string;
    sourceUrl?: string;
    htmlPath?: string;
    textPath?: string;
    pdfPath?: string;
    medianPrice?: number;
  }
): ProductDetail {
  const priceAverage = product.priceAverage ?? parsePrice(product.priceText);
  return {
    marketplace: "SHOPEE_ID",
    rank: product.rank,
    source: context.source,
    selectionReason: selectionReason(product, context.source, priceAverage, context.medianPrice),
    title: product.title,
    url: normalizeUrl(product.url),
    imageUrl: product.imageUrl,
    price: {
      average: priceAverage,
      original: product.originalPrice,
      currency: "IDR"
    },
    discount: product.discount,
    rating: product.rating,
    reviewCount: product.reviewCount,
    monthlySold: context.source === "Top Sales" ? product.soldCount : undefined,
    totalSold: product.soldCount,
    storeName: product.storeName,
    storeUrl: product.storeUrl ? normalizeUrl(product.storeUrl) : undefined,
    mallStatus: Boolean(product.mallStatus),
    officialStatus: Boolean(product.officialStatus),
    starSeller: Boolean(product.starSeller),
    variants: [],
    specifications: {},
    images: product.imageUrl ? [product.imageUrl] : [],
    videos: [],
    raw: {
      source: "rendered-page-snapshot",
      sourceStepId: context.stepId,
      sourceUrl: context.sourceUrl,
      sourcePlacement: product.sourcePlacement ?? sourcePlacementLabel(product, context.source),
      imageUrl: product.imageUrl,
      images: product.imageUrl ? [product.imageUrl] : [],
      productType: product.productType,
      storeType: normalizeStoreType(product.storeType),
      storeBadgeImageUrl: product.storeBadgeImageUrl,
      ratingText: product.ratingText,
      reviewText: product.reviewText,
      soldText: product.soldText,
      monthlySoldText: context.source === "Top Sales" ? product.soldText : undefined,
      totalSoldText: product.soldText,
      htmlPath: context.htmlPath,
      textPath: context.textPath,
      pdfPath: context.pdfPath,
      rawText: product.rawText,
      priceText: product.priceText
    }
  };
}

function sourcePlacementLabel(product: ExtractedPageProduct, source: string): string {
  const prefix = source === "Top Sales" ? "Top" : "Relevance";
  const placement = product.sourcePlacement ?? String(product.rank || 1);
  return /^(Top|Relevance)\s+/iu.test(placement) ? placement : `${prefix} ${placement}`;
}

function toStoreProfile(product: ExtractedPageProduct): StoreProfile {
  return {
    marketplace: "SHOPEE_ID",
    name: product.storeName ?? "Unknown Shopee Store",
    url: normalizeUrl(product.storeUrl ?? product.url),
    categories: [],
    voucherTypes: [],
    featuredProducts: [],
    bestSellers: [],
    visualTheme: {
      dominantColors: [],
      typographySignals: [],
      bannerStyle: []
    },
    raw: {
      source: "rendered-page-snapshot",
      productTitle: product.title
    }
  };
}

function isProductEvidenceKind(kind: ManualEvidencePayload["kind"]): boolean {
  return [
    "PRODUCT_PAGE",
    "PRODUCT_IMAGE",
    "PRODUCT_VIDEO",
    "PRODUCT_DESCRIPTION",
    "REVIEW_SECTION",
    "REVIEW_IMAGE"
  ].includes(kind);
}

function isStoreEvidenceKind(kind: ManualEvidencePayload["kind"]): boolean {
  return [
    "STORE_HOME",
    "STORE_VOUCHER",
    "STORE_BANNER",
    "STORE_FEATURED_PRODUCTS",
    "STORE_BEST_SELLER",
    "STORE_PROMOTION"
  ].includes(kind);
}

function extractProductEnrichment(
  input: ManualEvidencePayload,
  files: {
    htmlPath?: string;
    textPath?: string;
    pdfPath?: string;
  },
  product: {
    title: string;
    productUrl: string;
    mallStatus?: boolean | null;
    officialStatus?: boolean | null;
    starSeller?: boolean | null;
  }
): {
  title?: string;
  priceMin?: number;
  priceMax?: number;
  priceAverage?: number;
  originalPrice?: number;
  discount?: string;
  rating?: number;
  reviewCount?: number;
  totalSold?: number;
  stock?: number;
  voucherText?: string;
  shippingText?: string;
  variants: string[];
  specifications: Record<string, string>;
  description?: string;
  descriptionImages: string[];
  images: string[];
  videos: string[];
  reviewMediaImages: string[];
  reviewMediaVideos: string[];
  reviews: ReviewEvidence[];
  storeName?: string;
  storeUrl?: string;
  storeType?: string;
  shopVouchers: string[];
  bundleDeals: string[];
  promotionCount?: number;
  ratingText?: string;
  reviewText?: string;
  totalSoldText?: string;
} {
  const text = normalizeEvidenceText(input.visibleText);
  const html = input.pageHtml ?? "";
  const structured = readStructuredProductDetail(input.metadata);
  const subAction = productDetailSubAction(input.metadata);
  const collectEverything = !subAction;
  const collectProductMedia = collectEverything || subAction === "slides";
  const collectReviews = collectEverything || subAction === "positive-reviews" || subAction === "negative-reviews";
  const collectReviewMedia = collectEverything || subAction === "media-in-user";
  const collectDescriptionPromotions = collectEverything || subAction === "description-promotions";
  const htmlStoreInfo = extractPdpStoreInfoFromHtml(html);
  const price = extractMoneyRange(text);
  const structuredImages = structured?.images ?? [];
  const structuredVideos = structured?.videos ?? [];
  const images = collectProductMedia
    ? mergeUnique([
        ...structuredImages,
        ...(structuredImages.length > 0 ? [] : extractProductImageUrls(html))
      ]).slice(0, 12)
    : [];
  const videos = collectProductMedia
    ? mergeUnique([
        ...structuredVideos,
        ...(structuredVideos.length > 0 ? [] : extractVideoUrls(html))
      ]).slice(0, 8)
    : [];
  const reviews = collectReviews && structured?.reviews.length
    ? structured.reviews.map(toReviewEvidence)
    : [];
  const shopVouchers = collectDescriptionPromotions
    ? mergeUnique(structured?.shopVouchers ?? extractSectionKeywords(text, ["voucher", "diskon", "cashback"], 8))
    : [];
  const bundleDeals = collectDescriptionPromotions
    ? mergeUnique(structured?.bundleDeals ?? extractSectionKeywords(text, ["bundle deals", "paket hemat", "bundling"], 8))
    : [];
  return {
    title: safeProductTitle(extractHtmlTitle(html) ?? inferTitleFromText(text, product.title), product.title),
    priceMin: price.min,
    priceMax: price.max,
    priceAverage: price.average,
    originalPrice: price.original,
    discount: extractDiscount(text),
    rating: structured?.rating ?? extractRating(text),
    reviewCount: extractCountNear(text, ["ratings", "rating", "reviews", "review", "penilaian", "ulasan"]),
    totalSold: extractCountNear(text, ["sold", "terjual", "dijual"]),
    stock: extractCountNear(text, ["in stock", "stok", "tersedia"]),
    voucherText: findLine(text, ["voucher", "diskon", "gratis ongkir", "cashback"]),
    shippingText: findLine(text, ["shipping", "pengiriman", "ongkir", "garansi", "cod"]),
    variants: extractVariants(text),
    specifications: extractSpecifications(text),
    description: collectDescriptionPromotions ? structured?.description ?? extractDescription(input.kind, text) : undefined,
    descriptionImages: collectDescriptionPromotions ? structured?.descriptionImages ?? [] : [],
    images,
    videos,
    reviewMediaImages: collectReviewMedia ? structured?.reviewMediaImages ?? [] : [],
    reviewMediaVideos: collectReviewMedia ? structured?.reviewMediaVideos ?? [] : [],
    reviews,
    storeName: safeStoreName(structured?.storeName ?? htmlStoreInfo.storeName),
    storeUrl: structured?.storeUrl ? normalizeUrl(structured.storeUrl) : htmlStoreInfo.storeUrl,
    storeType: normalizeStoreType(structured?.storeType ?? htmlStoreInfo.storeType),
    shopVouchers,
    bundleDeals,
    promotionCount: structured?.promotionCount ?? shopVouchers.length + bundleDeals.length,
    ratingText: structured?.ratingText ?? extractRatingTextValue(text),
    reviewText: structured?.reviewText ?? extractReviewTextValue(text),
    totalSoldText: structured?.totalSoldText ?? extractSoldTextValue(text)
  };
}

function extractStoreProfile(input: ManualEvidencePayload, projectId: string): StoreProfile {
  const text = normalizeEvidenceText(input.visibleText);
  const url = normalizeUrl(input.sourceUrl ?? `https://shopee.co.id/store-${projectId}`);
  const storeName = inferStoreName(text, url, input.label);
  const voucherLine = findLine(text, ["voucher", "diskon", "cashback"]);
  return {
    marketplace: "SHOPEE_ID",
    name: storeName,
    url,
    followers: extractCountNear(text, ["followers", "pengikut"]),
    following: extractCountNear(text, ["following", "mengikuti"]),
    productsCount: extractCountNear(text, ["products", "produk"]),
    rating: extractRating(text),
    ratingCount: extractCountNear(text, ["ratings", "penilaian"]),
    chatResponse: findLine(text, ["chat", "response", "respon"]),
    joinedDate: findLine(text, ["joined", "bergabung"]),
    categories: extractSectionKeywords(text, ["kategori", "category"], 8),
    voucherCount: voucherLine ? Math.max(1, countOccurrences(text, /voucher/giu)) : undefined,
    voucherTypes: voucherLine ? mergeUnique(extractSectionKeywords(text, ["voucher", "diskon", "cashback"], 8)) : [],
    featuredProducts: [],
    bestSellers: [],
    visualTheme: extractVisualTheme(text, input.kind),
    raw: {
      source: "guided-manual-collector",
      sourceStepId: input.stepId,
      sourceUrl: input.sourceUrl,
      ownerId: input.ownerId,
      htmlCaptured: Boolean(input.pageHtml),
      textCaptured: Boolean(input.visibleText),
      visibleTextPreview: text.slice(0, 2400)
    }
  };
}

function parseReviewEvidence(text: string): ReviewEvidence[] {
  const normalized = normalizeEvidenceText(text);
  const lines = normalized
    .split(/\n|(?<=[.!?])\s+/u)
    .map((line) => line.trim())
    .filter((line) => line.length >= 24 && line.length <= 420)
    .filter((line) => !/(add to cart|buy now|shipping|voucher|filter|sort|variasi|description)/iu.test(line));

  const positiveWords = /(bagus|suka|sesuai|cepat|mantap|puas|recommended|rekomen|good|love|worth|cantik|rapi|halus|natural)/iu;
  const negativeWords = /(kecewa|rusak|jelek|kurang|lama|bad|tidak sesuai|gagal|patah|lepas|mahal|tipis|buruk)/iu;
  const positive = lines.filter((line) => positiveWords.test(line) && !negativeWords.test(line)).slice(0, 3);
  const negative = lines.filter((line) => negativeWords.test(line)).slice(0, 2);
  const fallback = positive.length + negative.length === 0 ? lines.slice(0, 3) : [];

  return [
    ...positive.map((comment) => review("POSITIVE", 5, comment)),
    ...negative.map((comment) => review("NEGATIVE", 1, comment)),
    ...fallback.map((comment) => review("NEUTRAL", undefined, comment))
  ];
}

function review(sentiment: ReviewEvidence["sentiment"], rating: number | undefined, comment: string): ReviewEvidence {
  return {
    sentiment,
    rating,
    comment,
    mediaUrls: [],
    raw: {
      source: "browser-visible-review-text",
      inferredSentiment: true
    }
  };
}

function readStructuredProductDetail(metadata?: Record<string, unknown>): StructuredProductDetail | undefined {
  const raw = metadata?.structuredProductDetail;
  if (!isRecord(raw)) {
    return undefined;
  }
  const reviews = Array.isArray(raw.reviews)
    ? raw.reviews
        .filter(isRecord)
        .map((reviewItem) => {
          const type: StructuredProductDetail["reviews"][number]["type"] =
            reviewItem.type === "Negative Reviews" ? "Negative Reviews" : "Positive Reviews";
          const rating = typeof reviewItem.rating === "number" && Number.isFinite(reviewItem.rating)
            ? reviewItem.rating
            : type === "Negative Reviews" ? 1 : 5;
          return {
            type,
            rating,
            ratingLabel: typeof reviewItem.ratingLabel === "string" ? reviewItem.ratingLabel : `${rating} Star`,
            comment: typeof reviewItem.comment === "string" ? reviewItem.comment : "",
            reviewDate: typeof reviewItem.reviewDate === "string" ? reviewItem.reviewDate : undefined,
            variation: typeof reviewItem.variation === "string" ? reviewItem.variation : undefined
          };
        })
        .filter((reviewItem) => isStructuredShopeeReviewComment(reviewItem.comment))
    : [];

  return {
    storeName: typeof raw.storeName === "string" && raw.storeName.trim() ? raw.storeName.trim() : undefined,
    storeUrl: typeof raw.storeUrl === "string" && raw.storeUrl.trim() ? raw.storeUrl.trim() : undefined,
    storeType: normalizeStoreType(typeof raw.storeType === "string" ? raw.storeType : undefined),
    rating: typeof raw.rating === "number" && Number.isFinite(raw.rating) && raw.rating >= 1 && raw.rating <= 5 ? raw.rating : undefined,
    ratingText: typeof raw.ratingText === "string" && raw.ratingText.trim() ? raw.ratingText.trim() : undefined,
    reviewText: typeof raw.reviewText === "string" && raw.reviewText.trim() ? raw.reviewText.trim() : undefined,
    totalSoldText: typeof raw.totalSoldText === "string" && raw.totalSoldText.trim() ? raw.totalSoldText.trim() : undefined,
    activeReviewFilter: typeof raw.activeReviewFilter === "string" && raw.activeReviewFilter.trim() ? raw.activeReviewFilter.trim() : undefined,
    images: extractStringArray(raw.images),
    videos: extractStringArray(raw.videos),
    description: typeof raw.description === "string" && raw.description.trim() ? raw.description.trim() : undefined,
    descriptionImages: extractStringArray(raw.descriptionImages),
    shopVouchers: extractStringArray(raw.shopVouchers),
    bundleDeals: extractStringArray(raw.bundleDeals),
    promotionCount: typeof raw.promotionCount === "number" && Number.isFinite(raw.promotionCount) ? raw.promotionCount : undefined,
    reviews,
    reviewMediaImages: extractStringArray(raw.reviewMediaImages),
    reviewMediaVideos: extractStringArray(raw.reviewMediaVideos)
  };
}

function toReviewEvidence(input: StructuredProductDetail["reviews"][number]): ReviewEvidence {
  return {
    sentiment: input.type === "Negative Reviews" ? "NEGATIVE" : "POSITIVE",
    rating: input.rating,
    comment: cleanText(input.comment),
    variation: input.variation ? cleanText(input.variation) : undefined,
    reviewDate: input.reviewDate ? cleanText(input.reviewDate) : undefined,
    mediaUrls: [],
    raw: {
      source: "structured-product-detail",
      type: input.type,
      ratingLabel: input.ratingLabel
    }
  };
}

function isStructuredShopeeReviewComment(comment: string): boolean {
  const value = cleanText(comment);
  return value.length >= 20 &&
    value.length <= 1000 &&
    /\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}(?:\s+\d{1,2}:\d{2})?\b/u.test(value) &&
    !/^https?:\/\//iu.test(value) &&
    !/(product ratings|all\s*\(|semua\s*\(|comments?\s*\(|with media|dengan media|repeat purchase|shop vouchers|bundle deals|barcode|bpom sesuai|dermatologically tested|add to cart|buy now)/iu.test(value);
}

function metadataFlag(metadata: Record<string, unknown> | undefined, key: string): boolean {
  return metadata?.[key] === true;
}

function productDetailSubAction(metadata: Record<string, unknown> | undefined): string | undefined {
  const value = metadata?.productDetailSubAction;
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function normalizeStoreType(value?: string): "Mall ORI" | "Star+" | "Star" | undefined {
  const normalized = String(value ?? "").trim();
  if (/^mall\s*ori$/iu.test(normalized) || /^shopee\s*mall$/iu.test(normalized)) {
    return "Mall ORI";
  }
  if (/^star\s*\+$/iu.test(normalized) || /^starplus$/iu.test(normalized)) {
    return "Star+";
  }
  if (/^star$/iu.test(normalized)) {
    return "Star";
  }
  return undefined;
}

function normalizeStoreTypeFromBadge(value?: string): "Mall ORI" | "Star+" | "Star" | undefined {
  const direct = normalizeStoreType(value);
  if (direct) {
    return direct;
  }
  const normalized = String(value ?? "").toLowerCase();
  if (/mall/iu.test(normalized)) {
    return "Mall ORI";
  }
  if (/star\s*(?:plus|\+)/iu.test(normalized)) {
    return "Star+";
  }
  if (/star/iu.test(normalized)) {
    return "Star";
  }
  return undefined;
}

function reviewDedupeKey(reviewItem: ReviewEvidence): string {
  return [
    reviewItem.sentiment,
    reviewItem.rating ?? "",
    cleanText(reviewItem.comment).toLowerCase().replace(/\s+/gu, " ").slice(0, 240)
  ].join("|");
}

function extractRatingTextValue(text: string): string | undefined {
  const normalized = normalizeEvidenceText(text);
  const firstRatingToken = (value: string): string | undefined => {
    const candidates = Array.from(value.matchAll(/(^|[^\d.,a-z])([1-5](?:[.,]\d)?)(?![\d.,a-z])/giu))
      .map((match) => match[2])
      .filter((candidateValue) => {
        const numeric = Number(candidateValue.replace(",", "."));
        return numeric >= 1 && numeric <= 5;
      });
    return candidates[0];
  };
  const lines = normalized
    .split("\n")
    .map((line) => cleanText(line))
    .filter(Boolean);
  const metricLine = lines.find((line) => /(★|star|bintang)/iu.test(line)) ??
    lines.find((line) => /(sold|terjual)/iu.test(line) && firstRatingToken(line)) ??
    lines.find((line) => /(ratings?|reviews?|penilaian|ulasan)/iu.test(line) && firstRatingToken(line));
  const contextual = metricLine ? firstRatingToken(metricLine) : undefined;
  const candidate = contextual ??
    normalized.match(/(?:rating|bintang|star|penilaian)\s*:?\s*(?:^|[^\d.,a-z])([1-5](?:[.,]\d)?)(?![\d.,a-z])/iu)?.[1] ??
    normalized.match(/(?:^|[^\d.,a-z])([1-5](?:[.,]\d)?)(?![\d.,a-z])\s*(?:\/\s*5|★|star|bintang)/iu)?.[1];
  return candidate ? candidate.replace(".", ",") : undefined;
}

function extractReviewTextValue(text: string): string | undefined {
  const normalized = normalizeEvidenceText(text);
  const match = normalized.match(/([.\d,]+\s*(?:rb|ribu|k|jt|juta|m)?\+?)\s*(reviews?|ulasan|penilaian|ratings?)/iu) ??
    normalized.match(/(reviews?|ulasan|penilaian|ratings?)\s*:?\s*([.\d,]+\s*(?:rb|ribu|k|jt|juta|m)?\+?)/iu);
  if (!match) {
    return undefined;
  }
  const value = match[2] && /reviews?|ulasan|penilaian|ratings?/iu.test(match[1]) ? match[2] : match[1];
  const label = /reviews?|ulasan|penilaian|ratings?/iu.test(match[1]) ? match[1] : match[2];
  return cleanText(`${value} ${label}`);
}

function extractSoldTextValue(text: string): string | undefined {
  const normalized = normalizeEvidenceText(text);
  const match = normalized.match(/([.\d,]+\s*(?:rb|ribu|k|jt|juta|m)?\+?)\s*(terjual|sold)/iu) ??
    normalized.match(/(terjual|sold)\s*:?\s*([.\d,]+\s*(?:rb|ribu|k|jt|juta|m)?\+?)/iu);
  if (!match) {
    return undefined;
  }
  const value = /terjual|sold/iu.test(match[1]) ? match[2] : match[1];
  const label = /terjual|sold/iu.test(match[1]) ? match[1] : match[2];
  return cleanText(`${value} ${label}`);
}

function extractMoneyRange(text: string): {
  min?: number;
  max?: number;
  average?: number;
  original?: number;
} {
  const rangeMatch = /(Rp\s*[\d.]+(?:,\d+)?)\s*[-–]\s*(Rp\s*[\d.]+(?:,\d+)?)/iu.exec(text);
  if (rangeMatch) {
    const min = parsePrice(rangeMatch[1]);
    const max = parsePrice(rangeMatch[2]);
    const allPrices = extractPriceValues(text);
    const original = allPrices.find((value) => max && value > max * 1.15);
    return {
      min,
      max,
      average: min && max ? Math.round((min + max) / 2) : min ?? max,
      original
    };
  }
  const prices = extractPriceValues(text);
  if (prices.length === 0) {
    return {};
  }
  const current = prices[0];
  const original = prices.find((value) => value > current * 1.15);
  return {
    min: current,
    max: current,
    average: current,
    original
  };
}

function extractPriceValues(text: string): number[] {
  return (text.match(/Rp\s*[\d.]+(?:,\d+)?/giu) ?? [])
    .map((value) => parsePrice(value))
    .filter(isFiniteNumber);
}

function extractDiscount(text: string): string | undefined {
  return text.match(/\b\d{1,2}%\s*(?:off|diskon)?\b/iu)?.[0];
}

function extractRating(text: string): number | undefined {
  const ratingText = extractRatingTextValue(text);
  if (!ratingText) {
    return undefined;
  }
  const rating = Number(ratingText.replace(",", "."));
  return rating >= 1 && rating <= 5 ? rating : undefined;
}

function extractCountNear(text: string, labels: string[]): number | undefined {
  for (const label of labels) {
    const after = new RegExp(`([\\d.,]+\\s*(?:rb|k|jt|m)?\\+?)\\s*(?:${escapeRegex(label)})`, "iu").exec(text);
    if (after) {
      return parseMarketplaceCount(after[1]);
    }
    const before = new RegExp(`(?:${escapeRegex(label)})\\s*:?\\s*([\\d.,]+\\s*(?:rb|k|jt|m)?\\+?)`, "iu").exec(text);
    if (before) {
      return parseMarketplaceCount(before[1]);
    }
  }
  return undefined;
}

function parseMarketplaceCount(value: string): number | undefined {
  const normalized = value.toLowerCase().replace(/\+/gu, "").replace(/\s+/gu, "");
  const numeric = Number((normalized.match(/[\d.,]+/u)?.[0] ?? "").replace(/\./gu, "").replace(",", "."));
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  if (normalized.includes("rb") || normalized.includes("k")) {
    return Math.round(numeric * 1000);
  }
  if (normalized.includes("jt") || normalized.includes("m")) {
    return Math.round(numeric * 1000000);
  }
  return Math.round(numeric);
}

function extractHtmlTitle(html: string): string | undefined {
  const title = /<title[^>]*>(?<title>[^<]+)<\/title>/iu.exec(html)?.groups?.title;
  return title ? cleanProductTitleCandidate(cleanText(title).replace(/\s*\|\s*Shopee.*$/iu, "")) : undefined;
}

export function extractPdpStoreInfoFromHtml(html: string): {
  storeName?: string;
  storeUrl?: string;
  storeType?: string;
} {
  if (!html) {
    return {};
  }
  const marker = html.search(/(?:id|class)=["'][^"']*(?:pdp-product-shop|page-product__shop)[^"']*["']/iu);
  if (marker < 0) {
    return {};
  }
  const nextSection = html.slice(marker).search(/<div\s+class=["'][^"']*page-product__content/iu);
  const block = html.slice(marker, marker + (nextSection > 0 ? nextSection : 24000));
  const storeUrl =
    extractHtmlAttribute(block, /<a\b(?=[^>]*\bentryPoint=ShopByPDP\b)[^>]*\bhref=["'](?<value>[^"']+)["'][^>]*>/iu) ??
    extractHtmlAttribute(block, /<a\b(?=[^>]*#product_list\b)[^>]*\bhref=["'](?<value>[^"']+)["'][^>]*>/iu) ??
    extractHtmlAttribute(block, /<a\b(?![^>]*\b(?:chat|cart|checkout|help|report|seller|login|verify|mall)\b)[^>]*\bhref=["'](?<value>\/[^"']+)["'][^>]*>/iu);
  const storeType = normalizeStoreTypeFromBadge(
    extractHtmlAttribute(block, /<img\b(?=[^>]*\balt=["'][^"']*(?:mall|star)[^"']*["'])[^>]*\balt=["'](?<value>[^"']+)["'][^>]*>/iu)
  );
  const candidates = [
    ...extractHtmlClassTextCandidates(block, "fV3TIn"),
    ...extractHtmlClassTextCandidates(block, "shop-name"),
    ...extractHtmlClassTextCandidates(block, "ShopName"),
    ...extractHtmlClassTextCandidates(block, "name"),
    ...extractHtmlSiblingStoreNameCandidates(block),
    ...extractHtmlTextCandidates(block)
  ];
  return {
    storeName: mergeUnique(candidates).map(safeStoreName).find((value): value is string => Boolean(value)),
    storeUrl: storeUrl ? normalizeUrl(storeUrl) : undefined,
    storeType
  };
}

function extractHtmlAttribute(html: string, pattern: RegExp): string | undefined {
  const value = pattern.exec(html)?.groups?.value;
  return value ? decodeHtmlText(value) : undefined;
}

function extractHtmlClassTextCandidates(html: string, classNeedle: string): string[] {
  const candidates: string[] = [];
  const pattern = new RegExp(`<(?:div|span|a)\\b(?=[^>]*\\bclass=["'][^"']*${escapeRegex(classNeedle)}[^"']*["'])[^>]*>(?<value>[\\s\\S]{0,600}?)<\\/(?:div|span|a)>`, "giu");
  for (const match of html.matchAll(pattern)) {
    if (match.groups?.value) {
      candidates.push(htmlToText(match.groups.value));
    }
  }
  return candidates;
}

function extractHtmlSiblingStoreNameCandidates(html: string): string[] {
  const candidates: string[] = [];
  const pattern = /<\/a>\s*<div\b[^>]*>\s*<div\b[^>]*>(?<value>[\s\S]{0,240}?)<\/div>/giu;
  for (const match of html.matchAll(pattern)) {
    if (match.groups?.value) {
      candidates.push(htmlToText(match.groups.value));
    }
  }
  const siblingBlockPattern = /<a\b[^>]*\bhref=["'][^"']+["'][^>]*>[\s\S]{0,2400}?<\/a>\s*(?<block><div\b[\s\S]{0,1800}?<\/div>\s*<\/div>)/giu;
  for (const match of html.matchAll(siblingBlockPattern)) {
    if (!match.groups?.block) {
      continue;
    }
    candidates.push(...extractHtmlTextCandidates(match.groups.block));
    candidates.push(
      ...htmlToText(match.groups.block)
        .split(/\n|\|/u)
        .map((value) => value.trim())
        .filter(Boolean)
    );
  }
  return candidates;
}

function extractHtmlTextCandidates(html: string): string[] {
  const candidates: string[] = [];
  const pattern = /<(?:div|span)\b[^>]*>(?<value>[^<>]{2,160})<\/(?:div|span)>/giu;
  for (const match of html.matchAll(pattern)) {
    if (match.groups?.value) {
      candidates.push(decodeHtmlText(match.groups.value));
    }
  }
  return candidates;
}

function htmlToText(html: string): string {
  return decodeHtmlText(html.replace(/<[^>]+>/gu, "\n"));
}

function decodeHtmlText(value: string): string {
  return cleanText(value
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&quot;/giu, "\"")
    .replace(/&#39;|&apos;/giu, "'")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">"));
}

function inferTitleFromText(text: string, fallback: string): string | undefined {
  const line = text
    .split("\n")
    .map((value) => value.trim())
    .find((value) => value.length > 18 && value.length < 180 && !isBadProductTitle(value) && !/(shopee|search|voucher|shipping)/iu.test(value));
  return line && line.length > fallback.length * 0.5 ? line : undefined;
}

function safeProductTitle(candidate: string | undefined, currentTitle: string): string | undefined {
  const cleaned = cleanProductTitleCandidate(candidate);
  if (!cleaned || isBadProductTitle(cleaned)) {
    return undefined;
  }
  if (isBadProductTitle(currentTitle)) {
    return cleaned;
  }
  return cleaned.length >= Math.max(8, currentTitle.length * 0.35) ? cleaned : undefined;
}

function safeExistingProductTitle(currentTitle: string, productUrl: string): string {
  const cleaned = cleanProductTitleCandidate(currentTitle);
  if (cleaned && !isBadProductTitle(cleaned)) {
    return cleaned;
  }
  const urlTitle = titleFromProductUrl(productUrl);
  return urlTitle ?? "Product detail";
}

function titleFromProductUrl(productUrl: string): string | undefined {
  try {
    const url = new URL(productUrl);
    const slug = decodeURIComponent(url.pathname.split("/").filter(Boolean)[0] ?? "")
      .replace(/[-_]+/gu, " ")
      .trim();
    const cleaned = cleanProductTitleCandidate(slug);
    return cleaned && !isBadProductTitle(cleaned) ? cleaned : undefined;
  } catch {
    return undefined;
  }
}

function cleanProductTitleCandidate(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const cleaned = cleanText(value)
    .replace(/^\s*(title|judul)\s*:?\s*/iu, "")
    .replace(/\s*\|\s*Shopee.*$/iu, "")
    .trim();
  return cleaned && !isBadProductTitle(cleaned) ? cleaned : undefined;
}

function isBadProductTitle(value: string): boolean {
  return /(shopping cart|cart icon|keranjang|add to cart|buy now|favorite|share|seller centre|seller center|notifications?|notifikasi|help|bantuan|report|laporkan)/iu.test(value);
}

function safeStoreName(value: string | undefined): string | undefined {
  const cleaned = value
    ? cleanText(value)
        .replace(/\s+(active|aktif)\b[\s\S]*$/iu, "")
        .replace(/\s+(chat now|view shop|lihat toko|ratings?|penilaian|products?|produk|response|respon|joined|bergabung|followers?|pengikut)\b[\s\S]*$/iu, "")
        .trim()
    : "";
  if (!cleaned || /(chat now|follow|ikuti|active|aktif|online|offline|click here to visit shop|visit shop|view shop|lihat toko|rating|penilaian|followers?|pengikut|products?|produk|response|respon|joined|bergabung|months?|bulan|ago|yang lalu|seller centre|notifications?)/iu.test(cleaned) || /^(mall\s*ori|star\+?|official|resmi)$/iu.test(cleaned)) {
    return undefined;
  }
  return cleaned.slice(0, 120);
}

function extractDescription(kind: ManualEvidencePayload["kind"], text: string): string | undefined {
  if (!text) {
    return undefined;
  }
  if (kind === "PRODUCT_DESCRIPTION") {
    return text.slice(0, 8000);
  }
  const match = /(?:description|deskripsi(?: produk)?)([\s\S]{80,6000}?)(?:reviews?|ulasan|penilaian|media in user|shop homepage|$)/iu.exec(text);
  return match ? cleanText(match[1]).slice(0, 8000) : undefined;
}

function extractVariants(text: string): string[] {
  const lines = text
    .split("\n")
    .map((line) => cleanText(line))
    .filter((line) => line.length >= 2 && line.length <= 48)
    .filter((line) => /(?:variant|variasi|type|tipe|warna|color|curl|mm|n\d{1,2}|#\d{1,2})/iu.test(line))
    .filter((line) => !/(shipping|voucher|sold|rating|review|quantity|stock)/iu.test(line));
  return mergeUnique(lines).slice(0, 24);
}

function extractSpecifications(text: string): Record<string, string> {
  const entries = text
    .split("\n")
    .map((line) => cleanText(line))
    .map((line) => /^([^:：]{2,42})[:：]\s*(.{2,160})$/u.exec(line))
    .filter((match): match is RegExpExecArray => Boolean(match))
    .slice(0, 30)
    .map((match) => [match[1].trim(), match[2].trim()] as const);
  return Object.fromEntries(entries);
}

function extractImageUrls(value: string): string[] {
  const urls = new Set<string>();
  for (const match of value.matchAll(/(?<attr>src|data-src|content|srcset|data-srcset)=["'](?<url>https?:\/\/[^"']+)["']/giu)) {
    if (!match.groups?.url) {
      continue;
    }
    if (/srcset/iu.test(match.groups.attr ?? "")) {
      for (const srcsetUrl of splitSrcsetUrls(match.groups.url)) {
        if (looksLikeImageUrl(srcsetUrl)) {
          urls.add(srcsetUrl.replace(/&amp;/gu, "&"));
        }
      }
      continue;
    }
    if (looksLikeImageUrl(match.groups.url)) {
      urls.add(match.groups.url.replace(/&amp;/gu, "&"));
    }
  }
  for (const match of value.matchAll(/https?:\/\/[^\s"'<>]+/giu)) {
    if (looksLikeImageUrl(match[0])) {
      urls.add(match[0].replace(/&amp;/gu, "&"));
    }
  }
  return Array.from(urls);
}

function extractProductImageUrls(html: string): string[] {
  return extractImageUrls(html).filter((url) => !/(avatar|profile|logo|sprite|favicon|icon)/iu.test(url));
}

function extractVideoUrls(value: string): string[] {
  const urls = new Set<string>();
  for (const match of value.matchAll(/(?:src|data-src)=["'](?<url>https?:\/\/[^"']+\.(?:mp4|webm|m3u8)[^"']*)["']/giu)) {
    if (match.groups?.url) {
      urls.add(match.groups.url.replace(/&amp;/gu, "&"));
    }
  }
  for (const match of value.matchAll(/https?:\/\/[^\s"'<>]+(?:mp4|webm|m3u8)[^\s"'<>]*/giu)) {
    urls.add(match[0].replace(/&amp;/gu, "&"));
  }
  return Array.from(urls);
}

function splitSrcsetUrls(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/u)[0])
    .filter((candidate) => /^https?:\/\//iu.test(candidate));
}

function looksLikeImageUrl(url: string): boolean {
  return /(image|img|susercontent|shopee|cdn|jpg|jpeg|png|webp|file\/)/iu.test(url) && !/(avatar|sprite|logo|favicon)/iu.test(url);
}

function inferStoreName(text: string, url: string, fallback: string): string {
  const line = text
    .split("\n")
    .map((value) => cleanText(value))
    .find((value) => value.length >= 3 && value.length <= 80 && !/(shopee|search|voucher|produk|followers|pengikut|rating)/iu.test(value));
  if (line) {
    return line;
  }
  try {
    const firstPath = new URL(url).pathname.split("/").filter(Boolean)[0];
    if (firstPath) {
      return decodeURIComponent(firstPath).replace(/[-_]/gu, " ");
    }
  } catch {
    // keep fallback below
  }
  return fallback.replace(/store|homepage|products|best-seller|visual|banner/giu, "").trim() || "Shopee Store";
}

function extractSectionKeywords(text: string, labels: string[], limit: number): string[] {
  const lines = text
    .split("\n")
    .map((line) => cleanText(line))
    .filter((line) => line.length >= 3 && line.length <= 80)
    .filter((line) => labels.some((label) => line.toLowerCase().includes(label.toLowerCase())));
  return mergeUnique(lines).slice(0, limit);
}

function extractVisualTheme(text: string, kind: ManualEvidencePayload["kind"]): StoreProfile["visualTheme"] {
  const colorWords = ["pink", "rose", "red", "orange", "yellow", "green", "blue", "purple", "black", "white", "gold", "pastel", "merah", "hijau", "biru", "ungu"];
  const normalized = text.toLowerCase();
  const dominantColors = colorWords.filter((color) => normalized.includes(color)).slice(0, 6);
  return {
    dominantColors,
    typographySignals: extractSectionKeywords(text, ["official", "mall", "star", "promo", "sale", "brand"], 6),
    bannerStyle: [
      kind === "STORE_BANNER" ? "captured store banner" : undefined,
      normalized.includes("promo") ? "promotion-led" : undefined,
      normalized.includes("official") ? "official-store signal" : undefined
    ].filter((value): value is string => Boolean(value))
  };
}

function findLine(text: string, keywords: string[]): string | undefined {
  return text
    .split("\n")
    .map((line) => cleanText(line))
    .find((line) => keywords.some((keyword) => line.toLowerCase().includes(keyword.toLowerCase())));
}

function normalizeEvidenceText(value?: string): string {
  return (value ?? "")
    .split(String.fromCharCode(0)).join("")
    .split(String.fromCharCode(1)).join(" ")
    .replace(/\r\n?/gu, "\n")
    .replace(/[ \t\f\v]+/gu, " ")
    .replace(/\s*\|\s*/gu, "\n")
    .replace(/\n[ \t]+/gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function cleanText(value: string): string {
  return value
    .split(String.fromCharCode(0)).join("")
    .split(String.fromCharCode(1)).join(" ")
    .replace(/\s+/gu, " ")
    .trim();
}

function extractRawImages(raw: Record<string, unknown>): string[] {
  const images = raw.images;
  if (Array.isArray(images)) {
    return images.filter((image): image is string => typeof image === "string");
  }
  return typeof raw.imageUrl === "string" ? [raw.imageUrl] : [];
}

function extractStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mergeUnique(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    output.push(normalized);
  }
  return output;
}

function countOccurrences(text: string, pattern: RegExp): number {
  return Array.from(text.matchAll(pattern)).length;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function selectionReason(
  product: ExtractedPageProduct,
  source: string,
  priceAverage?: number,
  medianPrice?: number
): string {
  const reasons = new Set<string>();
  if (source === "Top Sales") {
    reasons.add("best selling");
  } else {
    reasons.add("platform recommended");
  }
  if (priceAverage && medianPrice) {
    if (priceAverage < medianPrice * 0.78) {
      reasons.add("cheap");
    } else if (priceAverage > medianPrice * 1.28) {
      reasons.add("high price");
    } else {
      reasons.add("mid price");
    }
  }
  if (product.imageUrl) {
    reasons.add("strong visual");
  }
  if ((product.soldCount ?? 0) > 0) {
    reasons.add("sales");
  }
  return Array.from(reasons).join(" / ");
}

function parsePrice(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const matches = value.match(/(?:Rp\s*)?[\d.]+(?:,\d+)?/giu) ?? [];
  const values = matches
    .map((match) => Number(match.replace(/[^\d]/gu, "")))
    .filter((number) => Number.isFinite(number) && number > 0);
  if (values.length === 0) {
    return undefined;
  }
  return Math.round(values.reduce((sum, number) => sum + number, 0) / values.length);
}

function normalizeUrl(value: string): string {
  try {
    return new URL(value, "https://shopee.co.id").toString();
  } catch {
    return value;
  }
}

function median(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function isFiniteNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function decodeDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } {
  const match = /^data:(?<mimeType>[-\w.+/]+);base64,(?<payload>.+)$/u.exec(dataUrl);
  if (!match?.groups) {
    throw new Error("Manual evidence image must be a base64 data URL.");
  }
  return {
    mimeType: match.groups.mimeType,
    buffer: Buffer.from(match.groups.payload, "base64")
  };
}

function toPlatformPayload(info: ReturnType<typeof getPlatformService>["info"]): PlatformPayload {
  return {
    os: info.os,
    isPackaged: info.isPackaged,
    shortcutModifier: info.shortcutModifier,
    directories: info.directories
  };
}

function asyncRoute(
  handler: (request: Request, response: Response) => Promise<void>
): (request: Request, response: Response, next: (error: unknown) => void) => void {
  return (request, response, next) => {
    handler(request, response).catch(next);
  };
}

function listenOnAvailablePort(server: http.Server, preferredPort: number): Promise<number> {
  return new Promise((resolveListen, rejectListen) => {
    const tryPort = (port: number) => {
      const onError = (error: NodeJS.ErrnoException) => {
        server.off("listening", onListening);
        if (error.code === "EADDRINUSE" && port < preferredPort + 20) {
          tryPort(port + 1);
          return;
        }
        rejectListen(error);
      };
      const onListening = () => {
        server.off("error", onError);
        resolveListen(port);
      };
      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(port, "127.0.0.1");
    };
    tryPort(preferredPort);
  });
}

async function safeRemoveFiles(paths: Array<string | null | undefined>): Promise<void> {
  await Promise.all(
    paths
      .filter((value): value is string => Boolean(value))
      .map(async (path) => {
        const resolved = resolve(path);
        const fileStat = await stat(resolved).catch(() => undefined);
        if (!fileStat?.isFile()) {
          return;
        }
        await rm(resolved, { force: true }).catch(() => undefined);
      })
  );
}

function imageMimeType(path: string): string | undefined {
  switch (extname(path).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return undefined;
  }
}
