import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { Browser, BrowserPlatform, install } from "@puppeteer/browsers";

const CHROME_HEADLESS_SHELL_BUILD = "148.0.7778.97";

const options = Object.fromEntries(
  process.argv.slice(2).map((argument) => {
    const [key, value] = argument.replace(/^--/, "").split("=");
    return [key, value];
  })
);

const platform = options.platform ?? process.platform;
const arch = options.arch ?? process.arch;
const browserPlatform = resolveBrowserPlatform(platform, arch);
const targetDirectory = resolve("buildResources", "puppeteer", `${platform}-${arch}`);

await rm(targetDirectory, { force: true, recursive: true });
const installed = await install({
  browser: Browser.CHROMEHEADLESSSHELL,
  buildId: CHROME_HEADLESS_SHELL_BUILD,
  cacheDir: targetDirectory,
  platform: browserPlatform
});

process.stdout.write(`Staged Chrome Headless Shell at ${installed.executablePath}\n`);

function resolveBrowserPlatform(targetPlatform, targetArch) {
  if (targetPlatform === "win32") {
    return targetArch === "arm64" ? BrowserPlatform.WIN64 : BrowserPlatform.WIN64;
  }
  if (targetPlatform === "darwin") {
    return targetArch === "arm64" ? BrowserPlatform.MAC_ARM : BrowserPlatform.MAC;
  }
  if (targetPlatform === "linux") {
    return targetArch === "arm64" ? BrowserPlatform.LINUX_ARM : BrowserPlatform.LINUX;
  }
  throw new Error(`Unsupported Puppeteer target: ${targetPlatform}-${targetArch}`);
}
