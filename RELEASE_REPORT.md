# Marketplace Intelligence OS - Release Report

Release date: 2026-07-08
Version: 1.0.0
Local platform: Windows
Release task: Shopee Store Name and rating extraction repair, HTML download hardening, and packaged runtime validation

## Summary

This release repairs the Key Product extraction path reported in the project inspector. Shopee PDP Store Name extraction now preserves shop-panel line breaks and reads the sibling name block after the shop anchor, while rating extraction no longer treats review counts such as `50,7k Ratings` as rating `5`. The release also keeps the prior browser `Download HTML` repair and validates the packaged Windows runtime.

## Completed

- Fixed manual `Download HTML` by making rendered-page extraction async-safe.
- Added `/api/html-snapshot` for local project evidence HTML/text snapshot saves.
- Added renderer API client support for `saveHtmlSnapshot`.
- Changed the Download HTML button to save the current `#main` snapshot through the API and log the saved file path.
- Kept the normal evidence capture path unchanged: screenshot capture still saves image, HTML, visible text, optional PDF, extracted products, and structured PDP details.
- Fixed Key Product rating parsing so bounded star/rating tokens are used instead of the first digit inside review-count text.
- Added structured PDP metric persistence for rating, rating text, review text, and total-sold text.
- Fixed PDP Store Name parsing by preserving line breaks before candidate filtering and by checking the direct sibling after the Shopee shop anchor.
- Hardened PDP Store Name extraction using Shopee's `.s112-pdp-product-shop` / `section.page-product__shop` shop anchor and sibling name block.
- Kept Store Type strict to `Mall ORI`, `Star+`, and `Star`, with best-effort small badge image classification for image-only labels.
- Made Playwright smoke tests respect the configured E2E API port instead of hardcoding `4223`.
- Changed the desktop build script to use Vite's `--configLoader runner`, avoiding Windows/esbuild parent-directory access failures.
- Updated `CHANGELOG.md`, `IMPLEMENTATION_STATUS.md`, `ROADMAP.md`, and this release report.

## Release Checklist

| Step | Result |
| --- | --- |
| Delete `dist` | Completed |
| Delete `dist-node` | Completed |
| Delete `release` | Completed after stopping stale test/app processes |
| Generate Prisma | Completed through `scripts/generatePrismaClient.mjs` during build/package |
| Clean build | Completed |
| Package Electron | Completed |
| Generate Windows Installer | Completed: `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe` |
| Generate Windows Portable | Completed: `apps/desktop/release/Marketplace Intelligence OS Portable 1.0.0.exe` |
| Generate macOS App | Not run locally on Windows; configured for GitHub Actions macOS runner |
| Generate macOS DMG | Not run locally on Windows; configured for GitHub Actions macOS runner |
| Launch packaged application automatically | Completed from `apps/desktop/release/win-unpacked/Marketplace Intelligence OS.exe` |
| Verify UI/API reflects latest implementation | Completed through clean renderer build, Playwright smoke tests, and packaged API startup |
| Verify packaged application version | Completed: `/api/health` returned version `1.0.0` |
| Update changelog | Completed |
| Commit | Pending this release commit |
| Push | Pending this release commit |
| Verify GitHub Actions | Pending after push |

## Local Validation

- `pnpm --filter @marketplace-intelligence-os/desktop typecheck`: passed.
- `pnpm --filter @marketplace-intelligence-os/desktop lint`: passed.
- `pnpm --filter @marketplace-intelligence-os/desktop test`: passed, 5 files and 12 tests.
- `pnpm --filter @marketplace-intelligence-os/desktop build`: passed.
- `pnpm --filter @marketplace-intelligence-os/desktop test:e2e`: passed, 2 Playwright smoke tests.
- `pnpm --filter @marketplace-intelligence-os/desktop package:win`: passed for Windows installer, portable executable, and `win-unpacked`.
- Packaged app launched from `win-unpacked` and responded on `/api/health` port `4123` with `ok=true`, product `Marketplace Intelligence OS`, and version `1.0.0`.
- Packaged `/api/dashboard` returned `2` projects and `0` reports, confirming Prisma-backed runtime queries execute in the packaged app.
- Packaged app processes were stopped after verification.

## Generated Artifacts

- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe`
- `apps/desktop/release/Marketplace Intelligence OS Portable 1.0.0.exe`
- `apps/desktop/release/win-unpacked/Marketplace Intelligence OS.exe`
- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe.blockmap`

Artifact sizes:

- Setup installer: 153,515,108 bytes.
- Portable executable: 153,284,389 bytes.
- Unpacked executable: 201,233,920 bytes.

## Remaining Notes

- macOS artifacts must be verified on the GitHub Actions macOS runner.
- Existing projects that already stored incorrect `ratingText` or blank Store Name values need the affected PDP product detail step recaptured or synced again so the corrected parser can repair persisted rows.
- Shopee/TikTok login, captcha, verification, and protected pages remain user-controlled by design; the app does not bypass marketplace protections.
- Store Type image recognition is best-effort when Shopee exposes the Mall/Star badge only as pixels; persistence still rejects invalid Store Type labels.
- TikTok Shop adapter remains stubbed; Android evidence capture exists, but TikTok Shop navigation remains user-controlled.
