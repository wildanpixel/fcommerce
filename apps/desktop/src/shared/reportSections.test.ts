import { describe, expect, it } from "vitest";
import { DEFAULT_REPORT_SECTIONS, REPORT_SECTION_ORDER } from "./reportSections.js";

describe("report sections", () => {
  it("keeps default report sections in the PDF-derived workflow order", () => {
    expect(DEFAULT_REPORT_SECTIONS.map((section) => section.id)).toEqual(REPORT_SECTION_ORDER);
  });

  it("requires evidence for every enabled default section", () => {
    expect(DEFAULT_REPORT_SECTIONS.every((section) => section.requiredEvidence.length > 0)).toBe(true);
  });
});
