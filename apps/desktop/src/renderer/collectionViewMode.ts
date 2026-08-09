import type { CollectionStage } from "../shared/contracts.js";

export type CollectionViewMode = "desktop" | "mobile";

export function viewModeForCollectionStage(
  _stage: CollectionStage,
  currentViewMode: CollectionViewMode
): CollectionViewMode {
  return currentViewMode;
}
