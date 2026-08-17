import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { AnalysisInput, AIAnalysisService } from "../../application/services/AIAnalysisService.js";
import type { SettingsRepository } from "../../domain/repositories.js";
import type { AiAnalysisJson } from "../../domain/models.js";
import type { AIProvider, AnalyzeProjectPayload } from "../../shared/contracts.js";

const recommendationSchema = z.object({
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  action: z.string(),
  rationale: z.string()
});

const competitionMatrixRowSchema = z.object({
  productName: z.string().min(1),
  priceRange: z.string().min(1),
  uspKeyClaim: z.string().min(1),
  rating: z.string().min(1),
  shortDescription: z.string().min(1)
});

const categoryInsightSchema = z.object({
  title: z.string().min(1),
  insight: z.string().min(1)
});

const analysisSchema: z.ZodType<AiAnalysisJson> = z.object({
  schemaVersion: z.literal("1.0"),
  subjectType: z.enum(["PROJECT", "PRODUCT", "STORE", "REVIEW_SET", "CREATIVE_SET"]),
  subjectId: z.string().optional(),
  provider: z.string(),
  confidence: z.number().min(0).max(1),
  branding: z.object({
    score: z.number().min(0).max(100),
    observations: z.array(z.string())
  }),
  visualQuality: z.object({
    score: z.number().min(0).max(100),
    observations: z.array(z.string())
  }),
  voucherStrategy: z.object({
    score: z.number().min(0).max(100),
    observations: z.array(z.string())
  }),
  competitivePosition: z.object({
    score: z.number().min(0).max(100),
    observations: z.array(z.string())
  }),
  customerTrust: z.object({
    score: z.number().min(0).max(100),
    observations: z.array(z.string())
  }),
  executiveSummary: z.string(),
  keywordCompetitionMatrix: z.array(competitionMatrixRowSchema).max(10),
  synthesizedCategoryInsights: z.array(categoryInsightSchema).length(5),
  swot: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    opportunities: z.array(z.string()),
    threats: z.array(z.string())
  }),
  pricingAnalysis: z.object({ summary: z.string(), signals: z.array(z.string()) }),
  storeAnalysis: z.object({ summary: z.string(), signals: z.array(z.string()) }),
  competitorAnalysis: z.object({ summary: z.string(), signals: z.array(z.string()) }),
  visualAnalysis: z.object({ summary: z.string(), signals: z.array(z.string()) }),
  painPoints: z.array(z.string()),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendations: z.array(recommendationSchema),
  automationLimitations: z.array(z.string())
});

const translationResponseSchema = z.object({
  translations: z.array(z.string())
});

export type EvidenceTranslationResult = {
  translations: string[];
  translated: boolean;
  provider: AIProvider | "source" | "unavailable";
};

export class CompositeAIAnalysisService implements AIAnalysisService {
  constructor(
    private readonly settings: SettingsRepository,
    private readonly local = new LocalHeuristicAnalysisService()
  ) {}

  async analyze(input: AnalysisInput, selection?: AnalyzeProjectPayload): Promise<AiAnalysisJson> {
    const [settings, openAiKey, geminiKey, claudeKey] = await Promise.all([
      this.settings.get(),
      this.settings.getSecret("openai"),
      this.settings.getSecret("gemini"),
      this.settings.getSecret("claude")
    ]);
    const configured = [
      openAiKey ? { provider: "openai" as const, key: openAiKey, model: settings.openAiModel } : undefined,
      geminiKey ? { provider: "gemini" as const, key: geminiKey, model: settings.geminiModel } : undefined,
      claudeKey ? { provider: "claude" as const, key: claudeKey, model: settings.claudeModel } : undefined
    ].filter((item): item is { provider: AIProvider; key: string; model: string } => Boolean(item));

    if (configured.length === 0) {
      return this.local.analyze(input, ["No AI API key is configured; local deterministic analysis was used."]);
    }

    const requested = selection
      ? configured.find((item) => item.provider === selection.provider)
      : configured[0];
    if (!requested) {
      throw new Error(`${selection?.provider ?? "Selected"} AI provider is not configured.`);
    }
    const model = selection?.model.trim() || requested.model;
    try {
      if (requested.provider === "openai") return await requestOpenAI(requested.key, model, input);
      if (requested.provider === "gemini") return await requestGemini(requested.key, model, input);
      return await requestClaude(requested.key, model, input);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${requested.provider} model ${model} did not generate a valid AI Matrix result. ${message}`);
    }
  }

  async translateTexts(texts: string[], language: "id-ID" | "en-US" | "zh-CN"): Promise<EvidenceTranslationResult> {
    const sourceTexts = texts.map((text) => text.trim()).filter(Boolean).slice(0, 100);
    if (sourceTexts.length === 0 || language === "en-US") {
      return { translations: sourceTexts, translated: false, provider: "source" };
    }

    const [settings, openAiKey, geminiKey, claudeKey] = await Promise.all([
      this.settings.get(),
      this.settings.getSecret("openai"),
      this.settings.getSecret("gemini"),
      this.settings.getSecret("claude")
    ]);

    if (openAiKey) {
      try {
        return {
          translations: await requestOpenAITranslation(openAiKey, settings.openAiModel, sourceTexts, language),
          translated: true,
          provider: "openai"
        };
      } catch {
        // Try the configured fallback provider before returning source evidence.
      }
    }

    if (geminiKey) {
      try {
        return {
          translations: await requestGeminiTranslation(geminiKey, settings.geminiModel, sourceTexts, language),
          translated: true,
          provider: "gemini"
        };
      } catch {
        // Source evidence remains readable when provider translation is unavailable.
      }
    }

    if (claudeKey) {
      try {
        return {
          translations: await requestClaudeTranslation(claudeKey, settings.claudeModel, sourceTexts, language),
          translated: true,
          provider: "claude"
        };
      } catch {
        // Source evidence remains readable when provider translation is unavailable.
      }
    }

    return {
      translations: sourceTexts,
      translated: false,
      provider: openAiKey || geminiKey || claudeKey ? "unavailable" : "source"
    };
  }
}

export class LocalHeuristicAnalysisService {
  analyze(input: AnalysisInput, limitations: string[] = []): AiAnalysisJson {
    const positiveReviews = input.reviews.filter((review) => review.sentiment === "POSITIVE").length;
    const negativeReviews = input.reviews.filter((review) => review.sentiment === "NEGATIVE").length;
    const storesWithVouchers = input.stores.filter((store) => (store.voucherCount ?? 0) > 0).length;
    const averageRating = average(input.products.map((product) => product.rating).filter(isNumber));
    const storeCoverage = input.stores.length > 0 ? Math.min(100, input.stores.length * 20) : 30;
    const reviewBalance =
      positiveReviews + negativeReviews > 0
        ? Math.round((positiveReviews / (positiveReviews + negativeReviews)) * 100)
        : 55;
    const prices = input.products
      .map((product) => product.price.average ?? product.price.min ?? product.price.max)
      .filter(isNumber)
      .sort((left, right) => left - right);
    const medianPrice = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : undefined;
    const monthlyLeaders = [...input.products]
      .filter((product) => isNumber(product.monthlySold))
      .sort((left, right) => (right.monthlySold ?? 0) - (left.monthlySold ?? 0))
      .slice(0, 3)
      .map((product) => product.title);
    const leadingStore = input.stores
      .slice()
      .sort((left, right) => (right.followers ?? 0) - (left.followers ?? 0))[0];
    const evidenceSummary = `${input.products.length} products, ${input.stores.length} stores, ${input.reviews.length} review signals, and ${input.screenshotPaths.length} screenshots were evaluated for "${input.keyword}".`;
    const keywordCompetitionMatrix = buildKeywordCompetitionMatrix(input);
    const synthesizedCategoryInsights = buildSynthesizedCategoryInsights(input, keywordCompetitionMatrix);

    return {
      schemaVersion: "1.0",
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      provider: "local-heuristic",
      confidence: input.screenshotPaths.length > 0 ? 0.62 : 0.42,
      branding: {
        score: Math.max(45, Math.min(86, storeCoverage)),
        observations: [
          `${input.stores.length} store profile(s) were available for brand and homepage review.`,
          `${input.screenshotPaths.length} screenshot evidence file(s) were captured.`
        ]
      },
      visualQuality: {
        score: input.screenshotPaths.length >= input.products.length ? 76 : 58,
        observations: [
          "Visual quality is inferred from captured product and store evidence.",
          "AI vision scoring improves when OpenAI, Gemini, or Claude keys are configured."
        ]
      },
      voucherStrategy: {
        score: storesWithVouchers > 0 ? 78 : 46,
        observations: [
          `${storesWithVouchers} store profile(s) exposed voucher signals.`,
          "Voucher evidence is also preserved through store screenshots."
        ]
      },
      competitivePosition: {
        score: averageRating ? Math.min(90, Math.round(averageRating * 18)) : 58,
        observations: [
          `${input.products.length} product(s) were collected for the keyword "${input.keyword}".`,
          "Top sales and relevance views are compared when both sorts are enabled."
        ]
      },
      customerTrust: {
        score: reviewBalance,
        observations: [
          `${positiveReviews} positive review signal(s) and ${negativeReviews} negative review signal(s) were detected.`,
          "Store rating and mall/star/official badges are retained in product data when visible."
        ]
      },
      executiveSummary: `${evidenceSummary} The strongest opportunity is to combine current sales momentum with credible store presentation, complete promotion evidence, and consistent product visuals.`,
      keywordCompetitionMatrix,
      synthesizedCategoryInsights,
      swot: {
        strengths: [
          `${monthlyLeaders.length || input.products.length} commercially relevant product signal(s) provide a basis for competitor comparison.`,
          `${positiveReviews} positive review signal(s) support customer-trust analysis.`
        ],
        weaknesses: [
          negativeReviews > 0
            ? `${negativeReviews} negative review signal(s) expose product or service friction.`
            : "Negative review evidence is limited, which reduces downside visibility.",
          "Marketplace page changes and verification screens can reduce extraction confidence."
        ],
        opportunities: [
          medianPrice
            ? `The median observed price is approximately IDR ${Math.round(medianPrice).toLocaleString("id-ID")}, creating a practical benchmark for positioning.`
            : "Collect complete price evidence to establish a defensible market benchmark.",
          "Use the highest-momentum products as references for offer structure, merchandising, and creative testing."
        ],
        threats: [
          "High-volume competitors can defend share through aggressive vouchers and bundle promotions.",
          "Anti-bot and login barriers can make public evidence incomplete at the time of collection."
        ]
      },
      pricingAnalysis: {
        summary: medianPrice
          ? `Observed prices center around IDR ${Math.round(medianPrice).toLocaleString("id-ID")}; pricing should be evaluated together with monthly sales and historical demand.`
          : "The available evidence does not contain enough verified prices for a reliable benchmark.",
        signals: [
          `${prices.length} product price(s) were available for comparison.`,
          "High price is treated as commercially attractive only when current and historical sales are also strong."
        ]
      },
      storeAnalysis: {
        summary: leadingStore
          ? `${leadingStore.name} has the strongest visible follower signal among the collected stores and should be reviewed alongside homepage, voucher, and product-matrix evidence.`
          : "No complete store profile was available for a definitive store leader.",
        signals: [
          `${storesWithVouchers} store(s) exposed voucher signals.`,
          `${input.stores.length} store profile(s) were included in the comparison.`
        ]
      },
      competitorAnalysis: {
        summary: monthlyLeaders.length > 0
          ? `Current momentum is concentrated in ${monthlyLeaders.join(", ")}.`
          : "Monthly-sales evidence is incomplete, so competitor momentum should be interpreted cautiously.",
        signals: [
          `${input.products.length} product listing(s) were compared.`,
          `${monthlyLeaders.length} monthly-sales leader(s) had verifiable current-sales data.`
        ]
      },
      visualAnalysis: {
        summary: input.screenshotPaths.length > 0
          ? `${input.screenshotPaths.length} screenshot(s) support visual-quality and merchandising analysis.`
          : "No screenshots were available, so visual conclusions use structured evidence only.",
        signals: [
          "Product clarity, brand consistency, hierarchy, and promotion visibility are the primary visual criteria.",
          "Provider vision analysis can deepen these findings when an OpenAI, Gemini, or Claude key is configured."
        ]
      },
      painPoints: [
        "Browser-visible review text can be limited by login, captcha, lazy loading, or regional UI changes.",
        "Mobile-app-only evidence requires a mobile capture path or manual import in V1."
      ],
      strengths: [
        "Marketplace data, screenshots, product details, store context, and report generation stay local.",
        "The adapter boundary keeps Shopee logic separate from the core workflow."
      ],
      weaknesses: [
        "Public marketplace pages can change without notice and may reduce extraction confidence.",
        "Vision-level scoring requires configured AI provider access."
      ],
      recommendations: [
        {
          priority: "HIGH",
          action: "Prioritize products with high monthly sold counts and repeated positive review language.",
          rationale: "The PDF workflow selects products by sales relevance, pricing position, and visual strength."
        },
        {
          priority: "MEDIUM",
          action: "Compare store homepage vouchers, banners, and featured product blocks before final recommendations.",
          rationale: "Store merchandising quality is a major competitive signal in the reference report."
        },
        {
          priority: "LOW",
          action: "Use manual mobile evidence import for app-only screens until mobile automation is enabled.",
          rationale: "Shopee web automation cannot reliably access every mobile app surface."
        }
      ],
      automationLimitations: limitations
    };
  }
}

function buildKeywordCompetitionMatrix(input: AnalysisInput): AiAnalysisJson["keywordCompetitionMatrix"] {
  const products = new Map<string, AnalysisInput["products"][number]>();
  for (const product of input.products.filter((item) => !item.source?.startsWith("Store Products") && !item.source?.startsWith("Store Best Sellers"))) {
    const identity = competitionProductIdentity(product);
    const existing = products.get(identity);
    if (!existing || competitionProductScore(product) > competitionProductScore(existing)) {
      products.set(identity, product);
    }
  }

  return [...products.values()]
    .sort((left, right) =>
      competitionProductScore(right) - competitionProductScore(left)
      || left.rank - right.rank
      || competitionProductIdentity(left).localeCompare(competitionProductIdentity(right))
    )
    .slice(0, 10)
    .map((product) => ({
      productName: product.title,
      priceRange: competitionPriceRange(product),
      uspKeyClaim: competitionProductClaim(product),
      rating: isNumber(product.rating) ? `${product.rating.toFixed(1)} / 5` : "Not available",
      shortDescription: competitionProductDescription(product)
    }));
}

function buildSynthesizedCategoryInsights(
  input: AnalysisInput,
  matrix: AiAnalysisJson["keywordCompetitionMatrix"]
): AiAnalysisJson["synthesizedCategoryInsights"] {
  const prices = input.products
    .map((product) => product.price.average ?? product.price.min ?? product.price.max)
    .filter(isNumber)
    .sort((left, right) => left - right);
  const ratings = input.products.map((product) => product.rating).filter(isNumber);
  const monthlyLeaders = [...input.products]
    .filter((product) => isNumber(product.monthlySold))
    .sort((left, right) => (right.monthlySold ?? 0) - (left.monthlySold ?? 0));
  const minimumPrice = prices[0];
  const maximumPrice = prices[prices.length - 1];
  const medianPrice = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : undefined;
  const averageRating = average(ratings);
  const leader = monthlyLeaders[0];
  const language = input.language === "id-ID" ? "id-ID" : input.language === "zh-CN" ? "zh-CN" : "en-US";
  const priceSpan = minimumPrice !== undefined && maximumPrice !== undefined
    ? `${formatCompetitionMoney(minimumPrice)}–${formatCompetitionMoney(maximumPrice)}`
    : "not yet verified";
  const median = medianPrice !== undefined ? formatCompetitionMoney(medianPrice) : "not yet verified";
  const trust = averageRating !== undefined ? `${averageRating.toFixed(2)} / 5 across ${ratings.length} rated products` : "insufficient verified rating data";
  const momentum = leader
    ? `${leader.title} leads the visible monthly demand signal with ${formatCompetitionCount(leader.monthlySold)} sold`
    : "monthly-sales evidence is not yet complete";

  if (language === "id-ID") {
    return [
      { title: "ARSITEKTUR & TINGKAT HARGA", insight: `Rentang harga terverifikasi adalah ${priceSpan} dengan median ${median}. Gunakan median sebagai jangkar kategori, lalu bedakan tingkat ekonomis, inti, dan premium melalui manfaat yang dapat dibuktikan.` },
      { title: "POSISI KOMPETITIF & KLAIM UTAMA", insight: `${matrix.length} produk kompetitif dibandingkan. Klaim harus menonjolkan manfaat produk yang spesifik, bukti spesifikasi, dan alasan membeli yang tidak mudah ditiru oleh listing generik.` },
      { title: "KEPERCAYAAN PELANGGAN & SINYAL PENILAIAN", insight: `Sinyal kepercayaan saat ini adalah ${trust}. Prioritaskan bukti ulasan, identitas toko resmi, dan respons penjual untuk memperkuat klaim produk.` },
      { title: "KONSENTRASI PERMINTAAN & MOMENTUM PRODUK", insight: `${momentum}. Gunakan pemimpin permintaan sebagai tolok ukur penawaran, tetapi validasi momentum dengan total penjualan dan kualitas ulasan sebelum meniru strategi.` },
      { title: "PELUANG KATEGORI & TINDAKAN YANG DIREKOMENDASIKAN", insight: `Bangun penawaran di sekitar celah antara harga, klaim utama, dan bukti kepercayaan. Uji satu proposisi yang jelas terhadap produk Top 10 dan pertahankan hanya diferensiasi yang didukung bukti marketplace.` }
    ];
  }

  if (language === "zh-CN") {
    return [
      { title: "价格架构与分层", insight: `已验证价格范围为 ${priceSpan}，中位价为 ${median}。以中位价为类别锚点，并通过可验证的利益点区分入门、核心和高端层级。` },
      { title: "竞争定位与核心主张", insight: `本次比较了 ${matrix.length} 个竞争产品。核心主张应聚焦具体产品利益、规格证据和不易被普通商品页复制的购买理由。` },
      { title: "客户信任与评分信号", insight: `当前信任信号为 ${trust}。优先使用评论证据、官方店铺身份和卖家回复来支撑产品主张。` },
      { title: "需求集中度与产品动能", insight: `${momentum}。可将需求领先产品作为报价基准，但在复制策略前应结合累计销量和评论质量验证其动能。` },
      { title: "品类机会与建议行动", insight: `围绕价格、核心主张和信任证据之间的空白构建产品方案。针对 Top 10 产品测试一个清晰价值主张，仅保留有市场证据支持的差异化。` }
    ];
  }

  return [
    { title: "PRICING ARCHITECTURE & TIERING", insight: `The verified price span is ${priceSpan}, with a median of ${median}. Use the median as the category anchor, then separate entry, core, and premium tiers through provable benefits rather than price alone.` },
    { title: "COMPETITIVE POSITIONING & KEY CLAIMS", insight: `${matrix.length} competitive products were compared. Positioning should emphasize a specific product benefit, specification evidence, and a reason to buy that generic listings cannot easily duplicate.` },
    { title: "CUSTOMER TRUST & RATING SIGNALS", insight: `The current trust signal is ${trust}. Prioritize review evidence, official-store identity, and seller responsiveness to substantiate product claims.` },
    { title: "DEMAND CONCENTRATION & PRODUCT MOMENTUM", insight: `${momentum}. Use demand leaders as offer benchmarks, but validate momentum against total sales and review quality before copying their strategy.` },
    { title: "CATEGORY OPPORTUNITIES & RECOMMENDED ACTIONS", insight: `Build the offer around gaps between price, key claims, and trust evidence. Test one clear proposition against the Top 10 set and retain only differentiation supported by marketplace evidence.` }
  ];
}

function competitionProductIdentity(product: AnalysisInput["products"][number]): string {
  if (product.marketplaceProductId) return `id:${product.marketplaceProductId}`;
  try {
    const url = new URL(product.url);
    return `url:${url.hostname.toLowerCase()}${url.pathname.replace(/\/$/u, "").toLowerCase()}`;
  } catch {
    return `fallback:${product.storeName?.toLowerCase() ?? ""}|${product.title.toLowerCase().replace(/\s+/gu, " ").trim()}`;
  }
}

function competitionProductScore(product: AnalysisInput["products"][number]): number {
  const sourceScore = product.source === "Top Sales" ? 180 : product.source === "Relevance" ? 110 : 40;
  const rankScore = Math.max(0, 80 - Math.min(product.rank, 80));
  const monthlyScore = isNumber(product.monthlySold) ? Math.log10(product.monthlySold + 1) * 30 : 0;
  const totalScore = isNumber(product.totalSold) ? Math.log10(product.totalSold + 1) * 18 : 0;
  const ratingScore = isNumber(product.rating) ? product.rating * 10 : 0;
  return sourceScore + rankScore + monthlyScore + totalScore + ratingScore;
}

function competitionPriceRange(product: AnalysisInput["products"][number]): string {
  const { min, max, average } = product.price;
  if (isNumber(min) && isNumber(max) && min !== max) {
    return `${formatCompetitionMoney(min)}–${formatCompetitionMoney(max)}`;
  }
  const price = average ?? min ?? max;
  return isNumber(price) ? formatCompetitionMoney(price) : "Not available";
}

function competitionProductClaim(product: AnalysisInput["products"][number]): string {
  const specifications = Object.entries(product.specifications)
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
  const badges = [product.officialStatus || product.mallStatus ? "Official/Mall store" : undefined, product.starSeller ? "Star seller" : undefined]
    .filter(Boolean)
    .join("; ");
  return compactCompetitionText(
    specifications || product.voucherText || product.description || badges || product.selectionReason || "Marketplace product offer",
    150
  );
}

function competitionProductDescription(product: AnalysisInput["products"][number]): string {
  if (product.description?.trim()) return compactCompetitionText(product.description, 190);
  const demand = isNumber(product.monthlySold)
    ? `${formatCompetitionCount(product.monthlySold)} monthly sold`
    : isNumber(product.totalSold) ? `${formatCompetitionCount(product.totalSold)} total sold` : "sales not verified";
  const store = product.storeName ? ` from ${product.storeName}` : "";
  return compactCompetitionText(`${product.title}${store}; ${demand}.`, 190);
}

function compactCompetitionText(value: string, maximum: number): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  return normalized.length <= maximum ? normalized : `${normalized.slice(0, maximum - 1).trimEnd()}…`;
}

function formatCompetitionMoney(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatCompetitionCount(value: number | undefined): string {
  return isNumber(value) ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value) : "-";
}

async function requestOpenAI(apiKey: string, model: string, input: AnalysisInput): Promise<AiAnalysisJson> {
  const body = {
    model,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: buildPrompt(input, "OpenAI") },
          ...(await imageParts(input.screenshotPaths, "openai"))
        ]
      }
    ]
  };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`OpenAI analysis failed with status ${response.status}`);
  }
  const json = (await response.json()) as OpenAIResponse;
  const text = extractOpenAIText(json);
  return validateAnalysis(text, `openai:${model}`, input);
}

async function requestGemini(apiKey: string, model: string, input: AnalysisInput): Promise<AiAnalysisJson> {
  const parts = [{ text: buildPrompt(input, "Gemini") }, ...(await imageParts(input.screenshotPaths, "gemini"))];
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { responseMimeType: "application/json" }
      })
    }
  );
  if (!response.ok) {
    throw new Error(`Gemini analysis failed with status ${response.status}`);
  }
  const json = (await response.json()) as GeminiResponse;
  const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n") ?? "";
  return validateAnalysis(text, `gemini:${model}`, input);
}

async function requestClaude(apiKey: string, model: string, input: AnalysisInput): Promise<AiAnalysisJson> {
  const content = [
    { type: "text", text: buildPrompt(input, "Claude") },
    ...(await imageParts(input.screenshotPaths, "claude"))
  ];
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model, max_tokens: 12_000, messages: [{ role: "user", content }] })
  });
  if (!response.ok) {
    throw new Error(`Claude analysis failed with status ${response.status}: ${await response.text().then((value) => value.slice(0, 500)).catch(() => "")}`);
  }
  const json = (await response.json()) as ClaudeResponse;
  const text = json.content?.filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n") ?? "";
  return validateAnalysis(text, `claude:${model}`, input);
}

async function requestOpenAITranslation(
  apiKey: string,
  model: string,
  texts: string[],
  language: "id-ID" | "en-US" | "zh-CN"
): Promise<string[]> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: translationPrompt(texts, language)
    })
  });
  if (!response.ok) {
    throw new Error(`OpenAI translation failed with status ${response.status}`);
  }
  const json = (await response.json()) as OpenAIResponse;
  return validateTranslations(extractOpenAIText(json), texts);
}

async function requestGeminiTranslation(
  apiKey: string,
  model: string,
  texts: string[],
  language: "id-ID" | "en-US" | "zh-CN"
): Promise<string[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: translationPrompt(texts, language) }] }] })
    }
  );
  if (!response.ok) {
    throw new Error(`Gemini translation failed with status ${response.status}`);
  }
  const json = (await response.json()) as GeminiResponse;
  const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n") ?? "";
  return validateTranslations(text, texts);
}

async function requestClaudeTranslation(
  apiKey: string,
  model: string,
  texts: string[],
  language: "id-ID" | "en-US" | "zh-CN"
): Promise<string[]> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_tokens: 8_000,
      messages: [{ role: "user", content: translationPrompt(texts, language) }]
    })
  });
  if (!response.ok) {
    throw new Error(`Claude translation failed with status ${response.status}`);
  }
  const json = (await response.json()) as ClaudeResponse;
  const text = json.content?.filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n") ?? "";
  return validateTranslations(text, texts);
}

function translationPrompt(texts: string[], language: "id-ID" | "en-US" | "zh-CN"): string {
  const target = language === "id-ID" ? "Bahasa Indonesia" : language === "zh-CN" ? "Simplified Chinese" : "English";
  return [
    `Translate each marketplace evidence string into ${target}.`,
    "Preserve product names, store names, usernames, brands, SKUs, URLs, currencies, prices, dates, timestamps, measurements, and line breaks exactly.",
    "Do not summarize, add commentary, remove facts, or translate identifiers.",
    "Return only valid JSON in the form {\"translations\":[\"...\"]}, with exactly one output string for each input string in the same order.",
    JSON.stringify({ texts })
  ].join("\n");
}

function validateTranslations(text: string, sourceTexts: string[]): string[] {
  const parsed = translationResponseSchema.parse(JSON.parse(stripCodeFence(text)) as unknown);
  if (parsed.translations.length !== sourceTexts.length) {
    throw new Error("Translation response length does not match the requested evidence batch.");
  }
  return parsed.translations.map((translation, index) => translation.trim() || sourceTexts[index]);
}

function buildPrompt(input: AnalysisInput, provider: string): string {
  return [
    `Act as a senior marketplace strategy specialist analyzing evidence for ${input.keyword}.`,
    `Provider target: ${provider}.`,
    `Language: ${input.language}.`,
    "Write every narrative, observation, and recommendation in the requested language.",
    "When citing marketplace comments or descriptions, translate their meaning while preserving product names, store names, SKUs, URLs, prices, dates, and measurements exactly.",
    "Give evidence-grounded commercial recommendations with a clear action, rationale, and priority. Avoid generic advice, filler, AI self-reference, and unsupported claims.",
    "This request must produce the final analysis now. Do not describe how you would analyze it, ask questions, defer the task, or return an empty matrix.",
    "Use only the supplied Facts object. Treat missing values as unavailable and never manufacture product names, prices, ratings, sales, reviews, stores, or claims.",
    "Build keywordCompetitionMatrix from the strongest available competitive products only. Return one row per available product, up to 10 rows, without inventing products or evidence.",
    "For each matrix row, make uspKeyClaim and shortDescription concise, commercially useful, and grounded in the supplied title, description, specifications, badges, sales, rating, and promotion evidence.",
    "Return exactly five synthesizedCategoryInsights covering: pricing architecture and tiering; competitive positioning and key claims; customer trust and rating signals; demand concentration and product momentum; category opportunities and recommended actions.",
    "Write the five insights in the voice of a marketplace category specialist. Translate their titles and content into the requested report language.",
    "Return only valid JSON matching this schema:",
    JSON.stringify(schemaExample()),
    "Use the screenshots as visual evidence when provided.",
    "Do not return markdown.",
    "Populate every required schema property. The response is invalid if it contains prose outside the JSON object or omits a required property.",
    "Facts:",
    JSON.stringify(
      {
        products: input.products.map((product) => ({
          title: product.title,
          url: product.url,
          source: product.source,
          rank: product.rank,
          selectionReason: product.selectionReason,
          price: product.price,
          rating: product.rating,
          monthlySold: product.monthlySold,
          totalSold: product.totalSold,
          storeName: product.storeName,
          voucherText: product.voucherText,
          description: product.description,
          specifications: product.specifications,
          mallStatus: product.mallStatus,
          officialStatus: product.officialStatus,
          starSeller: product.starSeller
        })),
        stores: input.stores.map((store) => ({
          name: store.name,
          followers: store.followers,
          productsCount: store.productsCount,
          rating: store.rating,
          voucherCount: store.voucherCount,
          visualTheme: store.visualTheme
        })),
        reviewSignals: input.reviews.slice(0, 30)
      },
      null,
      2
    )
  ].join("\n");
}

function schemaExample(): AiAnalysisJson {
  return {
    schemaVersion: "1.0",
    subjectType: "PROJECT",
    provider: "provider-name",
    confidence: 0.7,
    branding: { score: 70, observations: ["observation"] },
    visualQuality: { score: 70, observations: ["observation"] },
    voucherStrategy: { score: 70, observations: ["observation"] },
    competitivePosition: { score: 70, observations: ["observation"] },
    customerTrust: { score: 70, observations: ["observation"] },
    executiveSummary: "executive summary",
    keywordCompetitionMatrix: [
      {
        productName: "product name",
        priceRange: "IDR 100,000 - IDR 150,000",
        uspKeyClaim: "evidence-grounded key claim",
        rating: "4.9 / 5",
        shortDescription: "concise competitive product description"
      }
    ],
    synthesizedCategoryInsights: [
      { title: "PRICING ARCHITECTURE & TIERING", insight: "specialist pricing insight" },
      { title: "COMPETITIVE POSITIONING & KEY CLAIMS", insight: "specialist positioning insight" },
      { title: "CUSTOMER TRUST & RATING SIGNALS", insight: "specialist trust insight" },
      { title: "DEMAND CONCENTRATION & PRODUCT MOMENTUM", insight: "specialist demand insight" },
      { title: "CATEGORY OPPORTUNITIES & RECOMMENDED ACTIONS", insight: "specialist opportunity insight" }
    ],
    swot: {
      strengths: ["strength"],
      weaknesses: ["weakness"],
      opportunities: ["opportunity"],
      threats: ["threat"]
    },
    pricingAnalysis: { summary: "pricing summary", signals: ["pricing signal"] },
    storeAnalysis: { summary: "store summary", signals: ["store signal"] },
    competitorAnalysis: { summary: "competitor summary", signals: ["competitor signal"] },
    visualAnalysis: { summary: "visual summary", signals: ["visual signal"] },
    painPoints: ["pain point"],
    strengths: ["strength"],
    weaknesses: ["weakness"],
    recommendations: [
      {
        priority: "HIGH",
        action: "action",
        rationale: "rationale"
      }
    ],
    automationLimitations: ["limitation"]
  };
}

async function imageParts(paths: string[], provider: AIProvider) {
  const limited = paths.filter((path) => path.toLowerCase().endsWith(".png")).slice(0, 4);
  const parts: Array<Record<string, unknown>> = [];
  for (const path of limited) {
    const data = (await readFile(path)).toString("base64");
    if (provider === "openai") {
      parts.push({
        type: "input_image",
        image_url: `data:image/png;base64,${data}`
      });
    } else if (provider === "gemini") {
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data
        }
      });
    } else {
      parts.push({
        type: "image",
        source: {
          type: "base64",
          media_type: "image/png",
          data
        }
      });
    }
  }
  return parts;
}

function validateAnalysis(text: string, provider: string, input: AnalysisInput): AiAnalysisJson {
  const parsed = JSON.parse(stripCodeFence(text)) as unknown;
  const analysis = analysisSchema.parse(parsed);
  return {
    ...analysis,
    provider,
    subjectType: input.subjectType,
    subjectId: input.subjectId
  };
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }
  return trimmed.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
}

function average(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

function extractOpenAIText(response: OpenAIResponse): string {
  if (response.output_text) {
    return response.output_text;
  }
  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? "")
      .join("\n") ?? ""
  );
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

type ClaudeResponse = {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
};
