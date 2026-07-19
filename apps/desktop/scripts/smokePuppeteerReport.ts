import { rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PuppeteerPdfExporter } from "../src/infrastructure/report/PdfReportExporter.js";

const outputPath = join(tmpdir(), "mio-puppeteer-smoke.pdf");
const html = "<!doctype html><html><body><h1>Packaged browser smoke</h1></body></html>";

try {
  await new PuppeteerPdfExporter().export(html, outputPath);
  const output = await stat(outputPath);
  process.stdout.write(`PDF runtime smoke passed (${output.size} bytes)\n`);
} finally {
  await rm(outputPath, { force: true });
}
