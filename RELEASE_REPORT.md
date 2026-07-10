# MarketPlace Keyword Competitor Analysis - Release Report

Release date: 2026-07-10
Version: 1.0.0
Local platform: Windows
Release task: Part 3 Evaluation and Key Store collection refinement

## Summary

This release completes the next Key Store collection pass. Product Detail completion now opens Evaluation Phase in the collection workspace, store evidence screenshots target the exact Shopee sections requested, store product matrices persist separately from Key Product rows, visual-style banners are saved as assets, and the TikTok cross-platform step opens search for the selected store name.

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
- Compact Project Inspector saved progress into a smaller circular-progress summary.
- Preserved vertical Shopee product videos with object-contained portrait preview cards.
- Limited product video extraction to the currently selected video per download action.
- Made Product Detail Qualified outline navigation collapsible per product.
- Made Analysis Session collapsed by default in the collection workspace.
- Removed forced mobile-view switching from Shop Home Page collection.
- Reduced high-contrast white border noise in dark mode.
- Changed Product Detail completion to automatically open Part 3 Evaluation Phase instead of returning directly to Project Inspector.
- Scoped Part 3 Store Home Page captures to `.shop-decoration`.
- Scoped Part 3 Store Products and Best Sellers captures to `.shop-page__all-products-section`.
- Persisted Part 3 store-grid rows as `Store Products` and `Store Best Sellers`.
- Saved readable `.shop-decoration` banner images as local `STORE_BANNER` assets during Visual Style collection.
- Changed Key Store Overall into conclusion sentences and changed the selected store URL into an Open Store Page button.
- Added TikTok.com search target generation from the selected Key Store name.
- Updated `CHANGELOG.md`, `IMPLEMENTATION_STATUS.md`, `ROADMAP.md`, and this release report.

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
