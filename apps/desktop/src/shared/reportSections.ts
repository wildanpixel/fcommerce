export const REPORT_SECTION_ORDER = [
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
  "aiRecommendations"
] as const;

export type ReportSectionId = (typeof REPORT_SECTION_ORDER)[number];

export type ReportSectionConfig = {
  id: ReportSectionId;
  label: string;
  enabled: boolean;
  requiredEvidence: string[];
};

export const DEFAULT_REPORT_SECTIONS: ReportSectionConfig[] = [
  {
    id: "cover",
    label: "Cover",
    enabled: true,
    requiredEvidence: ["keyword", "marketplace", "generatedAt"]
  },
  {
    id: "keywordRelevance",
    label: "Keyword General Relevance",
    enabled: true,
    requiredEvidence: ["searchResultScreenshot", "productGrid"]
  },
  {
    id: "topSales",
    label: "Top Sales Search Result",
    enabled: true,
    requiredEvidence: ["topSalesScreenshot", "rankedProducts"]
  },
  {
    id: "keyProductTable",
    label: "Key Product Structured Table",
    enabled: true,
    requiredEvidence: ["rank", "selectionReason", "productType", "monthlySold", "storeType"]
  },
  {
    id: "productDossiers",
    label: "Product Dossiers",
    enabled: true,
    requiredEvidence: ["productPage", "slides", "description", "specifications"]
  },
  {
    id: "reviewEvidence",
    label: "Review And User Media Evidence",
    enabled: true,
    requiredEvidence: ["positiveReviews", "negativeReviews", "userMedia"]
  },
  {
    id: "storeOverview",
    label: "Key Store Selection",
    enabled: true,
    requiredEvidence: ["storeSelectionCriteria", "storeSummary"]
  },
  {
    id: "storeDossiers",
    label: "Store Homepage And Product Matrix",
    enabled: true,
    requiredEvidence: ["storeHomepage", "vouchers", "featuredProducts", "bestSellers"]
  },
  {
    id: "visualStyle",
    label: "Visual Style And Store Banners",
    enabled: true,
    requiredEvidence: ["bannerScreenshots", "creativeAssets"]
  },
  {
    id: "crossPlatformEvidence",
    label: "Cross Platform Evidence",
    enabled: true,
    requiredEvidence: ["socialAccounts", "mobileScreenshots"]
  },
  {
    id: "aiRecommendations",
    label: "AI Structured Recommendations",
    enabled: true,
    requiredEvidence: ["structuredAnalysisJson"]
  }
];
