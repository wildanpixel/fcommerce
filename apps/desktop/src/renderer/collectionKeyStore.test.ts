import { describe, expect, it } from "vitest";
import { resolveKeyStoreCollectionTarget } from "./collectionKeyStore.js";

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
});
