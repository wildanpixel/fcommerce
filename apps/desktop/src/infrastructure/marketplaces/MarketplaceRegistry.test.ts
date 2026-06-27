import { describe, expect, it } from "vitest";
import { DefaultMarketplaceRegistry } from "./MarketplaceRegistry.js";

describe("DefaultMarketplaceRegistry", () => {
  it("registers Shopee as the enabled V1 marketplace", () => {
    const registry = new DefaultMarketplaceRegistry();
    const marketplaces = registry.list();
    expect(marketplaces.find((marketplace) => marketplace.id === "SHOPEE_ID")?.enabled).toBe(true);
  });

  it("keeps future marketplaces behind disabled adapters", () => {
    const registry = new DefaultMarketplaceRegistry();
    const disabled = registry.list().filter((marketplace) => marketplace.id !== "SHOPEE_ID");
    expect(disabled.every((marketplace) => marketplace.enabled === false)).toBe(true);
  });
});
