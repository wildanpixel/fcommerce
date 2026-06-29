import type { PrismaClient } from "@prisma/client";

const statements = [
  `CREATE TABLE IF NOT EXISTS "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "language" TEXT NOT NULL DEFAULT 'id-ID',
    "productCategory" TEXT,
    "exportFolder" TEXT,
    "screenshotFolder" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "ResearchJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "etaSeconds" INTEGER,
    "configJson" TEXT NOT NULL,
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ResearchJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "marketplaceStoreId" TEXT,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "followers" INTEGER,
    "following" INTEGER,
    "productsCount" INTEGER,
    "rating" REAL,
    "ratingCount" INTEGER,
    "chatResponse" TEXT,
    "joinedDate" TEXT,
    "categoriesJson" TEXT NOT NULL,
    "voucherCount" INTEGER,
    "voucherTypesJson" TEXT NOT NULL,
    "visualThemeJson" TEXT NOT NULL,
    "rawJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Store_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "storeId" TEXT,
    "marketplace" TEXT NOT NULL,
    "marketplaceProductId" TEXT,
    "rank" INTEGER,
    "source" TEXT,
    "selectionReason" TEXT,
    "productType" TEXT,
    "title" TEXT NOT NULL,
    "priceMin" REAL,
    "priceMax" REAL,
    "priceAverage" REAL,
    "originalPrice" REAL,
    "discount" TEXT,
    "rating" REAL,
    "reviewCount" INTEGER,
    "monthlySold" INTEGER,
    "totalSold" INTEGER,
    "stock" INTEGER,
    "storeName" TEXT,
    "storeUrl" TEXT,
    "productUrl" TEXT NOT NULL,
    "mallStatus" BOOLEAN NOT NULL DEFAULT false,
    "officialStatus" BOOLEAN NOT NULL DEFAULT false,
    "starSeller" BOOLEAN NOT NULL DEFAULT false,
    "voucherText" TEXT,
    "shippingText" TEXT,
    "variantsJson" TEXT NOT NULL,
    "specificationsJson" TEXT NOT NULL,
    "description" TEXT,
    "rawJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "rating" INTEGER,
    "comment" TEXT NOT NULL,
    "variation" TEXT,
    "reviewDate" TEXT,
    "mediaAssetIdsJson" TEXT NOT NULL,
    "rawJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "metadataJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Asset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "Analysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT,
    "provider" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "resultJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Analysis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "htmlPath" TEXT,
    "pdfPath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sectionsJson" TEXT NOT NULL,
    "generatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "LogEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "jobId" TEXT,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "contextJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LogEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LogEntry_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ResearchJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "AppSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "valueJson" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "Project_marketplace_keyword_idx" ON "Project"("marketplace", "keyword")`,
  `CREATE INDEX IF NOT EXISTS "Project_status_updatedAt_idx" ON "Project"("status", "updatedAt")`,
  `CREATE INDEX IF NOT EXISTS "ResearchJob_projectId_status_idx" ON "ResearchJob"("projectId", "status")`,
  `CREATE INDEX IF NOT EXISTS "ResearchJob_marketplace_keyword_idx" ON "ResearchJob"("marketplace", "keyword")`,
  `CREATE INDEX IF NOT EXISTS "Product_projectId_rank_idx" ON "Product"("projectId", "rank")`,
  `CREATE INDEX IF NOT EXISTS "Product_storeId_idx" ON "Product"("storeId")`,
  `CREATE INDEX IF NOT EXISTS "Product_marketplace_marketplaceProductId_idx" ON "Product"("marketplace", "marketplaceProductId")`,
  `CREATE INDEX IF NOT EXISTS "Store_projectId_name_idx" ON "Store"("projectId", "name")`,
  `CREATE INDEX IF NOT EXISTS "Store_marketplace_marketplaceStoreId_idx" ON "Store"("marketplace", "marketplaceStoreId")`,
  `CREATE INDEX IF NOT EXISTS "Review_productId_sentiment_idx" ON "Review"("productId", "sentiment")`,
  `CREATE INDEX IF NOT EXISTS "Asset_projectId_kind_idx" ON "Asset"("projectId", "kind")`,
  `CREATE INDEX IF NOT EXISTS "Asset_ownerType_ownerId_idx" ON "Asset"("ownerType", "ownerId")`,
  `CREATE INDEX IF NOT EXISTS "Analysis_projectId_subjectType_idx" ON "Analysis"("projectId", "subjectType")`,
  `CREATE INDEX IF NOT EXISTS "Report_projectId_status_idx" ON "Report"("projectId", "status")`,
  `CREATE INDEX IF NOT EXISTS "LogEntry_projectId_createdAt_idx" ON "LogEntry"("projectId", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "LogEntry_jobId_createdAt_idx" ON "LogEntry"("jobId", "createdAt")`
];

export async function ensureDatabaseSchema(db: PrismaClient): Promise<void> {
  await db.$executeRawUnsafe("PRAGMA foreign_keys = ON");
  for (const statement of statements) {
    await db.$executeRawUnsafe(statement);
  }
  await ensureColumn(db, "Project", "productCategory", "TEXT");
}

async function ensureColumn(
  db: PrismaClient,
  table: string,
  column: string,
  definition: string
): Promise<void> {
  const columns = await db.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("${table}")`);
  if (!columns.some((entry) => entry.name === column)) {
    await db.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
  }
}
