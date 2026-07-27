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
});

function reportData(): ReportData {
  return {
    project: {
      id: "project-1",
      name: "Multi-store report",
      keyword: "body lotion",
      marketplace: "SHOPEE_ID",
      language: "en",
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
