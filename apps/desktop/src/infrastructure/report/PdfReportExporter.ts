import { existsSync, readdirSync, statSync } from "node:fs";
import { copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import puppeteer from "puppeteer";
import type { Page } from "puppeteer";
import type { PdfExporter } from "../../application/services/ReportService.js";

export class PuppeteerPdfExporter implements PdfExporter {
  async export(html: string, outputPath: string): Promise<void> {
    const tempDir = await mkdtemp(join(tmpdir(), "mios-report-"));
    const htmlPath = join(tempDir, "report.html");
    await writeFile(htmlPath, html, "utf8");
    const executablePath = resolvePuppeteerExecutable();

    const browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: [
        "--allow-file-access-from-files",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process"
      ]
    });
    try {
      const page = await browser.newPage();
      page.setDefaultTimeout(120_000);
      page.setDefaultNavigationTimeout(120_000);
      await page.setViewport({ width: 1440, height: 1800, deviceScaleFactor: 1 });
      await page.emulateMediaType("print");
      await page.goto(pathToFileURL(htmlPath).toString(), {
        waitUntil: "domcontentloaded",
        timeout: 60_000
      });
      await page.waitForNetworkIdle({ idleTime: 700, timeout: 15_000 }).catch(() => undefined);
      await waitForImages(page);
      await prepareDocumentForPdf(page);
      await page.pdf({
        path: outputPath,
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        timeout: 120_000
      });
    } finally {
      await browser.close();
      await rm(tempDir, { force: true, recursive: true });
    }
  }

  async exportDocx(docxPath: string, outputPath: string): Promise<void> {
    const failures: string[] = [];
    if (process.platform === "win32") {
      try {
        await exportDocxWithMicrosoftWord(docxPath, outputPath);
        return;
      } catch (error) {
        failures.push(`Microsoft Word: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    try {
      await exportDocxWithLibreOffice(docxPath, outputPath);
      return;
    } catch (error) {
      failures.push(`LibreOffice: ${error instanceof Error ? error.message : String(error)}`);
    }
    throw new Error(`DOCX-native PDF export failed. ${failures.join(" | ")}`);
  }
}

const execFileAsync = promisify(execFile);

async function exportDocxWithMicrosoftWord(docxPath: string, outputPath: string): Promise<void> {
  const tempDir = await mkdtemp(join(tmpdir(), "mios-word-pdf-"));
  const scriptPath = join(tempDir, "export-docx-pdf.ps1");
  const script = `param([string]$DocxPath, [string]$PdfPath)
$word = $null
$document = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $document = $word.Documents.Open($DocxPath, $false, $true)
  # 17 = PDF, 1 = optimize for on-screen/minimum size. Word keeps the DOCX layout
  # while avoiding print-resolution image payloads in the generated PDF.
  $document.ExportAsFixedFormat($PdfPath, 17, $false, 1)
} finally {
  if ($document -ne $null) { $document.Close(0) }
  if ($word -ne $null) { $word.Quit() }
  if ($document -ne $null) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($document) }
  if ($word -ne $null) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}`;
  try {
    await writeFile(scriptPath, script, "utf8");
    await execFileAsync("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      scriptPath,
      docxPath,
      outputPath
    ], { timeout: 120_000, windowsHide: true });
    if (!existsSync(outputPath)) throw new Error("Word completed without creating a PDF file.");
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
}

async function exportDocxWithLibreOffice(docxPath: string, outputPath: string): Promise<void> {
  const tempDir = await mkdtemp(join(tmpdir(), "mios-libreoffice-pdf-"));
  const executableCandidates = process.platform === "win32"
    ? [
        join(process.env.ProgramFiles ?? "C:\\Program Files", "LibreOffice", "program", "soffice.exe"),
        join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "LibreOffice", "program", "soffice.exe"),
        "soffice.exe"
      ]
    : ["libreoffice", "soffice"];
  let lastError: unknown;
  try {
    for (const executable of executableCandidates) {
      if (executable.includes("\\") && !existsSync(executable)) continue;
      try {
        await execFileAsync(executable, ["--headless", "--convert-to", "pdf", "--outdir", tempDir, docxPath], {
          timeout: 120_000,
          windowsHide: true
        });
        const generatedPath = join(tempDir, `${basename(docxPath, extname(docxPath))}.pdf`);
        if (!existsSync(generatedPath)) throw new Error("LibreOffice completed without creating a PDF file.");
        await copyFile(generatedPath, outputPath);
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("LibreOffice executable was not found.");
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
}

async function prepareDocumentForPdf(page: Page): Promise<void> {
  await page.evaluate(async () => {
    document.querySelectorAll<HTMLDetailsElement>("details.report-section").forEach((section) => {
      section.open = true;
    });
    const images = Array.from(document.images);
    for (const image of images) {
      if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0 || image.src.startsWith("data:")) {
        continue;
      }
      const maximumDimension = 1_400;
      const scale = Math.min(1, maximumDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) continue;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      try {
        context.drawImage(image, 0, 0, width, height);
        image.src = canvas.toDataURL("image/jpeg", 0.72);
        await image.decode().catch(() => undefined);
      } catch {
        // Keep the original source when the browser cannot safely rasterize it.
      }
    }
  });
}

export function resolvePuppeteerExecutable(options?: {
  resourcesPath?: string;
  fallback?: () => string;
}): string {
  const configured = process.env.MIO_PUPPETEER_EXECUTABLE_PATH;
  if (configured && existsSync(configured)) {
    return configured;
  }

  const resourcesPath = options?.resourcesPath ?? process.resourcesPath;
  const packagedRoot = join(resourcesPath, "puppeteer", `${process.platform}-${process.arch}`);
  const packagedExecutable = findBrowserExecutable(packagedRoot);
  if (packagedExecutable) {
    return packagedExecutable;
  }

  return (options?.fallback ?? (() => puppeteer.executablePath()))();
}

function findBrowserExecutable(root: string): string | undefined {
  if (!existsSync(root)) {
    return undefined;
  }
  const executableNames = new Set([
    "chrome-headless-shell.exe",
    "chrome-headless-shell",
    "Google Chrome for Testing",
    "chrome"
  ]);
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) {
      continue;
    }
    for (const name of readdirSync(current)) {
      const candidate = join(current, name);
      const stats = statSync(candidate);
      if (stats.isDirectory()) {
        pending.push(candidate);
      } else if (executableNames.has(name)) {
        return candidate;
      }
    }
  }
  return undefined;
}

async function waitForImages(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const images = Array.from(document.images);
    await Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolve) => {
            if (image.complete) {
              resolve();
              return;
            }
            const timeout = window.setTimeout(resolve, 5_000);
            const done = () => {
              window.clearTimeout(timeout);
              resolve();
            };
            image.addEventListener("load", done, { once: true });
            image.addEventListener("error", done, { once: true });
          })
      )
    );
  });
}
