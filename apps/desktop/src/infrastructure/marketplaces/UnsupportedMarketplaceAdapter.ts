import type { MarketplaceAdapter } from "../../domain/marketplace/MarketplaceAdapter.js";
import { MarketplaceFeatureUnavailableError } from "../../domain/marketplace/MarketplaceAdapter.js";
import type {
  KeywordCollectionResult,
  MarketplaceCapability,
  ProductCollectionRequest,
  ProductCollectionResult,
  SearchRequest,
  StoreCollectionRequest,
  StoreCollectionResult
} from "../../domain/models.js";
import type { MarketplaceId } from "../../shared/contracts.js";

const unavailableCapabilities: MarketplaceCapability = {
  searchKeyword: false,
  topSalesSort: false,
  productDetail: false,
  storeDetail: false,
  reviews: false,
  userMedia: false,
  voucherCapture: false,
  mobileEvidence: false
};

export class UnsupportedMarketplaceAdapter implements MarketplaceAdapter {
  readonly baseUrl = "";
  readonly capabilities = unavailableCapabilities;

  constructor(
    readonly id: MarketplaceId,
    readonly displayName: string
  ) {}

  async searchKeyword(_request: SearchRequest): Promise<KeywordCollectionResult> {
    throw new MarketplaceFeatureUnavailableError(this.id, "keyword search");
  }

  async collectProduct(_request: ProductCollectionRequest): Promise<ProductCollectionResult> {
    throw new MarketplaceFeatureUnavailableError(this.id, "product collection");
  }

  async collectStore(_request: StoreCollectionRequest): Promise<StoreCollectionResult> {
    throw new MarketplaceFeatureUnavailableError(this.id, "store collection");
  }

  normalizeUrl(url: string): string {
    return url;
  }
}
