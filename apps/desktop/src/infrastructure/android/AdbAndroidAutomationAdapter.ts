import type { AndroidAutomationAdapter } from "../../domain/marketplace/MarketplaceAdapter.js";
import { getPlatformService } from "../platform/PlatformService.js";
import { AndroidToolingService } from "./AndroidToolingService.js";

export class AdbAndroidAutomationAdapter implements AndroidAutomationAdapter {
  readonly id: AndroidAutomationAdapter["id"] = "adb-device";
  readonly displayName = "ADB Android Device";

  constructor(private readonly tooling = new AndroidToolingService()) {}

  async isAvailable(): Promise<boolean> {
    const status = await this.tooling.status();
    return Boolean(status.adbPath && status.devices.length > 0);
  }

  async start(): Promise<void> {
    await this.tooling.startEmulator();
  }

  async captureScreenshot(label: string): Promise<string> {
    const folder = getPlatformService().info.directories.screenshots;
    return this.tooling.captureScreenshot(folder, label);
  }

  async extractVisibleText(): Promise<string> {
    return this.tooling.extractVisibleText();
  }

  async stop(): Promise<void> {
    return;
  }
}
