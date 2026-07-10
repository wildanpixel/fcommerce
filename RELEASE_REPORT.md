# MarketPlace Keyword Competitor Analysis - Release Report

Release date: 2026-07-10
Version: 1.0.0
Local platform: Windows
Release task: Product Detail collection, Keyword Projects, and report export update

## Summary

This release fixes Product Detail evidence round-tripping and changes slide collection into a user-selected HD media workflow. It also renames the visible app, upgrades Keyword Projects management, adds report preview/copy/HTML/DOCX export actions, and keeps collection activity in a collapsed right sidebar.

## Completed

- Renamed visible desktop app surfaces to MarketPlace Keyword Competitor Analysis.
- Renamed Projects to Keyword Projects.
- Added category filtering, card/list switching, typed delete confirmation, and completed/incomplete project states.
- Hid Continue Collection for completed project cards and changed the inspector action to Collect Again at 100%.
- Changed Product Detail slide collection to save the currently selected main product image/video one item at a time, up to 9 media items.
- Fixed Product Detail Shop Home Page evidence ownership so saved shop-home captures appear inside the matching Product Detailed Qualified product.
- Stored Product Detail sub-action progress independently so one sub-action no longer marks an entire product complete.
- Kept review extraction constrained to dated Shopee rows and 3 positive plus 2 low-star negative display rows.
- Added report Preview, Copy Report, HTML open, and DOCX export actions.
- Added local API endpoints for report HTML and DOCX export.
- Updated `CHANGELOG.md`, `IMPLEMENTATION_STATUS.md`, `ROADMAP.md`, `README.md`, and this release report.

## Release Checklist

| Step | Result |
| --- | --- |
| Delete `dist` | Completed with `pnpm clean` |
| Delete `dist-node` | Completed with `pnpm clean` |
| Delete `release` | Completed with `pnpm clean` after closing old packaged app processes |
| Generate Prisma | Passed with `pnpm prisma:generate` |
| Clean build | Passed with `pnpm build` |
| Package Electron | Passed with `pnpm package:win` |
| Generate Windows Installer | Completed |
| Generate Windows Portable | Completed |
| Generate macOS App | Not available locally on Windows; configured for GitHub Actions macOS runner |
| Generate macOS DMG | Not available locally on Windows; configured for GitHub Actions macOS runner |
| Launch packaged application automatically | Passed with `win-unpacked/MarketPlace Keyword Competitor Analysis.exe` |
| Verify UI reflects latest implementation | Passed by packaged startup smoke under the renamed app |
| Verify packaged application version | Passed: package version `1.0.0` |
| Update changelog | Completed |
| Commit | Pending after this report update |
| Push | Pending after commit |
| Verify GitHub Actions | Pending after push |

## Local Validation So Far

- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm test`: passed, 6 files and 14 tests.
- `pnpm build`: passed.
- `pnpm test:e2e`: passed, 2 Playwright smoke tests.
- `pnpm clean`: passed after old packaged app processes were closed.
- `pnpm prisma:generate`: passed.
- `pnpm package:win`: passed.
- Packaged app startup smoke: passed; the Windows unpacked executable stayed running for 12 seconds and was closed cleanly.

## Generated Artifacts

- `apps/desktop/release/MarketPlace Keyword Competitor Analysis Setup 1.0.0.exe` - 146.41 MB.
- `apps/desktop/release/MarketPlace Keyword Competitor Analysis Portable 1.0.0.exe` - 146.19 MB.
- `apps/desktop/release/win-unpacked/MarketPlace Keyword Competitor Analysis.exe` - 191.91 MB.

## Remaining Notes

- macOS artifacts must be verified on the GitHub Actions macOS runner.
- Shopee/TikTok login, captcha, verification, and protected pages remain user-controlled by design; the app does not bypass marketplace protections.
- Store Type image recognition remains best-effort when Shopee exposes Mall/Star badges only as pixels.
- TikTok Shop adapter remains stubbed; Android evidence capture exists, but TikTok Shop navigation remains user-controlled.
