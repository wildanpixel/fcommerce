import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalysisInput } from "../../application/services/AIAnalysisService.js";
import type { SettingsRepository } from "../../domain/repositories.js";
import { CompositeAIAnalysisService, LocalHeuristicAnalysisService } from "./AnalysisProviders.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

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
          ratingSamples: [],
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
    expect(result.keywordCompetitionMatrix).toHaveLength(1);
    expect(result.keywordCompetitionMatrix[0]).toMatchObject({
      productName: "Peptide eye cream",
      rating: "4.9 / 5"
    });
    expect(result.keywordCompetitionMatrix[0]?.priceRange).toContain("125.000");
    expect(result.synthesizedCategoryInsights).toHaveLength(5);
    expect(result.synthesizedCategoryInsights[0]?.title).toBe("PRICING ARCHITECTURE & TIERING");
  });
});

describe("CompositeAIAnalysisService evidence translation", () => {
  it("keeps source evidence when no AI provider is configured", async () => {
    const settings = {
      get: async () => ({ openAiModel: "gpt-5-mini", geminiModel: "gemini-3.6-flash", claudeModel: "claude-sonnet-5" }),
      getSecret: async () => undefined
    } as unknown as SettingsRepository;
    const service = new CompositeAIAnalysisService(settings);

    await expect(service.translateTexts(["Produk sangat bagus"], "id-ID")).resolves.toEqual({
      translations: ["Produk sangat bagus"],
      translated: false,
      provider: "source"
    });
  });

  it("keeps translated evidence aligned with the requested order", async () => {
    const settings = {
      get: async () => ({ openAiModel: "gpt-5-mini", geminiModel: "gemini-3.6-flash", claudeModel: "claude-sonnet-5" }),
      getSecret: async (provider: string) => provider === "openai" ? "test-key" : undefined
    } as unknown as SettingsRepository;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      output_text: JSON.stringify({ translations: ["Produk bagus", "Respons penjual"] })
    }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const service = new CompositeAIAnalysisService(settings);

    await expect(service.translateTexts(["Good product", "Seller response"], "id-ID")).resolves.toEqual({
      translations: ["Produk bagus", "Respons penjual"],
      translated: true,
      provider: "openai"
    });
  });
});

describe("CompositeAIAnalysisService provider selection", () => {
  it("calls the selected configured Claude model and returns an LLM result", async () => {
    const input: AnalysisInput = {
      projectId: "project-claude",
      subjectType: "PROJECT",
      keyword: "body lotion",
      language: "en-US",
      screenshotPaths: [],
      products: [{
        marketplace: "SHOPEE_ID",
        rank: 1,
        source: "Top Sales",
        title: "Qualified body lotion",
        url: "https://shopee.co.id/qualified-body-lotion-i.1.2",
        price: { average: 99_000, currency: "IDR" },
        rating: 4.9,
        monthlySold: 1_000,
        mallStatus: true,
        officialStatus: true,
        starSeller: false,
        variants: [],
        specifications: {},
        images: [],
        videos: [],
        raw: {}
      }],
      stores: [],
      reviews: []
    };
    const providerResult = new LocalHeuristicAnalysisService().analyze(input);
    const settings = {
      get: async () => ({ openAiModel: "gpt-5-mini", geminiModel: "gemini-3.6-flash", claudeModel: "claude-sonnet-5" }),
      getSecret: async (provider: string) => provider === "claude" ? "claude-test-key" : undefined
    } as unknown as SettingsRepository;
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({
      content: [{ type: "text", text: JSON.stringify(providerResult) }]
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await new CompositeAIAnalysisService(settings).analyze(input, {
      provider: "claude",
      model: "claude-sonnet-5"
    });

    expect(result.provider).toBe("claude:claude-sonnet-5");
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { model: string };
    expect(requestBody.model).toBe("claude-sonnet-5");
  });
});
