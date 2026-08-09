import type { QualifiedProductReference } from "../shared/contracts.js";

export type QualifiedProductRankingInput = {
  id: string;
  title?: string | null;
  productUrl?: string | null;
  storeName?: string | null;
  priceMin?: number | null;
  source?: string | null;
  sourcePlacement?: string | null;
  rank?: number | null;
  monthlySold?: number | null;
  monthlySoldText?: string | null;
  totalSold?: number | null;
  totalSoldText?: string | null;
};

type ProductRanks = {
  salesRank?: number;
  relevanceRank?: number;
};

export function rankQualifiedProducts<T extends QualifiedProductRankingInput>(products: readonly T[]): T[] {
  return rankedEntries(products, new Set())
    .filter(({ group }) => group <= 2)
    .map(({ product }) => product);
}

export function rankSelectedQualifiedProducts<T extends QualifiedProductRankingInput>(
  products: readonly T[],
  manuallyAddedIdentities: ReadonlySet<string> = new Set()
): T[] {
  return rankedEntries(products, manuallyAddedIdentities).map(({ product }) => product);
}

export function resolveSavedQualifiedProducts<T extends QualifiedProductRankingInput>(
  products: readonly T[],
  savedIds: readonly string[] | undefined,
  fallbackLimit = 10
): T[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  const saved = (savedIds ?? [])
    .map((id) => byId.get(id))
    .filter((product): product is T => Boolean(product));
  return saved.length > 0 ? saved : rankQualifiedProducts(products).slice(0, fallbackLimit);
}

export function createQualifiedProductReference(
  product: QualifiedProductRankingInput,
  manuallyAdded = false
): QualifiedProductReference {
  return {
    productId: product.id || undefined,
    productUrl: canonicalProductUrl(product.productUrl),
    fallbackIdentity: fallbackProductIdentity(product),
    manuallyAdded: manuallyAdded || undefined
  };
}

export function resolveQualifiedProductReferences<T extends QualifiedProductRankingInput>(
  products: readonly T[],
  references: readonly QualifiedProductReference[] | undefined,
  fallbackLimit = 10
): T[] {
  if (!references?.length) {
    return rankQualifiedProducts(products).slice(0, fallbackLimit);
  }
  const remaining = [...products];
  const resolved: T[] = [];
  for (const reference of references) {
    const matchIndex = findReferenceMatch(remaining, reference);
    if (matchIndex < 0) {
      continue;
    }
    resolved.push(remaining[matchIndex]);
    remaining.splice(matchIndex, 1);
  }
  return resolved;
}

export function resolveCanonicalQualifiedProducts<T extends QualifiedProductRankingInput>(
  products: readonly T[],
  references: readonly QualifiedProductReference[] | undefined,
  initialized: boolean,
  fallbackLimit = 10
): T[] {
  if (initialized && !references?.length) return [];
  return initialized
    ? resolveQualifiedProductReferences(products, references, fallbackLimit)
    : rankQualifiedProducts(products).slice(0, fallbackLimit);
}

export function sameQualifiedProduct(
  left: QualifiedProductRankingInput,
  right: QualifiedProductRankingInput
): boolean {
  if (left.id && right.id && left.id === right.id) {
    return true;
  }
  const leftUrl = canonicalProductUrl(left.productUrl);
  const rightUrl = canonicalProductUrl(right.productUrl);
  if (leftUrl && rightUrl && leftUrl === rightUrl) {
    return true;
  }
  return fallbackProductIdentity(left) === fallbackProductIdentity(right);
}

export function stableProductIdentity(product: QualifiedProductRankingInput): string {
  return product.id || canonicalProductUrl(product.productUrl) || fallbackProductIdentity(product);
}

export function productRanks(product: QualifiedProductRankingInput): ProductRanks {
  const placement = `${product.sourcePlacement ?? ""} ${product.source ?? ""}`;
  const salesRank = placementRank(placement, /(?:top\s*)?(\d+)\s*(?:in\s*)?(?:top\s*)?(?:sales|best\s*seller)/iu)
    ?? (/(?:top\s*sales|sales|best\s*seller)/iu.test(product.source ?? "") ? finiteRank(product.rank) : undefined);
  const relevanceRank = placementRank(placement, /(?:top\s*)?(\d+)\s*(?:in\s*)?(?:relevance|relevancy|search)/iu)
    ?? (/(?:relevance|relevancy|search)/iu.test(product.source ?? "") ? finiteRank(product.rank) : undefined);
  return { salesRank, relevanceRank };
}

export function qualifiedProductRankingReason(
  product: QualifiedProductRankingInput,
  manuallyAdded = false
): string {
  const ranks = productRanks(product);
  const salesRank = ranks.salesRank ? `sales #${ranks.salesRank}` : undefined;
  const relevanceRank = ranks.relevanceRank ? `relevance #${ranks.relevanceRank}` : undefined;
  const group = qualificationGroup(ranks, manuallyAdded);

  if (group === 1) {
    return `Group 1 · ${salesRank} and ${relevanceRank}; at least one placement is Top 10. Ordered by sales rank, relevance rank, monthly sales, then total sales.`;
  }
  if (group === 2) {
    return `Group 2 · ${salesRank}-only product. Ordered after dual-rank products by sales rank, monthly sales, then total sales.`;
  }
  if (group === 3) {
    return `Group 3 · manually added ${relevanceRank}-only product. Ordered after sales-ranked products.`;
  }
  if (group === 4) {
    return "Group 4 · manually added product without placement metadata. Ordered by available sales evidence and stable product identity.";
  }
  return "Saved canonical Key Product without complete ranking metadata.";
}

function rankedEntries<T extends QualifiedProductRankingInput>(
  products: readonly T[],
  manuallyAddedIdentities: ReadonlySet<string>
): Array<{ product: T; sourceOrder: number; ranks: ProductRanks; group: number }> {
  const unique: Array<{ product: T; sourceOrder: number; ranks: ProductRanks; group: number }> = [];
  products.forEach((product, sourceOrder) => {
    if (unique.some((entry) => sameQualifiedProduct(entry.product, product))) {
      return;
    }
    const ranks = productRanks(product);
    const manual = manuallyAddedIdentities.has(stableProductIdentity(product)) || manuallyAddedIdentities.has(product.id);
    const group = qualificationGroup(ranks, manual);
    if (group) {
      unique.push({ product, sourceOrder, ranks, group });
    }
  });
  return unique.sort(compareQualifiedProducts);
}

function qualificationGroup(ranks: ProductRanks, manuallyAdded: boolean): number | undefined {
  if (ranks.salesRank && ranks.relevanceRank && (ranks.salesRank <= 10 || ranks.relevanceRank <= 10)) {
    return 1;
  }
  if (ranks.salesRank && !ranks.relevanceRank) {
    return 2;
  }
  if (manuallyAdded && ranks.relevanceRank && !ranks.salesRank) {
    return 3;
  }
  return manuallyAdded ? 4 : undefined;
}

function compareQualifiedProducts<T extends QualifiedProductRankingInput>(
  left: { product: T; sourceOrder: number; ranks: ProductRanks; group: number },
  right: { product: T; sourceOrder: number; ranks: ProductRanks; group: number }
): number {
  if (left.group !== right.group) return left.group - right.group;

  const salesDifference = (left.ranks.salesRank ?? Number.MAX_SAFE_INTEGER) - (right.ranks.salesRank ?? Number.MAX_SAFE_INTEGER);
  if (salesDifference !== 0) return salesDifference;

  const relevanceDifference = (left.ranks.relevanceRank ?? Number.MAX_SAFE_INTEGER) - (right.ranks.relevanceRank ?? Number.MAX_SAFE_INTEGER);
  if (relevanceDifference !== 0) return relevanceDifference;

  const monthlyDifference = numericSales(right.product.monthlySold, right.product.monthlySoldText) - numericSales(left.product.monthlySold, left.product.monthlySoldText);
  if (monthlyDifference !== 0) return monthlyDifference;

  const totalDifference = numericSales(right.product.totalSold, right.product.totalSoldText) - numericSales(left.product.totalSold, left.product.totalSoldText);
  if (totalDifference !== 0) return totalDifference;

  return stableProductIdentity(left.product).localeCompare(stableProductIdentity(right.product)) || left.sourceOrder - right.sourceOrder;
}

function placementRank(value: string, pattern: RegExp): number | undefined {
  return finiteRank(Number(pattern.exec(value)?.[1]));
}

function finiteRank(value: number | null | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
}

function numericSales(value: number | null | undefined, text: string | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  if (!text) return 0;
  const normalized = text.trim().toUpperCase().replace(/\s+/gu, "");
  const numberMatch = normalized.replace(/\.(?=\d{3}(?:\D|$))/gu, "").replace(",", ".").match(/\d+(?:\.\d+)?/u);
  if (!numberMatch) return 0;
  const multiplier = /(?:JT|JUTA|M)(?:\+|$)/u.test(normalized) ? 1_000_000 : /(?:RB|RIBU|K)(?:\+|$)/u.test(normalized) ? 1_000 : 1;
  const parsed = Number(numberMatch[0]) * multiplier;
  return Number.isFinite(parsed) ? parsed : 0;
}

function canonicalProductUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, "https://shopee.co.id");
    url.hash = "";
    url.search = "";
    return `${url.origin}${url.pathname.replace(/\/$/u, "")}`.toLocaleLowerCase();
  } catch {
    return value.split(/[?#]/u)[0]?.replace(/\/$/u, "").toLocaleLowerCase();
  }
}

function fallbackProductIdentity(product: QualifiedProductRankingInput): string {
  return [product.title, product.storeName, product.priceMin]
    .map((value) => String(value ?? "").trim().toLocaleLowerCase().replace(/\s+/gu, " "))
    .join("|");
}

function findReferenceMatch<T extends QualifiedProductRankingInput>(
  products: readonly T[],
  reference: QualifiedProductReference
): number {
  if (reference.productId) {
    const byId = products.findIndex((product) => product.id === reference.productId);
    if (byId >= 0) return byId;
  }
  if (reference.productUrl) {
    const canonicalReferenceUrl = canonicalProductUrl(reference.productUrl);
    const byUrl = products.findIndex((product) => canonicalProductUrl(product.productUrl) === canonicalReferenceUrl);
    if (byUrl >= 0) return byUrl;
  }
  return products.findIndex((product) => fallbackProductIdentity(product) === reference.fallbackIdentity);
}
