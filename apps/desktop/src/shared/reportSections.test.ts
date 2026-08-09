import { describe, expect, it } from "vitest";
import { DEFAULT_REPORT_SECTIONS, REPORT_SECTION_GROUPS, REPORT_SECTION_ORDER } from "./reportSections.js";

describe("report sections", () => {
  it("keeps default report sections in the PDF-derived workflow order", () => {
    expect(DEFAULT_REPORT_SECTIONS.map((section) => section.id)).toEqual(REPORT_SECTION_ORDER);
  });

  it("requires evidence for every enabled default section", () => {
    expect(DEFAULT_REPORT_SECTIONS.every((section) => section.requiredEvidence.length > 0)).toBe(true);
  });

  it("keeps TikTok evidence as the final Key Store subsection", () => {
    const keyStore = REPORT_SECTION_GROUPS.find((group) => group.id === "key-store");
    expect(keyStore?.sectionIds.at(-2)).toBe("keyStoreVisualStyle");
    expect(keyStore?.sectionIds.at(-1)).toBe("tiktokEvidence");
  });

  it("uses the requested five-section structured report order", () => {
    expect(REPORT_SECTION_GROUPS.map((group) => group.title)).toEqual([
      "Keyword General",
      "Key Product List",
      "Product Detail",
      "Key Store",
      "Keyword Search Analysis"
    ]);
  });
});
