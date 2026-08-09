import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ParagraphChild
} from "docx";
import sharp from "sharp";
import type { AiAnalysisJson } from "../../domain/models.js";
import type { ReportData } from "../../application/services/ReportService.js";
import type { ReportGenerationPayload } from "../../shared/contracts.js";
import { DEFAULT_REPORT_SECTIONS, type ReportSectionConfig } from "../../shared/reportSections.js";
import { normalizeReportLanguage, reportText } from "../../shared/reportLocalization.js";

type DocxChild = Paragraph | Table;
type DocxCellValue = string | Paragraph | undefined;
type ImageLoadOptions = {
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
  targetWidth?: number;
  targetHeight?: number;
  fit?: "inside" | "cover" | "contain" | "fill" | "outside";
  position?: string;
};

const AUTHOR = "Wildan Ega Pradana";
const AUTHOR_LINKEDIN = "https://www.linkedin.com/in/wildanegapradana/";
const BLUE = "2563EB";
const INK = "111827";
const MUTED = "667085";
const BORDER = "D7DEE8";
const SOFT_BLUE = "EAF2FF";

export class ConsultingDocxReportExporter {
  async render(data: ReportData, payload?: ReportGenerationPayload): Promise<Buffer> {
    const language = normalizeReportLanguage(payload?.language ?? data.project.language);
    const t = (source: string) => reportText(language, source);
    const configuredSections = payload?.sections ?? DEFAULT_REPORT_SECTIONS;
    const sections = enabledSectionIds(configuredSections);
    const sectionPosition = new Map(configuredSections.map((section, index) => [section.id, index]));
    const position = (...ids: ReportSectionConfig["id"][]) =>
      Math.min(...ids.map((id) => sectionPosition.get(id) ?? Number.MAX_SAFE_INTEGER));
    const filters = projectSearchFilters(data);
    const children: DocxChild[] = [
      titleParagraph("Research Product Market"),
      paragraph(data.project.keyword, { size: 36, bold: true, color: INK }),
      paragraph(`${data.project.marketplace} ${t("keyword competitor report generated from local guided evidence.")}`, { color: MUTED }),
      simpleTable([
        ["Shop Type", filters.shopTypes],
        ["Price Range", filters.priceRange]
      ], [30, 70]),
      linkParagraph("Developer: Wildan Ega Pradana", AUTHOR_LINKEDIN),
      spacer()
    ];
    const blocks: Array<{ position: number; children: DocxChild[] }> = [];
    if (include(sections, "summaryMetrics", "cover")) {
      blocks.push({
        position: position("summaryMetrics", "cover"),
        children: [sectionHeading(t("Summary Metrics")), metricsTable(data), spacer()]
      });
    }
    if (include(sections, "keywordGeneral", "keywordRelevance", "topSales")) {
      blocks.push({
        position: position("keywordGeneral", "keywordRelevance", "topSales"),
        children: await keywordGeneralSection(data)
      });
    }
    if (include(sections, "keyProducts", "keyProductTable")) {
      blocks.push({
        position: position("keyProducts", "keyProductTable"),
        children: [sectionHeading(t("Key Products")), keyProductTable(data), spacer()]
      });
    }
    if (include(
      sections,
      "productDetailFirstPage",
      "productDetailSlides",
      "productDetailDescription",
      "productDetailReviews",
      "productDetailUserMedia",
      "productDetailShopHomePage",
      "productDossiers",
      "reviewEvidence"
    )) {
      blocks.push({
        position: position("productDetailFirstPage", "productDossiers", "reviewEvidence"),
        children: await productDetailSections(data, sections)
      });
    }
    if (include(sections, "keyStoreHomePage", "keyStoreData", "keyStoreCategories", "keyStoreProducts", "keyStoreBestSellers", "keyStoreVisualStyle", "tiktokEvidence", "storeOverview", "storeDossiers", "visualStyle")) {
      blocks.push({
        position: position("keyStoreHomePage", "keyStoreData", "keyStoreCategories", "keyStoreProducts", "keyStoreBestSellers", "keyStoreVisualStyle", "tiktokEvidence", "storeOverview", "storeDossiers", "visualStyle"),
        children: await keyStoreSection(data, sections)
      });
    }
    if (include(sections, "intelligence", "aiRecommendations")) {
      blocks.push({
        position: position("intelligence", "aiRecommendations"),
        children: intelligenceSection(data, t)
      });
    }
    if (include(sections, "crossPlatformEvidence")) {
      blocks.push({
        position: position("crossPlatformEvidence"),
        children: await tiktokSection(data)
      });
    }
    children.push(
      ...blocks
        .sort((left, right) => left.position - right.position)
        .flatMap((block) => block.children)
    );

    const doc = new Document({
      title: data.project.keyword,
      subject: "Marketplace keyword competitor report",
      creator: AUTHOR,
      description: "Generated by Research Product Market",
      styles: {
        default: {
          document: {
            run: {
              font: "Arial",
              size: 21,
              color: INK
            },
            paragraph: {
              spacing: { after: 140, line: 270 }
            }
          }
        }
      },
      sections: [
        {
          properties: {
            page: {
              margin: { top: 720, right: 720, bottom: 720, left: 720 }
            }
          },
          children
        }
      ]
    });

    return Packer.toBuffer(doc);
  }
}

function intelligenceSection(data: ReportData, t: (source: string) => string): DocxChild[] {
  const analyses = data.analyses
    .map((analysis) => safeJson<AiAnalysisJson | null>(analysis.resultJson, null))
    .filter((analysis): analysis is AiAnalysisJson => Boolean(analysis));
  const children: DocxChild[] = [sectionHeading(t("Intelligence and Recommendations"))];
  if (analyses.length === 0) {
    return [...children, paragraph(t("No structured intelligence analysis has been generated yet."), { color: MUTED })];
  }
  const analysis = analyses[analyses.length - 1];
  const matrix = intelligenceCompetitionMatrix(analysis, data);
  const insights = intelligenceCategoryInsights(analysis);
  children.push(
    subHeading(t("Keyword Search Analysis & Top 10 Competition Matrix")),
    tableWithHeader(
      [t("Product Name"), t("Price Range"), t("USP/Key Claim"), t("Rating"), t("Short Description")],
      matrix.map((item) => [item.productName, item.priceRange, item.uspKeyClaim, item.rating, item.shortDescription])
    ),
    subHeading(t("Synthesized Category Insights")),
    ...insights.flatMap((item, index) => [
      tinyHeading(`${index + 1}. ${t(item.title)}`),
      paragraph(item.insight, { preserveLines: true })
    ])
  );
  return [...children, spacer()];
}

function intelligenceCompetitionMatrix(analysis: AiAnalysisJson, data: ReportData): AiAnalysisJson["keywordCompetitionMatrix"] {
  if (Array.isArray(analysis.keywordCompetitionMatrix) && analysis.keywordCompetitionMatrix.length > 0) {
    return analysis.keywordCompetitionMatrix.slice(0, 10);
  }
  const products = keyProductsForReport(data.products);
  return products.map((product) => ({
    productName: product.title,
    priceRange: formatCurrency(product.priceAverage),
    uspKeyClaim: reportExcerpt(product.description || selectionReasonForDisplay(product, products), 150),
    rating: productRawText(product, "ratingText") ?? (product.rating ? `${product.rating.toFixed(1)} / 5` : "-"),
    shortDescription: reportExcerpt(
      product.description || `${product.title}${product.storeName ? ` from ${product.storeName}` : ""}.`,
      190
    )
  }));
}

function intelligenceCategoryInsights(analysis: AiAnalysisJson): AiAnalysisJson["synthesizedCategoryInsights"] {
  if (Array.isArray(analysis.synthesizedCategoryInsights) && analysis.synthesizedCategoryInsights.length > 0) {
    return analysis.synthesizedCategoryInsights.slice(0, 5);
  }
  return [
    { title: "PRICING ARCHITECTURE & TIERING", insight: analysis.pricingAnalysis?.summary ?? "No pricing insight generated." },
    { title: "COMPETITIVE POSITIONING & KEY CLAIMS", insight: analysis.competitorAnalysis?.summary ?? "No positioning insight generated." },
    { title: "CUSTOMER TRUST & RATING SIGNALS", insight: analysis.customerTrust?.observations?.join(" ") || "No customer-trust insight generated." },
    { title: "DEMAND CONCENTRATION & PRODUCT MOMENTUM", insight: analysis.competitorAnalysis?.signals?.join(" ") || "No demand insight generated." },
    { title: "CATEGORY OPPORTUNITIES & RECOMMENDED ACTIONS", insight: analysis.recommendations?.map((item) => `${item.action} ${item.rationale}`).join(" ") || "No action insight generated." }
  ];
}

function reportExcerpt(value: string, maximum: number): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  return normalized.length <= maximum ? normalized : `${normalized.slice(0, maximum - 1).trimEnd()}…`;
}

function enabledSectionIds(sections: ReportSectionConfig[]): Set<ReportSectionConfig["id"]> {
  return new Set(sections.filter((section) => section.enabled).map((section) => section.id));
}

function include(sections: Set<ReportSectionConfig["id"]>, ...ids: ReportSectionConfig["id"][]): boolean {
  return ids.some((id) => sections.has(id));
}

async function keywordGeneralSection(data: ReportData): Promise<DocxChild[]> {
  const filters = projectSearchFilters(data);
  const children: DocxChild[] = [
    sectionHeading("Keyword General"),
    simpleTable([
      ["Shop Type Filters", filters.shopTypes],
      ["Price Range", filters.priceRange]
    ], [30, 70]),
    subHeading("Relevance"),
    ...await assetImageBlocks(data.assets.filter((asset) => asset.kind === "SEARCH_RESULT").slice(0, 2), "Relevance screenshot", { captions: false }),
    await snapshotProductTable(data.products.filter((product) => product.source === "Relevance").slice(0, 40)),
    subHeading("Top Sales"),
    ...await assetImageBlocks(data.assets.filter((asset) => asset.kind === "TOP_SALES").slice(0, 2), "Top sales screenshot", { captions: false }),
    await snapshotProductTable(data.products.filter((product) => product.source === "Top Sales").slice(0, 40)),
    spacer()
  ];
  return children;
}

async function productDetailSections(data: ReportData, sections: Set<ReportSectionConfig["id"]>): Promise<DocxChild[]> {
  const legacy = sections.has("productDossiers") || sections.has("reviewEvidence");
  const showFirstPage = legacy || sections.has("productDetailFirstPage");
  const showSlides = legacy || sections.has("productDetailSlides");
  const showDescription = legacy || sections.has("productDetailDescription");
  const showReviews = legacy || sections.has("productDetailReviews");
  const showUserMedia = legacy || sections.has("productDetailUserMedia");
  const showShopHome = legacy || sections.has("productDetailShopHomePage");
  const children: DocxChild[] = [sectionHeading("Product Detail")];
  for (const [index, product] of keyProductsForReport(data.products).entries()) {
    const raw = safeJson<{
      imageUrl?: string;
      images?: string[];
      videos?: string[];
      descriptionImages?: string[];
      reviewMediaImages?: string[];
      reviewMediaVideos?: string[];
      evidencePlan?: { productImages?: string[]; productVideos?: string[] };
      shopVouchers?: string[];
      bundleDeals?: string[];
    }>(product.rawJson, {});
    const assets = data.assets.filter((asset) => asset.ownerType === "PRODUCT" && asset.ownerId === product.id);
    const storeAssets = data.assets.filter((asset) => assetMatchesStore(asset, product.storeUrl));
    const productVideos = uniqueMediaUrls(raw.evidencePlan?.productVideos ?? [])
      .filter(isLikelyProductVideoUrl)
      .slice(0, 1);
    const productImages = uniqueMediaUrls([...(raw.evidencePlan?.productImages ?? []), ...(raw.images ?? []), raw.imageUrl])
      .filter(isReportProductImageUrl)
      .slice(0, productVideos.length > 0 ? 8 : 9);
    const reviewImages = uniqueMediaUrls(raw.reviewMediaImages ?? []).filter(isReportProductImageUrl).slice(0, 30);
    const reviewVideos = uniqueMediaUrls(raw.reviewMediaVideos ?? []).filter(isLikelyProductVideoUrl).slice(0, 12);
    children.push(subHeading(`Product ${index + 1}: ${product.title}`), productFactTable(product));
    if (showFirstPage) {
      children.push(tinyHeading("1st page"), ...await assetImageBlocks(assets.filter((asset) => asset.kind === "PRODUCT_PAGE"), "Product first page", { captions: false }));
    }
    if (showSlides) {
      children.push(tinyHeading("Slides"), ...await remoteImageGridBlocks(productImages, "Product slide", 9));
      if (productVideos.length > 0) {
        children.push(bulletParagraph(`Product gallery video: ${productVideos[0]}`));
      }
    }
    if (showDescription) {
      children.push(tinyHeading("Description"), paragraph(product.description ?? "No browser-readable description captured.", { preserveLines: true }));
      children.push(...await remoteImageBlocks(uniqueMediaUrls(raw.descriptionImages ?? []).filter(isReportProductImageUrl).slice(0, 24), "Description image"));
      children.push(promotionTable(raw.shopVouchers ?? [], raw.bundleDeals ?? []));
    }
    if (showReviews) {
      children.push(tinyHeading("Reviews"), reviewTable(data.reviews.filter((review) => review.productId === product.id)));
    }
    if (showUserMedia) {
      children.push(tinyHeading("Media in user"), ...await remoteImageGridBlocks(reviewImages, "Review media", 12));
      if (reviewVideos.length > 0) {
        children.push(...reviewVideos.map((video, videoIndex) => bulletParagraph(`Review video ${videoIndex + 1}: ${video}`)));
      }
    }
    if (showShopHome) {
      children.push(tinyHeading("Shop Home Page"), ...await assetImageBlocks([
        ...assets.filter((asset) => asset.kind === "STORE_HOME"),
        ...storeAssets.filter((asset) => asset.kind === "STORE_HOME")
      ], "Shop home page", { captions: false, layout: "portraitEvidence" }));
    }
    children.push(spacer());
  }
  return children;
}

async function keyStoreSection(data: ReportData, sections: Set<ReportSectionConfig["id"]>): Promise<DocxChild[]> {
  const legacy = sections.has("storeOverview") || sections.has("storeDossiers") || sections.has("visualStyle");
  const showHome = legacy || sections.has("keyStoreHomePage");
  const showData = legacy || sections.has("keyStoreData");
  const showCategories = legacy || sections.has("keyStoreCategories");
  const showProducts = legacy || sections.has("keyStoreProducts");
  const showBestSellers = legacy || sections.has("keyStoreBestSellers");
  const showVisualStyle = legacy || sections.has("keyStoreVisualStyle");
  const showTikTok = sections.has("tiktokEvidence");
  if (data.stores.length === 0) {
    return [sectionHeading("Key Store Page List"), paragraph("No collected store evidence is available yet.", { color: MUTED })];
  }
  const children: DocxChild[] = [sectionHeading("Key Store Page List")];
  for (const store of data.stores) {
    const raw = reportStoreRaw(store);
    const assets = storeAssetsForReport(data, store);
    const categories = safeJson<string[]>(store.categoriesJson, []);
    const ratingSamples = reportStoreRatingSamples(store);
    children.push(
      subHeading(store.name),
      linkParagraph("Open Store", store.url),
      tinyHeading("Overall"),
      paragraph(storeOverall(store, data), { preserveLines: true })
    );
    if (showHome) {
      children.push(tinyHeading("Store Home Page"), ...await assetImageBlocks(assets.filter((asset) => asset.kind === "STORE_HOME"), "Store home page", { captions: false, layout: "portraitEvidence" }));
    }
    if (showData) {
      children.push(
        tinyHeading("Store Data"),
        simpleTable([
        ["Products", formatNumber(store.productsCount)],
        ["Followers", formatNumber(store.followers)],
        ["Following", formatNumber(store.following)],
        ["Rating", store.rating != null ? `${store.rating.toFixed(1)}${store.ratingCount ? ` (${formatNumber(store.ratingCount)} Rating)` : ""}` : "-"],
        ["Chat Performance", sanitizeStoreMetric(store.chatResponse)],
        ["Joined", sanitizeStoreMetric(store.joinedDate)],
        ["Description Store", sanitizeStoreDescription(raw.description)]
        ], [28, 72]),
        tinyHeading("1 Star Store Ratings"),
        ...await storeRatingBlocks(ratingSamples.filter((sample) => sample.rating === 1)),
        tinyHeading("5 Star Store Ratings"),
        ...await storeRatingBlocks(ratingSamples.filter((sample) => sample.rating === 5))
      );
    }
    if (showCategories) {
      children.push(tinyHeading("Store Product Categories"), storeCategoryTable(categories));
    }
    if (showProducts) {
      children.push(tinyHeading("Popular Products"), await snapshotProductTable(reportStoreProducts(data, store, "Store Products")));
    }
    if (showBestSellers) {
      children.push(tinyHeading("Best Sellers"), await snapshotProductTable(reportStoreProducts(data, store, "Store Best Sellers")));
    }
    if (showVisualStyle) {
      children.push(tinyHeading("Visual Shop Banner"), ...await assetImageBlocks(assets.filter((asset) => asset.kind === "STORE_BANNER"), "Store banner", { captions: false }));
    }
    if (showTikTok) {
      children.push(
        tinyHeading("TikTok Evidence"),
        ...await assetImageBlocks(assets.filter((asset) => asset.kind === "SOCIAL_ACCOUNT"), "TikTok evidence", { captions: false })
      );
    }
    children.push(spacer());
  }
  return children;
}

async function storeRatingBlocks(samples: StoreRatingSample[]): Promise<DocxChild[]> {
  if (samples.length === 0) {
    return [paragraph("No store rating samples captured.", { color: MUTED })];
  }
  const blocks: DocxChild[] = [];
  for (const [index, sample] of samples.slice(0, 5).entries()) {
    blocks.push(tableWithHeader(
      ["No", "Product", "Comment", "Seller response"],
      [[
        String(index + 1),
        sample.productUrl
          ? linkParagraph(`${sample.productTitle ?? "Open rated product"}${sample.productVariation ? `\n${sample.productVariation}` : ""}`, sample.productUrl)
          : `${sample.productTitle ?? "Product link unavailable"}${sample.productVariation ? `\n${sample.productVariation}` : ""}`,
        `${sample.reviewer || "—"}\n${sample.capturedAt ?? "—"}\n${sample.comment || "—"}`,
        sample.sellerResponse ?? "—"
      ]]
    ));
    for (const [mediaIndex, mediaUrl] of sample.mediaUrls.slice(0, 6).entries()) {
      if (/(?:\.mp4|\.webm|\.mov|\.m3u8)(?:$|[?#])|\bvideo\b/iu.test(mediaUrl)) {
        blocks.push(linkParagraph(`Open attached video ${mediaIndex + 1}`, mediaUrl));
        continue;
      }
      const media = await imageOnlyParagraph(mediaUrl, `Rating evidence ${index + 1}.${mediaIndex + 1}`, { maxWidth: 280, maxHeight: 280 });
      blocks.push(media ?? linkParagraph(`Open attached image ${mediaIndex + 1}`, mediaUrl));
    }
  }
  return blocks;
}

function storeCategoryTable(categories: string[]): Table {
  const rows = categories.map((category) => {
    const match = category.trim().match(/^(.*?)\s*\(\s*(\d+)\s*\)\s*$/u);
    return [match?.[1]?.trim() ?? category, match?.[2] ?? "-"];
  });
  return tableWithHeader(
    ["Category Name", "Total Product"],
    rows.length > 0 ? rows : [["No store categories captured.", "-"]]
  );
}

async function tiktokSection(data: ReportData): Promise<DocxChild[]> {
  return [
    sectionHeading("TikTok Evidence"),
    ...await assetImageBlocks(data.assets.filter((asset) => asset.kind === "SOCIAL_ACCOUNT"), "TikTok evidence", { captions: false })
  ];
}

function metricsTable(data: ReportData): Table {
  return simpleTable([
    ["Products", String(data.products.length)],
    ["Stores", String(data.stores.length)],
    ["Reviews", String(data.reviews.length)],
    ["Evidence", String(data.assets.length)]
  ], [35, 65]);
}

function keyProductTable(data: ReportData): Table {
  const rows = keyProductsForReport(data.products).map((product, index) => [
    String(index + 1),
    productSourcePlacement(product),
    selectionReasonForDisplay(product, data.products),
    product.title,
    productRawText(product, "productType") ?? product.productType ?? inferredProductType(product.title),
    productRawText(product, "monthlySoldText") ?? formatNumber(product.monthlySold),
    product.storeName ?? "-",
    storeType(product),
    formatCurrency(product.priceAverage),
    productRawText(product, "ratingText") ?? (product.rating ? product.rating.toFixed(1) : "-"),
    productRawText(product, "reviewText") ?? formatNumber(product.reviewCount),
    productRawText(product, "totalSoldText") ?? formatNumber(product.totalSold)
  ]);
  return tableWithHeader(
    ["No", "Source", "Reason", "Product Title", "Product Type", "Monthly Sold", "Store Name", "Store Type", "Price", "Rating", "Reviews", "Total Sold"],
    rows
  );
}

async function snapshotProductTable(products: ReportData["products"]): Promise<Table> {
  const rows = await Promise.all(products.map(async (product) => [
    await imageOnlyParagraph(productImage(product), product.title, { maxWidth: 56, maxHeight: 56, minWidth: 24, minHeight: 24 }) ?? "-",
    product.title,
    formatCurrency(product.priceAverage),
    productRawText(product, "ratingText") ?? (product.rating ? product.rating.toFixed(1) : "-"),
    productRawText(product, "monthlySoldText") ?? productRawText(product, "totalSoldText") ?? formatNumber(product.monthlySold ?? product.totalSold)
  ] satisfies DocxCellValue[]));
  return tableWithHeader(
    ["Thumbnail", "Product name", "Price", "Rating", "Sold"],
    rows
  );
}

function productFactTable(product: ReportData["products"][number]): Table {
  return simpleTable([
    ["Price", formatCurrency(product.priceAverage)],
    ["Store Name", product.storeName ?? "-"],
    ["Store Type", storeType(product)],
    ["Rating", productRawText(product, "ratingText") ?? (product.rating ? product.rating.toFixed(1) : "-")],
    ["Reviews", productRawText(product, "reviewText") ?? formatNumber(product.reviewCount)],
    ["Total Sold", productRawText(product, "totalSoldText") ?? formatNumber(product.totalSold)]
  ], [30, 70]);
}

function promotionTable(shopVouchers: string[], bundleDeals: string[]): Table {
  return simpleTable([
    ["Shop Vouchers", shopVouchers.slice(0, 8).join("\n") || "No promotion signal captured."],
    ["Bundle Deals", bundleDeals.slice(0, 8).join("\n") || "No promotion signal captured."]
  ], [30, 70]);
}

function reviewTable(reviews: ReportData["reviews"]): Table {
  const rows = curatedReviewsForReport(reviews).map((review) => [
    review.sentiment === "NEGATIVE" ? "Negative Reviews" : "Positive Reviews",
    review.rating ? `${review.rating} Star` : "-",
    formatReviewText(review)
  ]);
  return tableWithHeader(["Type", "Star Rated", "Comment - Include timestamp"], rows.length > 0 ? rows : [["-", "-", "No review text collected yet."]]);
}

async function remoteImageBlocks(urls: string[], label: string): Promise<DocxChild[]> {
  const blocks: DocxChild[] = [];
  const images = uniqueMediaUrls(urls).filter(isReportProductImageUrl).slice(0, 24);
  for (const [index, url] of images.entries()) {
    const image = await imageParagraph(url, `${label} ${index + 1}`);
    if (image) {
      blocks.push(image);
    }
  }
  if (blocks.length === 0) {
    blocks.push(paragraph(`No ${label.toLowerCase()} image captured.`, { color: MUTED }));
  }
  return blocks;
}

async function remoteImageGridBlocks(urls: string[], label: string, limit: number): Promise<DocxChild[]> {
  const images = uniqueMediaUrls(urls).filter(isReportProductImageUrl).slice(0, limit);
  const imageParagraphs = (await Promise.all(images.map((url, index) =>
    imageOnlyParagraph(url, `${label} ${index + 1}`, { maxWidth: 150, maxHeight: 150, minWidth: 48, minHeight: 48 })
  ))).filter(Boolean) as Paragraph[];
  if (imageParagraphs.length === 0) {
    return [paragraph(`No ${label.toLowerCase()} image captured.`, { color: MUTED })];
  }
  const rows: TableRow[] = [];
  for (let index = 0; index < imageParagraphs.length; index += 3) {
    const rowItems = imageParagraphs.slice(index, index + 3);
    rows.push(new TableRow({
      children: [0, 1, 2].map((cellIndex) => cell(rowItems[cellIndex], { width: 33 }))
    }));
  }
  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorders(),
      rows
    })
  ];
}

async function assetImageBlocks(
  assets: ReportData["assets"],
  label: string,
  options: { captions?: boolean; layout?: "default" | "portraitEvidence" } = {}
): Promise<DocxChild[]> {
  const blocks: DocxChild[] = [];
  for (const [index, asset] of assets.slice(0, 24).entries()) {
    const caption = asset.label || `${label} ${index + 1}`;
    const image = options.captions === false
      ? await imageOnlyParagraph(asset.path, caption, options.layout === "portraitEvidence"
        ? { targetWidth: 288, targetHeight: 512, fit: "cover", position: "top" }
        : { maxWidth: 520, maxHeight: 360, minWidth: 80, minHeight: 80 })
      : await imageParagraph(asset.path, caption);
    if (image) {
      blocks.push(image);
    }
  }
  if (blocks.length === 0) {
    blocks.push(paragraph(`No ${label.toLowerCase()} evidence captured.`, { color: MUTED }));
  }
  return blocks;
}

async function imageParagraph(source: string, caption: string): Promise<Paragraph | undefined> {
  const image = await loadDocxImage(source);
  if (!image) {
    return undefined;
  }
  return new Paragraph({
    spacing: { before: 80, after: 120 },
    children: [
      new ImageRun({
        type: "jpg",
        data: image.buffer,
        transformation: { width: image.width, height: image.height },
        altText: {
          title: caption,
          name: caption,
          description: caption
        }
      }),
      new TextRun({ text: `\n${caption}`, color: MUTED, size: 17 })
    ]
  });
}

async function imageOnlyParagraph(
  source: string | undefined,
  altText: string,
  options?: ImageLoadOptions
): Promise<Paragraph | undefined> {
  if (!source) {
    return undefined;
  }
  const image = await loadDocxImage(source, options);
  if (!image) {
    return undefined;
  }
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    children: [
      new ImageRun({
        type: "jpg",
        data: image.buffer,
        transformation: { width: image.width, height: image.height },
        altText: {
          title: altText,
          name: altText,
          description: altText
        }
      })
    ]
  });
}

async function loadDocxImage(
  source: string,
  options: ImageLoadOptions = {}
): Promise<{ buffer: Buffer; width: number; height: number } | undefined> {
  try {
    const buffer = await readImageSource(source);
    const metadata = await sharp(buffer).metadata();
    const originalWidth = metadata.width ?? 900;
    const originalHeight = metadata.height ?? 650;
    if (options.targetWidth && options.targetHeight) {
      const width = options.targetWidth;
      const height = options.targetHeight;
      const output = await sharp(buffer)
        .rotate()
        .resize({
          width,
          height,
          fit: options.fit ?? "cover",
          position: options.position ?? "top"
        })
        .jpeg({ quality: 92, mozjpeg: true })
        .toBuffer();
      return { buffer: output, width, height };
    }
    const maxWidth = options.maxWidth ?? 520;
    const maxHeight = options.maxHeight ?? 360;
    const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight, 1);
    const width = Math.max(options.minWidth ?? 80, Math.round(originalWidth * ratio));
    const height = Math.max(options.minHeight ?? 80, Math.round(originalHeight * ratio));
    const output = await sharp(buffer)
      .rotate()
      .resize({ width, height, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
    return { buffer: output, width, height };
  } catch {
    return undefined;
  }
}

async function readImageSource(source: string): Promise<Buffer> {
  if (/^https?:\/\//iu.test(source)) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    try {
      const response = await fetch(source, {
        signal: controller.signal,
        headers: {
          accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "user-agent": "Mozilla/5.0 Marketplace Intelligence OS"
        }
      });
      if (!response.ok) {
        throw new Error(`Image request failed with ${response.status}`);
      }
      return Buffer.from(await response.arrayBuffer());
    } finally {
      clearTimeout(timeout);
    }
  }
  const localPath = source.startsWith("file:") ? fileURLToPath(source) : source;
  return readFile(localPath);
}

function tableWithHeader(headers: string[], rows: DocxCellValue[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders(),
    rows: [
      new TableRow({
        children: headers.map((header) => cell(header, { header: true }))
      }),
      ...rows.map((row) => new TableRow({ children: row.map((value) => cell(value)) }))
    ]
  });
}

function simpleTable(rows: string[][], columnWidths: [number, number]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths,
    borders: tableBorders(),
    rows: rows.map((row) => new TableRow({
      children: [
        cell(row[0] ?? "", { header: true, width: columnWidths[0] }),
        cell(row[1] ?? "", { width: columnWidths[1] })
      ]
    }))
  });
}

function cell(value: DocxCellValue, options: { header?: boolean; width?: number } = {}): TableCell {
  return new TableCell({
    width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
    shading: options.header ? { fill: SOFT_BLUE, color: "auto" } : undefined,
    margins: { top: 100, bottom: 100, left: 100, right: 100 },
    children: [typeof value === "string" || value === undefined
      ? paragraph(value ?? "", { size: options.header ? 18 : 17, bold: options.header, preserveLines: true })
      : value]
  });
}

function tableBorders() {
  const border = { style: BorderStyle.SINGLE, color: BORDER, size: 1 };
  return {
    top: border,
    bottom: border,
    left: border,
    right: border,
    insideHorizontal: border,
    insideVertical: border
  };
}

function titleParagraph(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.TITLE,
    spacing: { after: 180 },
    children: [new TextRun({ text, color: BLUE, size: 26, bold: true, allCaps: true })]
  });
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 260, after: 120 },
    children: [new TextRun({ text, color: INK, size: 30, bold: true })]
  });
}

function subHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 180, after: 100 },
    children: [new TextRun({ text, color: INK, size: 24, bold: true })]
  });
}

function tinyHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 120, after: 80 },
    children: [new TextRun({ text, color: BLUE, size: 20, bold: true })]
  });
}

function paragraph(text: string, options: { size?: number; bold?: boolean; color?: string; preserveLines?: boolean } = {}): Paragraph {
  const lines = options.preserveLines
    ? text.replace(/\r\n?/gu, "\n").split("\n")
    : [text.replace(/\s+/gu, " ").trim()];
  const children: ParagraphChild[] = lines.flatMap((line, index) => [
    new TextRun({
      text: line,
      break: index === 0 ? undefined : 1,
      size: options.size ?? 21,
      bold: options.bold,
      color: options.color ?? INK
    })
  ]);
  return new Paragraph({ children, spacing: { after: 100 } });
}

function bulletParagraph(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    children: [new TextRun({ text, size: 19, color: INK })],
    spacing: { after: 80 }
  });
}

function linkParagraph(text: string, url: string): Paragraph {
  return new Paragraph({
    children: [
      new ExternalHyperlink({
        link: url,
        children: [
          new TextRun({
            text,
            color: BLUE,
            underline: {}
          })
        ]
      })
    ],
    spacing: { after: 100 }
  });
}

function spacer(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: "" })], spacing: { after: 120 } });
}

function keyProductsForReport(products: ReportData["products"]): ReportData["products"] {
  const merged = new Map<string, ReportData["products"][number]>();
  for (const product of products.filter((item) => !item.source?.startsWith("Store Products") && !item.source?.startsWith("Store Best Sellers"))) {
    const key = productIdentity(product);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, product);
      continue;
    }
    merged.set(key, mergeReportProductSignals(existing, product));
  }
  const candidates = [...merged.values()].filter((product) => product.title && product.productUrl);
  return candidates
    .sort((left, right) => businessSelectionScore(right, candidates) - businessSelectionScore(left, candidates))
    .slice(0, 10);
}

function mergeReportProductSignals(left: ReportData["products"][number], right: ReportData["products"][number]): ReportData["products"][number] {
  const preferred = productQualityScore(right) > productQualityScore(left) ? right : left;
  const base = preferred === right ? left : right;
  const preferredRaw = safeJson<Record<string, unknown>>(preferred.rawJson, {});
  const baseRaw = safeJson<Record<string, unknown>>(base.rawJson, {});
  return {
    ...preferred,
    storeName: preferred.storeName ?? base.storeName,
    storeUrl: preferred.storeUrl ?? base.storeUrl,
    reviewCount: preferred.reviewCount ?? base.reviewCount,
    monthlySold: preferred.monthlySold ?? base.monthlySold,
    totalSold: preferred.totalSold ?? base.totalSold,
    rating: preferred.rating ?? base.rating,
    rawJson: JSON.stringify({
      ...baseRaw,
      ...preferredRaw,
      sourcePlacement: uniqueStrings([productSourcePlacement(preferred), productSourcePlacement(base)]).join(" / "),
      productType: preferredRaw.productType ?? baseRaw.productType,
      storeType: preferredRaw.storeType ?? baseRaw.storeType,
      monthlySoldText: preferredRaw.monthlySoldText ?? baseRaw.monthlySoldText,
      totalSoldText: preferredRaw.totalSoldText ?? baseRaw.totalSoldText,
      reviewText: preferredRaw.reviewText ?? baseRaw.reviewText,
      ratingText: preferredRaw.ratingText ?? baseRaw.ratingText
    })
  };
}

function productIdentity(product: ReportData["products"][number]): string {
  try {
    const url = new URL(product.productUrl);
    return url.pathname.replace(/\/$/u, "").toLowerCase();
  } catch {
    return product.title.toLowerCase().replace(/\s+/gu, " ").trim();
  }
}

function productQualityScore(product: ReportData["products"][number]): number {
  const source = product.source ?? "";
  const rank = product.rank ?? 99;
  const topSalesBoost = source === "Top Sales" ? 120 - Math.min(rank, 99) : 35 - Math.min(rank, 35);
  const monthlySoldScore = product.monthlySold ? Math.log10(product.monthlySold + 1) * 18 : 0;
  const totalSoldScore = product.totalSold ? Math.log10(product.totalSold + 1) * 12 : 0;
  const reviewScore = product.reviewCount ? Math.log10(product.reviewCount + 1) * 10 : 0;
  const ratingScore = product.rating ? product.rating * 12 : 0;
  const priceScore = product.priceAverage ? 8 : 0;
  const imageScore = productImage(product) ? 8 : 0;
  return topSalesBoost + monthlySoldScore + totalSoldScore + reviewScore + ratingScore + priceScore + imageScore;
}

function businessSelectionScore(product: ReportData["products"][number], pool: ReportData["products"]): number {
  return productQualityScore(product) + selectionPriorityBoost(selectionPriority(product, pool));
}

function selectionPriorityBoost(priority: string): number {
  switch (priority) {
    case "Priority":
      return 95;
    case "High":
      return 70;
    case "Average":
      return 30;
    case "Not recommended":
      return -60;
    default:
      return 0;
  }
}

function selectionReasonForDisplay(product: ReportData["products"][number], pool: ReportData["products"]): string {
  const priority = selectionPriority(product, pool);
  const existing = product.selectionReason?.trim() || "-";
  if (priority === "Priority") {
    return `Priority - high price, high sold/month, and high total sold / ${existing}`;
  }
  if (priority === "High") {
    return `High - low price, high sold/month, and high total sold / ${existing}`;
  }
  if (priority === "Average") {
    return `Average - mixed price, sold/month, and total sold signals / ${existing}`;
  }
  if (priority === "Not recommended") {
    return `Not recommended - low sold/month and low total sold / ${existing}`;
  }
  return existing;
}

function selectionPriority(product: ReportData["products"][number], pool: ReportData["products"]): "Priority" | "High" | "Average" | "Not recommended" | "Review" {
  const priceBand = priceBandForProduct(product, pool);
  const soldMonth = product.monthlySold ?? 0;
  const totalSold = product.totalSold ?? 0;
  const highMonthly = isHighSignal(soldMonth, pool.map((item) => item.monthlySold ?? 0));
  const highTotal = isHighSignal(totalSold, pool.map((item) => item.totalSold ?? 0));
  if (priceBand === "high" && highMonthly && highTotal) return "Priority";
  if (priceBand === "low" && highMonthly && highTotal) return "High";
  if (priceBand === "mid" && highMonthly && !highTotal) return "Average";
  if (priceBand === "high" && !highMonthly && highTotal) return "Average";
  if (product.priceAverage && !highMonthly && !highTotal) return "Not recommended";
  return "Review";
}

function priceBandForProduct(product: ReportData["products"][number], pool: ReportData["products"]): "low" | "mid" | "high" | "unknown" {
  const prices = pool.map((item) => item.priceAverage).filter((value): value is number => typeof value === "number" && value > 0).sort((left, right) => left - right);
  if (!product.priceAverage || prices.length === 0) {
    return "unknown";
  }
  const medianPrice = prices[Math.floor(prices.length / 2)] ?? product.priceAverage;
  if (product.priceAverage >= medianPrice * 1.25) return "high";
  if (product.priceAverage <= medianPrice * 0.78) return "low";
  return "mid";
}

function isHighSignal(value: number, values: number[]): boolean {
  const usable = values.filter((item) => item > 0).sort((left, right) => left - right);
  if (value <= 0 || usable.length === 0) {
    return false;
  }
  const threshold = usable[Math.max(0, Math.floor(usable.length * 0.62))] ?? usable[usable.length - 1] ?? 0;
  return value >= Math.max(threshold, 1);
}

function productImage(product: { rawJson: string }): string | undefined {
  const raw = safeJson<{ imageUrl?: string; images?: string[] }>(product.rawJson, {});
  return uniqueMediaUrls([raw.imageUrl, ...(raw.images ?? [])]).filter(isReportProductImageUrl)[0];
}

function productRawText(product: { rawJson?: string }, key: string): string | undefined {
  const raw = product.rawJson ? safeJson<Record<string, unknown>>(product.rawJson, {}) : {};
  const value = raw[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function productSourcePlacement(product: ReportData["products"][number]): string {
  const rawPlacement = productRawText(product, "sourcePlacement");
  if (rawPlacement) {
    return formatSourcePlacement(rawPlacement, product.source);
  }
  const fallback = product.source && product.rank ? `${product.source} ${product.rank}` : product.source ?? "-";
  return formatSourcePlacement(fallback, product.source);
}

function formatSourcePlacement(value: string, source?: string | null): string {
  const parts = uniqueStrings(value.split("/").map((part) => part.trim()).filter(Boolean));
  if (parts.length === 0) {
    return "-";
  }
  return parts.map((part, index) => formatSourcePlacementToken(part, source, index)).join(" / ");
}

function formatSourcePlacementToken(value: string, source: string | null | undefined, index: number): string {
  if (/top\s+\d+\s+in\s+/iu.test(value)) {
    return value;
  }
  const rank = value.match(/\d+/u)?.[0] ?? "-";
  if (/relevance|relevancy|search/iu.test(value)) {
    return `Top ${rank} in relevance`;
  }
  if (/store\s*(popular|products)|popular|pop\b/iu.test(value)) {
    return `Top ${rank} in store popular`;
  }
  if (/store\s*(best|sales)|best\s*seller|top\s*sales|sales/iu.test(value)) {
    return `Top ${rank} in sales`;
  }
  const context = `${source ?? ""} ${value}`.toLowerCase();
  if (/store\s*(best|sales)|best\s*seller|top\s*sales|sales/iu.test(context)) {
    return `Top ${rank} in sales`;
  }
  if (/store\s*(popular|products)|popular|pop\b/iu.test(context)) {
    return `Top ${rank} in store popular`;
  }
  if (/relevance|relevancy|search/iu.test(context)) {
    return `Top ${rank} in relevance`;
  }
  if (index === 0 && source !== "Relevance") {
    return `Top ${rank} in sales`;
  }
  if (index === 1) {
    return `Top ${rank} in relevance`;
  }
  return value || "-";
}

function inferredProductType(title: string): string {
  const normalized = title.toLowerCase();
  if (/iphone\s*15|iphone15/u.test(normalized)) return "iphone15";
  if (/iphone/u.test(normalized)) return "iPhones";
  if (/bulu mata|eyelash|lashes|lash/u.test(normalized)) return "Eyelash";
  if (/eye\s*cream|krim mata|mata anti keriput/u.test(normalized)) return "eye cream";
  if (/lotion|body lotion|handbody/u.test(normalized)) return "body lotion";
  if (/lip\s*tint|lipstick|liptint/u.test(normalized)) return "lip tint";
  if (/serum/u.test(normalized)) return "serum";
  return "marketplace product";
}

function storeType(product: { mallStatus: boolean; officialStatus: boolean; starSeller: boolean; rawJson?: string }): string {
  const rawStoreType = product.rawJson ? productRawText(product, "storeType") : undefined;
  if (rawStoreType && /^(Mall ORI|Star\+|Star)$/u.test(rawStoreType)) {
    return rawStoreType;
  }
  if (product.officialStatus || product.mallStatus) {
    return "Mall ORI";
  }
  if (product.starSeller) {
    return "Star";
  }
  return "-";
}

function storeAssetsForReport(data: ReportData, store: ReportData["stores"][number]): ReportData["assets"] {
  const candidateId = reportStoreCandidateId(store);
  const storeOwned = data.assets.filter((asset) =>
    asset.ownerType === "STORE" &&
    (asset.ownerId === store.id || Boolean(candidateId && asset.ownerId === candidateId))
  );
  if (storeOwned.length > 0) {
    return storeOwned;
  }
  return data.assets.filter((asset) => assetMatchesStore(asset, store.url));
}

type StoreRatingSample = {
  rating: number;
  reviewer: string;
  reviewerUrl?: string;
  comment: string;
  productTitle?: string;
  productUrl?: string;
  productVariation?: string;
  sellerResponse?: string;
  mediaUrls: string[];
  capturedAt?: string;
};

type ReportStoreRaw = {
  storeCandidateId?: string;
  description?: string;
  ratingSamples?: StoreRatingSample[];
};

function reportStoreRaw(store: ReportData["stores"][number]): ReportStoreRaw {
  return safeJson<ReportStoreRaw>(store.rawJson, {});
}

function reportStoreCandidateId(store: ReportData["stores"][number]): string | undefined {
  const value = reportStoreRaw(store).storeCandidateId;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function reportStoreRatingSamples(store: ReportData["stores"][number]): StoreRatingSample[] {
  const samples = reportStoreRaw(store).ratingSamples;
  if (!Array.isArray(samples)) {
    return [];
  }
  return samples.filter((sample) =>
    typeof sample?.rating === "number" &&
    typeof sample.reviewer === "string" &&
    typeof sample.comment === "string" &&
    Array.isArray(sample.mediaUrls)
  );
}

function reportStoreProducts(
  data: ReportData,
  store: ReportData["stores"][number],
  sourcePrefix: "Store Products" | "Store Best Sellers"
): ReportData["products"] {
  const candidateId = reportStoreCandidateId(store);
  if (candidateId) {
    const scoped = data.products.filter((product) => product.source === `${sourcePrefix}:${candidateId}`);
    if (scoped.length > 0) {
      return scoped;
    }
  }
  const matching = data.products.filter((product) =>
    product.source?.startsWith(sourcePrefix) && productMatchesStore(product, store)
  );
  if (matching.length > 0) {
    return matching;
  }
  return data.stores.length === 1
    ? data.products.filter((product) => product.source?.startsWith(sourcePrefix))
    : [];
}

function storeOverall(store: ReportData["stores"][number], data: ReportData): string {
  void data;
  const description = sanitizeStoreDescription(reportStoreRaw(store).description);
  const summary = `${store.name} has ${formatNumber(store.productsCount)} total products and currently stands at ${store.rating ?? "-"}${store.ratingCount ? ` from ${formatNumber(store.ratingCount)} ratings` : " rating"}, ${formatNumber(store.followers)} followers, and chat performance ${sanitizeStoreMetric(store.chatResponse)}${sanitizeStoreMetric(store.joinedDate) !== "-" ? `. The store joined ${sanitizeStoreMetric(store.joinedDate)}` : ""}.`;
  return limitWords([summary, description !== "-" ? description : undefined].filter(Boolean).join("\n\n"), 1500);
}

function sanitizeStoreMetric(value?: string | null): string {
  const normalized = value?.replace(/\s+/gu, " ").trim() ?? "";
  return normalized && normalized.length <= 120 ? normalized : "-";
}

function sanitizeStoreDescription(value?: string | null): string {
  const source = value?.trim() ?? "";
  if (!source) return "-";
  const explicit = source.match(/(?:Description Store|Store Description|Deskripsi Toko)\s*:?\s*([\s\S]{20,2400})/iu)?.[1];
  const officialAccount = source.match(/([^\n]{0,160}(?:adalah akun resmi|is the official (?:store|account))[^\n]{20,1200})/iu)?.[1];
  const normalized = (explicit || officialAccount || source).replace(/\s+/gu, " ").trim();
  return normalized.length <= 2400 && !/(shopping cart|seller centre|customer service help centre).*(all rights reserved)/iu.test(normalized)
    ? normalized
    : "-";
}

function limitWords(value: string, maximumWords: number): string {
  const words = value.trim().split(/\s+/u);
  return words.length <= maximumWords ? value.trim() : `${words.slice(0, maximumWords).join(" ")}…`;
}

function projectSearchFilters(data: ReportData): { shopTypes: string; priceRange: string } {
  const state = safeJson<{
    searchFilters?: {
      shopTypes?: string[];
      priceMin?: number;
      priceMax?: number;
    };
  }>(data.project.collectionStateJson, {});
  const labels: Record<string, string> = {
    fulfilled_by_shopee: "Fulfilled by Shopee",
    shopee_mall: "Shopee Mall",
    star_plus: "Star+",
    star: "Star"
  };
  const shopTypes = state.searchFilters?.shopTypes?.map((value) => labels[value] ?? value).join(", ") || "All shop types";
  const min = state.searchFilters?.priceMin;
  const max = state.searchFilters?.priceMax;
  return {
    shopTypes,
    priceRange: min !== undefined || max !== undefined
      ? `${min !== undefined ? formatCurrency(min) : "No minimum"} - ${max !== undefined ? formatCurrency(max) : "No maximum"}`
      : "All prices"
  };
}

function productMatchesStore(product: ReportData["products"][number], store: ReportData["stores"][number]): boolean {
  if (product.storeUrl && sameReportUrl(product.storeUrl, store.url)) {
    return true;
  }
  return Boolean(product.storeName && product.storeName.toLowerCase() === store.name.toLowerCase());
}

function assetMatchesStore(asset: ReportData["assets"][number], storeUrl?: string | null): boolean {
  if (!storeUrl || !asset.sourceUrl) {
    return false;
  }
  const source = stripUrlNoise(asset.sourceUrl);
  const target = stripUrlNoise(storeUrl);
  return source.includes(target) || target.includes(source);
}

function sameReportUrl(left: string, right: string): boolean {
  return stripUrlNoise(left) === stripUrlNoise(right);
}

function stripUrlNoise(value: string): string {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//u, "")
    .replace(/^www\./u, "")
    .replace(/[?#].*$/u, "")
    .replace(/\/$/u, "");
}

function curatedReviewsForReport(reviews: ReportData["reviews"]): ReportData["reviews"] {
  const readable = reviews.filter((review) => isReadableReviewText(review.comment));
  const positive = readable
    .filter((review) => review.sentiment === "POSITIVE" || (typeof review.rating === "number" && review.rating >= 5))
    .slice(0, 3);
  const negative = readable
    .filter((review) => review.sentiment === "NEGATIVE" || (typeof review.rating === "number" && review.rating <= 3))
    .slice(0, 2);
  return [...positive, ...negative].slice(0, 5);
}

function isReadableReviewText(value: string): boolean {
  const normalized = value.trim();
  return normalized.length >= 20 &&
    /\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}(?:\s+\d{1,2}:\d{2})?\b/u.test(normalized) &&
    !/^https?:\/\//iu.test(normalized) &&
    !/(product ratings|all\s*\(|semua\s*\(|comments?\s*\(|with media|dengan media|repeat purchase|shop vouchers|bundle deals|barcode|bpom sesuai|dermatologically tested|add to cart|buy now)/iu.test(normalized);
}

function formatReviewText(review: ReportData["reviews"][number]): string {
  const commentLines = review.comment
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const hasDate = review.reviewDate ? review.comment.includes(review.reviewDate) : /\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}/u.test(review.comment);
  const hasVariation = review.variation ? review.comment.toLowerCase().includes(review.variation.toLowerCase()) : false;
  const prefix = [
    hasDate ? undefined : review.reviewDate,
    review.variation && !hasVariation ? `variation : ${review.variation}` : undefined
  ].filter(Boolean);
  return [...prefix, ...commentLines].join("\n");
}

function isReportProductImageUrl(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) {
    return false;
  }
  const lower = normalized.toLowerCase();
  if (/data:image\/svg|sprite|favicon|placeholder|default-avatar|avatar|profile|logo-shopee|shopee-logo|icon|arrow|chevron|next|previous|rating|star|cart|chat|help|verify/iu.test(lower)) {
    return false;
  }
  if (/\/(?:icons?|sprites?|avatars?)\//iu.test(lower)) {
    return false;
  }
  return /^(https?:|file:|data:image\/(?:png|jpe?g|webp|avif|gif|bmp))/iu.test(normalized);
}

function isLikelyProductVideoUrl(value: string): boolean {
  const lower = value.toLowerCase();
  return /^(https?:|file:)/iu.test(value) &&
    /\.(?:mp4|webm|m3u8)(?:$|[?#])/iu.test(lower) &&
    !/(rating|review|comment|buyer|user-media|media-in-user)/iu.test(lower);
}

function uniqueMediaUrls(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized) {
      continue;
    }
    const key = normalized
      .replace(/([?&](?:x-oss-process|width|height|resize|quality|format)=[^&]+)/giu, "")
      .replace(/@resize_[^?]+/giu, "")
      .replace(/@!.*$/u, "")
      .toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(normalized);
  }
  return unique;
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    unique.push(value);
  }
  return unique;
}

function safeJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function formatCurrency(value?: number | null): string {
  if (!value) {
    return "-";
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatNumber(value?: number | null): string {
  if (value === null || value === undefined) {
    return "-";
  }
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value);
}
