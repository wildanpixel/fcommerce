import { existsSync, mkdirSync, rmSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { Browser, BrowserPlatform, install } from "@puppeteer/browsers";

const CHROME_HEADLESS_SHELL_BUILD = "148.0.7778.97";

const options = Object.fromEntries(
  process.argv.slice(2).filter((argument) => argument !== "--").map((argument) => {
    const [key, value] = argument.replace(/^--/, "").split("=");
    return [key, value];
  })
);

const platform = options.platform ?? process.platform;
const arch = options.arch ?? process.arch;
const browserPlatform = resolveBrowserPlatform(platform, arch);
const targetDirectory = resolve("buildResources", "puppeteer", `${platform}-${arch}`);
const executablePath = expectedExecutablePath(targetDirectory, browserPlatform);
const archivePath = expectedArchivePath(targetDirectory, browserPlatform);

if (existsSync(executablePath)) {
  process.stdout.write(`Using staged Chrome Headless Shell at ${executablePath}\n`);
  process.exit(0);
}

if (existsSync(archivePath)) {
  extractArchive(archivePath, expectedInstallDirectory(targetDirectory, browserPlatform));
  if (existsSync(executablePath)) {
    process.stdout.write(`Recovered Chrome Headless Shell from ${archivePath}\n`);
    process.exit(0);
  }
}

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

function expectedArchivePath(cacheDirectory, browserPlatform) {
  return join(
    cacheDirectory,
    "chrome-headless-shell",
    `${CHROME_HEADLESS_SHELL_BUILD}-chrome-headless-shell-${browserPlatform}.zip`
  );
}

function expectedExecutablePath(cacheDirectory, browserPlatform) {
  const executableName = browserPlatform.startsWith("win") ? "chrome-headless-shell.exe" : "chrome-headless-shell";
  return join(
    expectedInstallDirectory(cacheDirectory, browserPlatform),
    `chrome-headless-shell-${browserPlatform}`,
    executableName
  );
}

function expectedInstallDirectory(cacheDirectory, browserPlatform) {
  return join(
    cacheDirectory,
    "chrome-headless-shell",
    `${browserPlatform}-${CHROME_HEADLESS_SHELL_BUILD}`
  );
}

function extractArchive(archivePath, outputDirectory) {
  rmSync(outputDirectory, { force: true, recursive: true });
  mkdirSync(outputDirectory, { recursive: true });
  const result = spawnSync("tar", ["-xf", archivePath, "-C", outputDirectory], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`Failed to extract ${archivePath}: ${result.stderr || result.stdout || `exit ${result.status}`}`);
  }
}
