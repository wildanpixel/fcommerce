import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { Page } from "playwright";
import type { ScreenshotEvidence } from "../../domain/models.js";
import { slug } from "../files/ProjectWorkspace.js";

export class ScreenshotEngine {
  async capture(
    page: Page,
    input: {
      projectFolder: string;
      group: "search" | "products" | "stores";
      kind: ScreenshotEvidence["kind"];
      label: string;
      sourceUrl?: string;
      fullPage?: boolean;
    }
  ): Promise<ScreenshotEvidence> {
    const folder = resolve(input.projectFolder, input.group);
    await mkdir(folder, { recursive: true });
    const viewport = page.viewportSize();
    const path = resolve(folder, `${Date.now()}-${slug(input.label)}.png`);
    await page.screenshot({
      path,
      fullPage: input.fullPage ?? true
    });
    return {
      kind: input.kind,
      label: input.label,
      path,
      sourceUrl: input.sourceUrl ?? page.url(),
      width: viewport?.width,
      height: viewport?.height
    };
  }
}
