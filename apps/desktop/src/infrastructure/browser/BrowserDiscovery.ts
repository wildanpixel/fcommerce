import { access } from "node:fs/promises";
import { join } from "node:path";
import { getPlatformService } from "../platform/PlatformService.js";
import type { BrowserPreference } from "../../shared/contracts.js";

export type BrowserInstall = {
  id: BrowserPreference;
  name: string;
  available: boolean;
  channel?: "chrome" | "msedge";
  executablePath?: string;
  profilePath: string;
  fallbackReason?: string;
};

export class BrowserDiscoveryService {
  async discover(): Promise<BrowserInstall[]> {
    const platform = getPlatformService();
    const profileRoot = platform.info.directories.browserProfiles;
    const [chrome, edge, brave] = await Promise.all([
      findFirstExisting(platform.browserExecutableCandidates("chrome")),
      findFirstExisting(platform.browserExecutableCandidates("edge")),
      findFirstExisting(platform.browserExecutableCandidates("brave"))
    ]);

    return [
      {
        id: "chromium",
        name: "Bundled Chromium",
        available: true,
        profilePath: join(profileRoot, "chromium")
      },
      {
        id: "chrome",
        name: "Google Chrome",
        available: Boolean(chrome),
        channel: chrome ? "chrome" : undefined,
        executablePath: chrome,
        profilePath: join(profileRoot, "chrome")
      },
      {
        id: "edge",
        name: "Microsoft Edge",
        available: Boolean(edge),
        channel: edge ? "msedge" : undefined,
        executablePath: edge,
        profilePath: join(profileRoot, "edge")
      },
      {
        id: "brave",
        name: "Brave",
        available: Boolean(brave),
        executablePath: brave,
        profilePath: join(profileRoot, "brave")
      }
    ];
  }

  async resolve(preferred: BrowserPreference): Promise<BrowserInstall> {
    const browsers = await this.discover();
    const selected = browsers.find((browser) => browser.id === preferred);
    if (selected?.available) {
      return selected;
    }
    const chromium = browsers.find((browser) => browser.id === "chromium");
    if (!chromium) {
      throw new Error("Bundled Chromium is unavailable.");
    }
    return {
      ...chromium,
      fallbackReason: selected
        ? `${selected.name} is not installed or could not be detected. Falling back to Chromium.`
        : "Unknown browser preference. Falling back to Chromium."
    };
  }
}

async function findFirstExisting(paths: string[]): Promise<string | undefined> {
  for (const candidate of paths) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Continue searching platform-specific browser locations.
    }
  }
  return undefined;
}
