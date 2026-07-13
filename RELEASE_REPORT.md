# MarketPlace Keyword Competitor Analysis - Release Report

Release date: 2026-07-13
Version: 1.0.0
Local platform: Windows
Release task: app-wide UI reference pass, Key Product priority ranking, and promotion-signal cleanup

## Summary

This release applies the supplied soft grey UI direction across the main application surfaces, adds spring page transitions and liquid click feedback, and standardizes destructive actions as red controls with white trash icons. It also tightens Part 1 Key Product selection so the max-10 table is led by `Priority`, `High`, and `Platform recommended` products, and filters Product Detail voucher/Bundle Deals parsing so generic headings or unrelated Shopee page text are not saved as promotion signals.

## Completed

- Applied the reference UI language to shared panels, project cards, sidebar states, report sections, settings, collection surfaces, and browser/workspace containers.
- Added spring-based page transitions through the existing Framer Motion page wrapper.
- Added global click/tap compression for buttons, project cards, and collapsible report summaries.
- Changed delete controls to red danger buttons with white trash icons.
- Changed Key Product selection to bucket candidates by business priority before score sorting.
- Preserved the max-10 Key Product table rule while demoting `Average` and `Not recommended` rows behind stronger product tags.
- Filtered Product Detail voucher and Bundle Deals capture to keep real promotion-like signals and reject standalone labels such as `Bundle Deals`.
- Updated `CHANGELOG.md`, `IMPLEMENTATION_STATUS.md`, `ROADMAP.md`, and this release report.

## Release Checklist

| Step | Result |
| --- | --- |
| Delete `dist` | Pending validation |
| Delete `dist-node` | Pending validation |
| Delete `release` | Pending validation |
| Generate Prisma | Pending validation |
| Clean build | Pending validation |
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
| Commit | Pending validation |
| Push | Pending validation |
| Verify GitHub Actions | Pending after push |

## Local Validation

- `pnpm --filter desktop typecheck`: passed.
- `pnpm --filter desktop lint`: passed.
- `pnpm --filter desktop test`: passed, 6 test files and 14 tests.
- `pnpm --filter desktop test:e2e`: passed, 2 Playwright smoke tests.
- `pnpm --filter desktop prisma:generate`: passed.
- `pnpm --filter desktop build`: passed.
- `pnpm --dir apps/desktop exec electron-builder --win --x64`: passed.
- Packaged app startup smoke: passed; `/api/health` returned `{"ok":true,"product":"MarketPlace Keyword Competitor Analysis","version":"1.0.0"}`.

## Generated Artifacts

- `apps/desktop/release/MarketPlace Keyword Competitor Analysis Setup 1.0.0.exe` - 154,616,668 bytes.
- `apps/desktop/release/MarketPlace Keyword Competitor Analysis Portable 1.0.0.exe` - 154,386,275 bytes.
- `apps/desktop/release/win-unpacked/MarketPlace Keyword Competitor Analysis.exe` - 201,233,920 bytes.

## Remaining Notes

- Existing saved projects with older 12-row evidence must be recollected for Relevance, Top Sales, Popular Products, or Best Sellers to display larger product sets.
- macOS artifacts must be produced and verified on the GitHub Actions macOS runner.
- Shopee login, captcha, verification, and protected pages remain user-controlled by design.
