import { pathToFileURL } from "node:url";
import type {
  HtmlReportRenderer,
  ReportAsset,
  ReportData,
  ReportDataLoader
} from "../../application/services/ReportService.js";
import type { ReportGenerationPayload } from "../../shared/contracts.js";
import type { AiAnalysisJson } from "../../domain/models.js";
import { localizeReportHtml, normalizeReportLanguage } from "../../shared/reportLocalization.js";
import { resolveQualifiedProductReferences, sameQualifiedProduct } from "../../renderer/qualifiedProducts.js";

export class ConsultingHtmlReportRenderer implements HtmlReportRenderer {
  async render(data: ReportData, payload: ReportGenerationPayload): Promise<string> {
    const enabled = new Set(payload.sections.filter((section) => section.enabled).map((section) => section.id));
    const include = (...ids: Array<(typeof payload.sections)[number]["id"]>) => ids.some((id) => enabled.has(id));
    const sectionPosition = new Map(payload.sections.map((section, index) => [section.id, index]));
    const position = (...ids: Array<(typeof payload.sections)[number]["id"]>) =>
      Math.min(...ids.map((id) => sectionPosition.get(id) ?? Number.MAX_SAFE_INTEGER));
    const blocks = [
      {
        position: position("summaryMetrics", "cover"),
        html: include("summaryMetrics", "cover") ? summaryMetrics(data) : ""
      },
      {
        position: position("keywordGeneral", "keywordRelevance", "topSales"),
        html: include("keywordGeneral", "keywordRelevance", "topSales") ? keywordGeneral(data) : ""
      },
      {
        position: position("keyProducts", "keyProductTable"),
        html: include("keyProducts", "keyProductTable") ? keyProductTable(data) : ""
      },
      {
        position: position("productDetailFirstPage", "productDossiers", "reviewEvidence"),
        html: include(
          "productDetailFirstPage",
          "productDetailSlides",
          "productDetailDescription",
          "productDetailReviews",
          "productDetailUserMedia",
          "productDetailShopHomePage",
          "productDossiers",
          "reviewEvidence"
        ) ? productDossiers(data, enabled) : ""
      },
      {
        position: position("keyStoreHomePage", "keyStoreData", "keyStoreCategories", "keyStoreProducts", "keyStoreBestSellers", "keyStoreVisualStyle", "tiktokEvidence", "storeOverview", "storeDossiers", "visualStyle"),
        html: include("keyStoreHomePage", "keyStoreData", "keyStoreCategories", "keyStoreProducts", "keyStoreBestSellers", "keyStoreVisualStyle", "tiktokEvidence", "storeOverview", "storeDossiers", "visualStyle")
          ? keyStoreReport(data, enabled)
          : ""
      },
      {
        position: position("intelligence", "aiRecommendations"),
        html: include("intelligence", "aiRecommendations") ? aiRecommendations(data) : ""
      },
      {
        position: position("crossPlatformEvidence"),
        html: include("crossPlatformEvidence") ? crossPlatformEvidence(data) : ""
      }
    ].filter((block) => block.html).sort((left, right) => left.position - right.position);
    const parts = [
      documentStart(data.project.name, payload.theme ?? "light"),
      reportHeader(data),
      ...blocks.map((block) => block.html),
      documentEnd()
    ];
    return localizeReportHtml(
      parts.filter(Boolean).join("\n"),
      normalizeReportLanguage(payload.language ?? data.project.language)
    );
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

function documentStart(title: string, theme: "light" | "dark"): string {
  const bodyClass = theme === "dark" ? "report-dark" : "report-light";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: 12.7mm; }
    * { box-sizing: border-box; }
    :root { color-scheme: light dark; font-family: Arial, Helvetica, sans-serif; }
    body.report-light {
      --report-bg: #eef3f8;
      --report-panel: #ffffff;
      --report-panel-soft: #f8fafc;
      --report-text: #111827;
      --report-muted: #667085;
      --report-border: #d7dee8;
      --report-accent: #2563eb;
      --report-row: #fbfcff;
      --report-image-bg: #ffffff;
      --report-nav: #f8fafc;
    }
    body.report-dark {
      --report-bg: #11161f;
      --report-panel: #20252f;
      --report-panel-soft: #303641;
      --report-text: #eef3f9;
      --report-muted: #aab8cc;
      --report-border: #3b4656;
      --report-accent: #62a8ff;
      --report-row: #343a45;
      --report-image-bg: #ffffff;
      --report-nav: #171c25;
    }
    html { scroll-behavior: smooth; }
    body { --report-nav-width: 264px; display: grid; grid-template-columns: var(--report-nav-width) minmax(0, 1fr); min-height: 100vh; margin: 0; color: var(--report-text); background: var(--report-bg); font-family: Arial, Helvetica, sans-serif; font-size: 11px; transition: grid-template-columns .18s ease; }
    body.nav-collapsed { --report-nav-width: 68px; }
    button { font: inherit; }
    .report-nav { position: sticky; top: 0; z-index: 20; display: flex; height: 100vh; min-width: 0; flex-direction: column; gap: 12px; overflow: hidden; border-right: 1px solid var(--report-border); background: color-mix(in srgb, var(--report-nav) 94%, transparent); padding: 18px 14px; backdrop-filter: blur(18px); }
    .report-nav-header { display: flex; align-items: center; gap: 10px; min-height: 36px; }
    .report-nav-mark { display: grid; width: 36px; height: 36px; flex: 0 0 36px; place-items: center; border-radius: 11px; background: var(--report-accent); color: #fff; font-weight: 800; }
    .report-nav-title { min-width: 0; overflow: hidden; white-space: nowrap; }
    .report-nav-title b, .report-nav-title span { display: block; overflow: hidden; text-overflow: ellipsis; }
    .report-nav-title span { margin-top: 2px; color: var(--report-muted); font-size: 9px; }
    .report-nav-toggle, .report-tool, .report-nav-link, .report-nav-group-toggle { border: 1px solid var(--report-border); border-radius: 9px; background: var(--report-panel); color: var(--report-text); cursor: pointer; }
    .report-nav-toggle { display: inline-grid; width: 38px; height: 38px; flex: 0 0 38px; place-items: center; }
    .report-nav-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
    .report-tool { min-width: 0; padding: 8px 6px; font-size: 9px; white-space: nowrap; }
    .report-nav-list { display: flex; min-height: 0; flex: 1; flex-direction: column; gap: 6px; overflow-y: auto; }
    .report-nav-group { display: grid; gap: 5px; }
    .report-nav-group-toggle { display: grid; grid-template-columns: 24px minmax(0, 1fr) 14px; align-items: center; gap: 7px; width: 100%; padding: 8px; text-align: left; font-weight: 700; }
    .report-nav-group-caret { color: var(--report-muted); }
    .report-nav-children { display: grid; gap: 4px; padding-left: 12px; }
    .report-nav-group.is-collapsed .report-nav-children { display: none; }
    .report-nav-group.is-collapsed .report-nav-group-caret { transform: rotate(-90deg); }
    .report-nav-children .report-nav-link { background: var(--report-panel-soft); }
    .report-nav-link { display: grid; grid-template-columns: 24px minmax(0, 1fr); align-items: center; gap: 7px; width: 100%; padding: 8px; text-align: left; }
    .report-nav-link:hover, .report-nav-link:focus-visible, .report-nav-group-toggle:hover, .report-nav-group-toggle:focus-visible, .report-tool:hover, .report-nav-toggle:hover { border-color: var(--report-accent); }
    .report-nav-index { color: var(--report-accent); font-size: 9px; font-weight: 800; }
    .report-nav-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    body.nav-collapsed .report-nav { padding-inline: 14px; }
    body.nav-collapsed .report-nav-title, body.nav-collapsed .report-nav-label, body.nav-collapsed .report-nav-group-caret, body.nav-collapsed .report-tool span { display: none; }
    body.nav-collapsed .report-nav-mark { display: none; }
    body.nav-collapsed .report-nav-header { justify-content: center; }
    body.nav-collapsed .report-nav-actions { grid-template-columns: 1fr; }
    body.nav-collapsed .report-nav-link { grid-template-columns: 1fr; place-items: center; }
    body.nav-collapsed .report-nav-group-toggle { grid-template-columns: 1fr; place-items: center; }
    body.nav-collapsed .report-nav-children { padding-left: 0; }
    .report-shell { display: grid; width: min(100%, 1260px); grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 16px; align-content: start; margin: 0 auto; padding: 24px; }
    h1 { margin: 0 0 8px; font-size: 24px; line-height: 1.16; letter-spacing: 0; }
    h2 { margin: 0 0 10px; font-size: 18px; break-after: avoid; letter-spacing: 0; }
    h3 { margin: 0 0 8px; font-size: 13px; break-after: avoid; letter-spacing: 0; }
    p { margin: 0 0 8px; line-height: 1.4; }
    .page { page-break-after: auto; break-after: auto; }
    .inspector-header { grid-column: 1 / -1; border: 1px solid var(--report-border); border-radius: 18px; padding: 20px 22px; background: var(--report-panel); box-shadow: 0 12px 28px rgba(15, 23, 42, .07); }
    .muted { color: var(--report-muted); }
    .kicker { color: var(--report-accent); font-weight: 700; letter-spacing: .02em; text-transform: uppercase; font-size: 10px; }
    .grid { display: grid; gap: 12px; }
    .grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .metric { border: 1px solid var(--report-border); border-radius: 8px; padding: 10px; background: var(--report-panel-soft); }
    .metric b { display: block; font-size: 18px; margin-top: 3px; }
    table { display: table; width: 100%; border-collapse: collapse; table-layout: fixed; margin: 8px 0 14px; overflow-x: auto; }
    th { background: var(--report-accent); color: white; text-align: left; padding: 7px; font-size: 10px; }
    td { border: 1px solid var(--report-border); vertical-align: top; padding: 7px; font-size: 10px; line-height: 1.32; word-break: break-word; }
    .asset-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin: 8px 0 14px; }
    .asset-grid.portrait-grid { grid-template-columns: repeat(auto-fit, minmax(170px, 220px)); align-items: start; }
    .asset { border: 1px solid var(--report-border); border-radius: 8px; overflow: hidden; background: var(--report-panel-soft); break-inside: avoid; }
    .asset img { display: block; width: 100%; height: 150px; object-fit: contain; background: var(--report-image-bg); cursor: zoom-in; }
    .asset.asset-portrait img { aspect-ratio: 9 / 16; height: auto; max-height: 500px; object-fit: cover; object-position: top center; }
    .asset video { display: block; width: 100%; aspect-ratio: 9 / 16; max-height: 280px; object-fit: contain; background: #111827; }
    .asset span { display: block; padding: 5px 7px; font-size: 9px; color: var(--report-muted); }
    .product-thumb { width: 50px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid var(--report-border); background: var(--report-image-bg); cursor: zoom-in; }
    .product-list { display: grid; gap: 7px; margin: 8px 0 14px; }
    .product-row { display: grid; grid-template-columns: 58px minmax(0, 1fr) 90px 54px 78px; gap: 8px; align-items: center; border: 1px solid var(--report-border); border-radius: 8px; padding: 7px; background: var(--report-row); break-inside: avoid; }
    .product-row b { display: block; margin-bottom: 3px; line-height: 1.3; }
    .product-row span { color: var(--report-muted); font-size: 9px; line-height: 1.28; }
    .link-button { display: inline-flex; align-items: center; max-width: 100%; border: 1px solid var(--report-border); border-radius: 999px; padding: 5px 9px; background: var(--report-panel-soft); color: var(--report-accent); font-size: 9px; text-decoration: none; overflow-wrap: anywhere; }
    .badge { display: inline-block; border-radius: 999px; padding: 3px 7px; background: var(--report-panel-soft); color: var(--report-accent); font-size: 9px; font-weight: 700; }
    .analysis { border: 1px solid var(--report-border); border-radius: 8px; padding: 12px; margin-bottom: 10px; break-inside: avoid; }
    .score-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; margin: 10px 0; }
    .score { background: var(--report-panel-soft); border-radius: 8px; padding: 7px; font-size: 9px; }
    .score b { display: block; font-size: 16px; color: var(--report-accent); }
    .section-note { border-left: 3px solid var(--report-accent); padding-left: 10px; color: var(--report-muted); margin-bottom: 12px; }
    .small { font-size: 9px; }
    .review-list { display: grid; gap: 8px; margin: 8px 0 14px; }
    .review-card { border: 1px solid var(--report-border); border-radius: 8px; padding: 9px; background: var(--report-row); break-inside: avoid; }
    .review-card b { display: block; margin-bottom: 5px; color: var(--report-text); }
    .review-card p { white-space: pre-line; margin: 0; }
    details.report-section { grid-column: span 6; min-width: 0; border: 1px solid var(--report-border); border-radius: 16px; padding: 16px; break-after: auto; page-break-after: auto; break-inside: auto; background: var(--report-panel); box-shadow: 0 10px 24px rgba(15, 23, 42, .06); }
    details.report-section:nth-of-type(n + 3), details.report-section:has(table), details.report-section:has(.asset-grid) { grid-column: 1 / -1; }
    details.report-section > summary { cursor: pointer; font-weight: 800; color: var(--report-text); list-style: none; }
    details.report-section > summary::-webkit-details-marker { display: none; }
    details.report-section > summary::before { content: "▾"; display: inline-block; margin-right: 8px; color: var(--report-accent); }
    details.report-section:not([open]) > summary::before { content: "▸"; }
    .report-body { margin-top: 10px; }
    .image-modal { width: min(94vw, 1180px); max-width: none; height: min(92vh, 900px); border: 1px solid var(--report-border); border-radius: 18px; padding: 0; color: var(--report-text); background: var(--report-panel); box-shadow: 0 28px 80px rgba(0, 0, 0, .38); }
    .image-modal::backdrop { background: rgba(3, 7, 18, .82); backdrop-filter: blur(8px); }
    .image-modal-frame { display: grid; height: 100%; grid-template-rows: auto minmax(0, 1fr) auto; }
    .image-modal-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--report-border); padding: 12px 14px; }
    .image-modal-close { border: 1px solid var(--report-border); border-radius: 9px; padding: 7px 10px; background: var(--report-panel-soft); color: var(--report-text); cursor: pointer; }
    .image-modal img { width: 100%; height: 100%; min-height: 0; object-fit: contain; background: #0b0f17; }
    .image-modal-caption { margin: 0; padding: 10px 14px; color: var(--report-muted); font-size: 10px; }
    @media screen and (max-width: 900px) {
      body { grid-template-columns: 1fr; }
      .report-nav { position: fixed; inset: 0 auto 0 0; width: min(82vw, 300px); box-shadow: 18px 0 48px rgba(0, 0, 0, .22); transition: transform .18s ease; }
      body.nav-collapsed .report-nav { transform: translateX(calc(-100% + 58px)); }
      body.nav-collapsed .report-nav-title, body.nav-collapsed .report-nav-label { display: block; }
      .report-shell { padding: 16px 16px 16px 74px; }
      details.report-section { grid-column: 1 / -1; }
    }
    @media print {
      html, body { color-scheme: light; background: #fff !important; }
      body { --report-bg: #ffffff; --report-panel: #ffffff; --report-panel-soft: #f8fafc; --report-text: #111827; --report-muted: #667085; --report-border: #d7dee8; --report-accent: #2563eb; --report-row: #fbfcff; display: block; color: #111827; font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .report-nav, .image-modal { display: none !important; }
      .report-shell { display: block; width: 100%; max-width: none; margin: 0; padding: 0; }
      h1 { font-size: 18pt; margin-bottom: 5px; }
      h2 { font-size: 14pt; margin-bottom: 7px; }
      h3 { font-size: 11pt; margin-bottom: 5px; }
      p { margin-bottom: 5px; line-height: 1.28; }
      .inspector-header { display: block; border: 0; border-radius: 0; padding: 0; margin-bottom: 12pt; box-shadow: none; }
      .kicker, .small, .asset span, .product-row span, .link-button, .badge, .score { font-size: 7.5pt; }
      table { margin: 6px 0 10px; }
      th { background: #2563eb !important; color: #fff !important; }
      th, td { padding: 5px; font-size: 8pt; line-height: 1.25; }
      .metric { padding: 7px; }
      .metric b { font-size: 14pt; }
      .asset-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; margin: 6px 0 10px; }
      .asset-grid.portrait-grid { grid-template-columns: repeat(auto-fit, minmax(128px, 165px)); }
      .asset img { height: 112px; }
      .asset.asset-portrait img { max-height: 420px; }
      .asset video { max-height: 220px; }
      .product-thumb { width: 42px; height: 42px; }
      .product-list { gap: 5px; margin: 6px 0 10px; }
      .product-row { grid-template-columns: 44px minmax(0, 1fr) 68px 42px 56px; gap: 6px; padding: 6px; }
      .analysis { padding: 8px; margin-bottom: 8px; }
      .review-card { padding: 7px; }
      .report-body { margin-top: 7px; }
      details.report-section { display: block; border: 0; border-radius: 0; padding: 0; margin-bottom: 12pt; box-shadow: none; page-break-after: auto; break-after: auto; }
      details.report-section > summary { display: none; }
      details.report-section > .report-body { display: block !important; margin-top: 0; }
      .asset, .metric, .analysis, .review-card { break-inside: avoid; page-break-inside: avoid; }
      details.report-section > summary::before { content: ""; margin: 0; }
    }
  </style>
</head>
<body class="${bodyClass}">
<aside class="report-nav" aria-label="Report navigation">
  <div class="report-nav-header">
    <div class="report-nav-mark" aria-hidden="true">W</div>
    <div class="report-nav-title"><b>Research Product Market</b><span>${escapeHtml(title)}</span></div>
    <button class="report-nav-toggle" id="report-nav-toggle" type="button" aria-expanded="true" aria-label="Collapse navigation and expand report content" title="Collapse navigation and expand report content">☰</button>
  </div>
  <div class="report-nav-actions">
    <button class="report-tool" id="report-expand-all" type="button" title="Expand all sections"><span>Expand</span> ＋</button>
    <button class="report-tool" id="report-collapse-all" type="button" title="Collapse all sections"><span>Collapse</span> −</button>
    <button class="report-tool" id="report-theme-toggle" type="button" title="Switch report theme"><span>Theme</span> ◐</button>
  </div>
  <nav class="report-nav-list" id="report-nav-list"></nav>
</aside>
<main class="report-shell" id="report-content">`;
}

function documentEnd(): string {
  return `</main>
  <dialog class="image-modal" id="report-image-modal" aria-label="Image inspection">
    <div class="image-modal-frame">
      <div class="image-modal-header"><strong>Image inspection</strong><button class="image-modal-close" id="report-image-close" type="button">Close</button></div>
      <img id="report-image-preview" alt="" />
      <p class="image-modal-caption" id="report-image-caption"></p>
    </div>
  </dialog>
  <script>
    (function () {
      var body = document.body;
      var sections = Array.from(document.querySelectorAll("details.report-section"));
      var navList = document.getElementById("report-nav-list");
      var navToggle = document.getElementById("report-nav-toggle");
      var modal = document.getElementById("report-image-modal");
      var preview = document.getElementById("report-image-preview");
      var caption = document.getElementById("report-image-caption");
      var printState = [];

      var navGroups = {};
      sections.forEach(function (section, index) {
        var summary = section.querySelector(":scope > summary");
        var label = section.dataset.reportNavLabel || (summary ? summary.textContent.trim() : "Section " + (index + 1));
        var parentLabel = section.dataset.reportNavParent;
        section.id = section.id || "report-section-" + (index + 1);
        var navTarget = navList;
        if (parentLabel) {
          var group = navGroups[parentLabel];
          if (!group) {
            let groupRoot = document.createElement("div");
            groupRoot.className = "report-nav-group";
            let groupToggle = document.createElement("button");
            groupToggle.type = "button";
            groupToggle.className = "report-nav-group-toggle";
            groupToggle.setAttribute("aria-expanded", "true");
            groupToggle.innerHTML = '<span class="report-nav-index">▦</span><span class="report-nav-label"></span><span class="report-nav-group-caret">▾</span>';
            groupToggle.querySelector(".report-nav-label").textContent = parentLabel;
            let children = document.createElement("div");
            children.className = "report-nav-children";
            groupToggle.addEventListener("click", function () {
              var collapsed = groupRoot.classList.toggle("is-collapsed");
              groupToggle.setAttribute("aria-expanded", String(!collapsed));
            });
            groupRoot.appendChild(groupToggle);
            groupRoot.appendChild(children);
            navList.appendChild(groupRoot);
            group = { root: groupRoot, children: children };
            navGroups[parentLabel] = group;
          }
          navTarget = group.children;
        }
        var button = document.createElement("button");
        button.type = "button";
        button.className = "report-nav-link";
        button.innerHTML = '<span class="report-nav-index">' + String(index + 1).padStart(2, "0") + '</span><span class="report-nav-label"></span>';
        button.querySelector(".report-nav-label").textContent = label;
        button.addEventListener("click", function () {
          section.open = true;
          section.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        navTarget.appendChild(button);
      });

      navToggle.addEventListener("click", function () {
        var collapsed = body.classList.toggle("nav-collapsed");
        navToggle.setAttribute("aria-expanded", String(!collapsed));
        navToggle.setAttribute("aria-label", collapsed ? "Expand navigation and reduce report content" : "Collapse navigation and expand report content");
        navToggle.title = collapsed ? "Expand navigation and reduce report content" : "Collapse navigation and expand report content";
      });
      document.getElementById("report-expand-all").addEventListener("click", function () {
        sections.forEach(function (section) { section.open = true; });
      });
      document.getElementById("report-collapse-all").addEventListener("click", function () {
        sections.forEach(function (section) { section.open = false; });
      });
      document.getElementById("report-theme-toggle").addEventListener("click", function () {
        var dark = body.classList.toggle("report-dark");
        body.classList.toggle("report-light", !dark);
      });

      function inspectImage(image) {
        preview.src = image.currentSrc || image.src;
        preview.alt = image.alt || "Report image";
        caption.textContent = image.alt || image.closest(".asset")?.querySelector("span")?.textContent || "Report image";
        if (typeof modal.showModal === "function") modal.showModal();
        else modal.setAttribute("open", "");
      }
      document.querySelectorAll("main img").forEach(function (image) {
        image.tabIndex = 0;
        image.setAttribute("role", "button");
        image.setAttribute("aria-label", "Inspect " + (image.alt || "report image"));
        image.addEventListener("click", function () { inspectImage(image); });
        image.addEventListener("keydown", function (event) {
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); inspectImage(image); }
        });
      });
      document.getElementById("report-image-close").addEventListener("click", function () { modal.close(); });
      modal.addEventListener("click", function (event) { if (event.target === modal) modal.close(); });
      window.addEventListener("beforeprint", function () {
        printState = sections.map(function (section) { return section.open; });
        sections.forEach(function (section) { section.open = true; });
      });
      window.addEventListener("afterprint", function () {
        sections.forEach(function (section, index) { section.open = printState[index] !== false; });
      });
    }());
  </script></body></html>`;
}

function reportHeader(data: ReportData): string {
  const filters = projectSearchFilters(data);
  return `<header class="inspector-header">
    <p class="kicker">Research Product Market</p>
    <h1>${escapeHtml(data.project.keyword)}</h1>
    <p class="muted">${escapeHtml(data.project.marketplace)} keyword competitor report generated from local guided evidence.</p>
    <div class="grid two">
      <div class="metric">Shop Type<b>${escapeHtml(filters.shopTypes)}</b></div>
      <div class="metric">Price Range<b>${escapeHtml(filters.priceRange)}</b></div>
    </div>
    <p class="small muted">Developer: Wildan Ega Pradana · <a href="https://www.linkedin.com/in/wildanegapradana/">https://www.linkedin.com/in/wildanegapradana/</a></p>
  </header>`;
}

function summaryMetrics(data: ReportData): string {
  return `<details class="page report-section">
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
  const filters = projectSearchFilters(data);
  return `<details class="page report-section">
    <summary>Keyword General</summary>
    <div class="report-body">
      <h2>Keyword General</h2>
      <div class="grid two">
        <div class="metric">Shop Type Filters<b>${escapeHtml(filters.shopTypes)}</b></div>
        <div class="metric">Price Range<b>${escapeHtml(filters.priceRange)}</b></div>
      </div>
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
    <p class="kicker">Research Product Market</p>
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
  return `<details class="page report-section">
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
  return `<details class="page report-section">
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
  const products = keyProductsForReport(data);
  return `<details class="page report-section">
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
              <td>${escapeHtml(selectionReasonForDisplay(product, products))}</td>
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
  return keyProductsForReport(data)
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
      return `<details class="page report-section" data-report-nav-parent="Product Detail" data-report-nav-label="${escapeAttribute(product.title)}">
        <summary>${escapeHtml(product.title)}</summary>
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
        ${showShopHome ? `<h3>Shop Home Page</h3>${assetGrid(shopHomeAssets, 12, "portrait")}` : ""}
        </div>
      </details>`;
    })
    .join("\n");
}

function keyStoreReport(data: ReportData, enabled: Set<string>): string {
  const legacy = enabled.has("storeOverview") || enabled.has("storeDossiers") || enabled.has("visualStyle");
  const showHome = legacy || enabled.has("keyStoreHomePage");
  const showData = legacy || enabled.has("keyStoreData");
  const showCategories = legacy || enabled.has("keyStoreCategories");
  const showProducts = legacy || enabled.has("keyStoreProducts");
  const showBestSellers = legacy || enabled.has("keyStoreBestSellers");
  const showVisualStyle = legacy || enabled.has("keyStoreVisualStyle");
  const showTikTok = enabled.has("tiktokEvidence");
  if (data.stores.length === 0) {
    return `<details class="page report-section">
      <summary>Key Store Page List</summary>
      <div class="report-body"><p class="muted">No collected store evidence is available yet.</p></div>
    </details>`;
  }
  return data.stores.map((store) => storeReport(data, store, {
        showHome,
        showData,
        showCategories,
        showProducts,
        showBestSellers,
        showVisualStyle,
        showTikTok
      })).join("");
}

function storeReport(
  data: ReportData,
  store: ReportData["stores"][number],
  options: {
    showHome: boolean;
    showData: boolean;
    showCategories: boolean;
    showProducts: boolean;
    showBestSellers: boolean;
    showVisualStyle: boolean;
    showTikTok: boolean;
  }
): string {
  const raw = reportStoreRaw(store);
  const assets = storeAssetsForReport(data, store);
  const storeProducts = reportStoreProducts(data, store, "Store Products");
  const storeBestSellers = reportStoreProducts(data, store, "Store Best Sellers");
  const categories = safeJson<string[]>(store.categoriesJson, []);
  const ratingSamples = reportStoreRatingSamples(store);
  return `<details class="page report-section store-report" data-report-nav-parent="Key Store Page List" data-report-nav-label="${escapeAttribute(store.name)}">
    <summary>${escapeHtml(store.name)}</summary>
    <div class="report-body">
      <h2>${escapeHtml(store.name)}</h2>
      <p><a class="link-button" href="${escapeAttribute(store.url)}">Open Store</a></p>
      <h3>Overall</h3>
      <p style="white-space:pre-line;">${escapeHtml(storeOverall(store, data))}</p>
      ${options.showHome ? `<h3>Store Home Page</h3>${assetGrid(assets.filter((asset) => asset.kind === "STORE_HOME"), 12, "portrait")}` : ""}
      ${options.showData ? `<h3>Store Data</h3>
      <div class="grid two">
        <div class="metric">Products<b>${formatNumber(store.productsCount)}</b></div>
        <div class="metric">Followers<b>${formatNumber(store.followers)}</b></div>
        <div class="metric">Following<b>${formatNumber(store.following)}</b></div>
        <div class="metric">Rating<b>${store.rating != null ? store.rating.toFixed(1) : "-"}${store.ratingCount ? ` (${formatNumber(store.ratingCount)} Rating)` : ""}</b></div>
        <div class="metric">Chat Performance<b>${escapeHtml(sanitizeStoreMetric(store.chatResponse))}</b></div>
        <div class="metric">Joined<b>${escapeHtml(sanitizeStoreMetric(store.joinedDate))}</b></div>
      </div>
      ${sanitizeStoreDescription(raw.description) !== "-" ? `<p style="white-space:pre-line;"><b>Description Store</b><br>${escapeHtml(sanitizeStoreDescription(raw.description))}</p>` : '<p class="muted">No store description captured.</p>'}
      <h3>1 Star Store Ratings</h3>
      ${storeRatingTable(ratingSamples.filter((sample) => sample.rating === 1))}
      <h3>5 Star Store Ratings</h3>
      ${storeRatingTable(ratingSamples.filter((sample) => sample.rating === 5))}
      ` : ""}
      ${options.showCategories ? `<h3>Store Product Categories</h3>
      ${categories.length > 0 ? storeCategoryTable(categories) : '<p class="muted">No store categories captured.</p>'}` : ""}
      ${options.showProducts ? `<h3>Popular Products</h3>${snapshotProductTable(storeProducts)}` : ""}
      ${options.showBestSellers ? `<h3>Best Sellers</h3>${snapshotProductTable(storeBestSellers)}` : ""}
      ${options.showVisualStyle ? `<h3>Visual Shop Banner</h3>${assetGrid(assets.filter((asset) => asset.kind === "STORE_BANNER"), 80)}` : ""}
      ${options.showTikTok ? `<h3>TikTok Evidence</h3>${assetGrid(assets.filter((asset) => asset.kind === "SOCIAL_ACCOUNT"), 12, "portrait")}` : ""}
    </div>
  </details>`;
}

function storeRatingTable(samples: StoreRatingSample[]): string {
  if (samples.length === 0) {
    return '<p class="muted">No store rating samples captured.</p>';
  }
  return samples.slice(0, 5).map((sample, index) => `<div class="rating-sample">
    <table>
      <thead><tr><th>No</th><th>Product</th><th>Comment</th><th>Seller response</th></tr></thead>
      <tbody><tr>
        <td>${index + 1}</td>
        <td>${sample.productUrl
          ? `<a href="${escapeAttribute(sample.productUrl)}">${escapeHtml(sample.productTitle ?? "Open rated product")}</a>`
          : escapeHtml(sample.productTitle ?? "Product link unavailable")}${sample.productVariation ? `<br><span class="muted">${escapeHtml(sample.productVariation)}</span>` : ""}</td>
        <td><b>${sample.reviewerUrl ? `<a href="${escapeAttribute(sample.reviewerUrl)}">${escapeHtml(sample.reviewer || "—")}</a>` : escapeHtml(sample.reviewer || "—")}</b><br>${escapeHtml(sample.capturedAt ?? "—")}<br><br>${escapeHtml(sample.comment || "—")}</td>
        <td>${escapeHtml(sample.sellerResponse ?? "—")}</td>
      </tr></tbody>
    </table>
    ${sample.mediaUrls.length > 0 ? `<p class="kicker">Attached media</p>${ratingMediaGrid(sample.mediaUrls)}` : ""}
  </div>`).join("");
}

function ratingMediaGrid(urls: string[]): string {
  const videos = urls.filter((url) => /(?:\.mp4|\.webm|\.mov|\.m3u8)(?:$|[?#])|\bvideo\b/iu.test(url));
  const images = urls.filter((url) => !videos.includes(url));
  return `${images.length > 0 ? remoteImageGrid(images, "Rating proof") : ""}${remoteVideoGrid(videos)}`;
}

function storeCategoryTable(categories: string[]): string {
  return `<table><thead><tr><th>Category Name</th><th>Total Product</th></tr></thead><tbody>${categories.map((category) => {
    const match = category.trim().match(/^(.*?)\s*\(\s*(\d+)\s*\)\s*$/u);
    return `<tr><td>${escapeHtml(match?.[1]?.trim() ?? category)}</td><td>${escapeHtml(match?.[2] ?? "-")}</td></tr>`;
  }).join("")}</tbody></table>`;
}

function _reviewEvidence(data: ReportData): string {
  return `<details class="page report-section">
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
  return `<details class="page report-section">
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
      return `<details class="page report-section">
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
        <h3>Popular Products</h3>
        ${assetGrid(assets.filter((asset) => asset.kind === "STORE_FEATURED_PRODUCTS"))}
        <h3>Bestseller</h3>
        ${assetGrid(assets.filter((asset) => asset.kind === "STORE_BEST_SELLER"))}
        <h3>Visual Shop Banner</h3>
        ${assetGrid(assets.filter((asset) => asset.kind === "STORE_BANNER" || asset.kind === "STORE_PROMOTION"))}
        </div>
      </details>`;
    })
    .join("\n");
}

function _visualStyle(data: ReportData): string {
  return `<details class="page report-section">
    <summary>Visual Shop Banner</summary>
    <div class="report-body">
    <p class="kicker">Visual Shop Banner</p>
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

function keyProductsForReport(data: ReportData): ReportData["products"] {
  const products = data.products;
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
  const state = safeJson<{
    qualifiedProductIds?: string[];
    qualifiedProductReferences?: Array<{ productId?: string; productUrl?: string; fallbackIdentity: string; manuallyAdded?: boolean }>;
    qualifiedProductsInitialized?: boolean;
  }>(data.project.collectionStateJson, {});
  if (state.qualifiedProductReferences?.length) {
    return resolveQualifiedProductReferences(candidates, state.qualifiedProductReferences);
  }
  if (state.qualifiedProductsInitialized) {
    return (state.qualifiedProductIds ?? []).flatMap((id) => {
      const direct = candidates.find((product) => product.id === id);
      if (direct) return [direct];
      const saved = products.find((product) => product.id === id);
      const canonical = saved ? candidates.find((product) => sameQualifiedProduct(product, saved)) : undefined;
      return canonical ? [canonical] : [];
    });
  }
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
  const existing = product.selectionReason?.trim() || "platform recommended";
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

function storeAssetsForReport(data: ReportData, store: ReportData["stores"][number]): ReportAsset[] {
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

function sameReportUrl(left: string, right: string): boolean {
  return stripUrlNoise(left) === stripUrlNoise(right);
}

function crossPlatformEvidence(data: ReportData): string {
  return `<details class="page report-section">
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
  const latestAnalysis = analyses.length > 0 ? analyses[analyses.length - 1] : null;
  const matrix = latestAnalysis ? intelligenceCompetitionMatrix(latestAnalysis, data) : [];
  const insights = latestAnalysis ? intelligenceCategoryInsights(latestAnalysis) : [];
  return `<details class="page report-section">
    <summary>Intelligence and Recommendations</summary>
    <div class="report-body">
    <p class="kicker">Specialist Assessment</p>
    <h2>Keyword Search Analysis &amp; Top 10 Competition Matrix</h2>
    ${[latestAnalysis]
      .map((analysis) => {
        if (!analysis) {
          return "";
        }
        return `<div class="analysis">
          <table>
            <thead><tr><th>Product Name</th><th>Price Range</th><th>USP/Key Claim</th><th>Rating</th><th>Short Description</th></tr></thead>
            <tbody>${matrix.map((item) => `<tr>
              <td>${escapeHtml(item.productName)}</td>
              <td>${escapeHtml(item.priceRange)}</td>
              <td>${escapeHtml(item.uspKeyClaim)}</td>
              <td>${escapeHtml(item.rating)}</td>
              <td>${escapeHtml(item.shortDescription)}</td>
            </tr>`).join("")}</tbody>
          </table>
          <h2>Synthesized Category Insights</h2>
          <div class="category-insights">${insights.map((item, index) => `<section class="analysis">
            <h3>${index + 1}. ${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.insight)}</p>
          </section>`).join("")}</div>
        </div>`;
      })
      .join("")}
    </div>
  </details>`;
}

function intelligenceCompetitionMatrix(analysis: AiAnalysisJson, data: ReportData): AiAnalysisJson["keywordCompetitionMatrix"] {
  if (Array.isArray(analysis.keywordCompetitionMatrix) && analysis.keywordCompetitionMatrix.length > 0) {
    return analysis.keywordCompetitionMatrix.slice(0, 10);
  }
  const products = keyProductsForReport(data);
  return products.map((product) => ({
    productName: product.title,
    priceRange: formatCurrency(product.priceAverage),
    uspKeyClaim: reportExcerpt(product.description || selectionReasonForDisplay(product, products), 150),
    rating: productRawText(product, "ratingText") || (product.rating ? `${product.rating.toFixed(1)} / 5` : "-"),
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

function snapshotProductTable(products: ReportData["products"]): string {
  if (products.length === 0) {
    return '<p class="muted">No rendered product rows extracted for this snapshot yet.</p>';
  }
  return `<div class="product-list">${products
      .map((product) => {
        const imageUrl = productImage(product);
        return `<div class="product-row">
          <div>${imageUrl ? `<img class="product-thumb" src="${escapeAttribute(reportMediaSource(imageUrl))}" alt="${escapeAttribute(product.title)}" />` : ""}</div>
          <div><b><a href="${escapeAttribute(product.productUrl)}">${escapeHtml(product.title)}</a></b><span>${escapeHtml(productSourcePlacement(product))}</span></div>
          <div><span>Price</span><b>${formatCurrency(product.priceAverage)}</b></div>
          <div><span>Rating</span><b>${escapeHtml(productRawText(product, "ratingText") || (product.rating ? product.rating.toFixed(1) : "-"))}</b></div>
          <div><span>Sold</span><b>${escapeHtml(productRawText(product, "monthlySoldText") || productRawText(product, "totalSoldText") || formatNumber(product.monthlySold ?? product.totalSold))}</b></div>
        </div>`;
      })
      .join("")}</div>`;
}

function assetGrid(assets: ReportAsset[], limit = 12, variant: "default" | "portrait" = "default"): string {
  if (assets.length === 0) {
    return '<p class="muted">No evidence asset captured for this section.</p>';
  }
  const gridClass = variant === "portrait" ? "asset-grid portrait-grid" : "asset-grid";
  const assetClass = variant === "portrait" ? "asset asset-portrait" : "asset";
  return `<div class="${gridClass}">${assets
    .slice(0, limit)
    .map(
      (asset) => `<figure class="${assetClass}">
        <img src="${escapeAttribute(pathToFileURL(asset.path).toString())}" alt="${escapeAttribute(asset.label)}" />
        <span>${escapeHtml(asset.label)}</span>
      </figure>`
    )
    .join("")}</div>`;
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
