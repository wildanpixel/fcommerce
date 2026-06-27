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

export class MarketplaceFeatureUnavailableError extends Error {
  constructor(
    public readonly marketplace: MarketplaceId,
    public readonly feature: string
  ) {
    super(`${marketplace} adapter does not support ${feature} in this build.`);
    this.name = "MarketplaceFeatureUnavailableError";
  }
}
