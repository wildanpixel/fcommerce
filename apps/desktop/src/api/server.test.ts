import { describe, expect, it } from "vitest";
import { extractMoneyRange, extractPdpStoreInfoFromHtml, extractRatingTextValue, parsePrice } from "./server.js";

describe("Shopee PDP store extraction", () => {
  it("extracts store name from the current sll2 product shop block", () => {
    const html = `
      <div id="sll2-pdp-product-shop">
        <section class="page-product__shop">
          <div class="r74CsV">
            <div class="uLQaPg">
              <a class="lG5Xxv" href="/iboxofficial?categoryId=100013&amp;entryPoint=ShopByPDP&amp;itemId=21493872655">
                <div class="H0wYar y8f_ga">
                  <img alt="click here to visit shop" src="avatar.webp">
                </div>
                <div class="aUEg4L">
                  <div class="official-shop-new-badge">
                    <img alt="mall shop badge" src="mall.svg">
                  </div>
                </div>
              </a>
              <div class="PYEGyz">
                <div class="fV3TIn">iBox Official Shop</div>
                <div class="mMlpiZ"><div class="product-page-seller-info__online"><span></span>online</div></div>
                <div class="NyRGTK"><a href="/iboxofficial"><div>view shop</div></a></div>
              </div>
            </div>
            <div class="NGzCXN">
              <div><label>Ratings</label><span>431,8k</span></div>
              <div><label>products</label><span>1,4k</span></div>
            </div>
          </div>
        </section>
      </div>
      <div class="page-product__content"></div>
    `;

    expect(extractPdpStoreInfoFromHtml(html)).toEqual({
      storeName: "iBox Official Shop",
      storeUrl: "https://shopee.co.id/iboxofficial?categoryId=100013&entryPoint=ShopByPDP&itemId=21493872655",
      storeType: "Mall ORI"
    });
  });

  it("does not use shop chrome labels as the store name", () => {
    const html = `
      <section class="page-product__shop">
        <a href="/pockets.official?entryPoint=ShopByPDP"><img alt="click here to visit shop"></a>
        <div><div>Pockets Official Store</div><div>Active 4 Minutes Ago</div></div>
        <div>view shop</div>
        <div>Ratings</div>
      </section>
    `;

    expect(extractPdpStoreInfoFromHtml(html).storeName).toBe("Pockets Official Store");
  });

  it("keeps a Star badge for a non-official store", () => {
    const html = `
      <section class="page-product__shop">
        <a href="/beauty.secret?entryPoint=ShopByPDP"><img alt="Star badge" src="star.svg"></a>
        <div><div>beauty.secret</div></div>
      </section>
    `;

    expect(extractPdpStoreInfoFromHtml(html).storeType).toBe("Star");
  });
});

describe("Shopee rating extraction", () => {
  it("does not mistake a Star seller badge or sold count for a rating", () => {
    expect(extractRatingTextValue("Star 1RB+ Sold")).toBeUndefined();
  });

  it("extracts the product-star metric beside its ratings count", () => {
    expect(extractRatingTextValue("4.8 9,9k Ratings 10RB+ Sold")).toBe("4,8");
  });
});

describe("Shopee price extraction", () => {
  it("preserves a complete Indonesian rupiah value", () => {
    expect(parsePrice("Rp13.200.000")).toBe(13_200_000);
  });

  it("uses the first price for a PDP variant range", () => {
    expect(extractMoneyRange("Rp13.299.000 - Rp18.198.000").average).toBe(13_299_000);
  });
});
