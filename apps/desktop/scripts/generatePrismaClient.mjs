import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";

const require = createRequire(import.meta.url);
const prismaCli = require.resolve("prisma/build/index.js");
const clientPackageJson = require.resolve("@prisma/client/package.json");
const clientPackageDir = dirname(clientPackageJson);
const generatedClientRoot = join(clientPackageDir, "..", "..", ".prisma", "client");
const sourceSchemaPath = join(process.cwd(), "prisma", "schema.prisma");
const generatedSchemaPath = join(generatedClientRoot, "schema.prisma");

const result = await runPrismaGenerate();
if (result.code === 0) {
  await import("./preparePrismaClient.mjs");
  process.exit(0);
}

if (canUseExistingLockedWindowsClient(result)) {
  console.warn(
    [
      "Prisma generate could not replace the locked Windows query engine.",
      "The existing generated client matches the current schema and includes required engines, so the build will reuse it.",
      "Close any running dev API/Electron process before changing the Prisma schema."
    ].join(" ")
  );
  await import("./preparePrismaClient.mjs");
  process.exit(0);
}

process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
process.exit(result.code ?? 1);

function runPrismaGenerate() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [prismaCli, "generate"], {
      cwd: process.cwd(),
      env: process.env,
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({
        code: 1,
        stdout,
        stderr: `${stderr}${error.stack ?? error.message}`
      });
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function canUseExistingLockedWindowsClient(result) {
  const output = `${result.stdout}\n${result.stderr}`;
  if (!/EPERM/i.test(output) || !/query_engine-windows\.dll\.node/i.test(output)) {
    return false;
  }
  return generatedClientLooksCurrent();
}

function generatedClientLooksCurrent() {
  const requiredFiles = [
    "default.js",
    "index.js",
    "schema.prisma",
    "query_engine-windows.dll.node",
    "libquery_engine-darwin.dylib.node",
    "libquery_engine-darwin-arm64.dylib.node"
  ];
  if (!requiredFiles.every((file) => existsSync(join(generatedClientRoot, file)))) {
    return false;
  }
  try {
    const sourceSchema = normalizeSchema(readFileSyncText(sourceSchemaPath));
    const generatedSchema = normalizeSchema(readFileSyncText(generatedSchemaPath));
    return sourceSchema === generatedSchema;
  } catch {
    return false;
  }
}

function readFileSyncText(filePath) {
  return require("node:fs").readFileSync(filePath, "utf8");
}

function normalizeSchema(value) {
  return value
    .split(/\r?\n/gu)
    .map((line) => line.trim().replace(/\s+/gu, " "))
    .filter(Boolean)
    .join("\n");
}
