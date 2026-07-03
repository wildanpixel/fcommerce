import type { MarketplaceId } from "../shared/contracts.js";

export type MoneyRange = {
  min?: number;
  max?: number;
  average?: number;
  original?: number;
  currency: "IDR" | "USD" | "UNKNOWN";
};

export type MarketplaceCapability = {
  searchKeyword: boolean;
  topSalesSort: boolean;
  productDetail: boolean;
  storeDetail: boolean;
  reviews: boolean;
  userMedia: boolean;
  voucherCapture: boolean;
  mobileEvidence: boolean;
};

export type ProductCard = {
  marketplace: MarketplaceId;
  marketplaceProductId?: string;
  rank: number;
  source?: string;
  selectionReason?: string;
  title: string;
  url: string;
  imageUrl?: string;
  price: MoneyRange;
  discount?: string;
  rating?: number;
  reviewCount?: number;
  monthlySold?: number;
  totalSold?: number;
  storeName?: string;
  storeUrl?: string;
  mallStatus: boolean;
  officialStatus: boolean;
  starSeller: boolean;
  raw: Record<string, unknown>;
};

export type ProductDetail = ProductCard & {
  stock?: number;
  voucherText?: string;
  shippingText?: string;
  variants: string[];
  description?: string;
  specifications: Record<string, string>;
  images: string[];
  videos: string[];
};

export type StoreProfile = {
  marketplace: MarketplaceId;
  marketplaceStoreId?: string;
  name: string;
  url: string;
  followers?: number;
  following?: number;
  productsCount?: number;
  rating?: number;
  ratingCount?: number;
  chatResponse?: string;
  joinedDate?: string;
  categories: string[];
  voucherCount?: number;
  voucherTypes: string[];
  featuredProducts: ProductCard[];
  bestSellers: ProductCard[];
  visualTheme: {
    dominantColors: string[];
    typographySignals: string[];
    bannerStyle: string[];
  };
  raw: Record<string, unknown>;
};

export type ReviewEvidence = {
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  rating?: number;
  comment: string;
  variation?: string;
  reviewDate?: string;
  mediaUrls: string[];
  raw: Record<string, unknown>;
};

export type ScreenshotEvidence = {
  kind:
    | "SEARCH_RESULT"
    | "TOP_SALES"
    | "PRODUCT_PAGE"
    | "PRODUCT_IMAGE"
    | "PRODUCT_VIDEO"
    | "PRODUCT_DESCRIPTION"
    | "REVIEW_SECTION"
    | "REVIEW_IMAGE"
    | "STORE_HOME"
    | "STORE_VOUCHER"
    | "STORE_BANNER"
    | "STORE_FEATURED_PRODUCTS"
    | "STORE_BEST_SELLER"
    | "STORE_PROMOTION"
    | "SOCIAL_ACCOUNT";
  label: string;
  path: string;
  sourceUrl?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  metadata?: Record<string, unknown>;
};

export type SearchRequest = {
  keyword: string;
  limit: number;
  sort: "RELEVANCE" | "TOP_SALES";
  projectFolder: string;
  captureScreenshots: boolean;
};

export type ProductCollectionRequest = {
  product: ProductCard;
  projectFolder: string;
  collectReviews: boolean;
  captureScreenshots: boolean;
};

export type StoreCollectionRequest = {
  storeUrl: string;
  projectFolder: string;
  captureScreenshots: boolean;
};

export type KeywordCollectionResult = {
  products: ProductCard[];
  screenshots: ScreenshotEvidence[];
  warnings: string[];
};

export type ProductCollectionResult = {
  detail: ProductDetail;
  reviews: ReviewEvidence[];
  screenshots: ScreenshotEvidence[];
  warnings: string[];
};

export type StoreCollectionResult = {
  store: StoreProfile;
  screenshots: ScreenshotEvidence[];
  warnings: string[];
};

export type AiAnalysisJson = {
  schemaVersion: "1.0";
  subjectType: "PROJECT" | "PRODUCT" | "STORE" | "REVIEW_SET" | "CREATIVE_SET";
  subjectId?: string;
  provider: string;
  confidence: number;
  branding: {
    score: number;
    observations: string[];
  };
  visualQuality: {
    score: number;
    observations: string[];
  };
  voucherStrategy: {
    score: number;
    observations: string[];
  };
  competitivePosition: {
    score: number;
    observations: string[];
  };
  customerTrust: {
    score: number;
    observations: string[];
  };
  painPoints: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: Array<{
    priority: "HIGH" | "MEDIUM" | "LOW";
    action: string;
    rationale: string;
  }>;
  automationLimitations: string[];
};
