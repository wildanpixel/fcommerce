import { cp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const clientPackageJson = require.resolve("@prisma/client/package.json");
const clientPackageDir = dirname(clientPackageJson);
const generatedClientRoot = join(clientPackageDir, "..", "..", ".prisma");
const generatedDefaultClient = join(generatedClientRoot, "client", "default.js");
const appPrismaClientRoot = join(process.cwd(), "node_modules", ".prisma");
const incorrectNestedClientRoot = join(clientPackageDir, ".prisma");

if (!existsSync(generatedDefaultClient)) {
  throw new Error(
    `Prisma Client was not generated at the expected pnpm location: ${generatedDefaultClient}`
  );
}

await rm(incorrectNestedClientRoot, { recursive: true, force: true });
for (let attempt = 1; attempt <= 3; attempt += 1) {
  try {
    await rm(appPrismaClientRoot, { recursive: true, force: true });
    await cp(generatedClientRoot, appPrismaClientRoot, {
      recursive: true,
      force: true,
      errorOnExist: false,
      filter: (source) => !basename(source).includes(".tmp")
    });
    break;
  } catch (error) {
    if (attempt === 3 || error?.code !== "EEXIST") {
      throw error;
    }
  }
}
