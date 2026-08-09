import type { ShopeeStoreRatingSample } from "./shopeeStoreRatings.js";

export type StoreRatingBuckets = {
  oneStar: ShopeeStoreRatingSample[];
  fiveStar: ShopeeStoreRatingSample[];
};

export function mergeStoreRatingBuckets(
  current: StoreRatingBuckets,
  incoming: readonly ShopeeStoreRatingSample[]
): StoreRatingBuckets {
  const incomingOneStar = uniqueRatingSamples(incoming.filter((sample) => sample.rating === 1)).slice(0, 5);
  const incomingFiveStar = uniqueRatingSamples(incoming.filter((sample) => sample.rating === 5)).slice(0, 5);
  return {
    oneStar: incomingOneStar.length > 0 ? incomingOneStar : uniqueRatingSamples(current.oneStar).slice(0, 5),
    fiveStar: incomingFiveStar.length > 0 ? incomingFiveStar : uniqueRatingSamples(current.fiveStar).slice(0, 5)
  };
}

export function uniqueRatingSamples(
  samples: readonly ShopeeStoreRatingSample[]
): ShopeeStoreRatingSample[] {
  const seen = new Set<string>();
  return samples.filter((sample) => {
    const key = [
      sample.rating,
      sample.productUrl ?? sample.productTitle ?? "",
      sample.reviewer,
      sample.capturedAt ?? "",
      sample.comment
    ].join(":").toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
