import type { Page } from "playwright";
import type { MarketplaceAdapter } from "../../../domain/marketplace/MarketplaceAdapter.js";
import type {
  KeywordCollectionResult,
  MoneyRange,
  ProductCard,
  ProductCollectionRequest,
  ProductCollectionResult,
  ProductDetail,
  ReviewEvidence,
  ScreenshotEvidence,
  SearchRequest,
  StoreCollectionRequest,
  StoreCollectionResult,
  StoreProfile
} from "../../../domain/models.js";
import type { SettingsRepository } from "../../../domain/repositories.js";
import { PlaywrightBrowserLauncher } from "../../browser/PlaywrightBrowserLauncher.js";
import { ScreenshotEngine } from "../../screenshot/ScreenshotEngine.js";

type RawCard = {
  href: string;
  title: string;
  imageUrl?: string;
  text: string;
};

type RawProductPage = {
  title: string;
  description?: string;
  text: string;
  images: string[];
  videos: string[];
  storeUrl?: string;
  storeName?: string;
};

export class ShopeeAdapter implements MarketplaceAdapter {
  readonly id = "SHOPEE_ID" as const;
  readonly displayName = "Shopee Indonesia";
  readonly baseUrl = "https://shopee.co.id";
  readonly capabilities = {
    searchKeyword: true,
    topSalesSort: true,
    productDetail: true,
    storeDetail: true,
    reviews: true,
    userMedia: true,
    voucherCapture: true,
    mobileEvidence: false
  };

  constructor(
    private readonly screenshots = new ScreenshotEngine(),
    private readonly settings?: Pick<SettingsRepository, "get">,
    private readonly browserLauncher = new PlaywrightBrowserLauncher()
  ) {}

  async searchKeyword(request: SearchRequest): Promise<KeywordCollectionResult> {
    return this.withPage(async (page) => {
      const url = this.searchUrl(request.keyword, request.sort);
      const warnings: string[] = [];
      await this.goto(page, url);
      await this.scrollForInventory(page);

      const screenshots: ScreenshotEvidence[] = [];
      if (request.captureScreenshots) {
        screenshots.push(
          await this.screenshots.capture(page, {
            projectFolder: request.projectFolder,
            group: "search",
            kind: request.sort === "TOP_SALES" ? "TOP_SALES" : "SEARCH_RESULT",
            label: `${request.keyword} ${request.sort.toLowerCase()}`,
            sourceUrl: url
          })
        );
      }

      const rawCards = await this.extractProductCards(page);
      if (rawCards.length === 0) {
        warnings.push(
          "Shopee returned no browser-readable product cards. This can happen when the page requires login, captcha, or regional consent."
        );
      }

      const products = rawCards.slice(0, request.limit).map((raw, index) =>
        this.toProductCard(raw, index + 1)
      );
      return { products, screenshots, warnings };
    });
  }

  async collectProduct(request: ProductCollectionRequest): Promise<ProductCollectionResult> {
    return this.withPage(async (page) => {
      const warnings: string[] = [];
      await this.goto(page, request.product.url);
      await this.scrollForInventory(page);
      const raw = await this.extractProductPage(page);

      const screenshots: ScreenshotEvidence[] = [];
      if (request.captureScreenshots) {
        screenshots.push(
          await this.screenshots.capture(page, {
            projectFolder: request.projectFolder,
            group: "products",
            kind: "PRODUCT_PAGE",
            label: `product ${request.product.rank} first page`,
            sourceUrl: request.product.url
          })
        );
      }

      const detail: ProductDetail = {
        ...request.product,
        title: raw.title || request.product.title,
        storeName: raw.storeName ?? request.product.storeName,
        storeUrl: raw.storeUrl ?? request.product.storeUrl,
        price: enrichPrice(request.product.price, raw.text),
        rating: request.product.rating ?? parseRating(raw.text),
        reviewCount: request.product.reviewCount ?? parseCountNear(raw.text, ["rating", "ratings", "ulasan"]),
        totalSold: request.product.totalSold ?? parseCountNear(raw.text, ["sold", "terjual"]),
        stock: parseCountNear(raw.text, ["stock", "stok"]),
        voucherText: extractLine(raw.text, ["voucher", "promo", "discount", "diskon"]),
        shippingText: extractLine(raw.text, ["shipping", "pengiriman", "gratis ongkir"]),
        variants: extractVariantLines(raw.text),
        description: raw.description ?? extractDescription(raw.text),
        specifications: extractSpecifications(raw.text),
        images: raw.images,
        videos: raw.videos,
        raw: {
          ...request.product.raw,
          pageTextSample: raw.text.slice(0, 5000)
        }
      };

      const reviews = request.collectReviews ? inferReviews(raw.text, raw.images) : [];
      if (request.collectReviews && reviews.length === 0) {
        warnings.push(
          "Review content was not available as browser-readable structured text. The report will keep screenshots and mark review extraction confidence as limited."
        );
      }

      return { detail, reviews, screenshots, warnings };
    });
  }

  async collectStore(request: StoreCollectionRequest): Promise<StoreCollectionResult> {
    return this.withPage(async (page) => {
      const warnings: string[] = [];
      await this.goto(page, request.storeUrl);
      await this.scrollForInventory(page);

      const screenshots: ScreenshotEvidence[] = [];
      if (request.captureScreenshots) {
        screenshots.push(
          await this.screenshots.capture(page, {
            projectFolder: request.projectFolder,
            group: "stores",
            kind: "STORE_HOME",
            label: "store homepage",
            sourceUrl: request.storeUrl
          })
        );
      }

      const raw = await this.extractStorePage(page);
      const products = raw.cards.slice(0, 24).map((card, index) => this.toProductCard(card, index + 1));
      if (products.length === 0) {
        warnings.push(
          "Store product grid was not available as browser-readable cards; screenshot evidence was still captured."
        );
      }

      const store: StoreProfile = {
        marketplace: this.id,
        marketplaceStoreId: extractStoreId(request.storeUrl),
        name: raw.name,
        url: request.storeUrl,
        followers: parseCountNear(raw.text, ["followers", "pengikut"]),
        following: parseCountNear(raw.text, ["following", "mengikuti"]),
        productsCount: parseCountNear(raw.text, ["products", "produk"]),
        rating: parseRating(raw.text),
        ratingCount: parseCountNear(raw.text, ["rating", "ratings", "penilaian"]),
        chatResponse: extractLine(raw.text, ["chat", "response", "performa"]),
        joinedDate: extractLine(raw.text, ["joined", "bergabung"]),
        categories: extractCategoryLines(raw.text),
        voucherCount: parseCountNear(raw.text, ["voucher", "coupon", "kupon"]),
        voucherTypes: extractVoucherLines(raw.text),
        featuredProducts: products.slice(0, 12),
        bestSellers: products.slice(0, 12),
        visualTheme: inferVisualTheme(raw.text, raw.images),
        raw: {
          textSample: raw.text.slice(0, 5000),
          imageCount: raw.images.length
        }
      };

      return { store, screenshots, warnings };
    });
  }

  normalizeUrl(url: string): string {
    if (url.startsWith("http")) {
      return url;
    }
    return new URL(url, this.baseUrl).toString();
  }

  private searchUrl(keyword: string, sort: SearchRequest["sort"]): string {
    const url = new URL("/search", this.baseUrl);
    url.searchParams.set("keyword", keyword);
    if (sort === "TOP_SALES") {
      url.searchParams.set("sortBy", "sales");
    }
    return url.toString();
  }

  private async withPage<T>(work: (page: Page) => Promise<T>): Promise<T> {
    const settings = await this.settings?.get().catch(() => undefined);
    return this.browserLauncher.withPage(settings?.browser ?? "chromium", async (page, fallbackReason) => {
      const result = await work(page);
      if (fallbackReason) {
        // The workflow records extraction warnings elsewhere; this keeps browser fallback local.
        console.warn(fallbackReason);
      }
      return result;
    });
  }

  private async goto(page: Page, url: string): Promise<void> {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(2500);
  }

  private async scrollForInventory(page: Page): Promise<void> {
    for (let step = 0; step < 6; step += 1) {
      await page.mouse.wheel(0, 1100);
      await page.waitForTimeout(650);
    }
    await page.mouse.wheel(0, -5000);
    await page.waitForTimeout(800);
  }

  private async extractProductCards(page: Page): Promise<RawCard[]> {
    const cards = await page.locator("a").evaluateAll((anchors) => {
      return anchors
        .map((anchor) => {
          const link = anchor as HTMLAnchorElement;
          const image = link.querySelector("img") as HTMLImageElement | null;
          return {
            href: link.href,
            title:
              image?.alt?.trim() ||
              link.getAttribute("aria-label")?.trim() ||
              link.textContent?.trim() ||
              "",
            imageUrl: image?.currentSrc || image?.src || image?.getAttribute("data-src") || undefined,
            text: link.textContent?.trim() || ""
          };
        })
        .filter((card) => card.href.includes("shopee.co.id") && /-i\.\d+\.\d+/.test(card.href));
    });

    const unique = new Map<string, RawCard>();
    for (const card of cards as RawCard[]) {
      const normalized = this.normalizeUrl(card.href).split("?")[0];
      if (!unique.has(normalized) && (card.title || card.text)) {
        unique.set(normalized, { ...card, href: normalized });
      }
    }
    return [...unique.values()];
  }

  private async extractProductPage(page: Page): Promise<RawProductPage> {
    return page.evaluate(() => {
      const title =
        document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content ||
        document.querySelector("h1")?.textContent?.trim() ||
        document.title;
      const description =
        document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ||
        document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content ||
        undefined;
      const images = [...document.images]
        .map((image) => image.currentSrc || image.src)
        .filter((src) => src.startsWith("http"));
      const videos = [...document.querySelectorAll("video")]
        .map((video) => video.currentSrc || video.src)
        .filter((src) => src.startsWith("http"));
      const storeCandidate = [...document.querySelectorAll("a")]
        .map((anchor) => anchor as HTMLAnchorElement)
        .find((anchor) => /\/shop\/\d+|shopee\.co\.id\/[^/?#]+$/i.test(anchor.href));
      return {
        title,
        description,
        text: document.body.innerText,
        images: [...new Set(images)].slice(0, 30),
        videos: [...new Set(videos)].slice(0, 5),
        storeUrl: storeCandidate?.href,
        storeName: storeCandidate?.textContent?.trim() || undefined
      };
    });
  }

  private async extractStorePage(page: Page): Promise<{ name: string; text: string; images: string[]; cards: RawCard[] }> {
    const pageData = await page.evaluate(() => {
      const images = [...document.images]
        .map((image) => image.currentSrc || image.src)
        .filter((src) => src.startsWith("http"));
      const name =
        document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content ||
        document.querySelector("h1")?.textContent?.trim() ||
        document.title.replace("| Shopee Indonesia", "").trim();
      return {
        name,
        text: document.body.innerText,
        images: [...new Set(images)].slice(0, 40)
      };
    });
    const cards = await this.extractProductCards(page);
    return { ...pageData, cards };
  }

  private toProductCard(raw: RawCard, rank: number): ProductCard {
    const combinedText = `${raw.title}\n${raw.text}`;
    return {
      marketplace: this.id,
      marketplaceProductId: extractProductId(raw.href),
      rank,
      title: cleanTitle(raw.title || firstTextLine(raw.text)),
      url: this.normalizeUrl(raw.href),
      imageUrl: raw.imageUrl,
      price: parsePrice(combinedText),
      rating: parseRating(combinedText),
      reviewCount: parseCountNear(combinedText, ["rating", "ratings", "ulasan"]),
      monthlySold: parseMonthlySold(combinedText),
      totalSold: parseCountNear(combinedText, ["sold", "terjual"]),
      storeName: undefined,
      storeUrl: undefined,
      mallStatus: /mall|ori|official/i.test(combinedText),
      officialStatus: /official/i.test(combinedText),
      starSeller: /star/i.test(combinedText),
      raw: {
        text: raw.text,
        imageUrl: raw.imageUrl
      }
    };
  }
}

function parsePrice(text: string) {
  const values = [...text.matchAll(/Rp\s?([\d.]+)/gi)]
    .map((match) => Number(match[1].replace(/\./g, "")))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (values.length === 0) {
    return { currency: "IDR" as const };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  return {
    min,
    max,
    average: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
    original: values.length > 1 ? max : undefined,
    currency: "IDR" as const
  };
}

function enrichPrice(existing: MoneyRange, text: string): MoneyRange {
  const parsed = parsePrice(text);
  return parsed.average ? parsed : existing;
}

function parseRating(text: string): number | undefined {
  const match = text.match(/\b([1-5](?:[.,]\d)?)\s*(?:\/\s*5|rating|ratings|\*)?/i);
  return match ? Number(match[1].replace(",", ".")) : undefined;
}

function parseMonthlySold(text: string): number | undefined {
  return parseCountNear(text, ["sold/month", "sold per month", "terjual/bulan", "terjual per bulan"]);
}

function parseCountNear(text: string, labels: string[]): number | undefined {
  const compact = text.replace(/\s+/g, " ");
  for (const label of labels) {
    const regex = new RegExp(`([\\d.,]+)\\s*(rb|ribu|k|jt|m|mio|million|juta)?\\s*${escapeRegex(label)}`, "i");
    const match = compact.match(regex);
    if (match) {
      return normalizeCount(match[1], match[2]);
    }
    const reversed = new RegExp(`${escapeRegex(label)}\\s*:?\\s*([\\d.,]+)\\s*(rb|ribu|k|jt|m|mio|million|juta)?`, "i");
    const reversedMatch = compact.match(reversed);
    if (reversedMatch) {
      return normalizeCount(reversedMatch[1], reversedMatch[2]);
    }
  }
  return undefined;
}

function normalizeCount(value: string, suffix?: string): number {
  const numeric = Number(value.replace(/\./g, "").replace(",", "."));
  const normalizedSuffix = suffix?.toLowerCase();
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  if (["rb", "ribu", "k"].includes(normalizedSuffix ?? "")) {
    return Math.round(numeric * 1000);
  }
  if (["jt", "m", "mio", "million", "juta"].includes(normalizedSuffix ?? "")) {
    return Math.round(numeric * 1000000);
  }
  return Math.round(numeric);
}

function extractLine(text: string, labels: string[]): string | undefined {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines.find((line) => labels.some((label) => line.toLowerCase().includes(label)));
}

function extractVariantLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /variant|variasi|tipe|warna|ukuran|curl|mm/i.test(line))
    .slice(0, 30);
}

function extractDescription(text: string): string | undefined {
  const marker = text.search(/description|deskripsi/i);
  if (marker < 0) {
    return undefined;
  }
  return text.slice(marker, marker + 3500).trim();
}

function extractSpecifications(text: string): Record<string, string> {
  const specs: Record<string, string> = {};
  const lines = text.split("\n").map((line) => line.trim());
  for (const line of lines) {
    const match = line.match(/^([^:]{3,40})\s*:\s*(.{2,120})$/);
    if (match) {
      specs[match[1]] = match[2];
    }
  }
  return specs;
}

function inferReviews(text: string, mediaUrls: string[]): ReviewEvidence[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 45);
  const reviewSignals = lines.filter((line) =>
    /bagus|cepat|lembut|nyaman|mantap|kecewa|buruk|rusak|tidak sesuai|suka|recommended|kualitas/i.test(line)
  );
  return reviewSignals.slice(0, 12).map((comment) => ({
    sentiment: /kecewa|buruk|rusak|tidak sesuai|keras|gagal/i.test(comment)
      ? "NEGATIVE"
      : /biasa|cukup/i.test(comment)
        ? "NEUTRAL"
        : "POSITIVE",
    rating: /kecewa|buruk|rusak|tidak sesuai|keras|gagal/i.test(comment) ? 1 : 5,
    comment,
    mediaUrls: mediaUrls.slice(0, 3),
    raw: { source: "browser-text-heuristic" }
  }));
}

function extractCategoryLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /category|kategori|all products|produk/i.test(line))
    .slice(0, 20);
}

function extractVoucherLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /voucher|coupon|kupon|off|diskon|min\.|gratis/i.test(line))
    .slice(0, 20);
}

function inferVisualTheme(text: string, images: string[]) {
  const lower = text.toLowerCase();
  const dominantColors = [
    lower.includes("pink") || lower.includes("merah muda") ? "pink" : undefined,
    lower.includes("natural") ? "natural tones" : undefined,
    lower.includes("black") || lower.includes("hitam") ? "black" : undefined
  ].filter((value): value is string => Boolean(value));
  return {
    dominantColors: dominantColors.length > 0 ? dominantColors : ["detected from screenshot evidence"],
    typographySignals: ["marketplace rendered typography"],
    bannerStyle: images.length > 5 ? ["image-led product banners"] : ["limited banner evidence"]
  };
}

function extractProductId(url: string): string | undefined {
  return url.match(/-i\.(\d+\.\d+)/)?.[1];
}

function extractStoreId(url: string): string | undefined {
  return url.match(/\/shop\/(\d+)/)?.[1];
}

function firstTextLine(text: string): string {
  return text.split("\n").map((line) => line.trim()).find(Boolean) ?? "Untitled product";
}

function cleanTitle(title: string): string {
  return title.replace(/\s+/g, " ").trim().slice(0, 260);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
