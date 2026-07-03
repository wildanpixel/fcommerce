# Marketplace Intelligence OS - Release Report

Release date: 2026-07-03
Version: 1.0.0
Local platform: Windows
Release task: staged guided collection, persistent browser session, HTML capture status, and collection resume

## Summary

This release improves the guided evidence collection workflow. Collection is now split into three user-controlled phases, browser HTML capture is visible instead of silent, Shopee browser login/cache state is persistent across projects, and project cards show saved collection progress so unfinished work can be resumed.

## Completed

- Added three collection phases: Part 1 Keyword General, Part 2 Product Details, and Part 3 Evaluation/Key Store.
- Added Save/Pause collection state on projects, including stage, completed steps, browser URL, view mode, and percentage.
- Added project-list progress display showing saved collection stage and completion percentage.
- Added top-center browser status for `targeted page received`, `downloading HTML`, success, failure, and manual `Download HTML`.
- Changed HTML snapshots to prioritize `div#main`, then `main`, then body, and format output across multiple lines.
- Changed Shopee browser partition from per-project to persistent marketplace session so login/cache state survives project switches and app restarts.
- Added best-effort WebP thumbnail conversion to local JPG files during evidence save.
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
| Verify UI reflects latest implementation | Completed through packaged UI screenshot and dev Playwright flow |
| Verify packaged application version | Completed: `/api/health` returned version `1.0.0` |
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
- Packaged app launched from `win-unpacked` and responded on `/api/health` with `{"ok":true,"product":"Marketplace Intelligence OS","version":"1.0.0"}`.
- Packaged UI screenshot verified the app shell renders after packaging.

## Generated Artifacts

- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe`
- `apps/desktop/release/Marketplace Intelligence OS Portable 1.0.0.exe`
- `apps/desktop/release/win-unpacked/Marketplace Intelligence OS.exe`
- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe.blockmap`

## Remaining Notes

- macOS artifacts must be verified on the GitHub Actions macOS runner.
- Shopee and TikTok anti-bot/login/verification flows remain user-controlled by design; the app does not bypass marketplace protections.
- WebP-to-JPG thumbnail conversion is best-effort and falls back to original URLs when the marketplace CDN blocks image fetching.
- Product slide/video extraction remains heuristic when Shopee hides media from browser-readable HTML.
- TikTok Shop adapter remains stubbed; Android evidence capture exists, but TikTok Shop navigation is user-controlled.
