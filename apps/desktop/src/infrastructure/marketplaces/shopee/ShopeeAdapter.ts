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

export type ShopeeRawCard = {
  href: string;
  title: string;
  imageUrl?: string;
  text: string;
  ariaLabel?: string;
  imageAlt?: string;
  parentText?: string;
  sourceSort?: SearchRequest["sort"];
  storeName?: string;
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
      warnings.push(...(await this.goto(page, url)));
      await this.tryDismissInterruptions(page);
      await this.waitForSearchSignals(page);
      await this.scrollForInventory(page);
      await this.tryDismissInterruptions(page);

      const pageSnapshot = await this.inspectSearchPage(page);

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

      const rawCards = await this.extractProductCards(page, request.sort);
      warnings.push(
        ...searchWarningsFromSnapshot({
          ...pageSnapshot,
          productLinkCount: rawCards.length
        })
      );
      if (request.sort === "TOP_SALES" && !pageSnapshot.url.includes("sortBy=sales")) {
        warnings.push(
          "[SHOPEE_TOP_SALES_URL_MISMATCH] Shopee did not keep the expected top-sales sort parameter in the final URL; result order may be marketplace-adjusted."
        );
      }
      if (rawCards.length === 0) {
        warnings.push(
          "[SHOPEE_SELECTOR_EMPTY] No Shopee product-card anchors matched the expected product URL pattern after navigation and scrolling."
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

  private async goto(page: Page, url: string): Promise<string[]> {
    const warnings: string[] = [];
    let lastError: unknown;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
        await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
        await page.waitForTimeout(2000);
        if (attempt > 1) {
          warnings.push(
            `[SHOPEE_NAVIGATION_RETRY] Shopee page loaded after retry attempt ${attempt}.`
          );
        }
        return warnings;
      } catch (error) {
        lastError = error;
        warnings.push(
          `[SHOPEE_NAVIGATION_RETRY] Attempt ${attempt} failed for ${url}: ${errorMessage(error)}`
        );
        await page.waitForTimeout(1500);
      }
    }

    throw new Error(
      `[SHOPEE_NAVIGATION_FAILED] Shopee navigation failed after 2 attempts for ${url}: ${errorMessage(lastError)}`
    );
  }

  private async scrollForInventory(page: Page): Promise<void> {
    for (let step = 0; step < 6; step += 1) {
      await page.mouse.wheel(0, 1100);
      await page.waitForTimeout(650);
    }
    await page.mouse.wheel(0, -5000);
    await page.waitForTimeout(800);
  }

  private async waitForSearchSignals(page: Page): Promise<void> {
    await page
      .waitForFunction(() => {
        const bodyText = document.body?.innerText ?? "";
        const hasProductLinks = [...document.querySelectorAll("a")].some((anchor) =>
          /-i\.\d+\.\d+/.test((anchor as HTMLAnchorElement).href)
        );
        const hasTerminalSignal =
          /captcha|verify|verifikasi|login|masuk|no results|tidak ditemukan|kosong|akses ditolak|blocked/i.test(
            bodyText
          );
        return hasProductLinks || hasTerminalSignal;
      }, undefined, { timeout: 15000 })
      .catch(() => undefined);
  }

  private async tryDismissInterruptions(page: Page): Promise<void> {
    const labels = [
      "Accept All",
      "Accept",
      "Terima Semua",
      "Saya Setuju",
      "Setuju",
      "Nanti",
      "Lewati",
      "Tutup"
    ];

    for (const label of labels) {
      const button = page.getByRole("button", { name: new RegExp(`^\\s*${escapeRegex(label)}\\s*$`, "i") }).first();
      if (await button.isVisible({ timeout: 300 }).catch(() => false)) {
        await button.click({ timeout: 1000 }).catch(() => undefined);
        await page.waitForTimeout(500);
      }
    }
  }

  private async inspectSearchPage(page: Page): Promise<ShopeeSearchPageSnapshot> {
    return page.evaluate(() => {
      const bodyText = document.body?.innerText ?? "";
      return {
        url: window.location.href,
        title: document.title,
        bodyTextSample: bodyText.replace(/\s+/g, " ").trim().slice(0, 3000),
        productLinkCount: [...document.querySelectorAll("a")].filter((anchor) =>
          /-i\.\d+\.\d+/.test((anchor as HTMLAnchorElement).href)
        ).length
      };
    });
  }

  private async extractProductCards(page: Page, sourceSort?: SearchRequest["sort"]): Promise<ShopeeRawCard[]> {
    const cards = await page.locator("a").evaluateAll((anchors, sort) => {
      const normalizeText = (value: string | null | undefined) =>
        (value ?? "").replace(/\s+/g, " ").trim();

      const productTitleFromText = (text: string) =>
        text
          .split(/\n| {2,}/)
          .map((line) => normalizeText(line))
          .find((line) => line.length >= 8 && !/^(Rp|[\d.,]+\s*(rb|ribu|k|jt|juta)?\+?\s*terjual)/i.test(line)) ??
        "";

      const cardTextFor = (link: HTMLAnchorElement) => {
        let node: HTMLElement | null = link;
        let best = normalizeText(link.innerText || link.textContent);

        for (let depth = 0; node && depth < 5; depth += 1) {
          const text = normalizeText(node.innerText || node.textContent);
          if (text.length > best.length && text.length <= 2500) {
            best = text;
          }
          if (/Rp\s?[\d.,]+/i.test(text) && /(terjual|sold|rating|ulasan|Rp)/i.test(text)) {
            return text;
          }
          node = node.parentElement;
        }

        return best;
      };

      return anchors
        .map((anchor) => {
          const link = anchor as HTMLAnchorElement;
          const image = link.querySelector("img") as HTMLImageElement | null;
          const parentText = cardTextFor(link);
          const ariaLabel = normalizeText(link.getAttribute("aria-label"));
          const imageAlt = normalizeText(image?.alt);
          const title = imageAlt || ariaLabel || productTitleFromText(parentText) || normalizeText(link.textContent);
          const storeName =
            link.getAttribute("data-shop-name") ||
            link.closest("[data-shop-name]")?.getAttribute("data-shop-name") ||
            undefined;

          return {
            href: link.href,
            title,
            imageUrl: image?.currentSrc || image?.src || image?.getAttribute("data-src") || undefined,
            text: normalizeText(link.textContent),
            ariaLabel,
            imageAlt,
            parentText,
            sourceSort: sort as SearchRequest["sort"] | undefined,
            storeName: storeName ? normalizeText(storeName) : undefined
          };
        })
        .filter((card) => card.href.includes("shopee.co.id") && /-i\.\d+\.\d+/.test(card.href));
    }, sourceSort);

    const unique = new Map<string, ShopeeRawCard>();
    for (const card of cards as ShopeeRawCard[]) {
      const normalized = this.normalizeUrl(card.href).split("?")[0];
      if (!unique.has(normalized) && (card.title || card.text || card.parentText)) {
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

  private async extractStorePage(page: Page): Promise<{ name: string; text: string; images: string[]; cards: ShopeeRawCard[] }> {
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

  private toProductCard(raw: ShopeeRawCard, rank: number): ProductCard {
    const product = parseShopeeProductCard(raw, rank);
    return {
      ...product,
      url: this.normalizeUrl(product.url)
    };
  }
}

export type ShopeeSearchPageSnapshot = {
  url: string;
  title: string;
  bodyTextSample: string;
  productLinkCount: number;
};

export function searchWarningsFromSnapshot(snapshot: ShopeeSearchPageSnapshot): string[] {
  const text = `${snapshot.title}\n${snapshot.bodyTextSample}`;
  const warnings: string[] = [];

  if (/captcha|robot|unusual traffic|verify|verifikasi|security check|akses ditolak|blocked/i.test(text)) {
    warnings.push(
      "[SHOPEE_BLOCKED_PAGE] Shopee showed a verification, captcha, security, or blocked-access signal."
    );
  }
  if (snapshot.productLinkCount === 0 && /login|log in|masuk|daftar|sign in/i.test(text)) {
    warnings.push(
      "[SHOPEE_LOGIN_REQUIRED] Shopee showed a login or account gate before product cards became readable."
    );
  }
  if (/no results|tidak ditemukan|hasil tidak ditemukan|produk tidak tersedia|kosong/i.test(text)) {
    warnings.push(
      "[SHOPEE_EMPTY_RESULT] Shopee indicated that no results were available for the keyword."
    );
  }
  if (snapshot.productLinkCount === 0) {
    warnings.push(
      "[SHOPEE_NO_PRODUCT_LINKS] No browser-readable product links were found on the final search page."
    );
  }

  return [...new Set(warnings)];
}

export function parseShopeeProductCard(raw: ShopeeRawCard, rank: number): ProductCard {
  const combinedText = [raw.title, raw.ariaLabel, raw.imageAlt, raw.text, raw.parentText]
    .filter((value): value is string => Boolean(value?.trim()))
    .join("\n");
  const title = selectProductTitle(raw, combinedText);

  return {
    marketplace: "SHOPEE_ID",
    marketplaceProductId: extractProductId(raw.href),
    rank,
    title,
    url: raw.href,
    imageUrl: raw.imageUrl,
    price: parsePrice(combinedText),
    rating: parseRating(combinedText),
    reviewCount: parseCountNear(combinedText, ["rating", "ratings", "ulasan", "penilaian"]),
    monthlySold: parseMonthlySold(combinedText),
    totalSold: parseCountNear(combinedText, ["sold", "terjual"]),
    storeName: raw.storeName ?? extractStoreName(combinedText),
    storeUrl: undefined,
    mallStatus: /shopee mall|mall|ori|official/i.test(combinedText),
    officialStatus: /official|resmi/i.test(combinedText),
    starSeller: /star\+?|star seller/i.test(combinedText),
    raw: {
      text: raw.text,
      parentText: raw.parentText,
      imageUrl: raw.imageUrl,
      sourceSort: raw.sourceSort,
      locationText: extractLocationLine(combinedText),
      extractionVersion: "shopee-search-v2"
    }
  };
}

function parsePrice(text: string) {
  const values = [...text.matchAll(/Rp\s?([\d.,]+)\s*(rb|ribu|k|jt|juta)?/gi)]
    .map((match) => normalizePrice(match[1], match[2]))
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

function normalizePrice(value: string, suffix?: string): number {
  const numeric = Number(value.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  const normalizedSuffix = suffix?.toLowerCase();
  if (["rb", "ribu", "k"].includes(normalizedSuffix ?? "")) {
    return Math.round(numeric * 1000);
  }
  if (["jt", "juta"].includes(normalizedSuffix ?? "")) {
    return Math.round(numeric * 1000000);
  }
  return Math.round(numeric);
}

function enrichPrice(existing: MoneyRange, text: string): MoneyRange {
  const parsed = parsePrice(text);
  return parsed.average ? parsed : existing;
}

function parseRating(text: string): number | undefined {
  const labeled =
    text.match(/(?:rating|ratings|penilaian)\s*:?\s*([1-5](?:[.,]\d)?)/i) ??
    text.match(/([1-5](?:[.,]\d)?)\s*(?:\/\s*5|\*)/i);
  if (labeled) {
    return Number(labeled[1].replace(",", "."));
  }

  if (!/(terjual|sold|ulasan|rating|penilaian)/i.test(text)) {
    return undefined;
  }

  const standalone = text
    .split(/\n| {2,}/)
    .map((line) => line.trim())
    .find((line) => /^[1-5](?:[.,]\d)$/.test(line));
  return standalone ? Number(standalone.replace(",", ".")) : undefined;
}

function parseMonthlySold(text: string): number | undefined {
  return parseCountNear(text, ["sold/month", "sold per month", "terjual/bulan", "terjual per bulan"]);
}

function parseCountNear(text: string, labels: string[]): number | undefined {
  const compact = text.replace(/\s+/g, " ");
  for (const label of labels) {
    const regex = new RegExp(`([\\d.,]+)\\s*(rb|ribu|k|jt|m|mio|million|juta)?\\+?\\s*${escapeRegex(label)}`, "i");
    const match = compact.match(regex);
    if (match) {
      return normalizeCount(match[1], match[2]);
    }
    const reversed = new RegExp(`${escapeRegex(label)}\\s*:?\\s*([\\d.,]+)\\s*(rb|ribu|k|jt|m|mio|million|juta)?\\+?`, "i");
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

function selectProductTitle(raw: ShopeeRawCard, combinedText: string): string {
  const candidates = [
    raw.imageAlt,
    raw.ariaLabel,
    raw.title,
    ...combinedText.split(/\n| {2,}/)
  ]
    .map((line) => cleanTitle(line ?? ""))
    .filter((line) => line.length >= 8 && line.length <= 260 && !isCommerceMetricLine(line));

  return candidates[0] ?? cleanTitle(raw.title || firstTextLine(raw.text || raw.parentText || ""));
}

function isCommerceMetricLine(line: string): boolean {
  return /^(Rp|[\d.,]+\s*(rb|ribu|k|jt|juta)?\+?\s*(terjual|sold|ulasan|rating)|gratis ongkir|diskon|cashback)/i.test(line);
}

function extractStoreName(text: string): string | undefined {
  const lines = text.split(/\n| {2,}/).map((line) => cleanTitle(line)).filter(Boolean);
  const explicit = lines.find((line) => /^(toko|store|seller|penjual)\s*[:-]/i.test(line));
  if (explicit) {
    return explicit.replace(/^(toko|store|seller|penjual)\s*[:-]\s*/i, "").slice(0, 120);
  }
  return undefined;
}

function extractLocationLine(text: string): string | undefined {
  return text
    .split(/\n| {2,}/)
    .map((line) => cleanTitle(line))
    .find((line) => /^(kota|kab\.?|kabupaten|dki|jakarta|bandung|surabaya|tangerang|bekasi|depok|bogor|semarang|yogyakarta|bali|medan)/i.test(line));
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
