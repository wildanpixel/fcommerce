import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const generatedPaths = [
  "dist",
  "dist-node",
  "out",
  "release",
  "build",
  "coverage",
  "playwright-report",
  "test-results",
  "tmp",
  "data",
  "logs",
  "exports",
  "reports",
  "screenshots",
  "dev-server.log",
  "dev-server.err.log",
  "apps/desktop/dist",
  "apps/desktop/dist-node",
  "apps/desktop/out",
  "apps/desktop/release",
  "apps/desktop/build",
  "apps/desktop/coverage",
  "apps/desktop/playwright-report",
  "apps/desktop/test-results",
  "apps/desktop/tmp",
  "apps/desktop/data",
  "apps/desktop/logs",
  "apps/desktop/exports",
  "apps/desktop/reports",
  "apps/desktop/screenshots"
];

for (const relativePath of generatedPaths) {
  const target = resolve(root, relativePath);

  if (!target.startsWith(root)) {
    throw new Error(`Refusing to remove path outside workspace: ${target}`);
  }

  await rm(target, { recursive: true, force: true });
}
