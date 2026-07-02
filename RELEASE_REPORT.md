# Marketplace Intelligence OS - Release Report

Release date: 2026-07-02
Version: 1.0.0
Local platform: Windows
Release task: M1/M2 guided rendered-page collection, project inspection, AI evaluation entry, and packaged UI validation

## Summary

This release completes the current M1 product-experience corrections and advances M2/M3 through a safer user-controlled collection model:

- Collection no longer depends on bot-like background crawling for protected Shopee pages.
- The user controls the embedded browser; the app captures the visible rendered page as screenshot, HTML, visible text, optional print-PDF data, and extracted product-card rows.
- Relevance and Top Sales captures populate local product rows with thumbnail, product link, price, discount, rating, sold count, source, and selection reason.
- Product-detail guided steps are generated dynamically from the collected product table.
- Project Inspector now mirrors the report structure through collapsible sections: Keyword General, Key Product, Product Detailed Qualified, Evaluation Phase, Key Store, and TikTok Evidence.
- The embedded browser has zoom in, zoom out, print, screenshot review, crop, save-full, save-selected, and redo controls.
- The generated HTML report is interactive, collapsible, and keeps product links usable.
- Project AI evaluation can be triggered from Project Inspector and persists structured analysis.
- Android tooling discovery now supports sidecar SDK folders through environment variables, packaged resources, or an `android-sdk` folder beside the executable.
- The default app shell is light, readable, and verified in the packaged renderer.

Anti-bot scope remains explicit: the app does not bypass Shopee or TikTok protections. The supported V1 path is user-controlled browsing, rendered-page evidence capture, HTML/text extraction where the page allows it, and manual Android screenshot attachment.

## Files Changed

- `CHANGELOG.md`
- `IMPLEMENTATION_STATUS.md`
- `ROADMAP.md`
- `RELEASE_REPORT.md`
- `apps/desktop/e2e/smoke.spec.ts`
- `apps/desktop/src/api/server.ts`
- `apps/desktop/src/electron/main.ts`
- `apps/desktop/src/infrastructure/android/AndroidToolingService.ts`
- `apps/desktop/src/infrastructure/report/HtmlReportRenderer.ts`
- `apps/desktop/src/infrastructure/repositories/PrismaRepositories.ts`
- `apps/desktop/src/renderer/App.tsx`
- `apps/desktop/src/renderer/api/client.ts`
- `apps/desktop/src/renderer/styles.css`
- `apps/desktop/src/shared/contracts.ts`

## Release Checklist

| Step | Result |
| --- | --- |
| Delete `dist` | Completed |
| Delete `dist-node` | Completed |
| Delete `release` | Completed |
| Generate Prisma | Completed |
| Clean build | Completed |
| Package Electron | Completed |
| Generate Windows Installer | Completed: `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe` |
| Generate Windows Portable | Completed: `apps/desktop/release/Marketplace Intelligence OS Portable 1.0.0.exe` |
| Generate macOS App | Not run locally on Windows; configured for GitHub Actions macOS runner |
| Generate macOS DMG | Not run locally on Windows; configured for GitHub Actions macOS runner |
| Launch packaged application automatically | Completed from `apps/desktop/release/win-unpacked/Marketplace Intelligence OS.exe` |
| Verify UI reflects latest implementation | Completed through Chromium CDP screenshot and DOM inspection |
| Verify packaged application version | Completed: package version `1.0.0` |
| Update changelog | Completed |
| Commit | Pending at report generation time |
| Push | Pending at report generation time |
| Verify GitHub Actions | Pending after push |

## Local Validation

- `pnpm --filter @marketplace-intelligence-os/desktop typecheck`: passed.
- `pnpm --filter @marketplace-intelligence-os/desktop lint`: passed.
- `pnpm --filter @marketplace-intelligence-os/desktop test`: passed, 5 files and 12 tests.
- `pnpm --filter @marketplace-intelligence-os/desktop test:e2e`: passed, 2 Playwright tests.
- `pnpm --filter @marketplace-intelligence-os/desktop prisma:generate`: passed.
- `pnpm --filter @marketplace-intelligence-os/desktop build`: passed.
- `pnpm exec electron-builder --win nsis portable --x64 --publish never`: passed.
- Packaged executable launched and responded.
- Packaged renderer loaded from `app.asar/dist/index.html` with no console, page, or request errors captured during CDP validation.
- Packaged renderer contained `Create Analysis`, `Manual Evidence Collection`, `Projects`, and the readable light-mode sidebar.

## Generated Artifacts

- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe`
- `apps/desktop/release/Marketplace Intelligence OS Portable 1.0.0.exe`
- `apps/desktop/release/win-unpacked/Marketplace Intelligence OS.exe`
- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe.blockmap`

## Remaining Notes

- macOS artifacts must be verified on the GitHub Actions macOS runner.
- Google Play system images and TikTok APKs are not bundled into the installer; production distribution should use sidecar SDK/tooling plus user-installed apps or user-provided APKs.
- OCR and Vision AI extraction from arbitrary screenshots remain future M4/M3 work.
- TikTok Shop adapter remains stubbed; Android evidence capture exists, but TikTok Shop navigation is user-controlled.
