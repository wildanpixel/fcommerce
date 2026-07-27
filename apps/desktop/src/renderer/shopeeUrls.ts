import type { ShopeeSearchFilters } from "../shared/contracts.js";

type ShopeeSearchSort = "relevancy" | "sales";
type ShopeeViewMode = "desktop" | "mobile";

const PRODUCT_DISPLAY_MODEL_IDS: Record<ShopeeViewMode, number> = {
  desktop: 306692767299,
  mobile: 227934351006
};

export function buildShopeeSearchUrl(
  keyword: string,
  sortBy: ShopeeSearchSort,
  filters?: ShopeeSearchFilters
): string {
  const url = new URL("https://shopee.co.id/search");
  const filterGroups: Array<{ group_name: string; values: string[] }> = [];
  const shopTypes = [...new Set(filters?.shopTypes ?? [])];
  if (shopTypes.length > 0) {
    filterGroups.push({
      group_name: "SHOP_TYPE",
      values: shopTypes
    });
  }

  const priceMin = normalizePrice(filters?.priceMin);
  const priceMax = normalizePrice(filters?.priceMax);
  if (priceMin !== undefined || priceMax !== undefined) {
    filterGroups.push({
      group_name: "PRICE_RANGE",
      values: [`${priceMin ?? "undefined"}▶◀${priceMax ?? "undefined"}`]
    });
  }

  if (filterGroups.length > 0) {
    url.searchParams.set("fe_filter_options", JSON.stringify(filterGroups));
  }
  url.searchParams.set("keyword", keyword.trim());
  url.searchParams.set("noCorrection", "true");
  url.searchParams.set("page", "0");
  url.searchParams.set("sortBy", sortBy);
  return url.toString();
}

export function withShopeeProductDisplayModel(value: string, viewMode: ShopeeViewMode): string {
  try {
    const url = new URL(value);
    if (url.hostname !== "shopee.co.id" || !isProductPath(url.pathname)) {
      return value;
    }
    url.searchParams.set(
      "extraParams",
      JSON.stringify({
        display_model_id: PRODUCT_DISPLAY_MODEL_IDS[viewMode],
        model_selection_logic: 3
      })
    );
    return url.toString();
  } catch {
    return value;
  }
}

function normalizePrice(value?: number): number | undefined {
  if (!Number.isFinite(value) || value === undefined || value < 0) {
    return undefined;
  }
  return Math.round(value);
}

function isProductPath(pathname: string): boolean {
  return /-i\.\d+\.\d+/u.test(pathname) || pathname.includes("/product/");
}
