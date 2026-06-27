import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { AnalysisInput, AIAnalysisService } from "../../application/services/AIAnalysisService.js";
import type { SettingsRepository } from "../../domain/repositories.js";
import type { AiAnalysisJson } from "../../domain/models.js";

const recommendationSchema = z.object({
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  action: z.string(),
  rationale: z.string()
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
  painPoints: z.array(z.string()),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendations: z.array(recommendationSchema),
  automationLimitations: z.array(z.string())
});

export class CompositeAIAnalysisService implements AIAnalysisService {
  constructor(
    private readonly settings: SettingsRepository,
    private readonly local = new LocalHeuristicAnalysisService()
  ) {}

  async analyze(input: AnalysisInput): Promise<AiAnalysisJson> {
    const [openAiKey, geminiKey] = await Promise.all([
      this.settings.getSecret("openai"),
      this.settings.getSecret("gemini")
    ]);

    if (openAiKey) {
      try {
        return await requestOpenAI(openAiKey, input);
      } catch {
        if (!geminiKey) {
          return this.local.analyze(input, ["OpenAI request failed; local analysis was used."]);
        }
      }
    }

    if (geminiKey) {
      try {
        return await requestGemini(geminiKey, input);
      } catch {
        return this.local.analyze(input, ["Gemini request failed; local analysis was used."]);
      }
    }

    return this.local.analyze(input, [
      "No AI API key is configured; local deterministic analysis was used."
    ]);
  }
}

class LocalHeuristicAnalysisService {
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
          "AI vision scoring improves when OpenAI or Gemini keys are configured."
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

async function requestOpenAI(apiKey: string, input: AnalysisInput): Promise<AiAnalysisJson> {
  const body = {
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
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
  return validateAnalysis(text, "openai", input);
}

async function requestGemini(apiKey: string, input: AnalysisInput): Promise<AiAnalysisJson> {
  const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
  const parts = [{ text: buildPrompt(input, "Gemini") }, ...(await imageParts(input.screenshotPaths, "gemini"))];
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts }] })
    }
  );
  if (!response.ok) {
    throw new Error(`Gemini analysis failed with status ${response.status}`);
  }
  const json = (await response.json()) as GeminiResponse;
  const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n") ?? "";
  return validateAnalysis(text, "gemini", input);
}

function buildPrompt(input: AnalysisInput, provider: string): string {
  return [
    `You are analyzing marketplace intelligence evidence for ${input.keyword}.`,
    `Provider target: ${provider}.`,
    `Language: ${input.language}.`,
    "Return only valid JSON matching this schema:",
    JSON.stringify(schemaExample()),
    "Use the screenshots as visual evidence when provided.",
    "Do not return markdown.",
    "Facts:",
    JSON.stringify(
      {
        products: input.products.map((product) => ({
          title: product.title,
          price: product.price,
          rating: product.rating,
          monthlySold: product.monthlySold,
          totalSold: product.totalSold,
          storeName: product.storeName,
          voucherText: product.voucherText
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

async function imageParts(paths: string[], provider: "openai" | "gemini") {
  const limited = paths.filter((path) => path.toLowerCase().endsWith(".png")).slice(0, 4);
  const parts: Array<Record<string, unknown>> = [];
  for (const path of limited) {
    const data = (await readFile(path)).toString("base64");
    if (provider === "openai") {
      parts.push({
        type: "input_image",
        image_url: `data:image/png;base64,${data}`
      });
    } else {
      parts.push({
        inlineData: {
          mimeType: "image/png",
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
