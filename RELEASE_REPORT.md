# Marketplace Intelligence OS - Release Report

Release date: 2026-07-07
Version: 1.0.0
Local platform: Windows
Release task: full-page screenshot capture, focused Shopee extraction, and Key Product table processing

## Summary

This release corrects the Shopee M1/M2 collection flow. Screenshots are captured as full-page stitched images and previewed without scrolling, Shopee extraction focuses on the inner content area under `#main`, and Keyword General Step 3 now builds the Key Product table instead of saving redundant screenshot evidence.

## Completed

- Added three collection phases: Part 1 Keyword General, Part 2 Product Details, and Part 3 Evaluation/Key Store.
- Added Save/Pause collection state on projects, including stage, completed steps, browser URL, view mode, and percentage.
- Added project-list progress display showing saved collection stage and completion percentage.
- Added explicit `Inspect` and `Continue Collection` actions to project cards.
- Added saved collection progress and `Continue Collection` to the project inspector so users can resume from the current saved state after inspecting data.
- Added top-center browser status for `targeted page received`, `downloading HTML`, success, failure, and manual `Download HTML`.
- Changed HTML snapshots to prioritize `div#main`, then `main`, then body, and format output across multiple lines.
- Changed Shopee browser partition from per-project to persistent marketplace session so login/cache state survives project switches and app restarts.
- Added best-effort WebP thumbnail conversion to local JPG files during evidence save.
- Added full-page stitched screenshot capture with a non-scrolling fit-to-screen crop review modal.
- Changed Keyword General Step 3 into a process-only Key Product table builder.
- Added AI-assisted local key-product selection capped at 10 products before Product Detail Qualified collection starts.
- Improved Shopee product extraction to target the inner content `<div>` below `#main`, prioritize `picture._displayContents_` thumbnails, and persist source placement/product type/store badge signals.
- Focused project inspection on Keyword General, Key Product, and Product Detail Qualified.
- Updated implementation status, roadmap, and changelog.

## Release Checklist

| Step | Result |
| --- | --- |
| Delete `dist` | Completed |
| Delete `dist-node` | Completed |
| Delete `release` | Completed after closing locked packaged app process |
| Generate Prisma | Completed |
| Clean build | Completed |
| Package Electron | Completed |
| Generate Windows Installer | Completed: `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe` |
| Generate Windows Portable | Completed: `apps/desktop/release/Marketplace Intelligence OS Portable 1.0.0.exe` |
| Generate macOS App | Not run locally on Windows; configured for GitHub Actions macOS runner |
| Generate macOS DMG | Not run locally on Windows; configured for GitHub Actions macOS runner |
| Launch packaged application automatically | Completed from `apps/desktop/release/win-unpacked/Marketplace Intelligence OS.exe` |
| Verify UI reflects latest implementation | Completed through packaged `win-unpacked` UI verification; Projects shows Inspect/Continue Collection and inspector opens the dedicated Keyword General/Key Product/Product Detailed Qualified sections |
| Verify packaged application version | Completed: `/api/health` on packaged port `4123` returned version `1.0.0` |
| Update changelog | Completed |
| Commit | Pending at report generation time |
| Push | Pending at report generation time |
| Verify GitHub Actions | Pending after push |

## Local Validation

- `pnpm prisma:generate`: passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm test`: passed, 5 files and 12 tests.
- `pnpm test:e2e`: passed, 2 Playwright tests.
- `pnpm build`: passed.
- `pnpm --filter @marketplace-intelligence-os/desktop exec electron-builder --win --x64`: passed.
- Packaged app launched from `win-unpacked` and responded on `/api/health` port `4123` with `{"ok":true,"product":"Marketplace Intelligence OS","version":"1.0.0"}`.
- Packaged `/api/dashboard` returned 30 projects, 211 products, and 2 generated reports, confirming Prisma-backed queries execute in the packaged runtime.
- Packaged UI verification confirmed Projects shows saved stage/progress plus `Inspect` and `Continue Collection`.
- Packaged inspector verification confirmed saved collection progress is visible and the inspector is focused on Keyword General, Key Product, and Product Detailed Qualified.
- Built renderer verification confirmed the packaged bundle contains `Build Key Product Table`, `Start Collect Product Detail`, full-page screenshot preview copy, Product Type/Store Type columns, and `_displayContents_` extraction logic.

## Generated Artifacts

- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe`
- `apps/desktop/release/Marketplace Intelligence OS Portable 1.0.0.exe`
- `apps/desktop/release/win-unpacked/Marketplace Intelligence OS.exe`
- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe.blockmap`

Artifact sizes:

- Setup installer: 146.39 MB.
- Portable executable: 146.17 MB.
- Unpacked executable: 191.91 MB.

## Remaining Notes

- macOS artifacts must be verified on the GitHub Actions macOS runner.
- Shopee and TikTok anti-bot/login/verification flows remain user-controlled by design; the app does not bypass marketplace protections.
- WebP-to-JPG thumbnail conversion is best-effort and falls back to original URLs when the marketplace CDN blocks image fetching.
- Product slide/video extraction remains heuristic when Shopee hides media from browser-readable HTML.
- TikTok Shop adapter remains stubbed; Android evidence capture exists, but TikTok Shop navigation is user-controlled.
