import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import type { PrismaClient as PrismaClientType } from "@prisma/client";
import { getPlatformService } from "../platform/PlatformService.js";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client") as typeof import("@prisma/client");

const fallbackDatabasePath = join(
  getPlatformService().info.directories.data,
  "marketplace-intelligence.db"
);
const databaseUrl = process.env.DATABASE_URL ?? `file:${fallbackDatabasePath}`;

if (databaseUrl.startsWith("file:")) {
  const dbPath = databaseUrl.replace("file:", "");
  const resolvedPath = dbPath.startsWith(".") ? resolve(process.cwd(), dbPath) : dbPath;
  mkdirSync(dirname(resolvedPath), { recursive: true });
}

export const prisma: PrismaClientType = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

export type PrismaDatabase = typeof prisma;
