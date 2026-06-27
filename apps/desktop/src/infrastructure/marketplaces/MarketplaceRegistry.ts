import type { MarketplaceAdapterRegistry, SettingsRepository } from "../../domain/repositories.js";
import type { MarketplaceAdapter } from "../../domain/marketplace/MarketplaceAdapter.js";
import { ShopeeAdapter } from "./shopee/ShopeeAdapter.js";
import { UnsupportedMarketplaceAdapter } from "./UnsupportedMarketplaceAdapter.js";

export class DefaultMarketplaceRegistry implements MarketplaceAdapterRegistry {
  private readonly adapters: MarketplaceAdapter[];

  constructor(settings?: Pick<SettingsRepository, "get">, shopee = new ShopeeAdapter(undefined, settings)) {
    this.adapters = [
      shopee,
      new UnsupportedMarketplaceAdapter("TIKTOK_SHOP", "TikTok Shop"),
      new UnsupportedMarketplaceAdapter("TOKOPEDIA", "Tokopedia"),
      new UnsupportedMarketplaceAdapter("LAZADA", "Lazada"),
      new UnsupportedMarketplaceAdapter("AMAZON", "Amazon"),
      new UnsupportedMarketplaceAdapter("ALIBABA", "Alibaba")
    ];
  }

  get(id: MarketplaceAdapter["id"]): MarketplaceAdapter {
    const adapter = this.adapters.find((candidate) => candidate.id === id);
    if (!adapter) {
      throw new Error(`Marketplace adapter ${id} is not registered.`);
    }
    return adapter;
  }

  list(): Array<{
    id: MarketplaceAdapter["id"];
    displayName: string;
    enabled: boolean;
    capabilities: Record<string, boolean>;
  }> {
    return this.adapters.map((adapter) => ({
      id: adapter.id,
      displayName: adapter.displayName,
      enabled: adapter.capabilities.searchKeyword,
      capabilities: adapter.capabilities
    }));
  }
}
