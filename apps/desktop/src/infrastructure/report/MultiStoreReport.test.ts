import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import type { ReportData } from "../../application/services/ReportService.js";
import { DEFAULT_REPORT_SECTIONS } from "../../shared/reportSections.js";
import type { ReportGenerationPayload } from "../../shared/contracts.js";
import { ConsultingDocxReportExporter } from "./DocxReportExporter.js";
import { ConsultingHtmlReportRenderer } from "./HtmlReportRenderer.js";

const payload: ReportGenerationPayload = {
  projectId: "project-1",
  templateId: "consulting",
  sections: DEFAULT_REPORT_SECTIONS.map((section) => ({
    ...section,
    enabled: section.id.startsWith("keyStore")
  })),
  theme: "light"
};

describe("multi-store report rendering", () => {
  it("ships a self-contained bento report with navigation and image inspection controls", async () => {
    const html = await new ConsultingHtmlReportRenderer().render(reportData(), payload);

    expect(html).toContain('id="report-nav-toggle"');
    expect(html).toContain('id="report-expand-all"');
    expect(html).toContain('id="report-image-modal"');
    expect(html).toContain('document.querySelectorAll("main img")');
    expect(html).toContain("grid-template-columns: repeat(12, minmax(0, 1fr))");
    expect(html).toContain("@page { size: A4; margin: 12.7mm; }");
    expect(html).toContain("report-nav-group-toggle");
    expect(html).not.toMatch(/<details\b[^>]*\bopen\b/iu);
    expect(html).toContain('data-report-nav-parent="Key Store Page List"');
    expect(html).toContain('data-report-nav-label="Alpha Official Store"');
    expect(html).toContain('data-report-nav-label="Beta Star Shop"');
  });

  it("uses the saved Inspector product list and exposes products under the Product Detail sub-navigation", async () => {
    const data = reportData();
    const first = product("first-qualified", "First Qualified Product", "Relevance", "Alpha Official Store");
    const second = product("second-qualified", "Second Qualified Product", "Top Sales", "Beta Star Shop");
    const excluded = product("not-qualified", "Product That Was Not Selected", "Top Sales", "Beta Star Shop");
    data.products.push(first, second, excluded);
    data.project.collectionStateJson = JSON.stringify({
      qualifiedProductsInitialized: true,
      qualifiedProductReferences: [
        { productId: second.id, productUrl: second.productUrl, fallbackIdentity: "second" },
        { productId: first.id, productUrl: first.productUrl, fallbackIdentity: "first" }
      ]
    });
    const productPayload: ReportGenerationPayload = {
      ...payload,
      sections: DEFAULT_REPORT_SECTIONS.map((section) => ({
        ...section,
        enabled: section.id === "keyProducts" || section.id === "productDetailFirstPage"
      }))
    };

    const html = await new ConsultingHtmlReportRenderer().render(data, productPayload);
    expect(html).toContain('data-report-nav-parent="Product Detail"');
    expect(html).toContain('data-report-nav-label="Second Qualified Product"');
    expect(html.indexOf("Second Qualified Product")).toBeLessThan(html.indexOf("First Qualified Product"));
    expect(html).not.toContain("Product That Was Not Selected");

    const buffer = await new ConsultingDocxReportExporter().render(data, productPayload);
    const archive = await JSZip.loadAsync(buffer);
    const documentXml = await archive.file("word/document.xml")?.async("string") ?? "";
    expect(documentXml.indexOf("Second Qualified Product")).toBeLessThan(documentXml.indexOf("First Qualified Product"));
    expect(documentXml).not.toContain("Product That Was Not Selected");
  });

  it("keeps candidate stores, products, and ratings scoped in HTML and DOCX", async () => {
    const data = reportData();

    const html = await new ConsultingHtmlReportRenderer().render(data, payload);
    expect(html).toContain("Alpha Official Store");
    expect(html).toContain("Alpha Popular Product");
    expect(html).toContain("Alpha rating evidence");
    expect(html).toContain("Beta Star Shop");
    expect(html).toContain("Beta Best Seller");
    expect(html).toContain("Beta rating evidence");

    const alphaBlock = html.slice(html.indexOf("Alpha Official Store"), html.indexOf("Beta Star Shop"));
    const betaBlock = html.slice(html.indexOf("Beta Star Shop"));
    expect(alphaBlock).toContain("Alpha Popular Product");
    expect(alphaBlock).not.toContain("Beta Best Seller");
    expect(betaBlock).toContain("Beta Best Seller");
    expect(betaBlock).not.toContain("Alpha Popular Product");

    const buffer = await new ConsultingDocxReportExporter().render(data, payload);
    const archive = await JSZip.loadAsync(buffer);
    const documentXml = await archive.file("word/document.xml")?.async("string");
    expect(documentXml).toContain("Alpha Official Store");
    expect(documentXml).toContain("Alpha Popular Product");
    expect(documentXml).toContain("Alpha rating evidence");
    expect(documentXml).toContain("Beta Star Shop");
    expect(documentXml).toContain("Beta Best Seller");
    expect(documentXml).toContain("Beta rating evidence");
  });

  it("renders the competition matrix and five synthesized category insights in HTML and DOCX", async () => {
    const data = reportData();
    data.analyses = [{
      id: "analysis-1",
      subjectType: "PROJECT",
      provider: "openai",
      resultJson: JSON.stringify({
        keywordCompetitionMatrix: [{
          productName: "Top Competitor Product",
          priceRange: "Rp100.000–Rp150.000",
          uspKeyClaim: "Evidence-backed key claim",
          rating: "4.9 / 5",
          shortDescription: "Concise specialist product description"
        }],
        synthesizedCategoryInsights: [
          { title: "PRICING ARCHITECTURE & TIERING", insight: "Pricing specialist insight" },
          { title: "COMPETITIVE POSITIONING & KEY CLAIMS", insight: "Positioning specialist insight" },
          { title: "CUSTOMER TRUST & RATING SIGNALS", insight: "Trust specialist insight" },
          { title: "DEMAND CONCENTRATION & PRODUCT MOMENTUM", insight: "Demand specialist insight" },
          { title: "CATEGORY OPPORTUNITIES & RECOMMENDED ACTIONS", insight: "Opportunity specialist insight" }
        ]
      })
    }];
    const intelligencePayload: ReportGenerationPayload = {
      ...payload,
      sections: DEFAULT_REPORT_SECTIONS.map((section) => ({
        ...section,
        enabled: section.id === "intelligence"
      }))
    };

    const html = await new ConsultingHtmlReportRenderer().render(data, intelligencePayload);
    expect(html).toContain("Keyword Search Analysis &amp; Top 10 Competition Matrix");
    expect(html).toContain("Top Competitor Product");
    expect(html).toContain("Synthesized Category Insights");
    expect(html).toContain("5. CATEGORY OPPORTUNITIES &amp; RECOMMENDED ACTIONS");

    const buffer = await new ConsultingDocxReportExporter().render(data, intelligencePayload);
    const archive = await JSZip.loadAsync(buffer);
    const documentXml = await archive.file("word/document.xml")?.async("string");
    expect(documentXml).toContain("Keyword Search Analysis &amp; Top 10 Competition Matrix");
    expect(documentXml).toContain("Top Competitor Product");
    expect(documentXml).toContain("Synthesized Category Insights");
    expect(documentXml).toContain("5. CATEGORY OPPORTUNITIES &amp; RECOMMENDED ACTIONS");
  });
});

function reportData(): ReportData {
  return {
    project: {
      id: "project-1",
      name: "Multi-store report",
      keyword: "body lotion",
      marketplace: "SHOPEE_ID",
      language: "en",
      collectionStateJson: "{}",
      createdAt: new Date("2026-07-27T00:00:00.000Z")
    },
    products: [
      product("alpha-product", "Alpha Popular Product", "Store Products:alpha", "Alpha Official Store"),
      product("beta-product", "Beta Best Seller", "Store Best Sellers:beta", "Beta Star Shop")
    ],
    stores: [
      store("alpha-store", "alpha", "Alpha Official Store", "Alpha rating evidence"),
      store("beta-store", "beta", "Beta Star Shop", "Beta rating evidence")
    ],
    reviews: [],
    assets: [],
    analyses: []
  };
}

function product(
  id: string,
  title: string,
  source: string,
  storeName: string
): ReportData["products"][number] {
  return {
    id,
    rank: 1,
    source,
    selectionReason: "Store collection evidence",
    title,
    priceAverage: 100_000,
    rating: 4.9,
    reviewCount: 100,
    monthlySold: 50,
    totalSold: 500,
    storeName,
    storeUrl: `https://shopee.co.id/${storeName.toLowerCase().replaceAll(" ", "-")}`,
    productType: "body lotion",
    productUrl: `https://shopee.co.id/${id}`,
    mallStatus: false,
    officialStatus: false,
    starSeller: false,
    description: null,
    variantsJson: "[]",
    specificationsJson: "{}",
    rawJson: "{}"
  };
}

function store(
  id: string,
  candidateId: string,
  name: string,
  ratingComment: string
): ReportData["stores"][number] {
  return {
    id,
    marketplaceStoreId: `${candidateId}-marketplace-id`,
    name,
    url: `https://shopee.co.id/${name.toLowerCase().replaceAll(" ", "-")}`,
    followers: 1_000,
    following: 10,
    productsCount: 100,
    rating: 4.9,
    ratingCount: 900,
    chatResponse: "100% within hours",
    joinedDate: "3 years",
    categoriesJson: JSON.stringify(["Body Care"]),
    voucherCount: 2,
    visualThemeJson: "{}",
    rawJson: JSON.stringify({
      storeCandidateId: candidateId,
      description: `${name} description`,
      ratingSamples: [
        {
          rating: 5,
          reviewer: `${candidateId}-reviewer`,
          comment: ratingComment,
          mediaUrls: ["https://example.com/proof.jpg"],
          capturedAt: "2026-07-27 08:00"
        }
      ]
    })
  };
}
