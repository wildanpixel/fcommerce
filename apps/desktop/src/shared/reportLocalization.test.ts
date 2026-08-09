import { describe, expect, it } from "vitest";
import { localizeReportHtml, reportText } from "./reportLocalization.js";

describe("report localization", () => {
  it("localizes report headings and metric labels into Indonesian", () => {
    const html = "<h2>Summary Metrics</h2><span>Products: 10</span><p>Best Price Shop</p>";
    const localized = localizeReportHtml(html, "id-ID");

    expect(localized).toContain("<h2>Ringkasan Metrik</h2>");
    expect(localized).toContain("<span>Produk: 10</span>");
    expect(localized).toContain("<p>Best Price Shop</p>");
  });

  it("provides Chinese section labels without changing English mode", () => {
    expect(reportText("zh-CN", "Key Products")).toBe("重点产品");
    expect(reportText("en-US", "Key Products")).toBe("Key Products");
  });
});
