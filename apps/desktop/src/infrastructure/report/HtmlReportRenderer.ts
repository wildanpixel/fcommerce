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
    const parts = [
      documentStart(data.project.name),
      enabled.has("cover") ? cover(data) : "",
      enabled.has("keywordRelevance") ? keywordRelevance(data) : "",
      enabled.has("topSales") ? topSales(data) : "",
      enabled.has("keyProductTable") ? keyProductTable(data) : "",
      enabled.has("productDossiers") ? productDossiers(data) : "",
      enabled.has("reviewEvidence") ? reviewEvidence(data) : "",
      enabled.has("storeOverview") ? storeOverview(data) : "",
      enabled.has("storeDossiers") ? storeDossiers(data) : "",
      enabled.has("visualStyle") ? visualStyle(data) : "",
      enabled.has("crossPlatformEvidence") ? crossPlatformEvidence(data) : "",
      enabled.has("aiRecommendations") ? aiRecommendations(data) : "",
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
    @page { size: A4; margin: 18mm 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, Arial, sans-serif; color: #20242c; background: #fff; }
    h1 { margin: 0 0 10px; font-size: 28px; line-height: 1.15; }
    h2 { margin: 0 0 14px; font-size: 22px; break-after: avoid; }
    h3 { margin: 0 0 10px; font-size: 16px; break-after: avoid; }
    p { margin: 0 0 10px; line-height: 1.45; }
    .page { page-break-after: always; }
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
    .asset img { display: block; width: 100%; height: auto; }
    .asset span { display: block; padding: 6px 8px; font-size: 10px; color: #475467; }
    .product-thumb { width: 54px; height: 54px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e6ee; background: #f8fafc; }
    .badge { display: inline-block; border-radius: 999px; padding: 3px 8px; background: #eef4ff; color: #2855ba; font-size: 10px; font-weight: 700; }
    .analysis { border: 1px solid #dfe4ef; border-radius: 8px; padding: 14px; margin-bottom: 12px; break-inside: avoid; }
    .score-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 12px 0; }
    .score { background: #f2f5fb; border-radius: 8px; padding: 8px; font-size: 10px; }
    .score b { display: block; font-size: 18px; color: #1d4ed8; }
    .section-note { border-left: 3px solid #4778ef; padding-left: 10px; color: #475467; margin-bottom: 12px; }
    .small { font-size: 10px; }
    details.report-section { border: 1px solid #dfe4ef; border-radius: 10px; padding: 14px; margin: 0 0 18px; break-after: page; }
    details.report-section > summary { cursor: pointer; font-weight: 800; color: #1d2939; list-style: none; }
    details.report-section > summary::-webkit-details-marker { display: none; }
    details.report-section > summary::before { content: "▾"; display: inline-block; margin-right: 8px; color: #4778ef; }
    details.report-section:not([open]) > summary::before { content: "▸"; }
    .report-body { margin-top: 14px; }
    @media print {
      details.report-section { border: 0; padding: 0; }
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

function cover(data: ReportData): string {
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

function keywordRelevance(data: ReportData): string {
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

function topSales(data: ReportData): string {
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
        ${data.products
          .map(
            (product, index) => `<tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(product.source ?? `Key Product #${product.rank ?? index + 1}`)}</td>
              <td>${escapeHtml(product.selectionReason ?? "platform recommended")}</td>
              <td><a href="${escapeAttribute(product.productUrl)}">${escapeHtml(product.title)}</a></td>
              <td>${formatNumber(product.monthlySold)}</td>
              <td>${escapeHtml(product.storeName ?? "Unknown")}</td>
              <td>${escapeHtml(storeType(product))}</td>
              <td>${formatCurrency(product.priceAverage)}</td>
              <td>${product.rating ? product.rating.toFixed(1) : "-"}</td>
              <td>${formatNumber(product.reviewCount)}</td>
              <td>${formatNumber(product.totalSold)}</td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>
    </div>
  </details>`;
}

function productDossiers(data: ReportData): string {
  return data.products
    .map((product, index) => {
      const productAssets = data.assets.filter(
        (asset) => asset.ownerType === "PRODUCT" && asset.ownerId === product.id
      );
      const productReviews = data.reviews.filter((review) => review.productId === product.id);
      const storeAssets = data.assets.filter((asset) => assetMatchesStore(asset, product.storeUrl));
      const variants = safeJson<string[]>(product.variantsJson, []);
      const specs = safeJson<Record<string, string>>(product.specificationsJson, {});
      const raw = safeJson<{ imageUrl?: string; images?: string[]; evidencePlan?: { productImages?: string[]; productVideos?: string[] } }>(product.rawJson, {});
      const productImages = uniqueStrings([...(raw.evidencePlan?.productImages ?? []), ...(raw.images ?? []), raw.imageUrl].filter(Boolean));
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
        <h3>First Page</h3>
        ${assetGrid(productAssets.filter((asset) => asset.kind === "PRODUCT_PAGE"))}
        <h3>Product Images</h3>
        ${remoteImageGrid(productImages.slice(0, 9))}
        ${assetGrid(productAssets.filter((asset) => asset.kind === "PRODUCT_IMAGE"))}
        <h3>Description</h3>
        <p>${escapeHtml(product.description ?? "No browser-readable description captured. Screenshot evidence is retained.")}</p>
        ${assetGrid(productAssets.filter((asset) => asset.kind === "PRODUCT_DESCRIPTION"))}
        <h3>Variants</h3>
        <p>${escapeHtml(variants.slice(0, 12).join(", ") || "No variants detected")}</p>
        <h3>Specifications</h3>
        <table><tbody>${Object.entries(specs)
          .slice(0, 12)
          .map(([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`)
          .join("")}</tbody></table>
        <h3>Reviews</h3>
        ${reviewTable(productReviews)}
        ${assetGrid(productAssets.filter((asset) => asset.kind === "REVIEW_SECTION"))}
        <h3>Media in user</h3>
        ${assetGrid(productAssets.filter((asset) => asset.kind === "REVIEW_IMAGE"))}
        <h3>Shop homepage</h3>
        ${assetGrid(storeAssets.filter((asset) => asset.kind === "STORE_HOME"))}
        </div>
      </details>`;
    })
    .join("\n");
}

function reviewEvidence(data: ReportData): string {
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

function storeOverview(data: ReportData): string {
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

function storeDossiers(data: ReportData): string {
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

function visualStyle(data: ReportData): string {
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
  if (reviews.length === 0) {
    return '<p class="muted">No positive/negative review rows captured for this product yet.</p>';
  }
  return `<table>
    <thead><tr><th>Type</th><th>Star rated</th><th>Comment - Include timestamp</th></tr></thead>
    <tbody>${reviews
      .slice(0, 5)
      .map(
        (review) => `<tr>
          <td>${escapeHtml(review.sentiment)}</td>
          <td>${review.rating ?? "-"}</td>
          <td>${escapeHtml([review.reviewDate, review.variation, review.comment].filter(Boolean).join(" | "))}</td>
        </tr>`
      )
      .join("")}</tbody>
  </table>`;
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

function remoteImageGrid(urls: string[]): string {
  if (urls.length === 0) {
    return '<p class="muted">No product image URLs captured as browser-readable media.</p>';
  }
  return `<div class="asset-grid">${urls
    .map(
      (url, index) => `<figure class="asset">
        <img src="${escapeAttribute(url)}" alt="Product image ${index + 1}" />
        <span>Product image ${index + 1}</span>
      </figure>`
    )
    .join("")}</div>`;
}

function productImage(product: { rawJson: string }): string | undefined {
  const raw = safeJson<{ imageUrl?: string; images?: string[] }>(product.rawJson, {});
  return raw.imageUrl ?? raw.images?.[0];
}

function storeType(product: { mallStatus: boolean; officialStatus: boolean; starSeller: boolean }): string {
  if (product.officialStatus) {
    return "Official";
  }
  if (product.mallStatus) {
    return "Mall";
  }
  if (product.starSeller) {
    return "Star Seller";
  }
  return "Marketplace";
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

function aiRecommendations(data: ReportData): string {
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
            ${score("Brand", analysis.branding.score)}
            ${score("Visual", analysis.visualQuality.score)}
            ${score("Voucher", analysis.voucherStrategy.score)}
            ${score("Position", analysis.competitivePosition.score)}
            ${score("Trust", analysis.customerTrust.score)}
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
          <td>${product.rating ?? "-"}</td>
          <td>${formatNumber(product.monthlySold)}</td>
        </tr>`;
      })
      .join("")}</tbody>
  </table>`;
}

function assetGrid(assets: ReportAsset[]): string {
  if (assets.length === 0) {
    return '<p class="muted">No evidence asset captured for this section.</p>';
  }
  return `<div class="asset-grid">${assets
    .slice(0, 12)
    .map(
      (asset) => `<figure class="asset">
        <img src="${escapeAttribute(pathToFileURL(asset.path).toString())}" alt="${escapeAttribute(asset.label)}" />
        <span>${escapeHtml(asset.label)}</span>
      </figure>`
    )
    .join("")}</div>`;
}

function score(label: string, value: number): string {
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
