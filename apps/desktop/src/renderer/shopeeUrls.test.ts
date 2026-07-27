import { describe, expect, it } from "vitest";
import { buildShopeeSearchUrl, withShopeeProductDisplayModel } from "./shopeeUrls.js";

describe("buildShopeeSearchUrl", () => {
  it("builds a combined shop-type and price filter", () => {
    const result = new URL(buildShopeeSearchUrl("fake eyelashes", "sales", {
      shopTypes: ["OFFICIAL_MALL", "PREFERRED_PLUS"],
      priceMin: 50_000
    }));

    expect(result.searchParams.get("keyword")).toBe("fake eyelashes");
    expect(result.searchParams.get("sortBy")).toBe("sales");
    expect(JSON.parse(result.searchParams.get("fe_filter_options") ?? "[]")).toEqual([
      {
        group_name: "SHOP_TYPE",
        values: ["OFFICIAL_MALL", "PREFERRED_PLUS"]
      },
      {
        group_name: "PRICE_RANGE",
        values: ["50000▶◀undefined"]
      }
    ]);
  });

  it("uses undefined for an omitted minimum price", () => {
    const result = new URL(buildShopeeSearchUrl("air purifier", "relevancy", {
      shopTypes: [],
      priceMax: 200_000
    }));

    expect(JSON.parse(result.searchParams.get("fe_filter_options") ?? "[]")).toEqual([
      {
        group_name: "PRICE_RANGE",
        values: ["undefined▶◀200000"]
      }
    ]);
  });
});

describe("withShopeeProductDisplayModel", () => {
  const productUrl = "https://shopee.co.id/example-i.123.456";

  it("uses the mobile model id", () => {
    const result = new URL(withShopeeProductDisplayModel(productUrl, "mobile"));
    expect(JSON.parse(result.searchParams.get("extraParams") ?? "{}")).toEqual({
      display_model_id: 227934351006,
      model_selection_logic: 3
    });
  });

  it("uses the desktop model id", () => {
    const result = new URL(withShopeeProductDisplayModel(productUrl, "desktop"));
    expect(JSON.parse(result.searchParams.get("extraParams") ?? "{}")).toEqual({
      display_model_id: 306692767299,
      model_selection_logic: 3
    });
  });
});
