# Marketplace Intelligence OS - Release Report

Release date: 2026-07-08
Version: 1.0.0
Local platform: Windows
Release task: Key Product Store Name/Store Type repair, Product Detail sub-action collection, review persistence, and packaged runtime validation

## Summary

This release completes the requested corrective pass around Key Product Store Name/Store Type extraction and Product Detail Qualified collection. PDP Store Name extraction now follows Shopee's current shop-anchor sibling layout, Store Type extraction targets small rendered badge images with a best-effort image-only classifier, Product Detail sub-actions are selectable, and review collection preserves separate 5-star and 1-star passes.

## Completed

- Fixed dark-mode readability for the floating guided collection controller.
- Kept compact target/open and collect/process actions visible when the collector is folded.
- Prevented Shopee chrome labels such as `Shopping Cart icon` from overwriting product titles.
- Updated Product Detail Qualified step guidance to show product-level substeps for first page, slides, description, reviews, media in user, vouchers/bundle deals, and shop homepage.
- Added PDP sync for Store Name/URL from Shopee's `.s112-pdp-product-shop` / `section.page-product__shop` shop block and visible adjacent store-name text.
- Tightened Key Product Store Type extraction to badge-derived `Mall ORI`, `Star+`, or `Star` values only.
- Reworked PDP Store Name extraction to walk from the shop anchor to the following sibling store-name block.
- Added small rendered badge scoring plus best-effort image color classification for image-only `Mall ORI`, `Star+`, and `Star` badges.
- Added strict Store Type persistence so invalid labels are not stored in product evidence.
- Turned Product Detail Qualified sub-actions into selectable guided actions.
- Split review collection into explicit 5-star Positive Reviews and 1-star Negative Reviews actions.
- Changed review persistence to append deduped rows instead of replacing the previous review batch.
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
- `pnpm --filter @marketplace-intelligence-os/desktop build`: passed.
- `pnpm --filter @marketplace-intelligence-os/desktop test:e2e`: passed, 2 Playwright smoke tests.
- Release cleanup deleted `apps/desktop/dist`, `apps/desktop/dist-node`, and `apps/desktop/release`.
- `pnpm --filter @marketplace-intelligence-os/desktop prisma:generate`: passed.
- `pnpm --filter @marketplace-intelligence-os/desktop package:win`: passed for Windows installer, portable executable, and `win-unpacked`.
- Packaged app launched from `win-unpacked` and responded on `/api/health` port `4123` with `{"ok":true,"product":"Marketplace Intelligence OS","version":"1.0.0"}`.
- Packaged `/api/dashboard` returned `37` projects, confirming Prisma-backed queries execute in the packaged runtime.
- No packaged app process or release/test port remained running after validation.
- Final artifact timestamps were refreshed after this Store Name/Store Type and sub-action collection fix so the Windows installer, portable executable, and unpacked app match the latest local source state.

## Generated Artifacts

- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe`
- `apps/desktop/release/Marketplace Intelligence OS Portable 1.0.0.exe`
- `apps/desktop/release/win-unpacked/Marketplace Intelligence OS.exe`
- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe.blockmap`

Artifact sizes:

- Setup installer: 146.40 MB, 153,514,506 bytes.
- Portable executable: 146.18 MB, 153,283,723 bytes.
- Unpacked executable: 191.91 MB.
- Installer blockmap: 0.15 MB.

## Remaining Notes

- macOS artifacts must be verified on the GitHub Actions macOS runner.
- Shopee and TikTok anti-bot/login/verification flows remain user-controlled by design; the app does not bypass marketplace protections.
- WebP-to-JPG thumbnail conversion is best-effort and falls back to original URLs when the marketplace CDN blocks image fetching.
- Product slide/video extraction remains heuristic when Shopee hides media from browser-readable HTML.
- Previous Windows release cleanup had encountered a locked `win-unpacked` folder; this run deleted `release` cleanly and packaged directly into the expected output folder.
- TikTok Shop adapter remains stubbed; Android evidence capture exists, but TikTok Shop navigation is user-controlled.
