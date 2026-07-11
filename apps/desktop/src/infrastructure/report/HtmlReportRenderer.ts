import { pathToFileURL } from "node:url";
import type {
  HtmlReportRenderer,
  ReportAsset,
  ReportData,
  ReportDataLoader
} from "../../application/services/ReportService.js";
import type { ReportGenerationPayload } from "../../shared/contracts.js";
import type { AiAnalysisJson } from "../../domain/models.js";

export class ConsultingHtmlReportRenderer implements HtmlReportRenderer {
  async render(data: ReportData, payload: ReportGenerationPayload): Promise<string> {
    const enabled = new Set(payload.sections.filter((section) => section.enabled).map((section) => section.id));
    const include = (...ids: Array<(typeof payload.sections)[number]["id"]>) => ids.some((id) => enabled.has(id));
    const parts = [
      documentStart(data.project.name),
      reportHeader(data),
      include("summaryMetrics", "cover") ? summaryMetrics(data) : "",
      include("keywordGeneral", "keywordRelevance", "topSales") ? keywordGeneral(data) : "",
      include("keyProducts", "keyProductTable") ? keyProductTable(data) : "",
      include(
        "productDetailFirstPage",
        "productDetailSlides",
        "productDetailDescription",
        "productDetailReviews",
        "productDetailUserMedia",
        "productDetailShopHomePage",
        "productDossiers",
        "reviewEvidence"
      ) ? productDossiers(data, enabled) : "",
      include("keyStoreHomePage", "keyStoreProducts", "keyStoreBestSellers", "keyStoreVisualStyle", "storeOverview", "storeDossiers", "visualStyle") ? keyStoreReport(data, enabled) : "",
      include("tiktokEvidence", "crossPlatformEvidence") ? crossPlatformEvidence(data) : "",
      documentEnd()
    ];
    return parts.filter(Boolean).join("\n");
  }
}

export class PrismaReportDataAdapter implements ReportDataLoader {
  constructor(
    private readonly loader: {
      load(projectId: string): Promise<ReportData>;
    }
  ) {}

  async load(projectId: string): Promise<ReportData> {
    return this.loader.load(projectId);
  }
}

function documentStart(title: string): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: 14mm 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, Arial, sans-serif; color: #20242c; background: #fff; font-size: 12px; }
    h1 { margin: 0 0 10px; font-size: 28px; line-height: 1.15; }
    h2 { margin: 0 0 14px; font-size: 22px; break-after: avoid; }
    h3 { margin: 0 0 10px; font-size: 16px; break-after: avoid; }
    p { margin: 0 0 10px; line-height: 1.45; }
    .page { page-break-after: auto; break-after: auto; }
    .cover-page { min-height: 190mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; break-after: page; }
    .muted { color: #667085; }
    .kicker { color: #3767d6; font-weight: 700; letter-spacing: .02em; text-transform: uppercase; font-size: 11px; }
    .grid { display: grid; gap: 14px; }
    .grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .metric { border: 1px solid #dfe4ef; border-radius: 8px; padding: 12px; background: #fbfcff; }
    .metric b { display: block; font-size: 20px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 10px 0 18px; }
    th { background: #4778ef; color: white; text-align: left; padding: 8px; font-size: 11px; }
    td { border: 1px solid #e2e6ee; vertical-align: top; padding: 8px; font-size: 11px; line-height: 1.35; word-break: break-word; }
    .asset-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 10px 0 18px; }
    .asset { border: 1px solid #e2e6ee; border-radius: 8px; overflow: hidden; background: #f8fafc; break-inside: avoid; }
    .asset img { display: block; width: 100%; height: 170px; object-fit: contain; background: #fff; }
    .asset video { display: block; width: 100%; aspect-ratio: 9 / 16; max-height: 300px; object-fit: contain; background: #111827; }
    .asset span { display: block; padding: 6px 8px; font-size: 10px; color: #475467; }
    .product-thumb { width: 54px; height: 54px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e6ee; background: #f8fafc; }
    .badge { display: inline-block; border-radius: 999px; padding: 3px 8px; background: #eef4ff; color: #2855ba; font-size: 10px; font-weight: 700; }
    .analysis { border: 1px solid #dfe4ef; border-radius: 8px; padding: 14px; margin-bottom: 12px; break-inside: avoid; }
    .score-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 12px 0; }
    .score { background: #f2f5fb; border-radius: 8px; padding: 8px; font-size: 10px; }
    .score b { display: block; font-size: 18px; color: #1d4ed8; }
    .section-note { border-left: 3px solid #4778ef; padding-left: 10px; color: #475467; margin-bottom: 12px; }
    .small { font-size: 10px; }
    .review-list { display: grid; gap: 10px; margin: 10px 0 18px; }
    .review-card { border: 1px solid #e2e6ee; border-radius: 8px; padding: 10px; background: #fbfcff; break-inside: avoid; }
    .review-card b { display: block; margin-bottom: 6px; color: #1d2939; }
    .review-card p { white-space: pre-line; margin: 0; }
    details.report-section { border: 1px solid #dfe4ef; border-radius: 10px; padding: 14px; margin: 0 0 18px; break-after: auto; page-break-after: auto; break-inside: auto; }
    details.report-section > summary { cursor: pointer; font-weight: 800; color: #1d2939; list-style: none; }
    details.report-section > summary::-webkit-details-marker { display: none; }
    details.report-section > summary::before { content: "▾"; display: inline-block; margin-right: 8px; color: #4778ef; }
    details.report-section:not([open]) > summary::before { content: "▸"; }
    .report-body { margin-top: 14px; }
    @media print {
      details.report-section { border: 0; padding: 0; page-break-after: auto; break-after: auto; }
      .asset, .metric, .analysis, .review-card { break-inside: avoid; page-break-inside: avoid; }
      details.report-section > summary { cursor: default; }
      details.report-section > summary::before { content: ""; margin: 0; }
    }
  </style>
</head>
<body>`;
}

function documentEnd(): string {
  return `<script>
    document.querySelectorAll("details.report-section").forEach((section) => {
      section.addEventListener("toggle", () => {
        document.body.dataset.lastToggled = section.open ? "open" : "closed";
      });
    });
  </script></body></html>`;
}

function reportHeader(data: ReportData): string {
  return `<section class="page cover-page">
    <p class="kicker">MarketPlace Keyword Competitor Analysis</p>
    <h1>${escapeHtml(data.project.keyword)}</h1>
    <p class="muted">${escapeHtml(data.project.marketplace)} keyword competitor report generated from local guided evidence.</p>
    <p class="small muted">Developer: Wildan Ega Pradana · <a href="https://www.linkedin.com/in/wildanegapradana/">https://www.linkedin.com/in/wildanegapradana/</a></p>
  </section>`;
}

function summaryMetrics(data: ReportData): string {
  return `<details class="page report-section" open>
    <summary>Summary Metrics</summary>
    <div class="report-body">
    <p class="kicker">Summary Metrics</p>
    <h2>Project Evidence Metrics</h2>
    <div class="grid four" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:22px;">
      <div class="metric">Products<b>${data.products.length}</b></div>
      <div class="metric">Stores<b>${data.stores.length}</b></div>
      <div class="metric">Reviews<b>${data.reviews.length}</b></div>
      <div class="metric">Evidence<b>${data.assets.length}</b></div>
    </div>
    </div>
  </details>`;
}

function keywordGeneral(data: ReportData): string {
  const keywordUrl = `https://shopee.co.id/search?keyword=${encodeURIComponent(data.project.keyword)}&page=0&sortBy=relevancy`;
  const topSalesUrl = `https://shopee.co.id/search?keyword=${encodeURIComponent(data.project.keyword)}&page=0&sortBy=sales`;
  return `<details class="page report-section" open>
    <summary>Keyword General</summary>
    <div class="report-body">
      <h2>Keyword General</h2>
      <h3>Relevance</h3>
      <p><a href="${escapeAttribute(keywordUrl)}">${escapeHtml(keywordUrl)}</a></p>
      ${assetGrid(data.assets.filter((asset) => asset.kind === "SEARCH_RESULT"))}
      ${snapshotProductTable(data.products.filter((product) => product.source === "Relevance"))}
      <h3>Top Sales</h3>
      <p><a href="${escapeAttribute(topSalesUrl)}">${escapeHtml(topSalesUrl)}</a></p>
      ${assetGrid(data.assets.filter((asset) => asset.kind === "TOP_SALES"))}
      ${snapshotProductTable(data.products.filter((product) => product.source === "Top Sales"))}
    </div>
  </details>`;
}

function _cover(data: ReportData): string {
  return `<section class="page">
    <p class="kicker">Marketplace Intelligence OS</p>
    <h1>${escapeHtml(data.project.keyword)}</h1>
    <p class="muted">${escapeHtml(data.project.marketplace)} competitive intelligence report</p>
    <div class="grid four" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:28px;">
      <div class="metric">Products<b>${data.products.length}</b></div>
      <div class="metric">Stores<b>${data.stores.length}</b></div>
      <div class="metric">Reviews<b>${data.reviews.length}</b></div>
      <div class="metric">Evidence<b>${data.assets.length}</b></div>
    </div>
    <p style="margin-top:28px;">Generated locally from browser-visible marketplace evidence, screenshots, structured product records, store records, review signals, and AI analysis.</p>
  </section>`;
}

function _keywordRelevance(data: ReportData): string {
  const keywordUrl = `https://shopee.co.id/search?keyword=${encodeURIComponent(data.project.keyword)}&page=0&sortBy=relevancy`;
  return `<details class="page report-section" open>
    <summary>Keyword General - Relevance</summary>
    <div class="report-body">
    <p class="kicker">Keyword General Relevance</p>
    <h2>${escapeHtml(data.project.keyword)}</h2>
    <p class="section-note">Relevance screenshot of the first Shopee search result page for the desired keyword.</p>
    <p><a href="${escapeAttribute(keywordUrl)}">${escapeHtml(keywordUrl)}</a></p>
    ${snapshotProductTable(data.products.filter((product) => product.source === "Relevance"))}
    ${assetGrid(data.assets.filter((asset) => asset.kind === "SEARCH_RESULT"))}
    </div>
  </details>`;
}

function _topSales(data: ReportData): string {
  const topSalesUrl = `https://shopee.co.id/search?keyword=${encodeURIComponent(data.project.keyword)}&page=0&sortBy=sales`;
  return `<details class="page report-section" open>
    <summary>Keyword General - Top Sales</summary>
    <div class="report-body">
    <p class="kicker">Top Sales</p>
    <h2>${escapeHtml(data.project.keyword)}</h2>
    <p class="section-note">Top-sales screenshot of the first Shopee result page for the same keyword.</p>
    <p><a href="${escapeAttribute(topSalesUrl)}">${escapeHtml(topSalesUrl)}</a></p>
    ${snapshotProductTable(data.products.filter((product) => product.source === "Top Sales"))}
    ${assetGrid(data.assets.filter((asset) => asset.kind === "TOP_SALES"))}
    </div>
  </details>`;
}

function keyProductTable(data: ReportData): string {
  const products = keyProductsForReport(data.products);
  return `<details class="page report-section" open>
    <summary>Key Product</summary>
    <div class="report-body">
    <p class="kicker">Key Product</p>
    <h2>Product Info Structured Table</h2>
    <table>
      <thead>
        <tr>
          <th style="width:6%">No</th>
          <th style="width:12%">Source</th>
          <th style="width:15%">Reason for selection</th>
          <th style="width:20%">Product title</th>
          <th style="width:9%">Product type</th>
          <th style="width:9%">Monthly sold</th>
          <th style="width:12%">Store name</th>
          <th style="width:8%">Store type</th>
          <th style="width:9%">Price</th>
          <th style="width:7%">Rating</th>
          <th style="width:7%">Reviews</th>
          <th style="width:7%">Total sold</th>
        </tr>
      </thead>
      <tbody>
        ${products
          .map(
            (product, index) => `<tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(productSourcePlacement(product))}</td>
              <td>${escapeHtml(product.selectionReason ?? "platform recommended")}</td>
              <td><a href="${escapeAttribute(product.productUrl)}">${escapeHtml(product.title)}</a></td>
              <td>${escapeHtml(productRawText(product, "productType") || inferredProductType(product.title))}</td>
              <td>${escapeHtml(productRawText(product, "monthlySoldText") || formatNumber(product.monthlySold))}</td>
              <td>${escapeHtml(product.storeName ?? "Unknown")}</td>
              <td>${escapeHtml(storeType(product))}</td>
              <td>${formatCurrency(product.priceAverage)}</td>
              <td>${escapeHtml(productRawText(product, "ratingText") || (product.rating ? product.rating.toFixed(1) : "-"))}</td>
              <td>${escapeHtml(productRawText(product, "reviewText") || formatNumber(product.reviewCount))}</td>
              <td>${escapeHtml(productRawText(product, "totalSoldText") || formatNumber(product.totalSold))}</td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>
    </div>
  </details>`;
}

function productDossiers(data: ReportData, enabled: Set<string>): string {
  const legacy = enabled.has("productDossiers") || enabled.has("reviewEvidence");
  const showFirstPage = legacy || enabled.has("productDetailFirstPage");
  const showSlides = legacy || enabled.has("productDetailSlides");
  const showDescription = legacy || enabled.has("productDetailDescription");
  const showReviews = legacy || enabled.has("productDetailReviews");
  const showUserMedia = legacy || enabled.has("productDetailUserMedia");
  const showShopHome = legacy || enabled.has("productDetailShopHomePage");
  return keyProductsForReport(data.products)
    .map((product, index) => {
      const productAssets = data.assets.filter(
        (asset) => asset.ownerType === "PRODUCT" && asset.ownerId === product.id
      );
      const productReviews = data.reviews.filter((review) => review.productId === product.id);
      const storeAssets = data.assets.filter((asset) => assetMatchesStore(asset, product.storeUrl));
      const variants = safeJson<string[]>(product.variantsJson, []);
      const specs = safeJson<Record<string, string>>(product.specificationsJson, {});
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
      const productVideos = uniqueMediaUrls(raw.evidencePlan?.productVideos ?? [])
        .filter(isLikelyProductVideoUrl)
        .slice(0, 1);
      const productImages = uniqueMediaUrls([...(raw.evidencePlan?.productImages ?? []), ...(raw.images ?? []), raw.imageUrl].filter(Boolean))
        .filter(isReportProductImageUrl)
        .slice(0, productVideos.length > 0 ? 8 : 9);
      const descriptionImages = uniqueStrings(raw.descriptionImages ?? []);
      const reviewImages = uniqueStrings(raw.reviewMediaImages ?? []);
      const reviewVideos = uniqueStrings(raw.reviewMediaVideos ?? []);
      const shopHomeAssets = [
        ...productAssets.filter((asset) => asset.kind === "STORE_HOME"),
        ...storeAssets.filter((asset) => asset.kind === "STORE_HOME")
      ];
      return `<details class="page report-section" open>
        <summary>Product ${index + 1}</summary>
        <div class="report-body">
        <p class="kicker">Product ${index + 1}</p>
        <h2>${escapeHtml(product.title)}</h2>
        <p><a href="${escapeAttribute(product.productUrl)}">${escapeHtml(product.productUrl)}</a></p>
        <div class="grid two">
          <div class="metric">Price<b>${formatCurrency(product.priceAverage)}</b></div>
          <div class="metric">Total sold<b>${formatNumber(product.totalSold)}</b></div>
        </div>
        ${showFirstPage ? `<h3>1st page</h3>${assetGrid(productAssets.filter((asset) => asset.kind === "PRODUCT_PAGE"))}` : ""}
        ${showSlides ? `<h3>Slides</h3>${remoteImageGrid(productImages, "Product slide")}${remoteVideoGrid(productVideos)}` : ""}
        ${showDescription ? `<h3>Description</h3><p style="white-space:pre-line;">${escapeHtml(product.description ?? "No browser-readable description captured. Screenshot evidence is retained.")}</p>${remoteImageGrid(descriptionImages.slice(0, 24))}${assetGrid(productAssets.filter((asset) => asset.kind === "PRODUCT_DESCRIPTION"))}<h3>Variants</h3><p>${escapeHtml(variants.slice(0, 12).join(", ") || "No variants detected")}</p><h3>Specifications</h3><table><tbody>${Object.entries(specs).slice(0, 12).map(([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`).join("")}</tbody></table>` : ""}
        ${showReviews ? `<h3>Reviews</h3>${reviewTable(productReviews)}` : ""}
        ${showUserMedia ? `<h3>Media in user</h3>${remoteImageGrid(reviewImages.slice(0, 30), "Review media")}${remoteVideoGrid(reviewVideos.slice(0, 12))}${assetGrid(productAssets.filter((asset) => asset.kind === "REVIEW_IMAGE"))}` : ""}
        ${showShopHome ? `<h3>Shop Home Page</h3>${assetGrid(shopHomeAssets)}` : ""}
        </div>
      </details>`;
    })
    .join("\n");
}

function keyStoreReport(data: ReportData, enabled: Set<string>): string {
  const legacy = enabled.has("storeOverview") || enabled.has("storeDossiers") || enabled.has("visualStyle");
  const showHome = legacy || enabled.has("keyStoreHomePage");
  const showProducts = legacy || enabled.has("keyStoreProducts");
  const showBestSellers = legacy || enabled.has("keyStoreBestSellers");
  const showVisualStyle = legacy || enabled.has("keyStoreVisualStyle");
  const store = selectReportKeyStore(data);
  if (!store) {
    return `<details class="page report-section" open>
      <summary>Key Store</summary>
      <div class="report-body"><p class="muted">No Key Store evidence has been selected yet.</p></div>
    </details>`;
  }
  const assets = storeAssetsForReport(data, store);
  const storeProducts = data.products.filter((product) => product.source === "Store Products");
  const storeBestSellers = data.products.filter((product) => product.source === "Store Best Sellers");
  return `<details class="page report-section" open>
    <summary>Key Store</summary>
    <div class="report-body">
      <p class="kicker">Key Store</p>
      <h2>${escapeHtml(store.name)}</h2>
      <p><a href="${escapeAttribute(store.url)}">${escapeHtml(store.url)}</a></p>
      <h3>Overall</h3>
      <p>${escapeHtml(storeOverall(store, data))}</p>
      ${showHome ? `<h3>Store Home Page</h3>${assetGrid(assets.filter((asset) => asset.kind === "STORE_HOME"), 12)}` : ""}
      ${showProducts ? `<h3>Products</h3>${snapshotProductTable(storeProducts)}` : ""}
      ${showBestSellers ? `<h3>Best Sellers</h3>${snapshotProductTable(storeBestSellers)}` : ""}
      ${showVisualStyle ? `<h3>Visual Style</h3>${assetGrid(assets.filter((asset) => asset.kind === "STORE_BANNER"), 80)}` : ""}
    </div>
  </details>`;
}

function _reviewEvidence(data: ReportData): string {
  return `<details class="page report-section" open>
    <summary>Reviews</summary>
    <div class="report-body">
    <p class="kicker">Reviews</p>
    <h2>Positive And Negative Review Evidence</h2>
    <table>
      <thead><tr><th>Type</th><th>Star rated</th><th>Comment</th></tr></thead>
      <tbody>${data.reviews
        .slice(0, 30)
        .map(
          (review) => `<tr>
            <td><span class="badge">${escapeHtml(review.sentiment)}</span></td>
            <td>${review.rating ?? "-"}</td>
            <td>${escapeHtml([review.reviewDate, review.variation, review.comment].filter(Boolean).join(" | "))}</td>
          </tr>`
        )
        .join("")}</tbody>
    </table>
    ${assetGrid(data.assets.filter((asset) => asset.kind === "REVIEW_SECTION" || asset.kind === "REVIEW_IMAGE"))}
    </div>
  </details>`;
}

function _storeOverview(data: ReportData): string {
  return `<details class="page report-section" open>
    <summary>Key Store Overview</summary>
    <div class="report-body">
    <p class="kicker">Key Stores</p>
    <h2>Store Selection Criteria</h2>
    <ul>
      <li>店铺首页 / 商品矩阵 / 爆品区 / 视觉风格.</li>
      <li>Top white-label or category brands visible in keyword results.</li>
      <li>Official, mall, star, or high-trust stores.</li>
      <li>Stores with strong visual merchandising and repeated keyword presence.</li>
      <li>Stores appearing across relevance and top-sales discovery.</li>
    </ul>
    <table>
      <thead><tr><th>Store</th><th>Link</th><th>Overall</th><th>Followers</th><th>Products</th><th>Rating</th><th>Voucher Count</th></tr></thead>
      <tbody>${data.stores
        .map(
          (store) => `<tr>
            <td>${escapeHtml(store.name)}</td>
            <td><a href="${escapeAttribute(store.url)}">${escapeHtml(store.url)}</a></td>
            <td>${escapeHtml(storeOverall(store, data))}</td>
            <td>${formatNumber(store.followers)}</td>
            <td>${formatNumber(store.productsCount)}</td>
            <td>${store.rating ?? "-"}</td>
            <td>${formatNumber(store.voucherCount)}</td>
          </tr>`
        )
        .join("")}</tbody>
    </table>
    </div>
  </details>`;
}

function _storeDossiers(data: ReportData): string {
  return data.stores
    .map((store) => {
      const assets = data.assets.filter((asset) => asset.ownerType === "STORE" && asset.ownerId === store.id);
      return `<details class="page report-section" open>
        <summary>Key Store - ${escapeHtml(store.name)}</summary>
        <div class="report-body">
        <p class="kicker">Store Homepage</p>
        <h2>${escapeHtml(store.name)}</h2>
        <p><a href="${escapeAttribute(store.url)}">${escapeHtml(store.url)}</a></p>
        <div class="grid three">
          <div class="metric">Followers<b>${formatNumber(store.followers)}</b></div>
          <div class="metric">Products<b>${formatNumber(store.productsCount)}</b></div>
          <div class="metric">Rating<b>${store.rating ?? "-"}</b></div>
        </div>
        <h3>Store Homepage</h3>
        ${assetGrid(assets.filter((asset) => asset.kind === "STORE_HOME"))}
        <h3>Products</h3>
        ${assetGrid(assets.filter((asset) => asset.kind === "STORE_FEATURED_PRODUCTS"))}
        <h3>Bestseller</h3>
        ${assetGrid(assets.filter((asset) => asset.kind === "STORE_BEST_SELLER"))}
        <h3>Visual Style</h3>
        ${assetGrid(assets.filter((asset) => asset.kind === "STORE_BANNER" || asset.kind === "STORE_PROMOTION"))}
        </div>
      </details>`;
    })
    .join("\n");
}

function _visualStyle(data: ReportData): string {
  return `<details class="page report-section" open>
    <summary>Visual Style</summary>
    <div class="report-body">
    <p class="kicker">Visual Style</p>
    <h2>Store Banners And Creative Assets</h2>
    ${assetGrid(
      data.assets.filter((asset) =>
        ["STORE_BANNER", "STORE_FEATURED_PRODUCTS", "STORE_BEST_SELLER", "STORE_PROMOTION", "STORE_HOME"].includes(
          asset.kind
        )
      )
    )}
    </div>
  </details>`;
}

function reviewTable(reviews: ReportData["reviews"]): string {
  const curatedReviews = curatedReviewsForReport(reviews);
  if (curatedReviews.length === 0) {
    return '<p class="muted">No positive/negative review rows captured for this product yet.</p>';
  }
  return `<div class="review-list">${curatedReviews
    .map(
      (review) => `<div class="review-card">
        <b>${escapeHtml(review.sentiment === "NEGATIVE" ? "Negative Reviews" : "Positive Reviews")} · ${escapeHtml(review.rating ? `${review.rating} Star` : "-")}</b>
        <p>${escapeHtml(formatReviewText(review))}</p>
      </div>`
    )
    .join("")}</div>`;
}

function assetMatchesStore(asset: ReportAsset, storeUrl?: string | null): boolean {
  if (!storeUrl || !asset.sourceUrl) {
    return false;
  }
  const source = stripUrlNoise(asset.sourceUrl);
  const target = stripUrlNoise(storeUrl);
  return source.includes(target) || target.includes(source);
}

function stripUrlNoise(value: string): string {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//u, "")
    .replace(/^www\./u, "")
    .replace(/[?#].*$/u, "")
    .replace(/\/$/u, "");
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
  const commentContainsDate = review.reviewDate ? review.comment.includes(review.reviewDate) : /\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}/u.test(review.comment);
  const commentContainsVariation = review.variation ? review.comment.toLowerCase().includes(review.variation.toLowerCase()) : false;
  const prefix = [
    commentContainsDate ? undefined : review.reviewDate,
    review.variation && !commentContainsVariation ? `variation : ${review.variation}` : undefined
  ].filter(Boolean);
  if (prefix.length > 0) {
    const dateLine = prefix.join(" | ");
    return [dateLine, ...commentLines].join("\n");
  }
  return commentLines.join("\n");
}

function remoteImageGrid(urls: string[], label = "Product image"): string {
  const filteredUrls = uniqueMediaUrls(urls).filter(isReportProductImageUrl);
  if (filteredUrls.length === 0) {
    return '<p class="muted">No product image URLs captured as browser-readable media.</p>';
  }
  return `<div class="asset-grid">${filteredUrls
    .map(
      (url, index) => `<figure class="asset">
        <img src="${escapeAttribute(reportMediaSource(url))}" alt="${escapeAttribute(label)} ${index + 1}" />
        <span>${escapeHtml(label)} ${index + 1}</span>
      </figure>`
    )
    .join("")}</div>`;
}

function remoteVideoGrid(urls: string[]): string {
  if (urls.length === 0) {
    return "";
  }
  return `<div class="asset-grid">${urls
    .map(
      (url, index) => `<figure class="asset">
        <video controls preload="metadata" src="${escapeAttribute(reportMediaSource(url))}"></video>
        <span>Product video ${index + 1}</span>
      </figure>`
    )
    .join("")}</div>`;
}

function reportMediaSource(value: string): string {
  return /^(https?:|data:|file:)/iu.test(value) ? value : pathToFileURL(value).toString();
}

function productImage(product: { rawJson: string }): string | undefined {
  const raw = safeJson<{ imageUrl?: string; images?: string[] }>(product.rawJson, {});
  return raw.imageUrl ?? raw.images?.[0];
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

function storeOverall(store: { rating?: number | null; followers?: number | null; voucherCount?: number | null }, data: ReportData): string {
  const analysis = data.analyses[0]?.resultJson ? safeJson<AiAnalysisJson | null>(data.analyses[0].resultJson, null) : null;
  if (analysis?.competitivePosition.observations[0]) {
    return analysis.competitivePosition.observations[0];
  }
  const cues = [
    store.rating ? `rating ${store.rating}` : undefined,
    store.followers ? `${formatNumber(store.followers)} followers` : undefined,
    store.voucherCount ? `${formatNumber(store.voucherCount)} voucher signals` : undefined
  ].filter(Boolean);
  return cues.length > 0 ? `AI-ready store candidate with ${cues.join(", ")}.` : "AI-ready store candidate; screenshot evidence required for final scoring.";
}

function keyProductsForReport(products: ReportData["products"]): ReportData["products"] {
  const merged = new Map<string, ReportData["products"][number]>();
  for (const product of products.filter((item) => item.source !== "Store Products" && item.source !== "Store Best Sellers")) {
    const key = productIdentity(product);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, product);
      continue;
    }
    merged.set(key, mergeReportProductSignals(existing, product));
  }
  return [...merged.values()]
    .filter((product) => product.title && product.productUrl)
    .sort((left, right) => productQualityScore(right) - productQualityScore(left))
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
  if (/iphone\s*15|iphone15/u.test(normalized)) {
    return "iphone15";
  }
  if (/iphone/u.test(normalized)) {
    return "iPhones";
  }
  if (/bulu mata|eyelash|lashes|lash/u.test(normalized)) {
    return "Eyelash";
  }
  if (/eye\s*cream|krim mata|mata anti keriput/u.test(normalized)) {
    return "eye cream";
  }
  if (/lotion|body lotion|handbody/u.test(normalized)) {
    return "body lotion";
  }
  if (/lip\s*tint|lipstick|liptint/u.test(normalized)) {
    return "lip tint";
  }
  if (/serum/u.test(normalized)) {
    return "serum";
  }
  return "marketplace product";
}

function selectReportKeyStore(data: ReportData): ReportData["stores"][number] | undefined {
  const keyProducts = keyProductsForReport(data.products);
  const byStore = new Map<string, { count: number; gmv: number; storeName?: string; storeUrl?: string }>();
  for (const product of keyProducts) {
    const storeName = product.storeName ?? undefined;
    const storeUrl = product.storeUrl ?? undefined;
    const key = (storeUrl ?? storeName ?? "").toLowerCase();
    if (!key) {
      continue;
    }
    const current = byStore.get(key) ?? { count: 0, gmv: 0, storeName, storeUrl };
    current.count += 1;
    current.gmv += (product.priceAverage ?? 0) * (product.monthlySold ?? product.totalSold ?? 0);
    byStore.set(key, current);
  }
  const selected = [...byStore.values()].sort((left, right) => right.gmv - left.gmv || right.count - left.count)[0];
  if (!selected) {
    return data.stores[0];
  }
  return data.stores.find((store) =>
    (selected.storeUrl && sameReportUrl(store.url, selected.storeUrl)) ||
    (selected.storeName && store.name.toLowerCase() === selected.storeName.toLowerCase())
  ) ?? data.stores[0];
}

function storeAssetsForReport(data: ReportData, store: ReportData["stores"][number]): ReportAsset[] {
  const storeOwned = data.assets.filter((asset) => asset.ownerType === "STORE" && asset.ownerId === store.id);
  if (storeOwned.length > 0) {
    return storeOwned;
  }
  return data.assets.filter((asset) => assetMatchesStore(asset, store.url));
}

function sameReportUrl(left: string, right: string): boolean {
  return stripUrlNoise(left) === stripUrlNoise(right);
}

function crossPlatformEvidence(data: ReportData): string {
  return `<details class="page report-section" open>
    <summary>TikTok Evidence</summary>
    <div class="report-body">
    <p class="kicker">Cross Platform Evidence</p>
    <h2>Social And Mobile Signals</h2>
    <p class="section-note">Shopee web collection keeps this section modular. App-only TikTok/Shopee mobile screenshots can be imported as assets, while future adapters can automate them directly.</p>
    ${assetGrid(data.assets.filter((asset) => asset.kind === "SOCIAL_ACCOUNT"))}
    </div>
  </details>`;
}

function _aiRecommendations(data: ReportData): string {
  const analyses = data.analyses.map((analysis) => safeJson<AiAnalysisJson | null>(analysis.resultJson, null)).filter(Boolean);
  return `<details class="page report-section" open>
    <summary>AI Recommendations</summary>
    <div class="report-body">
    <p class="kicker">AI Analysis</p>
    <h2>Structured Recommendations</h2>
    ${analyses
      .map((analysis) => {
        if (!analysis) {
          return "";
        }
        return `<div class="analysis">
          <h3>${escapeHtml(analysis.provider)} analysis</h3>
          <div class="score-row">
            ${_score("Brand", analysis.branding.score)}
            ${_score("Visual", analysis.visualQuality.score)}
            ${_score("Voucher", analysis.voucherStrategy.score)}
            ${_score("Position", analysis.competitivePosition.score)}
            ${_score("Trust", analysis.customerTrust.score)}
          </div>
          <h3>Recommendations</h3>
          <table><tbody>${analysis.recommendations
            .map(
              (item) => `<tr><td>${escapeHtml(item.priority)}</td><td>${escapeHtml(item.action)}</td><td>${escapeHtml(item.rationale)}</td></tr>`
            )
            .join("")}</tbody></table>
          <p class="small muted">Limitations: ${escapeHtml(analysis.automationLimitations.join("; ") || "None reported")}</p>
        </div>`;
      })
      .join("")}
    </div>
  </details>`;
}

function snapshotProductTable(products: ReportData["products"]): string {
  if (products.length === 0) {
    return '<p class="muted">No rendered product rows extracted for this snapshot yet.</p>';
  }
  return `<table>
    <thead><tr><th style="width:8%">Thumbnail</th><th>Product name</th><th style="width:14%">Price</th><th style="width:10%">Rating</th><th style="width:12%">Sold</th></tr></thead>
    <tbody>${products
      .map((product) => {
        const imageUrl = productImage(product);
        return `<tr>
          <td>${imageUrl ? `<img class="product-thumb" src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(product.title)}" />` : "-"}</td>
          <td><a href="${escapeAttribute(product.productUrl)}">${escapeHtml(product.title)}</a></td>
          <td>${formatCurrency(product.priceAverage)}</td>
          <td>${escapeHtml(productRawText(product, "ratingText") || (product.rating ? product.rating.toFixed(1) : "-"))}</td>
          <td>${escapeHtml(productRawText(product, "monthlySoldText") || productRawText(product, "totalSoldText") || formatNumber(product.monthlySold ?? product.totalSold))}</td>
        </tr>`;
      })
      .join("")}</tbody>
  </table>`;
}

function assetGrid(assets: ReportAsset[], limit = 12): string {
  if (assets.length === 0) {
    return '<p class="muted">No evidence asset captured for this section.</p>';
  }
  return `<div class="asset-grid">${assets
    .slice(0, limit)
    .map(
      (asset) => `<figure class="asset">
        <img src="${escapeAttribute(pathToFileURL(asset.path).toString())}" alt="${escapeAttribute(asset.label)}" />
        <span>${escapeHtml(asset.label)}</span>
      </figure>`
    )
    .join("")}</div>`;
}

function _score(label: string, value: number): string {
  return `<div class="score">${escapeHtml(label)}<b>${Math.round(value)}</b></div>`;
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
  return new Intl.NumberFormat("id-ID").format(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
