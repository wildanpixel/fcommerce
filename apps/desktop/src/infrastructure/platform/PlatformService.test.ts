import { describe, expect, it } from "vitest";
import { createNodePlatformService } from "./PlatformService.js";

describe("PlatformService", () => {
  it("resolves platform-specific application directories", () => {
    const service = createNodePlatformService();
    expect(service.info.directories.appData).toContain("Marketplace Intelligence OS");
    expect(service.info.directories.data).toContain("data");
    expect(service.info.directories.reports).toContain("reports");
    expect(service.info.directories.browserProfiles).toContain("browser-profiles");
  });

  it("maps the keyboard modifier for the current operating system", () => {
    const service = createNodePlatformService();
    expect(["Ctrl", "Command"]).toContain(service.info.shortcutModifier);
    if (service.info.os === "macos") {
      expect(service.info.shortcutModifier).toBe("Command");
    }
  });

  it("keeps browser executable discovery behind the platform service", () => {
    const service = createNodePlatformService();
    expect(service.browserExecutableCandidates("chrome").length).toBeGreaterThan(0);
    expect(service.browserExecutableCandidates("edge").length).toBeGreaterThan(0);
    expect(service.browserExecutableCandidates("brave").length).toBeGreaterThan(0);
  });
});
