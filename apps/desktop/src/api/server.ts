import http from "node:http";
import { copyFile, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import express, { type Express, type Request, type Response } from "express";
import { z } from "zod";
import { DEFAULT_REPORT_SECTIONS } from "../shared/reportSections.js";
import type {
  BrowserOption,
  AndroidApkCandidate,
  AndroidEvidencePayload,
  AndroidInstallPayload,
  AndroidStartPayload,
  AndroidVisibleTextResult,
  CreateJobPayload,
  ManualEvidencePayload,
  ManualFileEvidencePayload,
  NewProjectInput,
  PlatformPayload,
  ReportGenerationPayload,
  SaveSettingsPayload
} from "../shared/contracts.js";
import { ProjectService } from "../application/services/ProjectService.js";
import { JobQueue } from "../application/services/JobQueue.js";
import { IntelligenceWorkflow } from "../application/services/IntelligenceWorkflow.js";
import { ReportService } from "../application/services/ReportService.js";
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

const manualEvidenceSchema = z.object({
  projectId: z.string().uuid(),
  stepId: z.string().min(2),
  label: z.string().min(2),
  kind: manualEvidenceKindSchema,
  sourceUrl: z.string().optional(),
  imageDataUrl: z.string().min(20),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  note: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

const manualFileEvidenceSchema = z.object({
  projectId: z.string().uuid(),
  stepId: z.string().min(2),
  label: z.string().min(2),
  kind: manualEvidenceKindSchema,
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
    response.header("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
    if (request.method === "OPTIONS") {
      response.sendStatus(204);
      return;
    }
    next();
  });

  app.get("/api/health", (_request, response) => {
    response.json({
      ok: true,
      product: "Marketplace Intelligence OS",
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
    const detail = await dependencies.projectRepository.getDetail(input.id);
    if (!detail) {
      response.status(404).json({ error: "Project not found" });
      return;
    }
    response.json(detail);
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
    const assetPath = resolve(evidenceFolder, `${timestamp}-${slug(input.stepId)}.png`);
    await writeFile(assetPath, image.buffer);

    await dependencies.intelligenceRepository.saveScreenshots(project.id, "MANUAL_STEP", input.stepId, [
      {
        kind: input.kind,
        label: input.label,
        path: assetPath,
        sourceUrl: input.sourceUrl,
        width: input.width,
        height: input.height,
        metadata: {
          source: "guided-manual-collector",
          stepId: input.stepId,
          note: input.note,
          mimeType: image.mimeType,
          ...(input.metadata ?? {})
        }
      }
    ]);

    await dependencies.logRepository.write({
      projectId: project.id,
      level: "INFO",
      message: `Manual evidence captured: ${input.label}`,
      context: {
        stepId: input.stepId,
        sourceUrl: input.sourceUrl,
        assetPath
      }
    });

    response.status(201).json({ ok: true, stepId: input.stepId, assetPath });
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

    await dependencies.intelligenceRepository.saveScreenshots(project.id, "MANUAL_FILE_STEP", input.stepId, [
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

  app.delete("/api/reports/:id", asyncRoute(async (request, response) => {
    const input = z.object({ id: z.string().uuid() }).parse(request.params);
    const deleted = await dependencies.reportRepository.delete(input.id);
    if (!deleted) {
      response.status(404).json({ error: "Report not found" });
      return;
    }
    await safeRemoveFiles([deleted.htmlPath, deleted.pdfPath]);
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
      new PrismaReportDataAdapter(new PrismaReportDataLoader(prisma)),
      new ConsultingHtmlReportRenderer(),
      new PuppeteerPdfExporter(),
      workspace
    ),
    reportRepository
  };
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
