import { describe, expect, it } from "vitest";
import { mergeStoreRatingBuckets } from "./storeRatingPersistence.js";
import type { ShopeeStoreRatingSample } from "./shopeeStoreRatings.js";

const sample = (rating: 1 | 5, reviewer: string): ShopeeStoreRatingSample => ({
  rating,
  reviewer,
  comment: "",
  productTitle: `Product ${reviewer}`,
  productUrl: `https://shopee.co.id/product-${reviewer}`,
  mediaUrls: []
});

describe("store rating persistence", () => {
  it("replaces only the collected rating bucket", () => {
    expect(mergeStoreRatingBuckets(
      { oneStar: [sample(1, "old-one")], fiveStar: [sample(5, "old-five")] },
      [sample(1, "new-one")]
    )).toEqual({ oneStar: [sample(1, "new-one")], fiveStar: [sample(5, "old-five")] });
  });

  it("does not overwrite previous valid results when a parse returns zero", () => {
    const current = { oneStar: [sample(1, "one")], fiveStar: [sample(5, "five")] };
    expect(mergeStoreRatingBuckets(current, [])).toEqual(current);
  });
});
