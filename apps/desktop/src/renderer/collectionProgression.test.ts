import { describe, expect, it } from "vitest";
import {
  collectionAdvanceMode,
  nextPendingCollectionActionId,
  nextProductCollectionTarget,
  previousCollectionActionId,
  reusesCurrentStoreRatingsPage,
  userMediaAdvanceTarget
} from "./collectionProgression.js";

describe("collection action progression", () => {
  const actionIds = ["store-homepage", "store-details", "store-rating-negative", "store-rating-positive"];

  it("advances inside the current store before moving to another store", () => {
    expect(nextPendingCollectionActionId(actionIds, "store-homepage", new Set(["store-homepage"])))
      .toBe("store-details");
  });

  it("skips actions already collected", () => {
    expect(nextPendingCollectionActionId(
      actionIds,
      "store-homepage",
      new Set(["store-homepage", "store-details"])
    )).toBe("store-rating-negative");
  });

  it("returns no next action after the final collected action", () => {
    expect(nextPendingCollectionActionId(actionIds, "store-rating-positive", new Set(actionIds)))
      .toBeUndefined();
  });

  it("moves backward inside the store", () => {
    expect(previousCollectionActionId(actionIds, "store-rating-negative")).toBe("store-details");
  });

  it("advances Part 2 to the next product after successful User Media", () => {
    expect(collectionAdvanceMode("PRODUCT_DETAILS", "media-in-user")).toBe("next-step");
    expect(collectionAdvanceMode("PRODUCT_DETAILS", "shop-homepage")).toBe("next-step");
    expect(collectionAdvanceMode("PRODUCT_DETAILS", "description-promotions")).toBe("stay");
    expect(collectionAdvanceMode("PRODUCT_DETAILS", "positive-reviews")).toBe("stay");
  });

  it("opens Shop Home Page after User Media until that evidence is collected", () => {
    expect(userMediaAdvanceTarget(false)).toBe("shop-homepage");
    expect(userMediaAdvanceTarget(true)).toBe("next-product");
  });

  it("reuses the current ratings page between 1-star and 5-star collection", () => {
    expect(reusesCurrentStoreRatingsPage("store-rating-negative", "store-rating-positive")).toBe(true);
    expect(reusesCurrentStoreRatingsPage("store-details", "store-rating-negative")).toBe(false);
  });

  it("does not advance an empty or failed collection and preserves Part 3 progression", () => {
    expect(collectionAdvanceMode("PRODUCT_DETAILS", "media-in-user", false)).toBe("stay");
    expect(collectionAdvanceMode("EVALUATION_KEY_STORE", "store-homepage")).toBe("next-action");
  });

  it("advances by product identity exactly once and opens the next first action", () => {
    const steps = [
      { id: "step-one", ownerId: "product-one", targetUrl: "https://shopee.co.id/one", subActions: [{ id: "first-page" }] },
      { id: "step-two", ownerId: "product-two", targetUrl: "https://shopee.co.id/two", subActions: [{ id: "first-page" }] }
    ];
    expect(nextProductCollectionTarget(steps, "product-one")).toEqual({
      stepIndex: 1,
      stepId: "step-two",
      firstActionId: "first-page",
      targetUrl: "https://shopee.co.id/two"
    });
  });

  it("does not use store identity to block repeated-store product progression", () => {
    const steps = [
      { id: "one", ownerId: "product-one", subActions: [{ id: "first-page" }] },
      { id: "two", ownerId: "product-two", subActions: [{ id: "first-page" }] }
    ];
    expect(nextProductCollectionTarget(steps, "product-one")?.stepId).toBe("two");
  });

  it("does not wrap the final product back to Product 1", () => {
    const steps = [
      { id: "one", ownerId: "product-one", subActions: [{ id: "first-page" }] },
      { id: "two", ownerId: "product-two", subActions: [{ id: "first-page" }] }
    ];
    expect(nextProductCollectionTarget(steps, "product-two")).toBeUndefined();
  });
});
