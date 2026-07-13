# MarketPlace Keyword Competitor Analysis - Release Report

Release date: 2026-07-13
Version: 1.0.0
Local platform: Windows
Release task: full-grid extraction and Project Inspector UI refresh

## Summary

This release fixes the remaining issue where Inspect Project could still show only a partial product set for Relevance, Top Sales, Key Store Popular Products, and Best Sellers. The fix raises the capture persistence cap, project-detail product load cap, and Shopee grid hydration targets so full first-page evidence can be saved and rendered. It also refreshes the Project Inspector UI toward the supplied soft white/grey reference with a large keyword title, pill actions, clustered metrics, circular saved progress, and a rounded report workspace.

## Completed

- Increased Shopee search/store grid hydration targets so the collector keeps scrolling until the first-page grid is populated instead of stopping at the first visible cards.
- Increased manual evidence product persistence from 80 to 120 products per capture.
- Increased Project Inspector product loading from 50 to 500 products, with assets and reviews raised to support larger projects.
- Reworked Project Inspector into a dedicated keyword page with large title, marketplace/date subtitle, pill Back/Collect/Delete actions, clustered metrics, saved URL/progress card, and rounded workspace.
- Applied a broader light-theme visual refresh inspired by the attached reference while keeping existing dark-mode readability overrides.
- Updated `CHANGELOG.md`, `IMPLEMENTATION_STATUS.md`, `ROADMAP.md`, and this release report.

## Release Checklist

| Step | Result |
| --- | --- |
| Delete `dist` | Completed |
| Delete `dist-node` | Completed |
| Delete `release` | Completed after closing stale packaged app process |
| Generate Prisma | Passed |
| Clean build | Passed |
| TypeScript | Passed |
| ESLint | Passed |
| Unit tests | Passed |
| Playwright tests | Passed |
| Package Electron | Passed through `electron-builder --win --x64` |
| Generate Windows Installer | Completed |
| Generate Windows Portable | Completed |
| Generate macOS App | Not available locally on Windows; configured for GitHub Actions macOS runner |
| Generate macOS DMG | Not available locally on Windows; configured for GitHub Actions macOS runner |
| Launch packaged application automatically | Passed with `win-unpacked/MarketPlace Keyword Competitor Analysis.exe` |
| Verify packaged application version | Passed: health endpoint returned version `1.0.0` |
| Update changelog | Completed |
| Commit | Pending at report generation time |
| Push | Pending at report generation time |
| Verify GitHub Actions | Pending after push |

## Local Validation

- `pnpm --filter @marketplace-intelligence-os/desktop typecheck`: passed.
- `pnpm --filter @marketplace-intelligence-os/desktop lint`: passed.
- `pnpm --filter @marketplace-intelligence-os/desktop test`: passed, 6 test files and 14 tests.
- `pnpm --filter @marketplace-intelligence-os/desktop test:e2e`: passed, 2 Playwright smoke tests.
- `pnpm --filter @marketplace-intelligence-os/desktop prisma:generate`: passed.
- `pnpm --filter @marketplace-intelligence-os/desktop build`: passed.
- `pnpm --dir apps/desktop exec electron-builder --win --x64`: passed.
- Packaged app startup smoke: passed; the Windows unpacked executable launched, responded on `http://127.0.0.1:4123/api/health`, reported version `1.0.0`, and was closed cleanly.

## Generated Artifacts

- `apps/desktop/release/MarketPlace Keyword Competitor Analysis Setup 1.0.0.exe` - 154,615,984 bytes.
- `apps/desktop/release/MarketPlace Keyword Competitor Analysis Portable 1.0.0.exe` - 154,385,701 bytes.
- `apps/desktop/release/win-unpacked/MarketPlace Keyword Competitor Analysis.exe` - 201,233,920 bytes.

## Remaining Notes

- Existing projects that were previously captured with only 12 stored rows must be recollected for those sections to contain the larger first-page product set.
- macOS artifacts must be produced and verified on the GitHub Actions macOS runner.
- Shopee login, captcha, verification, and protected pages remain user-controlled by design.
- TikTok Shop is intentionally disabled from New Research until M5 implements a real marketplace adapter and normalized collection flow.
