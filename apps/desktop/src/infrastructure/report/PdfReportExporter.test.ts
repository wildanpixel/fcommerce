import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolvePuppeteerExecutable } from "./PdfReportExporter.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  delete process.env.MIO_PUPPETEER_EXECUTABLE_PATH;
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("resolvePuppeteerExecutable", () => {
  it("prefers an explicitly configured executable", async () => {
    const directory = await createTemporaryDirectory();
    const executable = join(directory, "custom-browser.exe");
    await writeFile(executable, "browser");
    process.env.MIO_PUPPETEER_EXECUTABLE_PATH = executable;

    expect(resolvePuppeteerExecutable({ resourcesPath: directory, fallback: () => "fallback" })).toBe(executable);
  });

  it("finds the browser staged in Electron resources", async () => {
    const directory = await createTemporaryDirectory();
    const executableName = process.platform === "win32" ? "chrome-headless-shell.exe" : "chrome-headless-shell";
    const executable = join(directory, "puppeteer", `${process.platform}-${process.arch}`, "nested", executableName);
    await mkdir(dirname(executable), { recursive: true });
    await writeFile(executable, "browser");

    expect(resolvePuppeteerExecutable({ resourcesPath: directory, fallback: () => "fallback" })).toBe(executable);
  });

  it("uses Puppeteer's development fallback when no packaged browser exists", async () => {
    const directory = await createTemporaryDirectory();
    expect(resolvePuppeteerExecutable({ resourcesPath: directory, fallback: () => "development-browser" })).toBe("development-browser");
  });
});

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "mios-puppeteer-test-"));
  temporaryDirectories.push(directory);
  return directory;
}
