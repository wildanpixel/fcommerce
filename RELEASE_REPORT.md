# MarketPlace Keyword Competitor Analysis - Release Report

Release date: 2026-07-13
Version: 1.0.0  
Local platform: Windows  
Release task: report portrait evidence layout and full first-page Shopee extraction

## Summary

This release targets the latest report and collection regressions. Product Detail Shop Home Page and Key Store Store Home Page evidence now export as 9:16 portrait cards in DOCX, HTML, and PDF so long page captures do not become unreadable strips. HTML/PDF output now defaults to the Project Inspector content view without the vault metrics strip, while Summary Metrics remains available as an optional report section. Shopee Relevance, Top Sales, Key Store Popular Products, and Best Sellers extraction now scrolls through the first-page grid and collects products during the scroll pass instead of stopping at the first visible viewport. PDP Store Type detection now prioritizes compact `Star` badges from the product title/header area before broader Mall ORI fallback detection.

## Completed

- Added 9:16 portrait evidence rendering for Product Detail Shop Home Page and Key Store Store Home Page in DOCX.
- Added 9:16 portrait evidence cards for the same long home-page captures in HTML/PDF reports.
- Changed generated HTML/PDF reports to start with a compact Project Inspector-like header instead of a cover page.
- Disabled Summary Metrics by default so generated reports omit vault metrics unless the user explicitly enables that section.
- Expanded Relevance and Top Sales collection to scroll and collect the first-page search grid beyond the initially visible viewport.
- Expanded Key Store Popular Products and Best Sellers collection to scroll and collect the first-page store grid beyond the initially visible viewport.
- Tightened PDP Store Type extraction so compact `Star` badges are not overwritten by broader Mall ORI badges elsewhere on the page.
- Updated `CHANGELOG.md`, `IMPLEMENTATION_STATUS.md`, `ROADMAP.md`, and this release report.

## Release Checklist

| Step | Result |
| --- | --- |
| Delete `dist` | Completed |
| Delete `dist-node` | Completed |
| Delete `release` | Completed after closing stale packaged app processes |
| Generate Prisma | Passed through clean build |
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
| Verify packaged application version | Passed: package version `1.0.0` |
| Update changelog | Completed |
| Commit | Pending at report generation time |
| Push | Pending at report generation time |
| Verify GitHub Actions | Pending after push |

## Local Validation

- `pnpm --filter @marketplace-intelligence-os/desktop typecheck`: passed.
- `pnpm --filter @marketplace-intelligence-os/desktop lint`: passed.
- `pnpm --filter @marketplace-intelligence-os/desktop test`: passed, 6 test files and 14 tests.
- `pnpm --filter @marketplace-intelligence-os/desktop test:e2e`: passed, 2 Playwright smoke tests.
- `pnpm --filter @marketplace-intelligence-os/desktop build`: passed and regenerated Prisma.
- `pnpm --filter @marketplace-intelligence-os/desktop exec electron-builder --win --x64`: passed.
- Packaged app startup smoke: passed; the Windows unpacked executable stayed running for 15 seconds and was closed cleanly.

## Generated Artifacts

- `apps/desktop/release/MarketPlace Keyword Competitor Analysis Setup 1.0.0.exe` - 154,614,294 bytes.
- `apps/desktop/release/MarketPlace Keyword Competitor Analysis Portable 1.0.0.exe` - 154,384,014 bytes.
- `apps/desktop/release/win-unpacked/MarketPlace Keyword Competitor Analysis.exe` - 201,233,920 bytes.

## Remaining Notes

- macOS artifacts must be produced and verified on the GitHub Actions macOS runner.
- Shopee login, captcha, verification, and protected pages remain user-controlled by design.
- TikTok Shop is intentionally disabled from New Research until M5 implements a real marketplace adapter and normalized collection flow.
- Full visual QA against a populated real-world report remains required before marking report generation complete.
