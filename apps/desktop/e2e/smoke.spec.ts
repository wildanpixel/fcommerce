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

  await page.getByRole("button", { name: "Expand browser" }).click();
  const fullscreen = page.locator(".mio-browser-fullscreen");
  await expect(fullscreen).toBeVisible();
  const fullscreenBox = await fullscreen.boundingBox();
  const viewport = page.viewportSize();

  expect(fullscreenBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(Math.round(fullscreenBox?.x ?? -1)).toBe(0);
  expect(Math.round(fullscreenBox?.y ?? -1)).toBe(0);
  expect(Math.round(fullscreenBox?.width ?? -1)).toBe(viewport?.width);
  expect(Math.round(fullscreenBox?.height ?? -1)).toBe(viewport?.height);

  const webviewBox = await page.locator("webview").boundingBox();
  expect(webviewBox).not.toBeNull();
  expect(Math.round(webviewBox?.height ?? -1)).toBe(viewport?.height);
  const internalFrameHeight = await page.locator("webview").evaluate((node) => {
    const frame = node.shadowRoot?.querySelector("iframe") as HTMLIFrameElement | null;
    return frame?.style.height ?? "";
  });
  if (internalFrameHeight) {
    expect(internalFrameHeight).toBe("100%");
  }

  const exitButtonBox = await page.getByRole("button", { name: "Exit fullscreen" }).boundingBox();
  expect(exitButtonBox).not.toBeNull();
  expect(Math.round(exitButtonBox?.width ?? -1)).toBe(Math.round(exitButtonBox?.height ?? -2));
});

test("shows TikTok as a coming-soon platform", async ({ page }) => {
  await page.goto(e2eApiOverride);
  await page.getByRole("button", { name: /Create Analysis/ }).click();
  const tiktokButton = page.getByRole("button", { name: /TIKTOK SHOP/ });

  await expect(tiktokButton).toBeVisible();
  await expect(tiktokButton).toBeDisabled();
  await expect(tiktokButton).toContainText("Coming soon");
});
