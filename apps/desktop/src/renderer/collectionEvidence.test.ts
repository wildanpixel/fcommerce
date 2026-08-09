import { describe, expect, it } from "vitest";
import {
  assertEvidenceHasProductRows,
  evidenceRequiresProductRows,
  isCollectionPageReady,
  preservesStoreEvidenceDuringReset
} from "./collectionEvidence.js";

describe("collection evidence readiness", () => {
  it("keeps ordinary evidence disabled while its matching target is still loading", () => {
    expect(isCollectionPageReady(true, "loading")).toBe(false);
    expect(isCollectionPageReady(true, "ready")).toBe(true);
    expect(isCollectionPageReady(false, "ready")).toBe(false);
  });

  it("allows guarded product-list collection once the target URL matches", () => {
    expect(isCollectionPageReady(true, "loading", true)).toBe(true);
    expect(isCollectionPageReady(true, "idle", true)).toBe(true);
    expect(isCollectionPageReady(true, "failed", true)).toBe(false);
    expect(isCollectionPageReady(false, "ready", true)).toBe(false);
  });

  it("requires product rows for both Part 1 result sorts", () => {
    expect(evidenceRequiresProductRows("SEARCH_RESULT")).toBe(true);
    expect(evidenceRequiresProductRows("TOP_SALES")).toBe(true);
    expect(evidenceRequiresProductRows("PRODUCT_PAGE")).toBe(false);
  });

  it("rejects an empty Top Sales capture instead of marking it complete", () => {
    expect(() => assertEvidenceHasProductRows("TOP_SALES", 0, "Top sales first page screenshot"))
      .toThrow("did not fetch any product rows");
    expect(() => assertEvidenceHasProductRows("TOP_SALES", 60, "Top sales first page screenshot"))
      .not.toThrow();
  });

  it("retains the last valid structured store result while preparing recollection", () => {
    expect(preservesStoreEvidenceDuringReset("store-details")).toBe(true);
    expect(preservesStoreEvidenceDuringReset("store-rating-negative")).toBe(true);
    expect(preservesStoreEvidenceDuringReset("store-rating-positive")).toBe(true);
    expect(preservesStoreEvidenceDuringReset("store-categories")).toBe(true);
    expect(preservesStoreEvidenceDuringReset("store-homepage")).toBe(false);
  });
});
