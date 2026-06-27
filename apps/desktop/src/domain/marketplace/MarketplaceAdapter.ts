import type {
  KeywordCollectionResult,
  MarketplaceCapability,
  ProductCollectionRequest,
  ProductCollectionResult,
  SearchRequest,
  StoreCollectionRequest,
  StoreCollectionResult
} from "../models.js";
import type { MarketplaceId } from "../../shared/contracts.js";

export type CollectionMethod =
  | "desktop-web"
  | "android-emulator"
  | "browser-automation"
  | "ocr"
  | "vision-ai";

export type CollectionPlan = {
  marketplace: MarketplaceId;
  keyword: string;
  country: string;
  language: string;
  preferredMethods: CollectionMethod[];
  automatic: boolean;
};

export interface MarketplaceAdapter {
  readonly id: MarketplaceId;
  readonly displayName: string;
  readonly baseUrl: string;
  readonly capabilities: MarketplaceCapability;
  searchKeyword(request: SearchRequest): Promise<KeywordCollectionResult>;
  collectProduct(request: ProductCollectionRequest): Promise<ProductCollectionResult>;
  collectStore(request: StoreCollectionRequest): Promise<StoreCollectionResult>;
  normalizeUrl(url: string): string;
}

export interface AndroidAutomationAdapter {
  readonly id: "android-studio-emulator" | "genymotion" | "adb-device";
  readonly displayName: string;
  isAvailable(): Promise<boolean>;
  start(): Promise<void>;
  captureScreenshot(label: string): Promise<string>;
  extractVisibleText(): Promise<string>;
  stop(): Promise<void>;
}

export class MarketplaceFeatureUnavailableError extends Error {
  constructor(
    public readonly marketplace: MarketplaceId,
    public readonly feature: string
  ) {
    super(`${marketplace} adapter does not support ${feature} in this build.`);
    this.name = "MarketplaceFeatureUnavailableError";
  }
}
