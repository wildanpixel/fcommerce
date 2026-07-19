import { describe, expect, it } from "vitest";
import type { AnalysisInput } from "../../application/services/AIAnalysisService.js";
import { LocalHeuristicAnalysisService } from "./AnalysisProviders.js";

describe("LocalHeuristicAnalysisService", () => {
  it("returns the complete structured intelligence contract", () => {
    const input: AnalysisInput = {
      projectId: "project-1",
      subjectType: "PROJECT",
      keyword: "eye cream",
      language: "en",
      screenshotPaths: ["evidence.png"],
      products: [
        {
          marketplace: "SHOPEE_ID",
          rank: 1,
          title: "Peptide eye cream",
          url: "https://shopee.co.id/product",
          price: { average: 125_000, currency: "IDR" },
          rating: 4.9,
          monthlySold: 500,
          totalSold: 4_000,
          mallStatus: true,
          officialStatus: true,
          starSeller: false,
          variants: [],
          specifications: {},
          images: [],
          videos: [],
          raw: {}
        }
      ],
      stores: [
        {
          marketplace: "SHOPEE_ID",
          name: "Example Official Store",
          url: "https://shopee.co.id/example",
          followers: 10_000,
          rating: 4.9,
          categories: [],
          voucherCount: 2,
          voucherTypes: [],
          featuredProducts: [],
          bestSellers: [],
          visualTheme: { dominantColors: [], typographySignals: [], bannerStyle: [] },
          raw: {}
        }
      ],
      reviews: [
        { sentiment: "POSITIVE", rating: 5, comment: "Works well", mediaUrls: [], raw: {} }
      ]
    };

    const result = new LocalHeuristicAnalysisService().analyze(input);

    expect(result.executiveSummary).toContain("eye cream");
    expect(result.swot.strengths.length).toBeGreaterThan(0);
    expect(result.pricingAnalysis.summary).toContain("125.000");
    expect(result.storeAnalysis.summary).toContain("Example Official Store");
    expect(result.competitorAnalysis.signals.length).toBeGreaterThan(0);
    expect(result.visualAnalysis.signals.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});
