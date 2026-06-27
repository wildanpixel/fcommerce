-- Initial SQLite schema for Marketplace Intelligence OS.

CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "language" TEXT NOT NULL DEFAULT 'id-ID',
    "exportFolder" TEXT,
    "screenshotFolder" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "ResearchJob" (
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
);

CREATE TABLE "Store" (
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
);

CREATE TABLE "Product" (
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
);

CREATE TABLE "Review" (
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
);

CREATE TABLE "Asset" (
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
);

CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT,
    "provider" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "resultJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Analysis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Report" (
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
);

CREATE TABLE "LogEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "jobId" TEXT,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "contextJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LogEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LogEntry_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ResearchJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "valueJson" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "Project_marketplace_keyword_idx" ON "Project"("marketplace", "keyword");
CREATE INDEX "Project_status_updatedAt_idx" ON "Project"("status", "updatedAt");
CREATE INDEX "ResearchJob_projectId_status_idx" ON "ResearchJob"("projectId", "status");
CREATE INDEX "ResearchJob_marketplace_keyword_idx" ON "ResearchJob"("marketplace", "keyword");
CREATE INDEX "Product_projectId_rank_idx" ON "Product"("projectId", "rank");
CREATE INDEX "Product_storeId_idx" ON "Product"("storeId");
CREATE INDEX "Product_marketplace_marketplaceProductId_idx" ON "Product"("marketplace", "marketplaceProductId");
CREATE INDEX "Store_projectId_name_idx" ON "Store"("projectId", "name");
CREATE INDEX "Store_marketplace_marketplaceStoreId_idx" ON "Store"("marketplace", "marketplaceStoreId");
CREATE INDEX "Review_productId_sentiment_idx" ON "Review"("productId", "sentiment");
CREATE INDEX "Asset_projectId_kind_idx" ON "Asset"("projectId", "kind");
CREATE INDEX "Asset_ownerType_ownerId_idx" ON "Asset"("ownerType", "ownerId");
CREATE INDEX "Analysis_projectId_subjectType_idx" ON "Analysis"("projectId", "subjectType");
CREATE INDEX "Report_projectId_status_idx" ON "Report"("projectId", "status");
CREATE INDEX "LogEntry_projectId_createdAt_idx" ON "LogEntry"("projectId", "createdAt");
CREATE INDEX "LogEntry_jobId_createdAt_idx" ON "LogEntry"("jobId", "createdAt");
