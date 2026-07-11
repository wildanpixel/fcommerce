import { expect, test } from "@playwright/test";

const e2eApiPort = process.env.MIO_E2E_API_PORT ?? "4223";
const e2eApiOverride = `/?apiBaseUrl=${encodeURIComponent(`http://127.0.0.1:${e2eApiPort}/api`)}`;

test("renders the guided manual analysis flow", async ({ page }) => {
  await page.goto(e2eApiOverride);
  await expect(page.getByRole("button", { name: "Hide sidebar" })).toBeVisible();
  await page.getByRole("button", { name: "Hide sidebar" }).click();
  await expect(page.getByRole("button", { name: "Show sidebar" })).toBeVisible();
  await page.getByRole("button", { name: "Show sidebar" }).click();
  await expect(page.getByRole("button", { name: /Create Analysis/ })).toBeVisible();
  await page.getByRole("button", { name: /Create Analysis/ }).click();
  await expect(page.getByLabel("Desired Keyword")).toBeVisible();
  await expect(page.getByLabel("Product Category")).toBeVisible();
  await expect(page.getByRole("button", { name: "SHOPEE" })).toBeVisible();
  await expect(page.getByRole("button", { name: "TIKTOK SHOP" })).toBeVisible();
  await page.getByLabel("Desired Keyword").fill("bulu mata palsu");
  await page.getByLabel("Product Category").fill("false eyelashes");
  await page.getByRole("button", { name: /Proceed to Browser/ }).click();
  await expect(page.getByText("Platform Browser")).toBeVisible();
  await expect(page.getByText(/Step 1\/\d+/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Expand collector" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Dark" })).toBeVisible();
});

test("shows TikTok as a coming-soon platform", async ({ page }) => {
  await page.goto(e2eApiOverride);
  await page.getByRole("button", { name: /Create Analysis/ }).click();
  const tiktokButton = page.getByRole("button", { name: /TIKTOK SHOP/ });

  await expect(tiktokButton).toBeVisible();
  await expect(tiktokButton).toBeDisabled();
  await expect(tiktokButton).toContainText("Coming soon");
});
