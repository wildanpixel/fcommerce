import { describe, expect, it } from "vitest";
import {
  buildStoreCollectionCandidates,
  dedupeStoreCollectionCandidates,
  resolveCanonicalStoreList,
  resolveKeyStoreCollectionTarget
} from "./collectionKeyStore.js";

describe("Key Store collection target", () => {
  it("uses the evaluated winner instead of the pre-scoring fallback product", () => {
    const cetaphil = {
      storeName: "Cetaphil Indonesia",
      storeUrl: "https://shopee.co.id/cetaphilindonesia?categoryId=100630&entryPoint=ShopByPDP"
    };
    const aveeno = {
      storeName: "Aveeno Official Shop",
      storeUrl: "https://shopee.co.id/aveeno.official?categoryId=100630"
    };

    expect(resolveKeyStoreCollectionTarget(
      [aveeno, cetaphil],
      { name: "Cetaphil Indonesia", url: "https://shopee.co.id/cetaphilindonesia" },
      aveeno
    )).toEqual({
      name: "Cetaphil Indonesia",
      url: "https://shopee.co.id/cetaphilindonesia",
      product: cetaphil
    });
  });

  it("keeps a Shopee shop ID found on the original product store URL", () => {
    expect(buildStoreCollectionCandidates([{
      storeName: "Tyeso Official Store",
      storeUrl: "https://shopee.co.id/tyeso.id?shopid=181234567&entryPoint=ShopByPDP"
    }])[0]).toMatchObject({
      storeUrl: "https://shopee.co.id/tyeso.id",
      shopId: "181234567"
    });
  });

  it("deduplicates the same store when saved URLs use different Shopee routes", () => {
    expect(dedupeStoreCollectionCandidates([
      {
        id: "store-one",
        storeName: "Cuculemon Official Store",
        storeUrl: "https://shopee.co.id/cuculemon.id?categoryId=100630",
        includePopularProducts: false,
        includeShopBanner: false
      },
      {
        id: "store-two",
        storeName: "Cuculemon Official Store",
        storeUrl: "https://shopee.co.id/shop/1479204661?shopid=1479204661",
        shopId: "1479204661",
        includePopularProducts: true,
        includeShopBanner: false
      }
    ])).toEqual([
      expect.objectContaining({
        id: "store-one",
        storeName: "Cuculemon Official Store",
        shopId: "1479204661",
        includePopularProducts: true
      })
    ]);
  });

  it("removes query parameters from canonical candidate URLs", () => {
    expect(buildStoreCollectionCandidates([{
      storeName: "Tyeso Official Store",
      storeUrl: "https://SHOPEE.co.id/tyeso.id/?categoryId=100&entryPoint=ShopByPDP#products"
    }])[0]?.storeUrl).toBe("https://shopee.co.id/tyeso.id");
  });

  it("keeps similar names separate when both stores have different shop IDs", () => {
    const result = dedupeStoreCollectionCandidates([
      { id: "one", storeName: "Example Official", storeUrl: "https://shopee.co.id/shop/111", shopId: "111", includePopularProducts: false, includeShopBanner: false },
      { id: "two", storeName: "Example Official", storeUrl: "https://shopee.co.id/shop/222", shopId: "222", includePopularProducts: false, includeShopBanner: false }
    ]);
    expect(result).toHaveLength(2);
  });

  it("preserves the strongest actual store classification while merging", () => {
    const result = dedupeStoreCollectionCandidates([
      { id: "one", storeName: "Cuculemon Official Store", storeUrl: "https://shopee.co.id/cuculemon.id", storeType: "star", includePopularProducts: false, includeShopBanner: false },
      { id: "two", storeName: "Cuculemon Official Store", storeUrl: "https://shopee.co.id/shop/1479204661", shopId: "1479204661", storeType: "shopee_mall", includePopularProducts: false, includeShopBanner: false }
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.storeType).toBe("shopee_mall");
  });

  it("combines source products from one shop into one store target", () => {
    const result = buildStoreCollectionCandidates([
      { id: "product-one", storeName: "Store", storeUrl: "https://shopee.co.id/shop/111", storeType: "star" },
      { id: "product-two", storeName: "Store", storeUrl: "https://shopee.co.id/shop/111", storeType: "shopee_mall" }
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ shopId: "111", storeType: "shopee_mall", sourceProductIds: ["product-one", "product-two"] });
  });

  it("uses an initialized saved Store List exactly without regenerating removed stores", () => {
    const products = [
      { id: "one", storeName: "Store One", storeUrl: "https://shopee.co.id/shop/111" },
      { id: "two", storeName: "Store Two", storeUrl: "https://shopee.co.id/shop/222" }
    ];
    const saved = buildStoreCollectionCandidates([products[1]]);
    expect(resolveCanonicalStoreList(products, saved, true)).toEqual(saved);
    expect(resolveCanonicalStoreList(products, [], true)).toEqual([]);
  });

  it("initializes older projects from qualified products and historical Part 3 stores", () => {
    const result = resolveCanonicalStoreList(
      [{ id: "one", storeName: "Store One", storeUrl: "https://shopee.co.id/shop/111" }],
      [],
      false,
      [{ storeName: "Historical Store", storeUrl: "https://shopee.co.id/shop/222" }]
    );
    expect(result.map((item) => item.shopId)).toEqual(["111", "222"]);
  });
});
