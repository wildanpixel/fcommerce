import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { access, mkdir, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { delimiter, dirname, extname, join, resolve } from "node:path";
import type {
  AndroidAppRuntimeStatus,
  AndroidApkCandidate,
  AndroidAvdInfo,
  AndroidDeviceInfo,
  AndroidToolStatus
} from "../../shared/contracts.js";
import { getPlatformService } from "../platform/PlatformService.js";
import { slug } from "../files/ProjectWorkspace.js";

const TIKTOK_PACKAGES = ["com.zhiliaoapp.musically", "com.ss.android.ugc.trill"];

type CommandResult = {
  stdout: string;
  stderr: string;
};

export class AndroidToolingService {
  async status(): Promise<AndroidToolStatus> {
    const tools = await this.discoverTools();
    const diagnostics: string[] = [];
    if (!tools.adbPath) {
      diagnostics.push("ADB not detected. Install Android SDK Platform Tools or add adb to PATH.");
    }
    if (!tools.emulatorPath) {
      diagnostics.push("Android Emulator CLI not detected. Install Android Studio Emulator or add emulator to PATH.");
    }
    if (!tools.sdkManagerPath) {
      diagnostics.push("sdkmanager not detected. Install Android command-line tools to manage SDK packages.");
    }
    if (!tools.avdManagerPath) {
      diagnostics.push("avdmanager not detected. Install Android command-line tools to create emulator profiles.");
    }

    const javaAvailable = Boolean(await findJavaExecutable());
    if (!javaAvailable) {
      diagnostics.push("Java runtime not detected. Android command-line tools require Java.");
    }

    const detectedDevices = tools.adbPath ? await this.listDevices(tools.adbPath, diagnostics) : [];
    const devices = tools.adbPath
      ? await this.annotateDeviceHealth(tools.adbPath, detectedDevices, diagnostics)
      : detectedDevices;
    const avds = tools.emulatorPath ? await this.listAvds(tools.emulatorPath, diagnostics) : [];
    const installedPackage = tools.adbPath
      ? await this.findInstalledTikTokPackage(tools.adbPath, devices, diagnostics)
      : undefined;
    const tiktokRuntime = tools.adbPath && installedPackage && devices.some((device) => device.bootCompleted)
      ? await this.inspectTikTokRuntime(tools.adbPath, installedPackage, diagnostics)
      : undefined;

    if (tools.emulatorPath && avds.length === 0) {
      diagnostics.push("No Android Virtual Device found. Create an AVD in Android Studio before launching TikTok.");
    }
    if (tools.adbPath && devices.length === 0) {
      diagnostics.push("No running Android device detected. Launch an emulator before opening or capturing TikTok.");
    }
    if (devices.length > 0 && !installedPackage) {
      diagnostics.push("TikTok app is not installed on the connected Android device.");
    }
    if (tiktokRuntime?.activeAnr) {
      diagnostics.push("TikTok is not responding. Use Recover TikTok to force-stop and reopen it without clearing app data.");
    }
    if (tiktokRuntime?.packageAbi?.startsWith("arm") && tiktokRuntime.deviceAbi?.includes("x86")) {
      diagnostics.push("The installed TikTok APK is ARM-only on an x86_64 emulator. If TikTok keeps freezing, install TikTok from Play Store or use a universal/x86-compatible APK.");
    }

    return {
      adbPath: tools.adbPath,
      emulatorPath: tools.emulatorPath,
      sdkManagerPath: tools.sdkManagerPath,
      avdManagerPath: tools.avdManagerPath,
      sdkRoot: tools.sdkRoot,
      javaAvailable,
      devices,
      avds,
      tiktokInstalled: Boolean(installedPackage),
      tiktokPackage: installedPackage,
      tiktokRuntime,
      ready: Boolean(tools.adbPath && devices.some((device) => device.bootCompleted) && installedPackage && !tiktokRuntime?.activeAnr),
      diagnostics
    };
  }

  async startEmulator(avdName?: string): Promise<void> {
    const status = await this.status();
    if (!status.emulatorPath) {
      throw new Error("Android Emulator CLI is not available.");
    }
    const emulatorPath = status.emulatorPath;
    const selectedAvd = avdName ?? status.avds[0]?.name;
    if (!selectedAvd) {
      throw new Error("No Android Virtual Device is available to launch.");
    }
    await new Promise<void>((resolveStart, rejectStart) => {
      const child = spawn(emulatorPath, [
        "-avd",
        selectedAvd,
        "-no-boot-anim",
        "-no-audio",
        "-gpu",
        "swiftshader_indirect"
      ], {
        detached: true,
        stdio: ["ignore", "ignore", "ignore"],
        windowsHide: false
      });
      child.once("error", rejectStart);
      child.once("spawn", () => {
        child.unref();
        resolveStart();
      });
    });
  }

  async installApk(apkPath: string): Promise<void> {
    const status = await this.status();
    if (!status.adbPath) {
      throw new Error("ADB is not available.");
    }
    if (status.devices.length === 0) {
      throw new Error("No running Android device is available for APK install.");
    }
    const resolvedApk = resolve(apkPath);
    const fileStat = await stat(resolvedApk).catch(() => undefined);
    if (!fileStat?.isFile()) {
      throw new Error(`APK file not found: ${resolvedApk}`);
    }
    await runCommand(status.adbPath, ["install", "-r", resolvedApk], 120000);
  }

  async findApkCandidates(): Promise<AndroidApkCandidate[]> {
    const roots = candidateApkRoots();
    const candidates: AndroidApkCandidate[] = [];
    for (const root of roots) {
      candidates.push(...(await findApks(root, 3)));
    }
    return candidates
      .filter((candidate, index, all) => all.findIndex((item) => item.path === candidate.path) === index)
      .sort((left, right) => Date.parse(right.modifiedAt) - Date.parse(left.modifiedAt))
      .slice(0, 20);
  }

  async openTikTok(): Promise<void> {
    const status = await this.status();
    if (!status.adbPath) {
      throw new Error("ADB is not available.");
    }
    if (status.devices.length === 0) {
      throw new Error("No running Android device is available.");
    }
    const packageName = status.tiktokPackage;
    if (!packageName) {
      throw new Error("TikTok is not installed on the connected Android device.");
    }
    await prepareAndroidForTikTok(status.adbPath);
    await runCommand(status.adbPath, [
      "shell",
      "monkey",
      "-p",
      packageName,
      "-c",
      "android.intent.category.LAUNCHER",
      "1"
    ]);
  }

  async recoverTikTok(): Promise<void> {
    const status = await this.status();
    if (!status.adbPath) {
      throw new Error("ADB is not available.");
    }
    if (status.devices.length === 0) {
      throw new Error("No running Android device is available.");
    }
    const packageName = status.tiktokPackage;
    if (!packageName) {
      throw new Error("TikTok is not installed on the connected Android device.");
    }
    await runCommand(status.adbPath, ["shell", "am", "force-stop", packageName], 15000);
    await runCommand(status.adbPath, ["shell", "input", "keyevent", "HOME"], 10000).catch(() => undefined);
    await prepareAndroidForTikTok(status.adbPath);
    await sleep(1200);
    await runCommand(status.adbPath, [
      "shell",
      "monkey",
      "-p",
      packageName,
      "-c",
      "android.intent.category.LAUNCHER",
      "1"
    ]);
  }

  async captureScreenshot(folder: string, label: string): Promise<string> {
    const status = await this.status();
    if (!status.adbPath) {
      throw new Error("ADB is not available.");
    }
    if (status.devices.length === 0) {
      throw new Error("No running Android device is available for screenshot capture.");
    }
    await mkdir(folder, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputPath = resolve(folder, `${timestamp}-${slug(label)}.png`);
    await captureAdbPng(status.adbPath, outputPath);
    return outputPath;
  }

  async extractVisibleText(): Promise<string> {
    const status = await this.status();
    if (!status.adbPath) {
      throw new Error("ADB is not available.");
    }
    if (status.devices.length === 0) {
      throw new Error("No running Android device is available for visible text extraction.");
    }
    await runCommand(status.adbPath, ["shell", "uiautomator", "dump", "/sdcard/window.xml"], 30000);
    const result = await runCommand(status.adbPath, ["exec-out", "cat", "/sdcard/window.xml"], 30000);
    return extractUiAutomatorText(result.stdout);
  }

  private async discoverTools(): Promise<{
    adbPath?: string;
    emulatorPath?: string;
    sdkManagerPath?: string;
    avdManagerPath?: string;
    sdkRoot?: string;
  }> {
    const sdkRoots = candidateSdkRoots();
    const adbPath = await findExecutable("adb", sdkRoots.map((root) => join(root, "platform-tools")));
    const emulatorPath = await findExecutable(
      "emulator",
      sdkRoots.map((root) => join(root, "emulator"))
    );
    const commandLineToolDirs = sdkRoots.flatMap((root) => [
      join(root, "cmdline-tools", "latest", "bin"),
      join(root, "cmdline-tools", "bin"),
      join(root, "tools", "bin")
    ]);
    const sdkManagerPath = await findExecutable("sdkmanager", commandLineToolDirs);
    const avdManagerPath = await findExecutable("avdmanager", commandLineToolDirs);
    const sdkRoot = sdkRoots.find((root) =>
      [adbPath, emulatorPath, sdkManagerPath, avdManagerPath].some((toolPath) => toolPath?.startsWith(root))
    );
    return {
      adbPath,
      emulatorPath,
      sdkManagerPath,
      avdManagerPath,
      sdkRoot
    };
  }

  private async listDevices(adbPath: string, diagnostics: string[]): Promise<AndroidDeviceInfo[]> {
    try {
      const result = await runCommand(adbPath, ["devices", "-l"]);
      return result.stdout
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("List of devices"))
        .map(parseDeviceLine)
        .filter((device): device is AndroidDeviceInfo => Boolean(device));
    } catch (error) {
      diagnostics.push(error instanceof Error ? error.message : "Unable to list Android devices.");
      return [];
    }
  }

  private async annotateDeviceHealth(
    adbPath: string,
    devices: AndroidDeviceInfo[],
    diagnostics: string[]
  ): Promise<AndroidDeviceInfo[]> {
    const availableDevices = devices.filter((device) => device.state === "device");
    if (availableDevices.length === 0) {
      return devices;
    }
    const annotated: AndroidDeviceInfo[] = [];
    for (const device of devices) {
      if (device.state !== "device") {
        annotated.push(device);
        continue;
      }
      try {
        const result = await runCommand(adbPath, ["-s", device.id, "shell", "getprop", "sys.boot_completed"], 10000);
        annotated.push({ ...device, bootCompleted: result.stdout.trim() === "1" });
      } catch (error) {
        diagnostics.push(
          error instanceof Error
            ? `Android boot health check failed for ${device.id}: ${error.message}`
            : `Android boot health check failed for ${device.id}.`
        );
        annotated.push({ ...device, bootCompleted: false });
      }
    }
    return annotated;
  }

  private async listAvds(emulatorPath: string, diagnostics: string[]): Promise<AndroidAvdInfo[]> {
    try {
      const result = await runCommand(emulatorPath, ["-list-avds"]);
      return result.stdout
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter(Boolean)
        .sort(compareAvdNames)
        .map((name) => ({ name }));
    } catch (error) {
      diagnostics.push(error instanceof Error ? error.message : "Unable to list Android emulator profiles.");
      return [];
    }
  }

  private async findInstalledTikTokPackage(
    adbPath: string,
    devices: AndroidDeviceInfo[],
    diagnostics: string[]
  ): Promise<string | undefined> {
    if (devices.length === 0) {
      return undefined;
    }
    for (const packageName of TIKTOK_PACKAGES) {
      try {
        const result = await runCommand(adbPath, ["shell", "pm", "path", packageName]);
        if (result.stdout.includes(packageName)) {
          return packageName;
        }
      } catch {
        // Try the next regional package id.
      }
    }
    diagnostics.push(`Checked TikTok package IDs: ${TIKTOK_PACKAGES.join(", ")}.`);
    return undefined;
  }

  private async inspectTikTokRuntime(
    adbPath: string,
    packageName: string,
    diagnostics: string[]
  ): Promise<AndroidAppRuntimeStatus> {
    try {
      const [windowDump, packageDump, deviceAbi, pid] = await Promise.all([
        runCommand(adbPath, ["shell", "dumpsys", "window"], 30000).then((result) => result.stdout),
        runCommand(adbPath, ["shell", "dumpsys", "package", packageName], 30000).then((result) => result.stdout),
        runCommand(adbPath, ["shell", "getprop", "ro.product.cpu.abi"], 10000).then((result) => result.stdout.trim()),
        runCommand(adbPath, ["shell", "pidof", packageName], 10000)
          .then((result) => result.stdout.trim())
          .catch(() => "")
      ]);
      const focus = parseFocusedAndroidWindow(windowDump);
      const activeAnr = isActiveAnr(windowDump, packageName);
      const lastAnr = parseLastAnr(windowDump, packageName);
      const version = /versionName=([^\s]+)/u.exec(packageDump)?.[1];
      const packageAbi = /primaryCpuAbi=([^\s]+)/u.exec(packageDump)?.[1];
      const foreground = focus.packageName === packageName;
      return {
        packageName,
        state: activeAnr ? "not-responding" : foreground ? "responding" : pid ? "starting" : "not-running",
        activeAnr,
        focusedPackage: focus.packageName,
        focusedActivity: focus.activityName,
        lastAnrAt: lastAnr.at,
        lastAnrReason: lastAnr.reason,
        packageVersion: version,
        packageAbi,
        deviceAbi
      };
    } catch (error) {
      diagnostics.push(error instanceof Error ? `TikTok runtime inspection failed: ${error.message}` : "TikTok runtime inspection failed.");
      return {
        packageName,
        state: "starting",
        activeAnr: false
      };
    }
  }
}

function compareAvdNames(left: string, right: string): number {
  return avdPreferenceScore(left) - avdPreferenceScore(right) || left.localeCompare(right);
}

function avdPreferenceScore(name: string): number {
  const normalized = name.toLowerCase();
  if (normalized.includes("mio_tiktok_stable")) {
    return 0;
  }
  if (normalized.includes("mio_tiktok")) {
    return 1;
  }
  return 2;
}

function isActiveAnr(windowDump: string, packageName: string): boolean {
  const escapedPackage = escapeRegExp(packageName);
  return new RegExp(`m(?:CurrentFocus|FocusedWindow)=Window\\{[^\\n]+Application Not Responding: ${escapedPackage}`, "u").test(windowDump);
}

function parseFocusedAndroidWindow(windowDump: string): { packageName?: string; activityName?: string } {
  const lines = windowDump.split(/\r?\n/u);
  const focusLines = [
    lines.find((line) => line.includes("mCurrentFocus=")),
    lines.find((line) => line.includes("mFocusedApp="))
  ].filter((line): line is string => Boolean(line));
  for (const focusLine of focusLines) {
    const packageMatch = /([a-z][\w.]+)\/([^\s}]+)/u.exec(focusLine);
    if (packageMatch) {
      return {
        packageName: packageMatch[1],
        activityName: packageMatch[2]
      };
    }
    const anrMatch = /Application Not Responding: ([a-z][\w.]+)/u.exec(focusLine);
    if (anrMatch) {
      return {
        packageName: anrMatch[1]
      };
    }
  }
  return {};
}

function parseLastAnr(windowDump: string, packageName: string): { at?: string; reason?: string } {
  if (!windowDump.includes(`Application at fault`) || !windowDump.includes(packageName)) {
    return {};
  }
  return {
    at: /ANR time:\s*([^\r\n]+)/u.exec(windowDump)?.[1]?.trim(),
    reason: /Reason:\s*([^\r\n]+)/u.exec(windowDump)?.[1]?.trim()
  };
}

async function prepareAndroidForTikTok(adbPath: string): Promise<void> {
  await Promise.all([
    runCommand(adbPath, ["shell", "settings", "put", "global", "window_animation_scale", "0"], 10000).catch(() => undefined),
    runCommand(adbPath, ["shell", "settings", "put", "global", "transition_animation_scale", "0"], 10000).catch(() => undefined),
    runCommand(adbPath, ["shell", "settings", "put", "global", "animator_duration_scale", "0"], 10000).catch(() => undefined),
    runCommand(adbPath, ["shell", "settings", "put", "global", "device_provisioned", "1"], 10000).catch(() => undefined),
    runCommand(adbPath, ["shell", "settings", "put", "secure", "user_setup_complete", "1"], 10000).catch(() => undefined)
  ]);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function parseDeviceLine(line: string): AndroidDeviceInfo | undefined {
  const [id, state, ...details] = line.split(/\s+/u);
  if (!id || !state || state === "offline" || state === "unauthorized") {
    return id && state ? { id, state } : undefined;
  }
  const fields = new Map(
    details
      .map((detail) => detail.split(":"))
      .filter((entry): entry is [string, string] => entry.length === 2)
  );
  return {
    id,
    state,
    model: fields.get("model"),
    product: fields.get("product")
  };
}

function executableNames(base: string): string[] {
  return getPlatformService().info.os === "windows"
    ? [`${base}.exe`, `${base}.bat`, `${base}.cmd`, base]
    : [base];
}

function candidateSdkRoots(): string[] {
  const home = homedir();
  const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
  const roots = [
    process.env.MIO_ANDROID_SDK_ROOT,
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    resourcesPath ? join(resourcesPath, "android-sdk") : undefined,
    process.execPath ? join(dirname(process.execPath), "android-sdk") : undefined,
    getPlatformService().info.os === "windows"
      ? join(process.env.LOCALAPPDATA ?? join(home, "AppData", "Local"), "Android", "Sdk")
      : undefined,
    getPlatformService().info.os === "macos" ? join(home, "Library", "Android", "sdk") : undefined,
    getPlatformService().info.os === "linux" ? join(home, "Android", "Sdk") : undefined
  ].filter((value): value is string => Boolean(value));
  return [...new Set(roots.map((root) => resolve(root)))];
}

function candidateApkRoots(): string[] {
  const home = homedir();
  return [
    join(home, "Downloads"),
    join(home, "Desktop")
  ].map((root) => resolve(root));
}

async function findApks(directory: string, depth: number): Promise<AndroidApkCandidate[]> {
  if (depth < 0 || !(await exists(directory))) {
    return [];
  }
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const results: AndroidApkCandidate[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findApks(path, depth - 1)));
      continue;
    }
    if (!entry.isFile() || extname(entry.name).toLowerCase() !== ".apk") {
      continue;
    }
    const lowerName = entry.name.toLowerCase();
    if (!lowerName.includes("tiktok") && !lowerName.includes("musically") && !lowerName.includes("trill")) {
      continue;
    }
    const fileStat = await stat(path).catch(() => undefined);
    if (!fileStat?.isFile()) {
      continue;
    }
    results.push({
      path,
      name: entry.name,
      sizeBytes: fileStat.size,
      modifiedAt: fileStat.mtime.toISOString()
    });
  }
  return results;
}

async function findExecutable(baseName: string, extraDirs: string[] = []): Promise<string | undefined> {
  const names = executableNames(baseName);
  const candidates = [
    ...extraDirs.flatMap((directory) => names.map((name) => join(directory, name))),
    ...(process.env.PATH ?? "")
      .split(delimiter)
      .filter(Boolean)
      .flatMap((directory) => names.map((name) => join(directory, name)))
  ];
  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

async function findJavaExecutable(): Promise<string | undefined> {
  const commonJavaDirs =
    getPlatformService().info.os === "windows"
      ? [
          join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Microsoft"),
          join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Eclipse Adoptium"),
          join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Java")
        ]
      : [];
  const discoveredDirs: string[] = [];
  for (const root of commonJavaDirs) {
    if (!(await exists(root))) {
      continue;
    }
    const children = await readdir(root, { withFileTypes: true }).catch(() => []);
    discoveredDirs.push(
      ...children.filter((entry) => entry.isDirectory()).map((entry) => join(root, entry.name, "bin"))
    );
  }
  return findExecutable("java", discoveredDirs);
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, milliseconds);
  });
}

function runCommand(command: string, args: string[], timeoutMs = 30000): Promise<CommandResult> {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      rejectRun(new Error(`${command} ${args.join(" ")} timed out.`));
    }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      rejectRun(error);
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolveRun({ stdout, stderr });
        return;
      }
      rejectRun(new Error(`${command} ${args.join(" ")} failed: ${stderr || stdout || `exit ${code}`}`));
    });
  });
}

function captureAdbPng(adbPath: string, outputPath: string): Promise<void> {
  return new Promise((resolveCapture, rejectCapture) => {
    const child = spawn(adbPath, ["exec-out", "screencap", "-p"], {
      windowsHide: true
    });
    const output = createWriteStream(outputPath);
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      rejectCapture(new Error("Android screenshot capture timed out."));
    }, 30000);
    child.stdout.pipe(output);
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      rejectCapture(error);
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      output.close();
      if (code === 0) {
        resolveCapture();
        return;
      }
      rejectCapture(new Error(stderr.trim() || `Android screenshot capture failed with exit code ${code}.`));
    });
  });
}

function extractUiAutomatorText(xml: string): string {
  const values = [...xml.matchAll(/\b(?:text|content-desc)="([^"]+)"/gu)]
    .map((match) => decodeXmlAttribute(match[1] ?? "").trim())
    .filter(Boolean);
  return [...new Set(values)].join("\n");
}

function decodeXmlAttribute(value: string): string {
  return value
    .replace(/&quot;/gu, "\"")
    .replace(/&apos;/gu, "'")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&amp;/gu, "&");
}
