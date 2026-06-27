import { expect, test } from "@playwright/test";

test("renders the desktop dashboard shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Marketplace Intelligence OS").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Research/i })).toBeVisible();
});
