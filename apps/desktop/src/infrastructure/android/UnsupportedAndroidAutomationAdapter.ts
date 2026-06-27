import type { AndroidAutomationAdapter } from "../../domain/marketplace/MarketplaceAdapter.js";

export class UnsupportedAndroidAutomationAdapter implements AndroidAutomationAdapter {
  readonly id: AndroidAutomationAdapter["id"] = "adb-device";
  readonly displayName = "Android Automation";

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async start(): Promise<void> {
    throw new Error("Android automation is not available in this build.");
  }

  async captureScreenshot(_label: string): Promise<string> {
    throw new Error("Android screenshot capture is not available in this build.");
  }

  async extractVisibleText(): Promise<string> {
    throw new Error("Android OCR extraction is not available in this build.");
  }

  async stop(): Promise<void> {
    return;
  }
}
