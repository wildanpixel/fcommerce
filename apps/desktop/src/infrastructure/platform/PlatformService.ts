import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { App, NotificationConstructorOptions, Shell } from "electron";

export type OperatingSystem = "windows" | "macos" | "linux";

export type AppDirectories = {
  appData: string;
  data: string;
  settings: string;
  screenshots: string;
  reports: string;
  logs: string;
  cache: string;
  browserProfiles: string;
};

export type PlatformInfo = {
  os: OperatingSystem;
  isPackaged: boolean;
  shortcutModifier: "Ctrl" | "Command";
  directories: AppDirectories;
};

export interface PlatformService {
  readonly info: PlatformInfo;
  ensureDirectories(): void;
  openPath(targetPath: string): Promise<void>;
  openExternal(url: string): Promise<void>;
  showNotification(title: string, body: string): void;
  shouldQuitOnAllWindowsClosed(): boolean;
}

let configuredService: PlatformService | undefined;
let nodeService: PlatformService | undefined;

export function configurePlatformService(service: PlatformService): void {
  configuredService = service;
  service.ensureDirectories();
}

export function getPlatformService(): PlatformService {
  if (configuredService) {
    return configuredService;
  }
  nodeService ??= createNodePlatformService();
  return nodeService;
}

export function createNodePlatformService(): PlatformService {
  const os = detectOperatingSystem();
  const directories = createNodeDirectories(os);
  return new BasicPlatformService({
    os,
    isPackaged: false,
    shortcutModifier: os === "macos" ? "Command" : "Ctrl",
    directories
  });
}

export function createElectronPlatformService(
  electronApp: App,
  electronShell: Shell,
  NotificationCtor?: {
    isSupported(): boolean;
    new (options: NotificationConstructorOptions): { show(): void };
  }
): PlatformService {
  const os = detectOperatingSystem();
  const appData = electronApp.getPath("userData");
  const cache = join(electronApp.getPath("sessionData"), "cache");
  const directories = createDirectories(appData, cache);
  return new BasicPlatformService(
    {
      os,
      isPackaged: electronApp.isPackaged,
      shortcutModifier: os === "macos" ? "Command" : "Ctrl",
      directories
    },
    {
      openPath: (targetPath) => electronShell.openPath(targetPath).then((error) => {
        if (error) {
          throw new Error(error);
        }
      }),
      openExternal: (url) => electronShell.openExternal(url),
      notify: (title, body) => {
        if (NotificationCtor?.isSupported()) {
          new NotificationCtor({ title, body }).show();
        }
      }
    }
  );
}

class BasicPlatformService implements PlatformService {
  constructor(
    readonly info: PlatformInfo,
    private readonly native?: {
      openPath(targetPath: string): Promise<void>;
      openExternal(url: string): Promise<void>;
      notify(title: string, body: string): void;
    }
  ) {}

  ensureDirectories(): void {
    for (const directory of Object.values(this.info.directories)) {
      mkdirSync(directory, { recursive: true });
    }
  }

  async openPath(targetPath: string): Promise<void> {
    if (this.native) {
      await this.native.openPath(targetPath);
      return;
    }
    await openWithSystem(resolve(targetPath), this.info.os);
  }

  async openExternal(url: string): Promise<void> {
    if (this.native) {
      await this.native.openExternal(url);
      return;
    }
    await openWithSystem(url, this.info.os);
  }

  showNotification(title: string, body: string): void {
    this.native?.notify(title, body);
  }

  shouldQuitOnAllWindowsClosed(): boolean {
    return this.info.os !== "macos";
  }
}

function detectOperatingSystem(): OperatingSystem {
  if (process.platform === "win32") {
    return "windows";
  }
  if (process.platform === "darwin") {
    return "macos";
  }
  return "linux";
}

function createNodeDirectories(os: OperatingSystem): AppDirectories {
  const appName = "Marketplace Intelligence OS";
  const home = homedir();
  const appData =
    os === "windows"
      ? join(process.env.APPDATA ?? join(home, "AppData", "Roaming"), appName)
      : os === "macos"
        ? join(home, "Library", "Application Support", appName)
        : join(process.env.XDG_CONFIG_HOME ?? join(home, ".config"), appName);
  const cache =
    os === "windows"
      ? join(process.env.LOCALAPPDATA ?? join(home, "AppData", "Local"), appName, "Cache")
      : os === "macos"
        ? join(home, "Library", "Caches", appName)
        : join(process.env.XDG_CACHE_HOME ?? join(home, ".cache"), appName);
  return createDirectories(appData, cache);
}

function createDirectories(appData: string, cache: string): AppDirectories {
  return {
    appData,
    data: join(appData, "data"),
    settings: join(appData, "settings"),
    screenshots: join(appData, "screenshots"),
    reports: join(appData, "reports"),
    logs: join(appData, "logs"),
    cache,
    browserProfiles: join(appData, "browser-profiles")
  };
}

function openWithSystem(target: string, os: OperatingSystem): Promise<void> {
  const command = os === "windows" ? "cmd" : os === "macos" ? "open" : "xdg-open";
  const args = os === "windows" ? ["/c", "start", "", target] : [target];
  return new Promise((resolveOpen, rejectOpen) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    child.once("error", rejectOpen);
    child.once("spawn", () => {
      child.unref();
      resolveOpen();
    });
  });
}
