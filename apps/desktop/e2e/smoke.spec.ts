import { expect, test } from "@playwright/test";

test("renders the guided manual analysis flow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Marketplace Intelligence OS").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Create Analysis/ })).toBeVisible();
  await page.getByRole("button", { name: /Create Analysis/ }).click();
  await expect(page.getByLabel("Desired Keyword")).toBeVisible();
  await expect(page.getByLabel("Product Category")).toBeVisible();
  await expect(page.getByRole("button", { name: "SHOPEE" })).toBeVisible();
  await expect(page.getByRole("button", { name: "TIKTOK SHOP" })).toBeVisible();
  await page.getByLabel("Desired Keyword").fill("bulu mata palsu");
  await page.getByLabel("Product Category").fill("false eyelashes");
  await page.getByRole("button", { name: /Proceed to Browser/ }).click();
  await expect(page.getByText("Guided Platform Browser")).toBeVisible();
  await expect(page.getByText("Guided Collection 1/13")).toBeVisible();
  await expect(page.getByRole("button", { name: "Collect This Step" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Light" })).toBeVisible();
});
