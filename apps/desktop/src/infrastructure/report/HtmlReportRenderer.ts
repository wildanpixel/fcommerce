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
    .badge { display: inline-block; border-radius: 999px; padding: 3px 8px; background: #eef4ff; color: #2855ba; font-size: 10px; font-weight: 700; }
    .analysis { border: 1px solid #dfe4ef; border-radius: 8px; padding: 14px; margin-bottom: 12px; break-inside: avoid; }
    .score-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 12px 0; }
    .score { background: #f2f5fb; border-radius: 8px; padding: 8px; font-size: 10px; }
    .score b { display: block; font-size: 18px; color: #1d4ed8; }
    .section-note { border-left: 3px solid #4778ef; padding-left: 10px; color: #475467; margin-bottom: 12px; }
    .small { font-size: 10px; }
  </style>
</head>
<body>`;
}

function documentEnd(): string {
  return "</body></html>";
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
  return `<section class="page">
    <p class="kicker">Keyword General Relevance</p>
    <h2>Search Result Evidence</h2>
    <p class="section-note">This section mirrors the first PDF workflow: capture the keyword result grid before narrowing into ranked competitors.</p>
    ${assetGrid(data.assets.filter((asset) => asset.kind === "SEARCH_RESULT"))}
  </section>`;
}

function topSales(data: ReportData): string {
  return `<section class="page">
    <p class="kicker">Top Sales</p>
    <h2>Sales-Sorted Marketplace View</h2>
    ${assetGrid(data.assets.filter((asset) => asset.kind === "TOP_SALES"))}
  </section>`;
}

function keyProductTable(data: ReportData): string {
  return `<section class="page">
    <p class="kicker">Key Product</p>
    <h2>Product Info Structured Table</h2>
    <table>
      <thead>
        <tr>
          <th style="width:6%">No</th>
          <th style="width:12%">Source</th>
          <th style="width:20%">Product title</th>
          <th style="width:12%">Price</th>
          <th style="width:12%">Monthly sold</th>
          <th style="width:12%">Rating</th>
          <th style="width:16%">Store</th>
          <th style="width:10%">Badges</th>
        </tr>
      </thead>
      <tbody>
        ${data.products
          .map(
            (product, index) => `<tr>
              <td>${index + 1}</td>
              <td>Top ${product.rank ?? index + 1}</td>
              <td>${escapeHtml(product.title)}</td>
              <td>${formatCurrency(product.priceAverage)}</td>
              <td>${formatNumber(product.monthlySold)}</td>
              <td>${formatRating(product.rating, product.reviewCount)}</td>
              <td>${escapeHtml(product.storeName ?? "Unknown")}</td>
              <td><span class="badge">Captured</span></td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>
  </section>`;
}

function productDossiers(data: ReportData): string {
  return data.products
    .map((product, index) => {
      const productAssets = data.assets.filter(
        (asset) => asset.ownerType === "PRODUCT" && asset.ownerId === product.id
      );
      const variants = safeJson<string[]>(product.variantsJson, []);
      const specs = safeJson<Record<string, string>>(product.specificationsJson, {});
      return `<section class="page">
        <p class="kicker">Product ${index + 1}</p>
        <h2>${escapeHtml(product.title)}</h2>
        <div class="grid two">
          <div class="metric">Price<b>${formatCurrency(product.priceAverage)}</b></div>
          <div class="metric">Total sold<b>${formatNumber(product.totalSold)}</b></div>
        </div>
        ${assetGrid(productAssets)}
        <h3>Description</h3>
        <p>${escapeHtml(product.description ?? "No browser-readable description captured. Screenshot evidence is retained.")}</p>
        <h3>Variants</h3>
        <p>${escapeHtml(variants.slice(0, 12).join(", ") || "No variants detected")}</p>
        <h3>Specifications</h3>
        <table><tbody>${Object.entries(specs)
          .slice(0, 12)
          .map(([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`)
          .join("")}</tbody></table>
      </section>`;
    })
    .join("\n");
}

function reviewEvidence(data: ReportData): string {
  return `<section class="page">
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
  </section>`;
}

function storeOverview(data: ReportData): string {
  return `<section class="page">
    <p class="kicker">Key Stores</p>
    <h2>Store Selection Criteria</h2>
    <ul>
      <li>Top white-label or category brands visible in keyword results.</li>
      <li>Official, mall, star, or high-trust stores.</li>
      <li>Stores with strong visual merchandising and repeated keyword presence.</li>
      <li>Stores appearing across relevance and top-sales discovery.</li>
    </ul>
    <table>
      <thead><tr><th>Store</th><th>Followers</th><th>Products</th><th>Rating</th><th>Voucher Count</th></tr></thead>
      <tbody>${data.stores
        .map(
          (store) => `<tr>
            <td>${escapeHtml(store.name)}</td>
            <td>${formatNumber(store.followers)}</td>
            <td>${formatNumber(store.productsCount)}</td>
            <td>${store.rating ?? "-"}</td>
            <td>${formatNumber(store.voucherCount)}</td>
          </tr>`
        )
        .join("")}</tbody>
    </table>
  </section>`;
}

function storeDossiers(data: ReportData): string {
  return data.stores
    .map((store) => {
      const assets = data.assets.filter((asset) => asset.ownerType === "STORE" && asset.ownerId === store.id);
      return `<section class="page">
        <p class="kicker">Store Homepage</p>
        <h2>${escapeHtml(store.name)}</h2>
        <p><a href="${escapeAttribute(store.url)}">${escapeHtml(store.url)}</a></p>
        <div class="grid three">
          <div class="metric">Followers<b>${formatNumber(store.followers)}</b></div>
          <div class="metric">Products<b>${formatNumber(store.productsCount)}</b></div>
          <div class="metric">Rating<b>${store.rating ?? "-"}</b></div>
        </div>
        ${assetGrid(assets)}
      </section>`;
    })
    .join("\n");
}

function visualStyle(data: ReportData): string {
  return `<section class="page">
    <p class="kicker">Visual Style</p>
    <h2>Store Banners And Creative Assets</h2>
    ${assetGrid(
      data.assets.filter((asset) =>
        ["STORE_BANNER", "STORE_FEATURED_PRODUCTS", "STORE_BEST_SELLER", "STORE_PROMOTION", "STORE_HOME"].includes(
          asset.kind
        )
      )
    )}
  </section>`;
}

function crossPlatformEvidence(data: ReportData): string {
  return `<section class="page">
    <p class="kicker">Cross Platform Evidence</p>
    <h2>Social And Mobile Signals</h2>
    <p class="section-note">Shopee web collection keeps this section modular. App-only TikTok/Shopee mobile screenshots can be imported as assets, while future adapters can automate them directly.</p>
    ${assetGrid(data.assets.filter((asset) => asset.kind === "SOCIAL_ACCOUNT"))}
  </section>`;
}

function aiRecommendations(data: ReportData): string {
  const analyses = data.analyses.map((analysis) => safeJson<AiAnalysisJson | null>(analysis.resultJson, null)).filter(Boolean);
  return `<section class="page">
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
  </section>`;
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

function formatRating(rating?: number | null, count?: number | null): string {
  if (!rating) {
    return "-";
  }
  return `${rating.toFixed(1)} (${formatNumber(count)})`;
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
