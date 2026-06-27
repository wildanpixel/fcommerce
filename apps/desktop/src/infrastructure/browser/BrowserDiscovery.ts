import { access } from "node:fs/promises";
import { delimiter, join } from "node:path";
import { homedir } from "node:os";
import { getPlatformService, type OperatingSystem } from "../platform/PlatformService.js";
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
    const os = platform.info.os;
    const [chrome, edge, brave] = await Promise.all([
      findFirstExisting(candidatePaths(os, "chrome")),
      findFirstExisting(candidatePaths(os, "edge")),
      findFirstExisting(candidatePaths(os, "brave"))
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

function candidatePaths(os: OperatingSystem, browser: Exclude<BrowserPreference, "chromium">): string[] {
  const home = homedir();
  const pathCandidates = pathExecutables(browser);
  if (os === "windows") {
    const roots = [
      process.env.LOCALAPPDATA,
      process.env.PROGRAMFILES,
      process.env["PROGRAMFILES(X86)"]
    ].filter((value): value is string => Boolean(value));
    const byBrowser = {
      chrome: roots.map((root) => join(root, "Google", "Chrome", "Application", "chrome.exe")),
      edge: roots.map((root) => join(root, "Microsoft", "Edge", "Application", "msedge.exe")),
      brave: roots.map((root) =>
        join(root, "BraveSoftware", "Brave-Browser", "Application", "brave.exe")
      )
    };
    return [...byBrowser[browser], ...pathCandidates];
  }

  if (os === "macos") {
    const byBrowser = {
      chrome: [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        join(home, "Applications", "Google Chrome.app", "Contents", "MacOS", "Google Chrome")
      ],
      edge: [
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        join(home, "Applications", "Microsoft Edge.app", "Contents", "MacOS", "Microsoft Edge")
      ],
      brave: [
        "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
        join(home, "Applications", "Brave Browser.app", "Contents", "MacOS", "Brave Browser")
      ]
    };
    return [...byBrowser[browser], ...pathCandidates];
  }

  return pathCandidates;
}

function pathExecutables(browser: Exclude<BrowserPreference, "chromium">): string[] {
  const names = {
    chrome: ["google-chrome", "google-chrome-stable", "chrome", "chrome.exe"],
    edge: ["microsoft-edge", "microsoft-edge-stable", "msedge", "msedge.exe"],
    brave: ["brave-browser", "brave", "brave.exe"]
  }[browser];
  return (process.env.PATH ?? "")
    .split(delimiter)
    .flatMap((directory) => names.map((name) => join(directory, name)));
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
