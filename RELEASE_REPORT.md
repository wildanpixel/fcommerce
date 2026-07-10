# Marketplace Intelligence OS - Release Report

Release date: 2026-07-10
Version: 1.0.0
Local platform: Windows
Release task: Product Detail collection evidence correctness

## Summary

This release fixes the Product Detail collection path. Shop Home Page captures now use full-page screenshots, Part 2 target navigation is owned by each sub-action, Shopee descriptions preserve readable line breaks and description images, and review extraction/display is limited to clean Shopee review rows: 3 positive and 2 low-star negative samples.

## Completed

- Added per-sub-action screenshot mode so First Page remains viewport-only while Shop Home Page captures full-page evidence.
- Moved Part 2 Open Target behavior into each sub-action row and kept folded collector target/action controls aligned with the selected sub-action.
- Preserved Shopee description formatting from rendered HTML and persisted description images into product raw evidence.
- Added Project Inspector rendering for collected description images.
- Tightened review parsing to require dated Shopee review rows and support negative review collection from 1-star, 2-star, or 3-star tabs.
- Stopped Product Detail review sub-actions from saving fallback page text when clean review rows are not found.
- Updated `CHANGELOG.md`, `IMPLEMENTATION_STATUS.md`, `ROADMAP.md`, and this release report.

## Release Checklist

| Step | Result |
| --- | --- |
| Delete `dist` | Completed |
| Delete `dist-node` | Completed |
| Delete `release` | Attempted; previous portable executable was locked, then packaging completed successfully without another rebuild loop |
| Generate Prisma | Completed through `scripts/generatePrismaClient.mjs` |
| Clean build | Completed |
| Package Electron | Completed |
| Generate Windows Installer | Completed: `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe` |
| Generate Windows Portable | Completed: `apps/desktop/release/Marketplace Intelligence OS Portable 1.0.0.exe` |
| Generate macOS App | Not run locally on Windows; configured for GitHub Actions macOS runner |
| Generate macOS DMG | Not run locally on Windows; configured for GitHub Actions macOS runner |
| Launch packaged application automatically | Completed from `apps/desktop/release/win-unpacked/Marketplace Intelligence OS.exe` |
| Verify UI reflects latest implementation | Completed through TypeScript, lint, unit tests, Playwright smoke tests, production build, and packaged startup smoke |
| Verify packaged application version | Completed by packaging `1.0.0` artifacts from the current source tree |
| Update changelog | Completed |
| Commit | Pending this release commit |
| Push | Pending this release commit |
| Verify GitHub Actions | Pending after push |

## Local Validation

- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm test`: passed, 6 files and 14 tests.
- `pnpm build`: passed.
- `pnpm test:e2e`: passed, 2 Playwright smoke tests.
- `pnpm prisma:generate`: passed.
- `pnpm package:win`: passed for Windows installer, portable executable, and `win-unpacked`.
- Packaged app launched from `apps/desktop/release/win-unpacked/Marketplace Intelligence OS.exe` and stayed running for the startup smoke check.

## Generated Artifacts

- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe`
- `apps/desktop/release/Marketplace Intelligence OS Portable 1.0.0.exe`
- `apps/desktop/release/win-unpacked/Marketplace Intelligence OS.exe`
- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe.blockmap`

Artifact sizes:

- Setup installer: 153,519,244 bytes.
- Portable executable: 153,288,527 bytes.
- Unpacked executable: 201,233,920 bytes.

## GitHub Verification

- Pending after this release commit is pushed.

## Remaining Notes

- macOS artifacts must be verified on the GitHub Actions macOS runner.
- Products without clean review rows on the selected Shopee review tab will save no review rows for that sub-action instead of guessing from page text.
- Shopee/TikTok login, captcha, verification, and protected pages remain user-controlled by design; the app does not bypass marketplace protections.
- Store Type image recognition remains best-effort when Shopee exposes the Mall/Star badge only as pixels.
- TikTok Shop adapter remains stubbed; Android evidence capture exists, but TikTok Shop navigation remains user-controlled.
