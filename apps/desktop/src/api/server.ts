import http from "node:http";
import express, { type Express, type Request, type Response } from "express";
import { z } from "zod";
import { DEFAULT_REPORT_SECTIONS } from "../shared/reportSections.js";
import type {
  BrowserOption,
  CreateJobPayload,
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
import { ProjectWorkspace } from "../infrastructure/files/ProjectWorkspace.js";
import { BrowserDiscoveryService } from "../infrastructure/browser/BrowserDiscovery.js";
import { getPlatformService } from "../infrastructure/platform/PlatformService.js";
import { NoopUpdateService } from "../application/services/UpdateService.js";

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

export type ApiServer = {
  app: Express;
  server: http.Server;
  port: number;
  close(): Promise<void>;
};

export function createApp(): Express {
  const dependencies = createDependencies();
  const app = express();

  app.use(express.json({ limit: "20mb" }));
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
    response.json({ ok: true, product: "Marketplace Intelligence OS" });
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

  app.post("/api/projects", asyncRoute(async (request, response) => {
    const input = projectSchema.parse(request.body) satisfies NewProjectInput;
    response.status(201).json(await dependencies.projects.createProject(input));
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
    marketplaces,
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
    )
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
