# Marketplace Intelligence OS - Release Report

Release date: 2026-07-08
Version: 1.0.0
Local platform: Windows
Release task: Browser HTML download repair, Shopee evidence extraction hardening, and packaged runtime validation

## Summary

This release fixes the failing browser `Download HTML` path. The root cause was the rendered-page snapshot script using `await` inside a non-async injected function, which caused Electron webview extraction to fail before HTML could be returned. The snapshot script now runs as an async IIFE, and manual HTML downloads are saved through the local API into the project evidence folder instead of relying on fragile renderer blob downloads.

## Completed

- Fixed manual `Download HTML` by making rendered-page extraction async-safe.
- Added `/api/html-snapshot` for local project evidence HTML/text snapshot saves.
- Added renderer API client support for `saveHtmlSnapshot`.
- Changed the Download HTML button to save the current `#main` snapshot through the API and log the saved file path.
- Kept the normal evidence capture path unchanged: screenshot capture still saves image, HTML, visible text, optional PDF, extracted products, and structured PDP details.
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
- Packaged `/api/dashboard` returned `1` project, `0` jobs, and `0` reports, confirming Prisma-backed runtime queries execute in the packaged app.
- Packaged app processes were stopped after verification.

## Generated Artifacts

- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe`
- `apps/desktop/release/Marketplace Intelligence OS Portable 1.0.0.exe`
- `apps/desktop/release/win-unpacked/Marketplace Intelligence OS.exe`
- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe.blockmap`

Artifact sizes:

- Setup installer: 153,514,761 bytes.
- Portable executable: 153,284,042 bytes.
- Unpacked executable: 201,233,920 bytes.

## Remaining Notes

- macOS artifacts must be verified on the GitHub Actions macOS runner.
- Shopee/TikTok login, captcha, verification, and protected pages remain user-controlled by design; the app does not bypass marketplace protections.
- Store Type image recognition is best-effort when Shopee exposes the Mall/Star badge only as pixels; persistence still rejects invalid Store Type labels.
- TikTok Shop adapter remains stubbed; Android evidence capture exists, but TikTok Shop navigation remains user-controlled.
