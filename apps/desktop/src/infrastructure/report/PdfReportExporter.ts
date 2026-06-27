import puppeteer from "puppeteer";
import type { PdfExporter } from "../../application/services/ReportService.js";

export class PuppeteerPdfExporter implements PdfExporter {
  async export(html: string, outputPath: string): Promise<void> {
    const browser = await puppeteer.launch({
      headless: true
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      await page.pdf({
        path: outputPath,
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true
      });
    } finally {
      await browser.close();
    }
  }
}
