import type { ManualEvidenceKind } from "../shared/contracts.js";

export type CollectionPageLoadState = "idle" | "loading" | "ready" | "failed";

const PRODUCT_LISTING_EVIDENCE_KINDS = new Set<ManualEvidenceKind>([
  "SEARCH_RESULT",
  "TOP_SALES",
  "STORE_FEATURED_PRODUCTS",
  "STORE_BEST_SELLER"
]);

export function isCollectionPageReady(intentMatches: boolean, loadState: CollectionPageLoadState): boolean {
  return intentMatches && loadState === "ready";
}

export function evidenceRequiresProductRows(kind: ManualEvidenceKind): boolean {
  return PRODUCT_LISTING_EVIDENCE_KINDS.has(kind);
}

export function assertEvidenceHasProductRows(kind: ManualEvidenceKind, productCount: number, label: string): void {
  if (!evidenceRequiresProductRows(kind) || productCount > 0) {
    return;
  }
  throw new Error(`${label} did not fetch any product rows. Wait until the marketplace results are visible, then try Collect again.`);
}
