import { expect, test } from "@playwright/test";

const e2eApiPort = process.env.MIO_E2E_API_PORT ?? "4223";
const e2eApiOverride = `/?apiBaseUrl=${encodeURIComponent(`http://127.0.0.1:${e2eApiPort}/api`)}`;

test.describe.configure({ mode: "serial" });

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

  const toolbarBox = await page.locator(".mio-browser-toolbar").boundingBox();
  const browserFrameBox = await page.locator(".mio-browser-frame").boundingBox();
  const webviewBox = await page.locator("webview").boundingBox();
  expect(toolbarBox).not.toBeNull();
  expect(browserFrameBox).not.toBeNull();
  expect(webviewBox).not.toBeNull();
  expect(Math.round(browserFrameBox?.y ?? -1)).toBeGreaterThanOrEqual(Math.round((toolbarBox?.y ?? 0) + (toolbarBox?.height ?? 0)));
  expect(Math.round(webviewBox?.height ?? -1)).toBe(Math.round(browserFrameBox?.height ?? -2));
  expect(Math.round((browserFrameBox?.y ?? 0) + (browserFrameBox?.height ?? 0))).toBe(viewport?.height);
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

test("keeps New Research inputs responsive after deleting a project", async ({ page }) => {
  const projectName = `delete-input-regression-${Date.now()}`;
  await page.goto(e2eApiOverride);
  await page.getByRole("button", { name: /Create Analysis/ }).click();
  await page.getByLabel("Desired Keyword").fill(projectName);
  await page.getByLabel("Product Category").fill("regression test");
  await page.getByRole("button", { name: /Proceed to Browser/ }).click();
  await expect(page.getByText("Platform Browser")).toBeVisible();

  await page.getByRole("button", { name: "Back to Projects" }).click();
  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue Collection" })).toBeVisible();
  await page.getByRole("button", { name: "Back to Projects" }).click();
  await expect(page.getByText("Keyword Projects", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: `Delete ${projectName}` }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Project name confirmation").fill(projectName);
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "New Research" }).click();
  await page.getByRole("button", { name: /Create Analysis/ }).click();
  const keywordInput = page.getByLabel("Desired Keyword");
  await keywordInput.fill("responsive after deletion");
  await expect(keywordInput).toHaveValue("responsive after deletion");
});

test("exposes the category-based bulk report workflow", async ({ page }) => {
  const projectName = `bulk-report-${Date.now()}`;
  await page.goto(e2eApiOverride);
  await page.getByRole("button", { name: /Create Analysis/ }).click();
  await page.getByLabel("Desired Keyword").fill(projectName);
  await page.getByLabel("Product Category").fill("bulk report category");
  await page.getByRole("button", { name: /Proceed to Browser/ }).click();
  await expect(page.getByText("Platform Browser")).toBeVisible();
  await page.getByRole("button", { name: "Reports" }).click();
  await page.getByRole("button", { name: "Bulk Report", exact: true }).click();
  await expect(page.getByText("Bulk Report Generation")).toBeVisible();

  await page.locator("select").first().selectOption("bulk report category");
  await page.getByRole("button", { name: /Next/ }).click();
  await page.getByRole("button", { name: "Select all" }).click();
  await page.getByRole("button", { name: /Next/ }).click();
  await expect(page.getByRole("button", { name: "PDF", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Next/ }).click();
  await expect(page.getByRole("button", { name: "Generate ZIP" })).toBeVisible();
});

test("synchronizes each project outline section with its report disclosure", async ({ page }) => {
  const projectName = `outline-disclosure-${Date.now()}`;
  await page.goto(e2eApiOverride);
  await page.getByRole("button", { name: /Create Analysis/ }).click();
  await page.getByLabel("Desired Keyword").fill(projectName);
  await page.getByLabel("Product Category").fill("inspector regression");
  await page.getByRole("button", { name: /Proceed to Browser/ }).click();
  await page.getByRole("button", { name: "Back to Projects" }).click();

  const keywordGeneral = page.locator("#keyword-general");
  const relevance = page.locator("#keyword-relevance");
  const outlineKeywordGeneral = page.locator(".mio-inspector-nav summary").filter({ hasText: /^Keyword General$/ });
  await expect(page.getByRole("button", { name: "Hide project outline" })).toBeVisible();
  await expect(keywordGeneral).not.toHaveAttribute("open", "");
  await expect(outlineKeywordGeneral.locator("..")).not.toHaveAttribute("open", "");

  await outlineKeywordGeneral.click();
  await expect(keywordGeneral).toHaveAttribute("open", "");
  await expect(outlineKeywordGeneral.locator("..")).toHaveAttribute("open", "");
  await expect(relevance).not.toHaveAttribute("open", "");

  await page.locator('.mio-inspector-nav a[href="#keyword-relevance"]').click();
  await expect(relevance).toHaveAttribute("open", "");

  await outlineKeywordGeneral.click();
  await expect(outlineKeywordGeneral.locator("..")).not.toHaveAttribute("open", "");
  await expect(keywordGeneral).toHaveAttribute("data-expanded", "false");
  await expect(keywordGeneral).not.toHaveAttribute("open", "");
  await expect(relevance).toHaveCount(0);

  await outlineKeywordGeneral.click();
  await expect(keywordGeneral).toHaveAttribute("open", "");
  await expect(relevance).toHaveCount(1);
  await expect(relevance).not.toHaveAttribute("open", "");
  await page.getByRole("button", { name: "Hide project outline" }).click();
  await expect(page.getByRole("button", { name: "Show project outline" })).toBeVisible();
  await expect(keywordGeneral).toHaveAttribute("open", "");
  await page.getByRole("button", { name: "Show project outline" }).click();
  await expect(keywordGeneral).toHaveAttribute("open", "");
});
