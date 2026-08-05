import { describe, expect, it } from "vitest";
import {
  STORE_TYPE_IMAGES,
  normalizeStoreType,
  storeTypeFromBadgeContext,
  storeTypeFromCapturedProductHtml,
  storeTypeImage
} from "./storeTypes.js";

describe("store type normalization", () => {
  it("rejects unsupported thumbnail image URLs", () => {
    expect(
      normalizeStoreType(
        "https://down-id.img.susercontent.com/file/id-11134258-7r98o-ly1pxywrszyh0b_tn.webp"
      )
    ).toBeNull();
  });

  it("renders Star with the canonical badge image", () => {
    expect(normalizeStoreType(STORE_TYPE_IMAGES.star)).toBe("star");
    expect(storeTypeImage("star")).toBe(STORE_TYPE_IMAGES.star);
  });

  it("recognizes current Shopee listing badge contexts without requiring an exact label", () => {
    expect(storeTypeFromBadgeContext("flag-label Shopee Mall product card")).toBe("shopee_mall");
    expect(storeTypeFromBadgeContext("seller badge preferred plus")).toBe("star_plus");
    expect(storeTypeFromBadgeContext("seller badge preferred")).toBe("star");
  });

  it("recovers a badge that appears before the product title in captured Shopee HTML", () => {
    const html = [
      '<section data-mio-captured-product-cards="true">',
      '<div class="h-full h-full product-card">',
      `<img src="${STORE_TYPE_IMAGES.shopee_mall}" aria-label="Shopee Mall" />`,
      '<a href="/Apple-iPhone-i.12345.67890">Apple iPhone</a>',
      '</div>',
      '</section>'
    ].join("");

    expect(storeTypeFromCapturedProductHtml(html, "https://shopee.co.id/Apple-iPhone-i.12345.67890"))
      .toBe("shopee_mall");
  });
});
