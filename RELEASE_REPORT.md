# MarketPlace Keyword Competitor Analysis - Release Report

Release date: 2026-07-12  
Version: 1.0.0  
Local platform: Windows  
Release task: report export fidelity, Part 1 scoring, and Part 3 Key Store collection refinement

## Summary

This release fixes the remaining report export mismatch and Key Store collection issues. DOCX product thumbnails now render as real images, Product Detail slide/user-media output is compact, and Key Store Overall uses the same rationale model shown in Project Inspector. HTML/PDF reports now use expanded Project Inspector-style sections with product list rows and follow the user's active light/dark theme. Part 1 Key Product selection now applies the requested business-priority scoring labels. Part 3 Key Store collection captures store homepage evidence from page top through `.shop-decoration`, removes screenshot placeholders from data-only Popular Products and Best Sellers matrices, scans lazy-loaded store-grid rows, and hydrates `.shop-decoration` banner/carousel images before saving Visual Shop Banner assets.

## Completed

- Fixed DOCX product-table thumbnails so they render as JPEG-converted images instead of URL text.
- Changed DOCX Slides and Media in user sections to compact image grids without repeated caption paragraphs.
- Changed Key Store Overall export text to explain why the store was selected for the keyword using GMV, sold/month, promotion, trust, evidence readiness, and AI summary text when available.
- Restyled HTML/PDF product sections as expanded Project Inspector-like list rows.
- Added theme-aware HTML/PDF output that uses the last selected app theme.
- Added Part 1 business-priority scoring for Key Product selection.
- Changed Key Store Store Home Page capture to crop from the top of the store page through the bottom of `.shop-decoration`.
- Renamed Key Store Products to Popular Products and Visual Style to Visual Shop Banner across the collection, inspector, and reports.
- Removed empty screenshot/evidence placeholder boxes from Key Store Popular Products and Best Sellers in Project Inspector.
- Strengthened Key Store Popular Products and Best Sellers extraction to scan lazy-loaded store rows while scrolling through the first page.
- Improved Visual Shop Banner collection by hydrating `.shop-decoration`, cycling likely carousel controls, filtering product-card imagery, and downloading readable banner images.
- Made the collapsed collection activity control compact while keeping actions reachable.
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
- Packaged app startup smoke: passed; the Windows unpacked executable stayed running for 12 seconds and was closed cleanly.

## Generated Artifacts

- `apps/desktop/release/MarketPlace Keyword Competitor Analysis Setup 1.0.0.exe` - 154,613,860 bytes.
- `apps/desktop/release/MarketPlace Keyword Competitor Analysis Portable 1.0.0.exe` - 154,383,581 bytes.
- `apps/desktop/release/win-unpacked/MarketPlace Keyword Competitor Analysis.exe` - 201,233,920 bytes.

## Remaining Notes

- macOS artifacts must be produced and verified on the GitHub Actions macOS runner.
- Shopee login, captcha, verification, and protected pages remain user-controlled by design.
- TikTok Shop is intentionally disabled from New Research until M5 implements a real marketplace adapter and normalized collection flow.
- Full visual QA against a populated real-world report remains required before marking report generation complete.
