# Marketplace Intelligence OS - Release Report

Release date: 2026-07-07
Version: 1.0.0
Local platform: Windows
Release task: guided browser polish, structured Shopee PDP sync, and Product Inspector evidence review

## Summary

This release continues the M1/M2 guided-collection refactor. The embedded browser now uses inline controls, transient Shopee manual-action notices, and a true fullscreen overlay. Key Product rows preserve rendered Shopee rating/sold/store-type strings, Product Detail Qualified captures the visible first viewport, and PDP evidence sync now stores browser-readable images, videos, descriptions, review rows, and user-media URLs.

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
- Fixed crop coordinate mapping for object-fit screenshot previews so selected screenshots match the focused area more accurately.
- Changed Shopee protected/login messaging into a transient notice that auto-hides after 5 seconds and can be reopened from a persistent warning icon.
- Reworked browser fullscreen so the webview fills the viewport while browser controls and the guided collector float above it.
- Moved Desktop/Mobile view switching inline with the browser address and action controls.
- Changed Keyword General Step 3 into a process-only Key Product table builder.
- Added AI-assisted local key-product selection capped at 10 products before Product Detail Qualified collection starts.
- Improved Shopee product extraction to target the inner content `<div>` below `#main`, prioritize `picture._displayContents_` thumbnails, and persist source placement/product type/store badge signals.
- Improved Key Product table display for Product Type, Store Type, Rating, Reviews pending state, Monthly Sold, and Total Sold text.
- Added structured PDP sync for Product Detail Qualified captures: slides/images, videos, description, review rows, review media images, and review media videos.
- Added product videos and Media in User evidence to Project Inspector product dossiers.
- Added cards/list toggle for rendered product evidence under Keyword General.
- Added left-side Project Inspector outline navigation and reduced heavy panel/metric shadows in light mode.
- Prioritized project inspection around Keyword General, Key Product, and Product Detail Qualified while preserving Evaluation Phase, Key Store, and TikTok Evidence below them.
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
| Verify UI reflects latest implementation | Completed through packaged startup plus fresh artifact timestamps; bundle includes the latest browser and inspector implementation from the clean build |
| Verify packaged application version | Completed: `/api/health` on packaged port `4123` returned version `1.0.0` |
| Update changelog | Completed |
| Commit | Completed |
| Push | Completed |
| Verify GitHub Actions | Completed: CI and Build Desktop Artifacts passed on GitHub Actions |

## Local Validation

- `pnpm prisma:generate`: passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm test`: passed, 5 files and 12 tests.
- `pnpm test:e2e`: passed, 2 Playwright tests.
- `pnpm build`: passed.
- `pnpm package:win`: build phase passed, but Electron Builder could not remove a locked empty `release/win-unpacked` directory (`EBUSY`). No source/build error was involved.
- `pnpm exec electron-builder --win --x64 --config.directories.output=release-fresh`: passed after the lock was isolated.
- Fresh `release-fresh` artifacts were copied into the expected `apps/desktop/release` paths; temporary `release-fresh` output was removed afterward.
- Packaged app launched from `win-unpacked` and responded on `/api/health` port `4123` with `{"ok":true,"product":"Marketplace Intelligence OS","version":"1.0.0"}`.
- Packaged `/api/dashboard` returned 35 projects, 307 products, and 2 generated reports, confirming Prisma-backed queries execute in the packaged runtime.
- Packaged artifact verification confirmed the fresh installer, portable executable, and unpacked executable were generated with 2026-07-07 timestamps.

## Generated Artifacts

- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe`
- `apps/desktop/release/Marketplace Intelligence OS Portable 1.0.0.exe`
- `apps/desktop/release/win-unpacked/Marketplace Intelligence OS.exe`
- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe.blockmap`

Artifact sizes:

- Setup installer: 146.40 MB.
- Portable executable: 146.18 MB.
- Unpacked executable: 191.91 MB.

## Remaining Notes

- macOS artifacts must be verified on the GitHub Actions macOS runner.
- Shopee and TikTok anti-bot/login/verification flows remain user-controlled by design; the app does not bypass marketplace protections.
- WebP-to-JPG thumbnail conversion is best-effort and falls back to original URLs when the marketplace CDN blocks image fetching.
- Product slide/video extraction remains heuristic when Shopee hides media from browser-readable HTML.
- A Windows directory handle intermittently locked `apps/desktop/release/win-unpacked` during local packaging. The verified release was built in a fresh side output and copied into the expected release paths after confirming the locked folder accepted writes.
- TikTok Shop adapter remains stubbed; Android evidence capture exists, but TikTok Shop navigation is user-controlled.
