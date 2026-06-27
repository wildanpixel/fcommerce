import { describe, expect, it } from "vitest";
import { BrowserDiscoveryService } from "./BrowserDiscovery.js";

describe("BrowserDiscoveryService", () => {
  it("always exposes bundled Chromium as the safe fallback", async () => {
    const browsers = await new BrowserDiscoveryService().discover();
    const chromium = browsers.find((browser) => browser.id === "chromium");
    expect(chromium?.available).toBe(true);
    expect(chromium?.profilePath).toContain("chromium");
  });

  it("returns the supported browser preference set", async () => {
    const browsers = await new BrowserDiscoveryService().discover();
    expect(browsers.map((browser) => browser.id)).toEqual([
      "chromium",
      "chrome",
      "edge",
      "brave"
    ]);
  });
});
