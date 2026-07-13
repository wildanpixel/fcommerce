import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer";
import type { Page } from "puppeteer";
import type { PdfExporter } from "../../application/services/ReportService.js";

export class PuppeteerPdfExporter implements PdfExporter {
  async export(html: string, outputPath: string): Promise<void> {
    const tempDir = await mkdtemp(join(tmpdir(), "mios-report-"));
    const htmlPath = join(tempDir, "report.html");
    await writeFile(htmlPath, html, "utf8");

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--allow-file-access-from-files"]
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
