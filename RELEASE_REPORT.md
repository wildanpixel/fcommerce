# Marketplace Intelligence OS - Release Report

Release date: 2026-07-09
Version: 1.0.0
Local platform: Windows
Release task: Shopee Store Name extraction repair for captured Product Detail HTML and packaged runtime validation

## Summary

This release repairs the remaining Store Name gap in the Key Product table. The root cause was Shopee's saved PDP HTML using `id="sll2-pdp-product-shop"` while the app only searched the older `s112` shop selector. The renderer now recognizes current and generic PDP shop containers, and the API can backfill missing product store fields from saved Product Detail Qualified HTML assets.

## Completed

- Fixed renderer PDP Store Name extraction for `#sll2-pdp-product-shop`, generic `[id*='pdp-product-shop']`, and `section.page-product__shop`.
- Added backend HTML fallback parsing for Product Detail Qualified captures, extracting visible store name, store URL, and Mall/Star badge signals from saved PDP HTML.
- Added project-detail repair for already captured products whose Store Name/URL are blank but whose evidence asset metadata points to a saved PDP HTML file.
- Added regression coverage for the current Shopee shop panel shape.
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
- `pnpm --filter @marketplace-intelligence-os/desktop test`: passed, 6 files and 14 tests.
- `pnpm --filter @marketplace-intelligence-os/desktop build`: passed.
- `pnpm --filter @marketplace-intelligence-os/desktop test:e2e`: passed, 2 Playwright smoke tests.
- `pnpm --filter @marketplace-intelligence-os/desktop package:win`: passed for Windows installer, portable executable, and `win-unpacked`.
- Packaged app launched from `win-unpacked` and responded on `/api/health` port `4123` with `ok=true`, product `Marketplace Intelligence OS`, and version `1.0.0`.
- Packaged `/api/dashboard` returned `2` projects and `0` reports, confirming Prisma-backed runtime queries execute in the packaged app.
- Packaged project-detail verification triggered the captured-HTML store repair: `iphone 15` now has `iBox Official Shop` from saved PDP HTML, and `eyecream` returned `10` products with store names.
- Packaged app processes were stopped after verification.

## Generated Artifacts

- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe`
- `apps/desktop/release/Marketplace Intelligence OS Portable 1.0.0.exe`
- `apps/desktop/release/win-unpacked/Marketplace Intelligence OS.exe`
- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe.blockmap`

Artifact sizes:

- Setup installer: 153,516,250 bytes.
- Portable executable: 153,285,534 bytes.
- Unpacked executable: 201,233,920 bytes.

## GitHub Verification

- Pending after this release commit is pushed.

## Remaining Notes

- macOS artifacts must be verified on the GitHub Actions macOS runner.
- Existing projects with saved Product Detail Qualified HTML can be repaired automatically when project detail is opened; products without PDP HTML still need that product detail step captured.
- Shopee/TikTok login, captcha, verification, and protected pages remain user-controlled by design; the app does not bypass marketplace protections.
- Store Type image recognition is best-effort when Shopee exposes the Mall/Star badge only as pixels; persistence still rejects invalid Store Type labels.
- TikTok Shop adapter remains stubbed; Android evidence capture exists, but TikTok Shop navigation remains user-controlled.
