import { describe, expect, it } from "vitest";
import { normalizeStoreCategoryLabel, normalizeStoreCategoryLabels } from "./storeCategories.js";

describe("store category normalization", () => {
  it("keeps a category after emoji and icon prefixes", () => {
    expect(normalizeStoreCategoryLabel("🔥 Best Seller (24)")).toBe("Best Seller (24)");
    expect(normalizeStoreCategoryLabel("🧴✨ Body Care (103)")).toBe("Body Care (103)");
    expect(normalizeStoreCategoryLabel("• 【Promo】 Skincare (8)")).toBe("Promo】 Skincare (8)");
  });

  it("supports non-Latin category names and removes generic tabs", () => {
    expect(normalizeStoreCategoryLabel("🌸 美妆护肤 (17)")).toBe("美妆护肤 (17)");
    expect(normalizeStoreCategoryLabel("Kategori")).toBeUndefined();
  });

  it("deduplicates normalized labels case-insensitively", () => {
    expect(normalizeStoreCategoryLabels(["🔥 Serum (12)", "serum (12)", "Home"])).toEqual(["Serum (12)"]);
  });
});
