import { describe, expect, it } from "vitest";
import {
  parseShopeeProductCard,
  searchWarningsFromSnapshot,
  type ShopeeRawCard
} from "./ShopeeAdapter.js";

describe("Shopee search parsing", () => {
  it("normalizes product-card evidence from browser-readable Shopee text", () => {
    const raw: ShopeeRawCard = {
      href: "https://shopee.co.id/Fake-Lash-Natural-i.12345.67890?sp_atk=abc",
      title: "Fake Lash Natural Soft Curl",
      imageAlt: "Fake Lash Natural Soft Curl",
      imageUrl: "https://cf.shopee.co.id/file/lash.jpg",
      sourceSort: "TOP_SALES",
      text: "Fake Lash Natural Soft Curl Rp12.500 4.9 1,2RB Terjual KOTA JAKARTA BARAT",
      parentText: [
        "Fake Lash Natural Soft Curl",
        "Rp12.500",
        "4.9",
        "1,2RB Terjual",
        "KOTA JAKARTA BARAT"
      ].join("\n")
    };

    const product = parseShopeeProductCard(raw, 3);

    expect(product.marketplace).toBe("SHOPEE_ID");
    expect(product.marketplaceProductId).toBe("12345.67890");
    expect(product.rank).toBe(3);
    expect(product.title).toBe("Fake Lash Natural Soft Curl");
    expect(product.price.average).toBe(12500);
    expect(product.rating).toBe(4.9);
    expect(product.totalSold).toBe(1200);
    expect(product.imageUrl).toBe("https://cf.shopee.co.id/file/lash.jpg");
    expect(product.raw.sourceSort).toBe("TOP_SALES");
    expect(product.raw.locationText).toBe("KOTA JAKARTA BARAT");
  });

  it("does not parse prices as ratings when no rating signal exists", () => {
    const raw: ShopeeRawCard = {
      href: "https://shopee.co.id/Lash-Pack-i.111.222",
      title: "Lash Pack",
      text: "Lash Pack Rp5.000 Gratis Ongkir",
      parentText: "Lash Pack\nRp5.000\nGratis Ongkir"
    };

    const product = parseShopeeProductCard(raw, 1);

    expect(product.price.average).toBe(5000);
    expect(product.rating).toBeUndefined();
  });

  it("reports blocked and empty search pages as structured warnings", () => {
    const warnings = searchWarningsFromSnapshot({
      url: "https://shopee.co.id/search?keyword=lash",
      title: "Security Check",
      bodyTextSample: "Please verify captcha before login. Produk tidak ditemukan.",
      productLinkCount: 0
    });

    expect(warnings).toContain(
      "[SHOPEE_BLOCKED_PAGE] Shopee showed a verification, captcha, security, or blocked-access signal."
    );
    expect(warnings).toContain(
      "[SHOPEE_LOGIN_REQUIRED] Shopee showed a login or account gate before product cards became readable."
    );
    expect(warnings).toContain(
      "[SHOPEE_EMPTY_RESULT] Shopee indicated that no results were available for the keyword."
    );
    expect(warnings).toContain(
      "[SHOPEE_NO_PRODUCT_LINKS] No browser-readable product links were found on the final search page."
    );
  });
});
