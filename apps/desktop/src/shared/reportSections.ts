export const REPORT_SECTION_ORDER = [
  "keywordGeneral",
  "keyProducts",
  "productDetailFirstPage",
  "productDetailSlides",
  "productDetailDescription",
  "productDetailReviews",
  "productDetailUserMedia",
  "productDetailShopHomePage",
  "keyStoreHomePage",
  "keyStoreData",
  "keyStoreCategories",
  "keyStoreProducts",
  "keyStoreBestSellers",
  "keyStoreVisualStyle",
  "tiktokEvidence",
  "intelligence"
] as const;

export const LEGACY_REPORT_SECTION_IDS = [
  "cover",
  "keywordRelevance",
  "topSales",
  "keyProductTable",
  "productDossiers",
  "reviewEvidence",
  "storeOverview",
  "storeDossiers",
  "visualStyle",
  "crossPlatformEvidence",
  "aiRecommendations",
  "summaryMetrics"
] as const;

export type ReportSectionId = (typeof REPORT_SECTION_ORDER)[number] | (typeof LEGACY_REPORT_SECTION_IDS)[number];

export type ReportSectionConfig = {
  id: ReportSectionId;
  label: string;
  enabled: boolean;
  requiredEvidence: string[];
};

export const REPORT_SECTION_GROUPS = [
  { id: "keyword-general", title: "Keyword General", sectionIds: ["keywordGeneral"] },
  { id: "key-products", title: "Key Product List", sectionIds: ["keyProducts"] },
  {
    id: "product-detail",
    title: "Product Detail",
    sectionIds: [
      "productDetailFirstPage",
      "productDetailSlides",
      "productDetailDescription",
      "productDetailReviews",
      "productDetailUserMedia",
      "productDetailShopHomePage"
    ]
  },
  {
    id: "key-store",
    title: "Key Store",
    sectionIds: [
      "keyStoreHomePage",
      "keyStoreData",
      "keyStoreCategories",
      "keyStoreProducts",
      "keyStoreBestSellers",
      "keyStoreVisualStyle",
      "tiktokEvidence"
    ]
  },
  { id: "intelligence", title: "Keyword Search Analysis", sectionIds: ["intelligence"] }
] as const satisfies ReadonlyArray<{
  id: string;
  title: string;
  sectionIds: readonly ReportSectionId[];
}>;

export type ReportSectionGroupId = (typeof REPORT_SECTION_GROUPS)[number]["id"];

export const DEFAULT_REPORT_SECTIONS: ReportSectionConfig[] = [
  {
    id: "keywordGeneral",
    label: "Keyword General",
    enabled: true,
    requiredEvidence: ["relevanceScreenshot", "topSalesScreenshot", "productGrid"]
  },
  {
    id: "keyProducts",
    label: "Key Product List",
    enabled: true,
    requiredEvidence: ["sourcePlacement", "selectionReason", "productType", "monthlySold", "storeType"]
  },
  {
    id: "productDetailFirstPage",
    label: "Product Detail - 1st page",
    enabled: true,
    requiredEvidence: ["productPageScreenshot"]
  },
  {
    id: "productDetailSlides",
    label: "Product Detail - Slides",
    enabled: true,
    requiredEvidence: ["productImages", "productVideos"]
  },
  {
    id: "productDetailDescription",
    label: "Product Detail - Description",
    enabled: true,
    requiredEvidence: ["descriptionText", "descriptionImages", "shopVouchers", "bundleDeals"]
  },
  {
    id: "productDetailReviews",
    label: "Product Detail - Reviews",
    enabled: true,
    requiredEvidence: ["positiveReviews", "negativeReviews"]
  },
  {
    id: "productDetailUserMedia",
    label: "Product Detail - Media in user",
    enabled: true,
    requiredEvidence: ["reviewImages", "reviewVideos"]
  },
  {
    id: "productDetailShopHomePage",
    label: "Product Detail - Shop Home Page",
    enabled: true,
    requiredEvidence: ["shopHomepageScreenshot"]
  },
  {
    id: "keyStoreHomePage",
    label: "Key Store - Store Home Page",
    enabled: true,
    requiredEvidence: ["shopDecorationScreenshot", "overallConclusion"]
  },
  {
    id: "keyStoreData",
    label: "Key Store - Store Data",
    enabled: true,
    requiredEvidence: ["productsCount", "followers", "rating", "description", "ratingSamples"]
  },
  {
    id: "keyStoreCategories",
    label: "Key Store - Store Product Categories",
    enabled: true,
    requiredEvidence: ["categories"]
  },
  {
    id: "keyStoreProducts",
    label: "Key Store - Popular Products",
    enabled: true,
    requiredEvidence: ["popularProducts", "productGrid"]
  },
  {
    id: "keyStoreBestSellers",
    label: "Key Store - Best Sellers",
    enabled: true,
    requiredEvidence: ["bestSellerProducts", "productGrid"]
  },
  {
    id: "keyStoreVisualStyle",
    label: "Key Store - Visual Shop Banner",
    enabled: true,
    requiredEvidence: ["shopDecorationBanners"]
  },
  {
    id: "tiktokEvidence",
    label: "Key Store - TikTok Evidence",
    enabled: true,
    requiredEvidence: ["tiktokSearch", "tiktokProfile"]
  },
  {
    id: "intelligence",
    label: "Keyword Search Analysis & Top 10 Competition Matrix",
    enabled: true,
    requiredEvidence: ["structuredAnalysisJson"]
  }
];
