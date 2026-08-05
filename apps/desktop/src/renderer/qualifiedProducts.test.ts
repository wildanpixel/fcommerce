import { describe, expect, it } from "vitest";
import {
  createQualifiedProductReference,
  productRanks,
  qualifiedProductRankingReason,
  rankQualifiedProducts,
  rankSelectedQualifiedProducts,
  resolveCanonicalQualifiedProducts,
  resolveQualifiedProductReferences,
  resolveSavedQualifiedProducts,
  stableProductIdentity
} from "./qualifiedProducts.js";

type Product = {
  id: string;
  title: string;
  productUrl: string;
  sourcePlacement?: string;
  source?: string;
  rank?: number;
  monthlySold?: number;
  totalSold?: number;
};

const product = (id: string, sourcePlacement: string, overrides: Partial<Product> = {}): Product => ({
  id,
  title: id,
  productUrl: `https://shopee.co.id/${id}`,
  sourcePlacement,
  ...overrides
});

describe("qualified product ranking", () => {
  it("prioritizes products with both ranks when either rank is top 10", () => {
    const ranked = rankQualifiedProducts([
      product("sales-only", "Top 1 in sales"),
      product("relevance-top", "Top 13 in sales / Top 3 in relevance"),
      product("sales-top", "Top 4 in sales / Top 20 in relevance"),
      product("both-top", "Top 8 in sales / Top 7 in relevance")
    ]);
    expect(ranked.map((item) => item.id)).toEqual(["sales-top", "both-top", "relevance-top", "sales-only"]);
  });

  it("excludes both-rank products outside the top 10 and relevance-only products", () => {
    const ranked = rankQualifiedProducts([
      product("outside", "Top 11 in sales / Top 12 in relevance"),
      product("relevance-only", "Top 1 in relevance"),
      product("sales-only", "Top 2 in sales")
    ]);
    expect(ranked.map((item) => item.id)).toEqual(["sales-only"]);
  });

  it("uses deterministic sales metrics and source order without non-finite scores", () => {
    const ranked = rankQualifiedProducts([
      product("first", "Top 3 in sales", { monthlySold: 20 }),
      product("second", "Top 3 in sales", { monthlySold: 30 }),
      product("third", "Top 3 in sales", { monthlySold: 30 })
    ]);
    expect(ranked.map((item) => item.id)).toEqual(["second", "third", "first"]);
    expect(productRanks(product("zero", "Top 0 in sales / Top 0 in relevance"))).toEqual({ salesRank: undefined, relevanceRank: undefined });
  });

  it("resolves the saved edited list in persisted order for Inspect and Part 2", () => {
    const products = [product("one", "Top 1 in sales"), product("two", "Top 2 in sales"), product("three", "Top 3 in sales")];
    expect(resolveSavedQualifiedProducts(products, ["three", "one"]).map((item) => item.id)).toEqual(["three", "one"]);
    expect(resolveSavedQualifiedProducts(products, []).map((item) => item.id)).toEqual(["one", "two", "three"]);
  });

  it("creates and reloads exactly the generated Top 10 when no edited list has been saved", () => {
    const products = Array.from({ length: 12 }, (_, index) => product(`sales-${index + 1}`, `Top ${index + 1} in sales`));
    const generated = resolveSavedQualifiedProducts(products, []);
    expect(generated).toHaveLength(10);
    expect(generated.map((item) => item.id)).toEqual(Array.from({ length: 10 }, (_, index) => `sales-${index + 1}`));
    expect(resolveSavedQualifiedProducts(products, generated.map((item) => item.id)).map((item) => item.id)).toEqual(generated.map((item) => item.id));
  });

  it("keeps manual relevance-only additions and removals after reload for Inspect and Part 2", () => {
    const products = [
      product("sales-one", "Top 1 in sales"),
      product("sales-two", "Top 2 in sales"),
      product("relevance-only", "Top 1 in relevance")
    ];
    const editedIds = ["relevance-only", "sales-two"];
    const reloadedForInspect = resolveSavedQualifiedProducts(products, editedIds);
    const reloadedForPartTwo = resolveSavedQualifiedProducts(products, editedIds);
    expect(reloadedForInspect.map((item) => item.id)).toEqual(editedIds);
    expect(reloadedForPartTwo.map((item) => item.id)).toEqual(editedIds);
    expect(reloadedForPartTwo.some((item) => item.id === "sales-one")).toBe(false);
  });

  it("re-ranks four manual additions within the full visible list of fourteen", () => {
    const defaults = Array.from({ length: 10 }, (_, index) => product(`sales-${index + 1}`, `Top ${index + 1} in sales`));
    const additions = [
      product("manual-relevance-2", "Top 2 in relevance"),
      product("manual-unranked", ""),
      product("manual-relevance-1", "Top 1 in relevance"),
      product("manual-both", "Top 6 in sales / Top 9 in relevance")
    ];
    const manual = new Set(additions.map(stableProductIdentity));
    const ranked = rankSelectedQualifiedProducts([...defaults, ...additions], manual);
    expect(ranked).toHaveLength(14);
    expect(ranked.map((item) => item.id)).toEqual([
      "manual-both",
      ...defaults.map((item) => item.id),
      "manual-relevance-1",
      "manual-relevance-2",
      "manual-unranked"
    ]);
  });

  it("persists and resolves product identity by ID, canonical URL, then composite fallback", () => {
    const original = product("original-id", "Top 1 in sales", { title: "Stable Product", productUrl: "https://shopee.co.id/Stable-i.1.2?utm=old" });
    const reference = createQualifiedProductReference(original, true);
    const reloaded = product("new-database-id", "Top 1 in sales", { title: "Stable Product", productUrl: "https://shopee.co.id/Stable-i.1.2#details" });
    expect(resolveQualifiedProductReferences([reloaded], [reference])).toEqual([reloaded]);
  });

  it("keeps a deliberately emptied or shortened initialized list exact", () => {
    const products = Array.from({ length: 12 }, (_, index) => product(`sales-${index + 1}`, `Top ${index + 1} in sales`));
    expect(resolveCanonicalQualifiedProducts(products, [], true)).toEqual([]);
    const kept = products.slice(0, 3).map((item) => createQualifiedProductReference(item));
    expect(resolveCanonicalQualifiedProducts(products, kept, true).map((item) => item.id)).toEqual(["sales-1", "sales-2", "sales-3"]);
  });

  it("does not add duplicate products that share a canonical URL", () => {
    const first = product("first", "Top 1 in sales", { productUrl: "https://shopee.co.id/Product-i.1.2?ref=one" });
    const duplicate = product("second", "Top 2 in sales", { productUrl: "https://shopee.co.id/Product-i.1.2#two" });
    expect(rankSelectedQualifiedProducts([first, duplicate], new Set([stableProductIdentity(duplicate)]))).toEqual([first]);
  });

  it("explains the visible reason using the same canonical ranking groups", () => {
    expect(qualifiedProductRankingReason(product("dual", "Top 4 in sales / Top 12 in relevance"))).toContain("Group 1");
    expect(qualifiedProductRankingReason(product("sales", "Top 2 in sales"))).toContain("Group 2");
    expect(qualifiedProductRankingReason(product("relevance", "Top 3 in relevance"), true)).toContain("Group 3");
    expect(qualifiedProductRankingReason(product("manual", ""), true)).toContain("Group 4");
  });
});
