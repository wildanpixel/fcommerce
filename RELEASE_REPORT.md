# Marketplace Intelligence OS - Release Report

Release date: 2026-07-09
Version: 1.0.0
Local platform: Windows
Release task: Product Detail collection UX refinement and packaged runtime validation

## Summary

This release improves the guided Product Detail collection workflow. Users can now jump between Part 1, Part 2, and Part 3 from Collection Progress, use compact Product Detail sub-action controls instead of long instruction blocks, inspect richer active-product previews before continuing, zoom screenshot review previews with wheel/trackpad gestures, and return automatically to Project Inspector after Product Details completion.

## Completed

- Added Part 1/Part 2/Part 3 navigation inside Collection Progress.
- Replaced long Product Detail instruction lists in the floating collector and progress panel with compact sub-action controls.
- Added active-product previews for store, store type, rating, reviews, sold text, media counts, description snippets, and review rows.
- Added screenshot review zoom controls plus mouse-wheel/trackpad pinch zoom behavior.
- Auto-closes the browser collection workspace after Product Details completion and opens the Project Inspector for the same project.
- Updated `CHANGELOG.md`, `IMPLEMENTATION_STATUS.md`, `ROADMAP.md`, and this release report.

## Release Checklist

| Step | Result |
| --- | --- |
| Delete `dist` | Completed |
| Delete `dist-node` | Completed |
| Delete `release` | Completed after stopping stale packaged app processes |
| Generate Prisma | Completed through `scripts/generatePrismaClient.mjs` |
| Clean build | Completed |
| Package Electron | Completed |
| Generate Windows Installer | Completed: `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe` |
| Generate Windows Portable | Completed: `apps/desktop/release/Marketplace Intelligence OS Portable 1.0.0.exe` |
| Generate macOS App | Not run locally on Windows; configured for GitHub Actions macOS runner |
| Generate macOS DMG | Not run locally on Windows; configured for GitHub Actions macOS runner |
| Launch packaged application automatically | Completed from `apps/desktop/release/win-unpacked/Marketplace Intelligence OS.exe` |
| Verify UI/API reflects latest implementation | Completed through TypeScript, lint, unit tests, Playwright smoke tests, built renderer string verification, and packaged API startup |
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
- `pnpm --filter @marketplace-intelligence-os/desktop prisma:generate`: passed.
- `pnpm --filter @marketplace-intelligence-os/desktop exec electron-builder --win --x64`: passed for Windows installer, portable executable, and `win-unpacked`.
- Packaged app launched from `win-unpacked` and responded on `/api/health` port `4123` with `ok=true`, product `Marketplace Intelligence OS`, and version `1.0.0`.
- Packaged `/api/dashboard` returned `4` projects and `0` jobs, confirming Prisma-backed runtime queries execute in the packaged app.
- Built renderer bundle contains the new Part 1/Part 2/Part 3 navigation and screenshot zoom UI strings.
- Packaged app processes were stopped after verification.

## Generated Artifacts

- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe`
- `apps/desktop/release/Marketplace Intelligence OS Portable 1.0.0.exe`
- `apps/desktop/release/win-unpacked/Marketplace Intelligence OS.exe`
- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe.blockmap`

Artifact sizes:

- Setup installer: 153,517,156 bytes.
- Portable executable: 153,286,437 bytes.
- Unpacked executable: 201,233,920 bytes.

## GitHub Verification

- Pending after this release commit is pushed.

## Remaining Notes

- macOS artifacts must be verified on the GitHub Actions macOS runner.
- Products without captured PDP HTML still need Product Detail Qualified evidence before Store Name, Store URL, reviews, and media previews can be fully populated.
- Shopee/TikTok login, captcha, verification, and protected pages remain user-controlled by design; the app does not bypass marketplace protections.
- Store Type image recognition remains best-effort when Shopee exposes the Mall/Star badge only as pixels.
- TikTok Shop adapter remains stubbed; Android evidence capture exists, but TikTok Shop navigation remains user-controlled.
