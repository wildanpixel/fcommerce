import { describe, expect, it } from "vitest";
import {
  viewModeForCollectionStage
} from "./collectionViewMode.js";

describe("collection browser view mode", () => {
  it("preserves the user's selected view mode during store collection", () => {
    expect(viewModeForCollectionStage("EVALUATION_KEY_STORE", "mobile")).toBe("mobile");
    expect(viewModeForCollectionStage("EVALUATION_KEY_STORE", "desktop")).toBe("desktop");
  });

  it("preserves the selected view mode outside Part 3", () => {
    expect(viewModeForCollectionStage("KEYWORD_GENERAL", "mobile")).toBe("mobile");
    expect(viewModeForCollectionStage("PRODUCT_DETAILS", "desktop")).toBe("desktop");
  });
});
