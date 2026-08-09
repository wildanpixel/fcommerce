export type ShopeeStoreRatingSample = {
  rating: number;
  reviewer: string;
  reviewerUrl?: string;
  comment: string;
  productTitle?: string;
  productUrl?: string;
  productVariation?: string;
  sellerResponse?: string;
  mediaUrls: string[];
  capturedAt?: string;
};

export type ShopeeStoreRatingDiagnostics = {
  htmlLength: number;
  rootCount: number;
  solidStarCounts: Record<string, number>;
  oneStarCandidateCount: number;
  fiveStarCandidateCount: number;
  rejectedReasons: Record<string, number>;
  finalParsedCount: number;
};

export function parseShopeeStoreRatingHtml(
  html: string,
  requestedRating?: number
): ShopeeStoreRatingSample[] {
  return parseShopeeStoreRatingHtmlWithDiagnostics(html, requestedRating).samples;
}

export function parseShopeeStoreRatingHtmlWithDiagnostics(
  html: string,
  requestedRating?: number
): { samples: ShopeeStoreRatingSample[]; diagnostics: ShopeeStoreRatingDiagnostics } {
  const exactRows = html && html.includes("A7MThp") ? elementsByClass(html, "A7MThp") : [];
  const rows = exactRows.length > 0 ? exactRows : structuralReviewRows(html);
  const solidStarCounts: Record<string, number> = {};
  const rejectedReasons: Record<string, number> = {};
  const reject = (reason: string) => {
    rejectedReasons[reason] = (rejectedReasons[reason] ?? 0) + 1;
  };
  const parsed: Array<ShopeeStoreRatingSample & { sourceIndex: number }> = [];
  let oneStarCandidateCount = 0;
  let fiveStarCandidateCount = 0;

  rows.forEach((row, sourceIndex) => {
    const ratingRoot = firstElementByClass(row, "rGdC5O");
    const rating = countClass(ratingRoot || row, "icon-rating-solid");
    solidStarCounts[String(rating)] = (solidStarCounts[String(rating)] ?? 0) + 1;
    if (rating === 1) oneStarCandidateCount += 1;
    if (rating === 5) fiveStarCandidateCount += 1;
    if (rating !== 1 && rating !== 5) {
      reject("unsupported-solid-star-count");
      return;
    }
    if (requestedRating && rating !== requestedRating) {
      reject("requested-rating-mismatch");
      return;
    }

    const reviewerRoot = firstElementByClass(row, "d72He7");
    const reviewerElement = firstElementByClass(reviewerRoot || row, "InK5kS") || firstAnchorMatching(row, isReviewerUrl);
    const timestampRoot = firstElementByClass(row, "j5ucs4");
    const timestampElement = firstElementByClass(timestampRoot || reviewerRoot || row, "XYk98l");
    const responseRoot = firstElementByClass(row, "p5tg3L");
    const productRoot = firstElementByClass(row, "Fv6uAA");
    const productAnchor = firstElementByClass(productRoot, "h3xEIM") || firstAnchorMatching(row, isProductUrl);
    const productContainer = productRoot || productAnchor;
    const productText = semanticTextFromHtml(productAnchor);
    const productTitle = textFromHtml(firstElementByClass(productContainer, "EQ3yLe")) ||
      firstMeaningfulProductLine(productText) || undefined;
    const productUrl = absoluteShopeeUrl(attribute(productAnchor, "href"));
    if (!productTitle && !productUrl) {
      reject("missing-product-identity");
      return;
    }

    const rowText = semanticTextFromHtml(row);
    const capturedAt = textFromHtml(timestampElement) || timestampFromText(rowText);
    const sellerResponse = sanitizeSellerResponse(
      textFromHtml(firstElementByClass(responseRoot, "QSiE2A")) ||
      sellerResponseFromText(rowText, productTitle)
    );
    const exactComment = textFromHtml(firstElementByClass(row, "meQyXP"));
    parsed.push({
      rating,
      reviewer: textFromHtml(reviewerElement),
      reviewerUrl: absoluteShopeeUrl(attribute(reviewerElement, "href")),
      comment: sanitizeReviewText(exactComment || commentFromText(rowText, {
        reviewer: textFromHtml(reviewerElement),
        capturedAt,
        sellerResponse,
        productTitle,
        productVariation: productVariationFromText(productText)
      })),
      productTitle,
      productUrl,
      productVariation: textFromHtml(firstElementByClass(productContainer, "TaSogz")) || productVariationFromText(productText),
      sellerResponse,
      mediaUrls: ratingMediaUrls(row, productAnchor),
      capturedAt,
      sourceIndex
    });
  });

  const samples = uniqueParsedSamples(parsed)
    .sort(compareRatingSamples)
    .slice(0, 5)
    .map(({ sourceIndex: _sourceIndex, ...sample }) => sample);
  return {
    samples,
    diagnostics: {
      htmlLength: html.length,
      rootCount: rows.length,
      solidStarCounts,
      oneStarCandidateCount,
      fiveStarCandidateCount,
      rejectedReasons,
      finalParsedCount: samples.length
    }
  };
}

export function storeRatingPriority(sample: {
  sellerResponse?: string;
  comment: string;
  mediaUrls: string[];
}): number {
  const hasSellerResponse = Boolean(sample.sellerResponse?.trim());
  const hasUserComment = Boolean(sample.comment.trim());
  const hasMedia = sample.mediaUrls.length > 0;
  if (hasSellerResponse && hasMedia && hasUserComment) return 1;
  if (hasSellerResponse && hasMedia && !hasUserComment) return 2;
  if (hasSellerResponse && hasUserComment && !hasMedia) return 3;
  if (hasUserComment && hasMedia && !hasSellerResponse) return 4;
  if (hasUserComment && !hasSellerResponse && !hasMedia) return 5;
  if (hasSellerResponse && !hasMedia && !hasUserComment) return 6;
  if (hasMedia && !hasSellerResponse && !hasUserComment) return 7;
  return 8;
}

export function compareRatingSamples<T extends {
  sellerResponse?: string;
  comment: string;
  mediaUrls: string[];
  sourceIndex: number;
}>(left: T, right: T): number {
  return storeRatingPriority(left) - storeRatingPriority(right) ||
    right.mediaUrls.length - left.mediaUrls.length ||
    meaningfulLength(right.comment) - meaningfulLength(left.comment) ||
    meaningfulLength(right.sellerResponse ?? "") - meaningfulLength(left.sellerResponse ?? "") ||
    left.sourceIndex - right.sourceIndex;
}

function ratingMediaUrls(row: string, productAnchor: string): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  const exactMediaElements = [
    ...elementsByClass(row, "rating-media-list__zoomed-image-item"),
    ...elementsByClass(row, "rating-media-list__image-wrapper--image")
  ];
  const mediaElements = exactMediaElements.length > 0
    ? exactMediaElements
    : mediaTags(productAnchor ? row.replace(productAnchor, "") : row);
  for (const mediaElement of mediaElements) {
    const match = mediaElement.match(/<(?:img|video|source)\b[^>]*>/iu);
    if (!match) continue;
    const candidates = [
      ...srcsetUrls(attribute(match[0], "srcset")),
      attribute(match[0], "src"),
      attribute(match[0], "poster")
    ].filter((value): value is string => Boolean(value));
    for (const candidate of candidates) {
      const src = normalizeRatingMediaUrl(absoluteShopeeUrl(candidate));
      if (!src || seen.has(src) || /(avatar|profile|sprite|icon)/iu.test(src)) {
        continue;
      }
      seen.add(src);
      output.push(src);
    }
  }
  return output.slice(0, 12);
}

function uniqueParsedSamples<T extends ShopeeStoreRatingSample & { sourceIndex: number }>(samples: T[]): T[] {
  const seen = new Set<string>();
  return samples.filter((sample) => {
    const key = [
      sample.rating,
      sample.productUrl ?? sample.productTitle ?? "",
      sample.reviewer,
      sample.capturedAt ?? "",
      sample.comment,
      sample.sellerResponse ?? ""
    ].join(":").toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function structuralReviewRows(html: string): string[] {
  if (!html || !html.includes("icon-rating-solid")) {
    return [];
  }
  type Frame = {
    tagName: string;
    start: number;
    solidStarCount: number;
    productAnchorCount: number;
  };
  type Candidate = { start: number; end: number };
  const stack: Frame[] = [];
  const candidates: Candidate[] = [];
  const tokenPattern = /<\/?([a-z][\w:-]*)\b[^>]*>/giu;
  for (const match of html.matchAll(tokenPattern)) {
    const token = match[0];
    const tagName = match[1].toLocaleLowerCase();
    const tokenIndex = match.index ?? 0;
    if (token.startsWith("</")) {
      let frameIndex = stack.length - 1;
      while (frameIndex >= 0 && stack[frameIndex].tagName !== tagName) {
        frameIndex -= 1;
      }
      if (frameIndex < 0) continue;
      const [frame] = stack.splice(frameIndex, 1);
      const end = tokenIndex + token.length;
      if ((frame.solidStarCount === 1 || frame.solidStarCount === 5) && frame.productAnchorCount > 0) {
        candidates.push({ start: frame.start, end });
      }
      const parent = stack.at(-1);
      if (parent) {
        parent.solidStarCount += frame.solidStarCount;
        parent.productAnchorCount += frame.productAnchorCount;
      }
      continue;
    }

    const classes = attribute(token, "class")?.split(/\s+/u) ?? [];
    const frame: Frame = {
      tagName,
      start: tokenIndex,
      solidStarCount: classes.includes("icon-rating-solid") ? 1 : 0,
      productAnchorCount: tagName === "a" && isProductUrl(attribute(token, "href")) ? 1 : 0
    };
    if (/^(?:img|source|br|hr|input|meta|link)$/u.test(tagName) || token.endsWith("/>")) {
      const parent = stack.at(-1);
      if (parent) {
        parent.solidStarCount += frame.solidStarCount;
        parent.productAnchorCount += frame.productAnchorCount;
      }
      continue;
    }
    stack.push(frame);
  }

  const selected: Candidate[] = [];
  for (const candidate of candidates.sort((left, right) => (left.end - left.start) - (right.end - right.start))) {
    if (selected.some((item) => candidate.start <= item.start && candidate.end >= item.end)) {
      continue;
    }
    selected.push(candidate);
  }
  return selected
    .sort((left, right) => left.start - right.start)
    .map((candidate) => html.slice(candidate.start, candidate.end));
}

function firstAnchorMatching(html: string, predicate: (value?: string) => boolean): string {
  const pattern = /<a\b[^>]*>/giu;
  for (const match of html.matchAll(pattern)) {
    if (!predicate(attribute(match[0], "href"))) continue;
    return balancedElement(html, match.index ?? 0, "a", match[0]);
  }
  return "";
}

function isProductUrl(value?: string): boolean {
  return Boolean(value && /(?:-i\.\d+\.\d+|\/product\/|[?&]itemid=)/iu.test(value));
}

function isReviewerUrl(value?: string): boolean {
  return Boolean(value && /\/(?:shop|buyer)\/\d+/iu.test(value));
}

function firstMeaningfulProductLine(value: string): string {
  return value.split("\n").find((line) =>
    Boolean(line.trim()) &&
    !/^(?:variation|variasi)\s*:/iu.test(line) &&
    !/^(?:helpful\??|report abuse)$/iu.test(line)
  )?.trim() ?? "";
}

function productVariationFromText(value: string): string | undefined {
  return value.split("\n").find((line) => /^(?:variation|variasi)\s*:/iu.test(line))?.trim();
}

function timestampFromText(value: string): string | undefined {
  return value.split("\n").find((line) => /\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}(?:\s+\d{1,2}:\d{2})?/u.test(line))?.trim();
}

function sellerResponseFromText(value: string, productTitle?: string): string {
  const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
  const labelIndex = lines.findIndex((line) => /^(?:seller'?s? response|respons?(?:e)? penjual|tanggapan penjual)\s*:?$/iu.test(line));
  if (labelIndex < 0) return "";
  const productLead = productTitle?.split("\n")[0]?.trim();
  const responseLines = lines.slice(labelIndex + 1);
  const stopIndex = responseLines.findIndex((line) =>
    /^(?:helpful\??|report abuse|laporkan penyalahgunaan)$/iu.test(line) ||
    Boolean(productLead && line === productLead)
  );
  return responseLines.slice(0, stopIndex >= 0 ? stopIndex : undefined).join("\n");
}

function commentFromText(
  value: string,
  context: {
    reviewer: string;
    capturedAt?: string;
    sellerResponse?: string;
    productTitle?: string;
    productVariation?: string;
  }
): string {
  const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
  const timestampIndex = context.capturedAt ? lines.indexOf(context.capturedAt) : -1;
  const startIndex = timestampIndex >= 0 ? timestampIndex + 1 : 0;
  const productLead = context.productTitle?.split("\n")[0]?.trim();
  const endIndex = lines.findIndex((line, index) => index >= startIndex && (
    /^(?:seller'?s? response|respons?(?:e)? penjual|tanggapan penjual)\s*:?$/iu.test(line) ||
    Boolean(productLead && line === productLead)
  ));
  return lines
    .slice(startIndex, endIndex >= 0 ? endIndex : undefined)
    .filter((line) => line !== context.reviewer)
    .filter((line) => line !== context.productVariation)
    .filter((line) => line !== context.sellerResponse)
    .filter((line) => !/^(?:helpful\??|report abuse|laporkan penyalahgunaan)$/iu.test(line))
    .join("\n");
}

function mediaTags(html: string): string[] {
  return Array.from(html.matchAll(/<(?:img|video|source)\b[^>]*>/giu), (match) => match[0]);
}

function meaningfulLength(value: string): number {
  return value.replace(/\s+/gu, " ").trim().length;
}

function srcsetUrls(value?: string): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/u)[0])
    .filter(Boolean)
    .reverse();
}

function normalizeRatingMediaUrl(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  try {
    const url = new URL(value);
    url.hash = "";
    url.pathname = url.pathname.replace(/@resize_[^/?#]+(?:\.(?:webp|jpe?g|png))?$/iu, "");
    return url.toString();
  } catch {
    return value;
  }
}

function elementsByClass(html: string, className: string): string[] {
  const output: string[] = [];
  let cursor = 0;
  while (cursor < html.length) {
    const opening = nextOpeningTagWithClass(html, className, cursor);
    if (!opening) {
      break;
    }
    const element = balancedElement(html, opening.index, opening.tagName, opening.openingTag);
    if (!element) {
      cursor = opening.index + opening.openingTag.length;
      continue;
    }
    output.push(element);
    cursor = opening.index + element.length;
  }
  return output;
}

function firstElementByClass(html: string, className: string): string {
  const opening = nextOpeningTagWithClass(html, className, 0);
  return opening
    ? balancedElement(html, opening.index, opening.tagName, opening.openingTag)
    : "";
}

function nextOpeningTagWithClass(
  html: string,
  className: string,
  fromIndex: number
): { index: number; tagName: string; openingTag: string } | undefined {
  const openingTagPattern = /<([a-z][\w:-]*)\b[^>]*>/giu;
  openingTagPattern.lastIndex = fromIndex;
  for (const match of html.matchAll(openingTagPattern)) {
    const classes = attribute(match[0], "class")?.split(/\s+/u) ?? [];
    if (classes.includes(className)) {
      return {
        index: match.index ?? 0,
        tagName: match[1],
        openingTag: match[0]
      };
    }
  }
  return undefined;
}

function balancedElement(html: string, start: number, tagName: string, openingTag: string): string {
  if (/^(?:img|source|br|hr|input|meta|link)$/iu.test(tagName) || /\/>\s*$/u.test(openingTag)) {
    return openingTag;
  }
  const tagPattern = new RegExp("</?" + escapeRegex(tagName) + "\\b[^>]*>", "giu");
  tagPattern.lastIndex = start;
  let depth = 0;
  for (const match of html.matchAll(tagPattern)) {
    const token = match[0];
    if (token.startsWith("</")) {
      depth -= 1;
      if (depth === 0) {
        return html.slice(start, (match.index ?? start) + token.length);
      }
      continue;
    }
    if (!token.endsWith("/>")) {
      depth += 1;
    }
  }
  return "";
}

function countClass(html: string, className: string): number {
  let count = 0;
  for (const match of html.matchAll(/<[a-z][\w:-]*\b[^>]*>/giu)) {
    const classes = attribute(match[0], "class")?.split(/\s+/u) ?? [];
    if (classes.includes(className)) {
      count += 1;
    }
  }
  return count;
}

function attribute(html: string, name: string): string | undefined {
  if (!html) {
    return undefined;
  }
  const quoted = html.match(new RegExp("\\b" + escapeRegex(name) + "\\s*=\\s*([\"'])([\\s\\S]*?)\\1", "iu"));
  const value = quoted?.[2] ?? html.match(new RegExp("\\b" + escapeRegex(name) + "\\s*=\\s*([^\\s>]+)", "iu"))?.[1];
  return value ? decodeHtmlEntities(value.trim()) : undefined;
}

function textFromHtml(html: string): string {
  if (!html) {
    return "";
  }
  return decodeHtmlEntities(html
    .replace(/<(?:script|style|noscript)\b[\s\S]*?<\/(?:script|style|noscript)>/giu, "")
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<\/(?:div|p|li|section|h1|h2|h3|h4)>/giu, "\n")
    .replace(/<[^>]+>/gu, ""))
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/gu, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function semanticTextFromHtml(html: string): string {
  if (!html) return "";
  return decodeHtmlEntities(html
    .replace(/<(?:script|style|noscript)\b[\s\S]*?<\/(?:script|style|noscript)>/giu, "")
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<\/(?:a|article|div|footer|header|li|p|section|span|strong|time)>/giu, "\n")
    .replace(/<[^>]+>/gu, ""))
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/gu, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function sanitizeReviewText(value: string): string {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(?:helpful\??|membantu\??|report abuse|laporkan penyalahgunaan|like|share)$/iu.test(line))
    .join("\n")
    .slice(0, 900);
}

function sanitizeSellerResponse(value: string): string | undefined {
  const output = value
    .replace(/^(?:seller'?s? response|respons?(?:e)? penjual|tanggapan penjual)\s*:?\s*/iu, "")
    .replace(/\b(?:helpful\??|report abuse|laporkan penyalahgunaan)\b[\s\S]*$/iu, "")
    .trim()
    .slice(0, 1200);
  return output || undefined;
}

function absoluteShopeeUrl(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  try {
    return new URL(value, "https://shopee.co.id").toString();
  } catch {
    return undefined;
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/giu, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/gu, (_match, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&quot;/giu, "\"")
    .replace(/&#39;|&apos;/giu, "'");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^$(){}|[\]\\]/gu, "\\$&");
}
