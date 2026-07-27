export type CollectionStoreProduct = {
  id?: string;
  storeName?: string | null;
  storeUrl?: string | null;
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
    const categoryId = url.searchParams.get("categoryId");
    const base = `${url.origin}${url.pathname.replace(/\/$/u, "")}`;
    return `${base}${categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : ""}`.toLowerCase();
  } catch {
    return value.split(/[?#]/u)[0]?.replace(/\/$/u, "").toLowerCase();
  }
}

export function buildStoreCollectionCandidates<T extends CollectionStoreProduct>(
  products: T[],
  existing: StoreCollectionCandidateInput[] = []
): StoreCollectionCandidateInput[] {
  const byStore = new Map<string, StoreCollectionCandidateInput>();
  for (const candidate of existing) {
    const key = canonicalStoreUrl(candidate.storeUrl) ?? normalizeStoreName(candidate.storeName);
    if (key) {
      byStore.set(key, { ...candidate, storeUrl: canonicalStoreUrl(candidate.storeUrl) ?? candidate.storeUrl });
    }
  }
  for (const product of products) {
    const storeUrl = canonicalStoreUrl(product.storeUrl);
    const storeName = product.storeName?.trim();
    const key = storeUrl ?? normalizeStoreName(storeName);
    if (!key || !storeName || !storeUrl || byStore.has(key)) {
      continue;
    }
    byStore.set(key, {
      id: stableStoreCandidateId(storeUrl, storeName),
      storeName,
      storeUrl,
      shopId: extractShopeeShopId(storeUrl),
      includePopularProducts: false,
      includeShopBanner: false
    });
  }
  return [...byStore.values()].slice(0, 50);
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
