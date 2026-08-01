import { describe, expect, it } from "vitest";
import {
  assertEvidenceHasProductRows,
  evidenceRequiresProductRows,
  isCollectionPageReady
} from "./collectionEvidence.js";

describe("collection evidence readiness", () => {
  it("does not enable collection while a matching target URL is still loading", () => {
    expect(isCollectionPageReady(true, "loading")).toBe(false);
    expect(isCollectionPageReady(true, "ready")).toBe(true);
    expect(isCollectionPageReady(false, "ready")).toBe(false);
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
});
