import { mkdir } from "node:fs/promises";
import { chromium, type Page } from "playwright";
import type { BrowserPreference } from "../../shared/contracts.js";
import { BrowserDiscoveryService } from "./BrowserDiscovery.js";
import { getPlatformService } from "../platform/PlatformService.js";

export class PlaywrightBrowserLauncher {
  constructor(private readonly discovery = new BrowserDiscoveryService()) {}

  async withPage<T>(
    preferredBrowser: BrowserPreference,
    work: (page: Page, fallbackReason?: string) => Promise<T>
  ): Promise<T> {
    const browser = await this.discovery.resolve(preferredBrowser);
    const os = getPlatformService().info.os;
    await mkdir(browser.profilePath, { recursive: true });
    const context = await chromium.launchPersistentContext(browser.profilePath, {
      headless: process.env.MIO_HEADLESS !== "false",
      channel: browser.channel,
      executablePath: browser.channel ? undefined : browser.executablePath,
      locale: "id-ID",
      viewport: { width: 1366, height: 1600 },
      userAgent: userAgentFor(os)
    });
    try {
      const page = context.pages()[0] ?? (await context.newPage());
      return await work(page, browser.fallbackReason);
    } finally {
      await context.close();
    }
  }
}

function userAgentFor(os: "windows" | "macos" | "linux"): string {
  if (os === "macos") {
    return "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
  }
  if (os === "linux") {
    return "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
  }
  return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
}
