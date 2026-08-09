import { normalizeStoreType, type StoreType } from "../shared/storeTypes.js";

export type CollectionStoreProduct = {
  id?: string;
  storeName?: string | null;
  storeUrl?: string | null;
  storeType?: StoreType | string | null;
};

export type EvaluatedStoreTarget = {
  name: string;
  url?: string;
};

export type CollectionStoreTarget<T extends CollectionStoreProduct> = {
  name?: string;
  url?: string;
  product?: T;
};

export type StoreCollectionCandidateInput = {
  id: string;
  storeName: string;
  storeUrl: string;
  shopId?: string;
  storeType?: StoreType;
  sourceProductIds?: string[];
  includePopularProducts: boolean;
  includeShopBanner: boolean;
};

export function resolveKeyStoreCollectionTarget<T extends CollectionStoreProduct>(
  products: T[],
  evaluatedStore: EvaluatedStoreTarget | undefined,
  fallbackProduct: T | undefined
): CollectionStoreTarget<T> {
  const evaluatedProduct = evaluatedStore
    ? products.find((product) => storeMatches(product, evaluatedStore))
    : undefined;
  const product = evaluatedProduct ?? fallbackProduct;
  return {
    name: evaluatedStore?.name ?? product?.storeName ?? undefined,
    url: evaluatedStore?.url ?? evaluatedProduct?.storeUrl ?? product?.storeUrl ?? undefined,
    product
  };
}

function storeMatches(product: CollectionStoreProduct, evaluatedStore: EvaluatedStoreTarget): boolean {
  const productUrl = canonicalStoreUrl(product.storeUrl);
  const evaluatedUrl = canonicalStoreUrl(evaluatedStore.url);
  if (productUrl && evaluatedUrl && productUrl === evaluatedUrl) {
    return true;
  }
  return Boolean(
    product.storeName &&
    product.storeName.trim().localeCompare(evaluatedStore.name.trim(), undefined, { sensitivity: "base" }) === 0
  );
}

export function canonicalStoreUrl(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  try {
    const url = new URL(value, "https://shopee.co.id");
    const base = `${url.origin}${url.pathname.replace(/\/$/u, "")}`;
    return base.toLowerCase();
  } catch {
    return value.split(/[?#]/u)[0]?.replace(/\/$/u, "").toLowerCase();
  }
}

export function buildStoreCollectionCandidates<T extends CollectionStoreProduct>(
  products: T[],
  existing: StoreCollectionCandidateInput[] = []
): StoreCollectionCandidateInput[] {
  const candidates = [...existing];
  for (const product of products) {
    const shopId = extractShopeeShopId(product.storeUrl);
    const storeUrl = canonicalStoreUrl(product.storeUrl);
    const storeName = product.storeName?.trim();
    if (!storeName || !storeUrl) {
      continue;
    }
    candidates.push({
      id: stableStoreCandidateId(storeUrl, storeName),
      storeName,
      storeUrl,
      shopId,
      storeType: normalizeStoreType(product.storeType) ?? undefined,
      sourceProductIds: product.id ? [product.id] : [],
      includePopularProducts: false,
      includeShopBanner: false
    });
  }
  return dedupeStoreCollectionCandidates(candidates).slice(0, 50);
}

export function resolveCanonicalStoreList<T extends CollectionStoreProduct>(
  products: T[],
  saved: StoreCollectionCandidateInput[],
  initialized: boolean,
  legacyStores: CollectionStoreProduct[] = []
): StoreCollectionCandidateInput[] {
  if (initialized) {
    return dedupeStoreCollectionCandidates(saved).slice(0, 50);
  }
  return buildStoreCollectionCandidates([...products, ...legacyStores], saved);
}

export function dedupeStoreCollectionCandidates(
  candidates: StoreCollectionCandidateInput[]
): StoreCollectionCandidateInput[] {
  const result: StoreCollectionCandidateInput[] = [];
  for (const input of candidates) {
    const candidate = {
      ...input,
      storeName: input.storeName.trim(),
      storeUrl: canonicalStoreUrl(input.storeUrl) ?? input.storeUrl,
      shopId: input.shopId ?? extractShopeeShopId(input.storeUrl),
      storeType: normalizeStoreType(input.storeType) ?? undefined
    };
    const existingIndex = result.findIndex((current) => sameStoreCandidate(current, candidate));

    if (existingIndex < 0) {
      result.push(candidate);
      continue;
    }

    const current = result[existingIndex];
    const merged = {
      ...current,
      storeName: current.storeName || candidate.storeName,
      storeUrl: current.storeUrl || candidate.storeUrl,
      shopId: current.shopId ?? candidate.shopId,
      storeType: preferredStoreType(current.storeType, candidate.storeType),
      sourceProductIds: [...new Set([...(current.sourceProductIds ?? []), ...(candidate.sourceProductIds ?? [])])],
      includePopularProducts: current.includePopularProducts || candidate.includePopularProducts,
      includeShopBanner: current.includeShopBanner || candidate.includeShopBanner
    };
    result[existingIndex] = merged;
  }

  return result;
}

export function stableStoreCandidateId(storeUrl: string, storeName: string): string {
  const input = `${canonicalStoreUrl(storeUrl) ?? storeUrl}:${normalizeStoreName(storeName)}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `store-${(hash >>> 0).toString(36)}`;
}

export function storeHomepageUrl(candidate: StoreCollectionCandidateInput): string {
  return canonicalStoreUrl(candidate.storeUrl) ?? candidate.storeUrl;
}

export function storeDetailsUrl(candidate: StoreCollectionCandidateInput): string {
  const shopId = candidate.shopId ?? extractShopeeShopId(candidate.storeUrl);
  return shopId
    ? `https://shopee.co.id/shop/${encodeURIComponent(shopId)}/details?shopid=${encodeURIComponent(shopId)}`
    : storeHomepageUrl(candidate);
}

export function storeRatingsUrl(candidate: StoreCollectionCandidateInput, rating: 1 | 5): string {
  const shopId = candidate.shopId ?? extractShopeeShopId(candidate.storeUrl);
  return shopId
    ? `https://shopee.co.id/buyer/${encodeURIComponent(shopId)}/rating?shop_id=${encodeURIComponent(shopId)}&tab=0&type=${rating}`
    : storeHomepageUrl(candidate);
}

export function storeCategoriesUrl(candidate: StoreCollectionCandidateInput): string {
  const url = new URL(storeHomepageUrl(candidate));
  url.searchParams.set("tab", "category");
  return url.toString();
}

export function storeProductsUrl(candidate: StoreCollectionCandidateInput, sortBy: "pop" | "sales"): string {
  const url = new URL(storeHomepageUrl(candidate));
  url.searchParams.set("page", "0");
  url.searchParams.set("sortBy", sortBy);
  url.searchParams.set("tab", "0");
  return url.toString();
}

export function extractShopeeShopId(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  try {
    const url = new URL(value, "https://shopee.co.id");
    return url.searchParams.get("shopid")
      ?? url.searchParams.get("shop_id")
      ?? url.pathname.match(/\/(?:shop|buyer)\/(\d+)/u)?.[1]
      ?? undefined;
  } catch {
    return undefined;
  }
}

function normalizeStoreName(value?: string | null): string {
  return value?.trim().toLocaleLowerCase().replace(/\s+/gu, " ") ?? "";
}

function sameStoreCandidate(left: StoreCollectionCandidateInput, right: StoreCollectionCandidateInput): boolean {
  const leftShopId = left.shopId ?? extractShopeeShopId(left.storeUrl);
  const rightShopId = right.shopId ?? extractShopeeShopId(right.storeUrl);
  if (leftShopId && rightShopId) {
    return leftShopId === rightShopId;
  }
  const leftUrl = canonicalStoreUrl(left.storeUrl);
  const rightUrl = canonicalStoreUrl(right.storeUrl);
  if (leftUrl && rightUrl && leftUrl === rightUrl) {
    return true;
  }
  return (!leftShopId || !rightShopId) && normalizeStoreName(left.storeName) === normalizeStoreName(right.storeName);
}

function preferredStoreType(left: StoreType | undefined, right: StoreType | undefined): StoreType | undefined {
  const priority: Record<StoreType, number> = { star: 1, star_plus: 2, shopee_mall: 3 };
  if (!left) return right;
  if (!right) return left;
  return priority[right] > priority[left] ? right : left;
}
