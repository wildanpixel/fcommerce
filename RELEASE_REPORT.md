# Marketplace Intelligence OS - Release Report

Release date: 2026-07-08
Version: 1.0.0
Local platform: Windows
Release task: Key Product store sync, Product Detail Qualified previews, Evaluation Phase collection flow, sticky navigation, and packaged runtime validation

## Summary

This release completes the requested corrective pass around the guided browser collector, Key Product table, and project inspection workflow. The floating collector is readable in dark mode, compact mode still exposes the target and collect/process actions, Product Detail Qualified steps preserve real product titles, PDP sync records store and promotion signals where visible, search Store Type is constrained to valid Shopee badges, and Evaluation Phase now opens inside the collection workspace before promoting the top Potential Store into Key Store.

## Completed

- Fixed dark-mode readability for the floating guided collection controller.
- Kept compact target/open and collect/process actions visible when the collector is folded.
- Prevented Shopee chrome labels such as `Shopping Cart icon` from overwriting product titles.
- Updated Product Detail Qualified step guidance to show product-level substeps for first page, slides, description, reviews, media in user, vouchers/bundle deals, and shop homepage.
- Added PDP sync for Store Name/URL from Shopee's `.s112-pdp-product-shop` / `section.page-product__shop` shop block and visible adjacent store-name text.
- Tightened Key Product Store Type extraction to badge-derived `Mall ORI`, `Star+`, or `Star` values only.
- Added Collection Progress previews for active product-detail evidence, including screenshot/media/review/description/promotion/shop-homepage status.
- Added PDP raw evidence for shop vouchers, bundle deals, promotion count, videos, review rows, and review media where browser-readable HTML exposes them.
- Removed the standalone Key Stores navigation tab; Key Store remains inside Project Inspector.
- Changed Evaluation Phase labels to `Potential Store`, moved the AI scoring action into Evaluation Phase, and made the phase reviewable without leaving the collection workspace.
- Added project-level Key Store subsections for Overall, Store Home Page, Products, Best Sellers, and Visual Style.
- Made the main sidebar sticky and made Project Inspector outline navigation sticky, grouped, collapsible, and readable in light-mode hover states.
- Restored Vite and Vitest config files while keeping deterministic CLI flags for build/test scripts.
- Stabilized Playwright smoke tests by running isolated API/web servers on test-only ports and test app-data/cache folders.
- Fixed the macOS artifact workflow unit-test failure by moving Vitest excludes into `vitest.config.ts` and removing unquoted shell globs from the test script.
- Added a Prisma generate wrapper that only reuses an existing Windows generated client when schema and engine verification pass.
- Updated implementation status, roadmap, changelog, and release report.

## Release Checklist

| Step | Result |
| --- | --- |
| Delete `dist` | Completed |
| Delete `dist-node` | Completed |
| Delete `release` | Partially completed: Windows kept an empty `release/win-unpacked` directory locked by an external handle |
| Generate Prisma | Completed through `scripts/generatePrismaClient.mjs` |
| Clean build | Completed |
| Package Electron | Completed |
| Generate Windows Installer | Completed: `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe` |
| Generate Windows Portable | Completed: `apps/desktop/release/Marketplace Intelligence OS Portable 1.0.0.exe` |
| Generate macOS App | Not run locally on Windows; configured for GitHub Actions macOS runner |
| Generate macOS DMG | Not run locally on Windows; configured for GitHub Actions macOS runner |
| Launch packaged application automatically | Completed from `apps/desktop/release/win-unpacked/Marketplace Intelligence OS.exe` |
| Verify UI reflects latest implementation | Completed through clean renderer build, Playwright smoke tests, packaged startup, and fresh artifact timestamps |
| Verify packaged application version | Completed: `/api/health` returned version `1.0.0` |
| Update changelog | Completed |
| Commit | Completed by the Git commit containing this report |
| Push | Completed when this release commit is pushed to `origin/main` |
| Verify GitHub Actions | CI must pass and Build Desktop Artifacts must complete for the pushed release commit |

## Local Validation

- `pnpm --filter @marketplace-intelligence-os/desktop typecheck`: passed.
- `pnpm --filter @marketplace-intelligence-os/desktop lint`: passed.
- `pnpm --filter @marketplace-intelligence-os/desktop test`: passed, 5 files and 12 tests.
- `pnpm --filter @marketplace-intelligence-os/desktop test` after macOS CI script fix: passed, 5 files and 12 tests.
- `pnpm --filter @marketplace-intelligence-os/desktop build`: passed.
- `pnpm --filter @marketplace-intelligence-os/desktop exec playwright test`: passed, 2 Playwright tests.
- `pnpm --filter @marketplace-intelligence-os/desktop run build`: passed before final packaging.
- `pnpm --filter @marketplace-intelligence-os/desktop exec electron-builder --win --x64 --config.directories.output=release-fresh`: passed for the final Windows package.
- Fresh `release-fresh` artifacts were copied into the expected `apps/desktop/release` paths; temporary `release-fresh` output was removed afterward.
- Packaged app launched from `win-unpacked` and responded on `/api/health` port `4123` with `{"ok":true,"product":"Marketplace Intelligence OS","version":"1.0.0"}`.
- Packaged `/api/dashboard` returned project data, confirming Prisma-backed queries execute in the packaged runtime.
- No packaged app process or release/test port remained running after validation.
- Final artifact timestamps were refreshed after the macOS CI script fix so the Windows installer, portable executable, and unpacked app match the latest local source state.

## Generated Artifacts

- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe`
- `apps/desktop/release/Marketplace Intelligence OS Portable 1.0.0.exe`
- `apps/desktop/release/win-unpacked/Marketplace Intelligence OS.exe`
- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe.blockmap`

Artifact sizes:

- Setup installer: 146.40 MB.
- Portable executable: 146.18 MB.
- Unpacked executable: 191.91 MB.
- Installer blockmap: 0.15 MB.

## Remaining Notes

- macOS artifacts must be verified on the GitHub Actions macOS runner.
- Shopee and TikTok anti-bot/login/verification flows remain user-controlled by design; the app does not bypass marketplace protections.
- WebP-to-JPG thumbnail conversion is best-effort and falls back to original URLs when the marketplace CDN blocks image fetching.
- Product slide/video extraction remains heuristic when Shopee hides media from browser-readable HTML.
- A Windows directory handle locked the empty `apps/desktop/release/win-unpacked` folder during local cleanup. Packaging was completed in a fresh side output and copied into the expected release paths after verifying the destination accepted writes.
- TikTok Shop adapter remains stubbed; Android evidence capture exists, but TikTok Shop navigation is user-controlled.
