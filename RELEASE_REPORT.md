# MarketPlace Keyword Competitor Analysis - Release Report

Release date: 2026-07-13
Version: 1.0.0
Local platform: Windows
Release task: startup polish, collection UX fixes, weighted Key Product ranking, and packaged validation

## Summary

This release adds the animated startup pre-screen, improves light/dark collection UI consistency, fixes expanded-browser rendering, hardens project deletion, and reworks Key Product Top 10 selection with weighted commercial scoring across relevance, monthly sales, total sales, commercial value, thumbnail quality, duplicates, and data confidence.

## Completed

- Added startup animation with product identity and Wildan Ega Pradana attribution.
- Moved the collection Activity control beside the light/dark control.
- Added collapse/uncollapse transitions and circular icon-only controls.
- Fixed the expanded browser state so the embedded browser remains visible full screen.
- Hardened Keyword Project deletion with exact title confirmation and explicit dependent-data cleanup.
- Added screenshot review zoom limits up to 400%, explicit select-area mode, and grab/pan cursor behavior.
- Made capture status notifications readable with glass backgrounds.
- Added minimum-purchase/gift promotion capture to Product Detail background sync.
- Reworked Key Product Top 10 selection so Monthly Sold comes from Top Sales, Total Sold comes from Relevance/PDP-enriched evidence, and final ranking follows weighted commercial scoring rather than simple sales sorting.

## Release Checklist

| Step | Result |
| --- | --- |
| Delete `dist` | Completed |
| Delete `dist-node` | Completed |
| Delete `release` | Completed after stopping stale packaged app processes |
| Generate Prisma | Passed |
| TypeScript | Passed |
| ESLint | Passed |
| Unit tests | Passed |
| Clean build | Passed |
| Playwright tests | Passed |
| Package Electron | Passed through `electron-builder --win --x64` |
| Generate Windows Installer | Completed |
| Generate Windows Portable | Completed |
| Generate macOS App | Not available locally on Windows; configured for GitHub Actions macOS runner |
| Generate macOS DMG | Not available locally on Windows; configured for GitHub Actions macOS runner |
| Launch packaged application automatically | Passed with `win-unpacked/MarketPlace Keyword Competitor Analysis.exe` |
| Verify packaged application version | Passed: `/api/health` returned version `1.0.0` |
| Verify database initialization | Passed: packaged `/api/settings` and `/api/dashboard` returned data through Prisma |
| Update changelog | Completed |
| Commit | Completed |
| Push | Completed |
| Verify GitHub Actions | Passed for CI and Build Desktop Artifacts |

## Local Validation

- `pnpm --filter desktop prisma:generate`: passed.
- `pnpm --filter desktop typecheck`: passed.
- `pnpm --filter desktop lint`: passed.
- `pnpm --filter desktop test`: passed, 6 test files and 14 tests.
- `pnpm --filter desktop build`: passed.
- `pnpm --filter desktop exec playwright test`: passed, 2 Playwright smoke tests.
- `pnpm --filter desktop exec electron-builder --win --x64`: passed.
- Packaged startup smoke: passed; `/api/health` returned `{"ok":true,"product":"MarketPlace Keyword Competitor Analysis","version":"1.0.0"}`.
- Packaged database smoke: passed; `/api/settings` returned `SHOPEE_ID` and `/api/dashboard` returned 11 projects and 2 completed reports.
- GitHub Actions: passed for `CI` and `Build Desktop Artifacts`.

## Generated Artifacts

- `apps/desktop/release/MarketPlace Keyword Competitor Analysis Setup 1.0.0.exe` - 154,619,295 bytes.
- `apps/desktop/release/MarketPlace Keyword Competitor Analysis Portable 1.0.0.exe` - 154,389,008 bytes.
- `apps/desktop/release/win-unpacked/MarketPlace Keyword Competitor Analysis.exe` - 201,233,920 bytes.

## Remaining Notes

- Existing saved projects with older evidence must be recollected if the user wants the newest weighted Top 10 logic and expanded first-page product pools applied to that data.
- macOS artifacts must be produced and verified on the GitHub Actions macOS runner.
- Shopee login, captcha, verification, and protected pages remain user-controlled by design.
