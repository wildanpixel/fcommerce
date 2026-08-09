import { describe, expect, it } from "vitest";
import {
  parseShopeeStoreRatingHtml,
  parseShopeeStoreRatingHtmlWithDiagnostics,
  storeRatingPriority
} from "./shopeeStoreRatings.js";

const filledStar = '<svg class="shopee-svg-icon YBGCRA icon-rating-solid"></svg>';
const emptyStar = '<svg class="shopee-svg-icon YBGCRA icon-rating"></svg>';

function ratingRow(
  id: string,
  rating: 1 | 5,
  options: { comment?: string; response?: string; media?: string[] } = {}
): string {
  const stars = filledStar.repeat(rating) + emptyStar.repeat(5 - rating);
  const media = options.media?.map((url) =>
    `<img class="rating-media-list__image-wrapper--image" src="${url}@resize_w72_nl.webp"><img class="rating-media-list__zoomed-image-item" src="${url}">`
  ).join("") ?? "";
  return `<div class="A7MThp"><div class="d72He7"><a class="InK5kS" href="/shop/${id}">${id}</a><div class="rGdC5O">${stars}</div></div>` +
    `<div class="j5ucs4"><div class="XYk98l">2026-08-02 | Variation: ${id}</div></div>` +
    (options.comment ? `<div class="meQyXP">${options.comment}</div>` : "") +
    (media ? `<div class="rating-media-list">${media}</div>` : "") +
    (options.response ? `<div class="p5tg3L"><div class="QSiE2A">${options.response}</div></div>` : "") +
    `<div class="Fv6uAA"><a class="h3xEIM" href="/Product-${id}-i.1.${id}"><img src="https://example.com/product-thumb-${id}"><span class="EQ3yLe">Product ${id}</span></a></div>` +
    `<div class="jpKEtU">helpful? Report Abuse</div></div>`;
}

describe("Shopee store rating HTML", () => {
  it("extracts structured one-star evidence without action noise", () => {
    const html = '<div class="A7MThp">' +
      '<div class="d72He7"><a class="InK5kS" href="/shop/1474794348">anyaashaa</a>' +
      '<div class="rGdC5O">' + filledStar + emptyStar.repeat(4) + '</div>' +
      '<div class="XYk98l">2026-08-02 22:24 | Variation: 53#Bunga Pink</div></div>' +
      '<div class="meQyXP"><div><span>Desain: </span><span>desainnya lucu</span></div>' +
      '<div><span>Ukuran: </span><span>KGK BISA DITUTUP</span></div></div>' +
      '<div class="rating-media-list"><img srcset="https://down-id.img.susercontent.com/file/review-one@resize_w72_nl.webp 1x, https://down-id.img.susercontent.com/file/review-one@resize_w144_nl.webp 2x">' +
      '<img class="rating-media-list__zoomed-image-item" src="https://down-id.img.susercontent.com/file/review-one"></div>' +
      '<div class="p5tg3L"><div>seller&apos;s response:</div><div class="QSiE2A">Kami sangat menyesal atas masalah ini.</div></div>' +
      '<div class="Fv6uAA"><a class="h3xEIM" href="/Product-i.1.2"><img src="https://down-id.img.susercontent.com/file/product-thumbnail"><span class="EQ3yLe">Cuculemon Tumbler</span><span class="TaSogz">Variation: Pink</span></a></div>' +
      '<div class="jpKEtU">helpful? Report Abuse</div></div>';

    expect(parseShopeeStoreRatingHtml(html, 1)).toEqual([{
      rating: 1,
      reviewer: "anyaashaa",
      reviewerUrl: "https://shopee.co.id/shop/1474794348",
      comment: "Desain: desainnya lucu\nUkuran: KGK BISA DITUTUP",
      productTitle: "Cuculemon Tumbler",
      productUrl: "https://shopee.co.id/Product-i.1.2",
      productVariation: "Variation: Pink",
      sellerResponse: "Kami sangat menyesal atas masalah ini.",
      mediaUrls: ["https://down-id.img.susercontent.com/file/review-one"],
      capturedAt: "2026-08-02 22:24 | Variation: 53#Bunga Pink"
    }]);
  });

  it("keeps a five-star product-only rating as fallback evidence", () => {
    const html = '<div class="A7MThp"><a class="InK5kS" href="/shop/1600029919">lauradilamhrnip</a>' +
      '<div class="rGdC5O">' + filledStar.repeat(5) + '</div>' +
      '<div class="XYk98l">2026-08-02 22:53 | Variation: 06#Pink 750ml</div>' +
      '<div class="Fv6uAA"><a class="h3xEIM" href="/Tumbler-i.1.2"><span class="EQ3yLe">Tumbler 1 Liter</span></a></div></div>';

    expect(parseShopeeStoreRatingHtml(html, 5)).toEqual([
      expect.objectContaining({
        rating: 5,
        reviewer: "lauradilamhrnip",
        comment: "",
        productTitle: "Tumbler 1 Liter",
        productUrl: "https://shopee.co.id/Tumbler-i.1.2"
      })
    ]);
  });

  it("parses the supplied nested five-star row with a seller response", () => {
    const html = '<div class="A7MThp"><div class="d72He7"><a class="InK5kS" href="/shop/1600029919">lauradilamhrnip</a>' +
      '<div class="BnXxkm"><div class="rGdC5O">' + filledStar.repeat(5) + '</div></div>' +
      '<div class="j5ucs4"><div class="XYk98l">2026-08-02 22:53 | Variation: 06#Pink 750ml</div></div></div>' +
      '<div class="p5tg3L"><div class="rFzVcr">seller&apos;s response:</div><div class="QSiE2A">Wah, terima kasih banyak untuk bintang 5 nya!</div></div>' +
      '<div class="Fv6uAA"><a class="h3xEIM" href="/CucuLemon-Termos-i.1479204661.29328414921">' +
      '<picture><img src="https://down-id.img.susercontent.com/file/product-thumbnail" alt="product-image"></picture>' +
      '<div><span class="EQ3yLe">CucuLemon Termos Stainless Steel Tumbler</span><span class="TaSogz">Variation: 06#Pink 750ml</span></div></a></div>' +
      '<div class="jpKEtU"><div>helpful?</div><div>Report Abuse</div></div></div>';

    expect(parseShopeeStoreRatingHtml(html, 5)).toEqual([expect.objectContaining({
      rating: 5,
      reviewer: "lauradilamhrnip",
      reviewerUrl: "https://shopee.co.id/shop/1600029919",
      comment: "",
      productTitle: "CucuLemon Termos Stainless Steel Tumbler",
      productUrl: "https://shopee.co.id/CucuLemon-Termos-i.1479204661.29328414921",
      productVariation: "Variation: 06#Pink 750ml",
      sellerResponse: "Wah, terima kasih banyak untuk bintang 5 nya!",
      mediaUrls: []
    })]);
  });

  it("discovers a review structurally when generated container classes change", () => {
    const html = '<section class="generated-review-row"><header><a href="/shop/1600029919">lauradilamhrnip</a>' +
      '<div class="generated-rating">' + filledStar.repeat(5) + '</div>' +
      '<time>2026-08-02 22:53 | Variation: Pink</time></header>' +
      '<div><strong>seller&apos;s response:</strong><p>Thank you for your review.</p></div>' +
      '<footer><a href="/Generic-Product-i.1479204661.29328414921"><span>Generic Product</span>' +
      '<span>Variation: Pink</span><img src="https://example.com/product-thumbnail"></a></footer></section>';

    expect(parseShopeeStoreRatingHtml(html, 5)).toEqual([expect.objectContaining({
      rating: 5,
      reviewer: "lauradilamhrnip",
      productTitle: "Generic Product",
      productVariation: "Variation: Pink",
      sellerResponse: "Thank you for your review.",
      mediaUrls: []
    })]);
  });

  it("deduplicates repeated hydrated copies before applying the five-result limit", () => {
    const repeated = ratingRow("duplicate", 5, { response: "response" });
    const html = repeated.repeat(8) + ratingRow("distinct", 5, { comment: "comment" });

    expect(parseShopeeStoreRatingHtml(html, 5).map((sample) => sample.reviewer)).toEqual([
      "distinct",
      "duplicate"
    ]);
  });

  it("does not infer a requested rating when the downloaded row has no solid stars", () => {
    const html = '<div class="A7MThp"><a class="InK5kS" href="/shop/1">buyer</a>' +
      '<div class="rGdC5O">' + emptyStar.repeat(5) + '</div>' +
      '<div class="Fv6uAA"><a class="h3xEIM" href="/Product-i.1.2"><span class="EQ3yLe">Product</span></a></div></div>';

    expect(parseShopeeStoreRatingHtml(html, 5)).toEqual([]);
  });

  it("sorts the five requested priority groups and all fallbacks deterministically", () => {
    const html = [
      ratingRow("fallback-product", 5),
      ratingRow("priority-5", 5, { comment: "comment" }),
      ratingRow("priority-4", 5, { comment: "comment", media: ["https://example.com/p4"] }),
      ratingRow("priority-3", 5, { comment: "comment", response: "response" }),
      ratingRow("priority-2", 5, { response: "response", media: ["https://example.com/p2"] }),
      ratingRow("priority-1", 5, { comment: "comment", response: "response", media: ["https://example.com/p1"] }),
      ratingRow("fallback-response", 5, { response: "response" }),
      ratingRow("fallback-media", 5, { media: ["https://example.com/p7"] })
    ].join("");
    expect(parseShopeeStoreRatingHtml(html, 5).map((sample) => sample.reviewer)).toEqual([
      "priority-1",
      "priority-2",
      "priority-3",
      "priority-4",
      "priority-5"
    ]);
    expect(storeRatingPriority({ comment: "", mediaUrls: [], sellerResponse: "response" })).toBe(6);
    expect(storeRatingPriority({ comment: "", mediaUrls: ["media"] })).toBe(7);
    expect(storeRatingPriority({ comment: "", mediaUrls: [] })).toBe(8);
  });

  it("uses media count, meaningful text length, then page order to resolve equal priorities", () => {
    const html = [
      ratingRow("page-first", 1, { comment: "same length" }),
      ratingRow("long-comment", 1, { comment: "this comment is meaningfully longer" }),
      ratingRow("page-third", 1, { comment: "same length" })
    ].join("");
    expect(parseShopeeStoreRatingHtml(html, 1).map((sample) => sample.reviewer)).toEqual([
      "long-comment",
      "page-first",
      "page-third"
    ]);
  });

  it("sorts seller-only, media-only, and product-only fallbacks after Priority 5", () => {
    const html = [
      ratingRow("product-only", 5),
      ratingRow("media-only", 5, { media: ["https://example.com/media"] }),
      ratingRow("seller-only", 5, { response: "Thank you for the rating." }),
      ratingRow("priority-five", 5, { comment: "user comment" })
    ].join("");
    expect(parseShopeeStoreRatingHtml(html, 5).map((sample) => sample.reviewer)).toEqual([
      "priority-five",
      "seller-only",
      "media-only",
      "product-only"
    ]);
  });

  it("requires product identity and reports zero-result diagnostics", () => {
    const html = `<div class="A7MThp"><div class="rGdC5O">${filledStar.repeat(5)}</div><div class="meQyXP">Comment without product</div></div>`;
    const result = parseShopeeStoreRatingHtmlWithDiagnostics(html, 5);
    expect(result.samples).toEqual([]);
    expect(result.diagnostics).toMatchObject({
      htmlLength: html.length,
      rootCount: 1,
      fiveStarCandidateCount: 1,
      finalParsedCount: 0,
      rejectedReasons: { "missing-product-identity": 1 }
    });
  });
});
