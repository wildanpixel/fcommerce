# MarketPlace Keyword Competitor Analysis - Release Report

Release date: 2026-07-11  
Version: 1.0.0  
Local platform: Windows  
Release task: report export fidelity, product-detail media cleanup, review formatting, and inspector navigation refinement

## Summary

This release tightens the guided Shopee evidence workflow around the current Project Inspector and report structure. Keyword Projects now use circular progress indicators, Part 1 capture/extraction is scoped to the visible Shopee result grid, Part 3 Key Store product matrices are collected as data-only store-grid rows, Visual Style saves only `.shop-decoration` banner assets, and report generation now follows the same modular headings and media limits shown in Project Inspector. The report export path now uses a structured DOCX renderer with JPEG image conversion, cleaner A4 HTML/PDF layout, stricter product-gallery media filtering, and multiline Shopee review formatting.

## Completed

- Changed Keyword Projects progress to circular indicators.
- Added capture/download/save loading status for manual evidence actions.
- Scoped Relevance and Top Sales screenshots and extracted product rows to `section.shopee-search-item-result`.
- Scoped Key Store Store Home Page screenshots to `.shop-decoration`.
- Scoped Key Store Products and Best Sellers extraction to `.shop-page__all-products-section`.
- Changed Key Store Products and Best Sellers into `Collect Data` steps without screenshot evidence, with store-grid hydration before extraction to capture more than the first rendered row set when Shopee exposes it.
- Filtered Key Store assets by selected store URL and store ownership to avoid unrelated product-level shop captures.
- Changed Visual Style persistence so successful `.shop-decoration` banner downloads create `STORE_BANNER` assets without storing a broad base screenshot or product-card imagery.
- Expanded Key Store product matrix rendering to show the captured store product set instead of a 12-item preview.
- Replaced the legacy HTML-to-DOCX ZIP writer with a structured DOCX exporter that converts report images to JPEG for Word compatibility.
- Improved generated HTML/PDF report layout with cleaner A4 pagination, contained image rendering, portrait video handling, and multiline review cards.
- Filtered Product Detail slide media to exclude Shopee carousel arrows, UI icons, placeholders, avatars, and review/user media from product slides.
- Limited product videos to explicit product-gallery captures and prevented legacy review videos from appearing in product slides.
- Preserved review evidence as multiline Shopee-style rows with customer id, timestamp/variation, attribute lines, and comment body.
- Changed Project Inspector outline behavior so Evaluation Phase and TikTok Evidence are plain links, while Key Store exposes its expected sub-sections.
- Changed report creation button text to `Generate Report`.
- Reworked report section customization to match Project Inspector headings: Keyword General, Key Products, Product Detail subparts, Key Store subparts, and TikTok Evidence.
- Added Summary Metrics as an independent configurable report section.
- Changed generated report Key Products to use the same max-10 selected Key Product table as Project Inspector.
- Changed Key Product source placement labels to readable `Top N in sales` / `Top N in relevance` context across collection preview, Project Inspector, and reports.
- Deduplicated generated report product slides, capped product dossier media to the inspector-selected set, limited product videos to one, and aligned report Visual Style with the stored Key Store banner assets.
- Added developer attribution for Wildan Ega Pradana and LinkedIn profile in the app/report surface.
- Added Bahasa Indonesia, English, and Chinese Modern language choices.
- Disabled TikTok Shop from New Research as `Coming soon` until the TikTok adapter and normalized collection workflow are implemented.
- Updated `CHANGELOG.md`, `IMPLEMENTATION_STATUS.md`, `ROADMAP.md`, and this release report.

## Release Checklist

| Step | Result |
| --- | --- |
| Delete `dist` | Completed |
| Delete `dist-node` | Completed |
| Delete `release` | Completed after closing stale packaged app processes |
| Generate Prisma | Passed |
| Clean build | Passed through `pnpm --filter @marketplace-intelligence-os/desktop build` |
| TypeScript | Passed |
| ESLint | Passed |
| Unit tests | Passed |
| Playwright tests | Passed |
| Package Electron | Passed through direct `electron-builder --win --x64` after the clean build |
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
- `pnpm exec playwright test`: passed, 2 Playwright smoke tests.
- `pnpm --filter @marketplace-intelligence-os/desktop build`: passed and regenerated Prisma.
- `pnpm exec electron-builder --win --x64`: passed.
- Packaged app startup smoke: passed; the Windows unpacked executable stayed running for 12 seconds and was closed cleanly.

## Generated Artifacts

- `apps/desktop/release/MarketPlace Keyword Competitor Analysis Setup 1.0.0.exe` - 154,610,739 bytes.
- `apps/desktop/release/MarketPlace Keyword Competitor Analysis Portable 1.0.0.exe` - 154,380,460 bytes.
- `apps/desktop/release/win-unpacked/MarketPlace Keyword Competitor Analysis.exe` - 191.91 MB.

## Remaining Notes

- macOS artifacts must be produced and verified on the GitHub Actions macOS runner.
- Shopee login, captcha, verification, and protected pages remain user-controlled by design.
- TikTok Shop is intentionally disabled from New Research until M5 implements a real marketplace adapter and normalized collection flow.
- Full visual QA against a populated real-world report remains required before marking report generation complete.
