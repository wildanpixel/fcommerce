export const STORE_TYPE_IMAGES = {
  star: "https://down-id.img.susercontent.com/file/id-11134258-7r98o-lyam4dmlnqcoba.webp",
  star_plus: "https://down-id.img.susercontent.com/file/id-11134258-7r98r-lyalscj1g30l0b.webp",
  shopee_mall: "https://down-id.img.susercontent.com/file/id-11134258-7r98z-lykpu80ygbvs76.webp"
} as const;

export type StoreType = keyof typeof STORE_TYPE_IMAGES;

export const STORE_TYPE_LABELS: Record<StoreType, string> = {
  star: "Star",
  star_plus: "Star+",
  shopee_mall: "Shopee Mall"
};

const STORE_TYPE_FILE_IDS: Record<StoreType, string> = {
  star: "id-11134258-7r98o-lyam4dmlnqcoba",
  star_plus: "id-11134258-7r98r-lyalscj1g30l0b",
  shopee_mall: "id-11134258-7r98z-lykpu80ygbvs76"
};

export function normalizeStoreType(value: unknown): StoreType | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === "star" || normalized === "preferred") {
    return "star";
  }
  if (normalized === "star_plus" || normalized === "star+" || normalized === "preferred_plus") {
    return "star_plus";
  }
  if (
    normalized === "shopee_mall" ||
    normalized === "shopee mall" ||
    normalized === "mall ori" ||
    normalized === "official_mall"
  ) {
    return "shopee_mall";
  }

  for (const [storeType, fileId] of Object.entries(STORE_TYPE_FILE_IDS) as Array<[StoreType, string]>) {
    if (normalized.includes(fileId)) {
      return storeType;
    }
  }

  return null;
}

export function storeTypeFromBadgeContext(value: unknown): StoreType | null {
  const normalized = normalizeStoreType(value);
  if (normalized) {
    return normalized;
  }
  if (typeof value !== "string" || /https?:|\.webp|\.png|\.jpe?g/i.test(value)) {
    return null;
  }

  const text = value.trim().toLowerCase();
  if (/\b(?:mall\s*ori|shopee\s*mall)\b/.test(text)) {
    return "shopee_mall";
  }
  if (/\bstar\s*\+\b|\bstar\s*plus\b|\bpreferred\s*plus\b/.test(text)) {
    return "star_plus";
  }
  if (/\bstar\b|\bpreferred\b/.test(text)) {
    return "star";
  }
  return null;
}

export function storeTypeFromCapturedProductHtml(html: string, productUrl: string): StoreType | null {
  const productTokenMatch = productUrl.match(/(?:-i\.|\/product\/|i\.)(\d+)[./](\d+)/iu);
  const productToken = productTokenMatch ? `${productTokenMatch[1]}.${productTokenMatch[2]}` : undefined;
  if (!html || !productToken) {
    return null;
  }

  const capturedStart = html.indexOf('data-mio-captured-product-cards="true"');
  const searchableHtml = capturedStart >= 0 ? html.slice(capturedStart) : html;
  const productIndex = searchableHtml.indexOf(productToken);
  if (productIndex < 0) {
    return null;
  }

  const cardStart = Math.max(
    0,
    searchableHtml.lastIndexOf('<div class="h-full h-full', productIndex),
    searchableHtml.lastIndexOf('<li class="col-xs-2-4', productIndex)
  );
  const nextCardCandidates = [
    searchableHtml.indexOf('<div class="h-full h-full', productIndex + productToken.length),
    searchableHtml.indexOf('<li class="col-xs-2-4', productIndex + productToken.length)
  ].filter((index) => index > productIndex);
  const cardEnd = nextCardCandidates.length > 0
    ? Math.min(...nextCardCandidates)
    : Math.min(searchableHtml.length, productIndex + 16_000);

  return normalizeStoreType(searchableHtml.slice(cardStart, cardEnd));
}

export function storeTypeImage(value: unknown): string | null {
  const storeType = normalizeStoreType(value);
  return storeType ? STORE_TYPE_IMAGES[storeType] : null;
}

export function storeTypeLabel(value: unknown): string {
  const storeType = normalizeStoreType(value);
  return storeType ? STORE_TYPE_LABELS[storeType] : "Unclassified";
}

export function isValidStoreType(value: unknown): value is StoreType {
  return normalizeStoreType(value) !== null;
}
