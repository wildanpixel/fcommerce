# MarketPlace Keyword Competitor Analysis - Release Report

Release date: 2026-07-13
Version: 1.0.0  
Local platform: Windows  
Release task: PDF image rendering and compact report layout

## Summary

This release fixes report export regressions reported in the latest generated PDF. PDF generation now prints from a file-backed temporary HTML document instead of an in-memory `setContent()` page, which lets local evidence images resolve correctly and waits for image loading before printing. HTML/PDF report layout now uses tighter A4 margins, smaller typography, denser product rows, and a centered maximum width for standalone HTML so reports remain comfortable on wide displays.

## Completed

- Fixed broken PDF report images by writing report HTML to a temporary file and navigating Puppeteer to that file URL before export.
- Allowed local file evidence images during PDF printing and waited for image load/error completion before writing the final PDF.
- Increased the Puppeteer PDF timeout for media-heavy reports so large evidence sets can finish rendering.
- Reduced PDF page margins and print typography to avoid squeezed content and oversized text.
- Added a centered `.report-shell` for generated HTML reports so wide-screen viewing stays readable.
- Visually rendered a fresh `eyecream` PDF sample with Poppler and confirmed page images are no longer broken.
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
- Visual PDF QA: generated `tmp/pdfs/current-renderer-report.pdf` from the local `eyecream` project, rendered pages 1-2 with Poppler, and confirmed evidence images render instead of broken placeholders.

## Generated Artifacts

- `apps/desktop/release/MarketPlace Keyword Competitor Analysis Setup 1.0.0.exe` - 154,614,890 bytes.
- `apps/desktop/release/MarketPlace Keyword Competitor Analysis Portable 1.0.0.exe` - 154,384,612 bytes.
- `apps/desktop/release/win-unpacked/MarketPlace Keyword Competitor Analysis.exe` - 201,233,920 bytes.

## Remaining Notes

- macOS artifacts must be produced and verified on the GitHub Actions macOS runner.
- Shopee login, captcha, verification, and protected pages remain user-controlled by design.
- TikTok Shop is intentionally disabled from New Research until M5 implements a real marketplace adapter and normalized collection flow.
- DOCX styling is outside this fix; this task addressed PDF image rendering, PDF density, and standalone HTML reading width.
