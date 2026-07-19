# MarketPlace Keyword Competitor Analysis - Release Report

Release date: 2026-07-19

Version: 1.0.0

Local platform: Windows x64

Release task: Project Inspector performance and synchronized disclosures, guided evidence recollection, reusable store evidence, and safe product/media filtering

## Summary

This release makes Keyword Project cards directly inspectable and prefetches bounded project detail data. Project evidence indexes are memoized, collapsed report sections defer heavy children, and evidence media loads lazily so large saved projects remain responsive.

Project Inspector disclosure state is now authoritative and shared between the outline and report. Clicking a parent outline row opens its subnavigation and matching main section; clicking it again closes both. Nested links open their exact nested report section, while the global outline hide/show button affects only outline visibility. Product Detail and Key Store actions can be reset and recollected, saved shop-home evidence is reused for Key Store homepage/popular/banner sections, Best Sellers remains the deliberate manual exception, review avatars are excluded from customer media, and `NOT FOR SALE` / `FREE GIFT` listings are rejected from normalized product evidence.

## Release Checklist

| Step | Result |
| --- | --- |
| Delete `dist` / `dist-node` / `release` | Passed before the clean build |
| Generate Prisma Client | Passed |
| TypeScript | Passed |
| ESLint | Passed |
| Unit tests | Passed: 6 files, 19 tests |
| Clean renderer/Electron build | Passed |
| Playwright smoke tests | Passed: 5 tests, including exact parent/nested outline synchronization and global outline independence |
| Package Electron | Passed on the first and only attempt |
| Generate Windows Installer | Passed |
| Generate Windows Portable | Passed |
| Verify packaged Prisma Client | Passed: `@prisma/client` is packaged and `.prisma/client` is present in `app.asar.unpacked` |
| Verify packaged Prisma engines | Passed: Windows, macOS Intel, and macOS Apple Silicon engines are unpacked |
| Launch unpacked Windows application | Passed; live responding Electron process tree confirmed |
| Launch Windows Portable | Passed; live responding Electron process tree confirmed |
| Verify SQLite initialization | Passed: production database present at the platform app-data location |
| Verify Prisma queries | Passed: Project, Product, Store, and Review counts executed successfully |
| Generate macOS Intel App / DMG | Configured as a dedicated GitHub Actions `x64` job |
| Generate macOS Apple Silicon App / DMG | Configured as a dedicated GitHub Actions `arm64` job |
| Update changelog/status/roadmap | Completed |

## Validation Commands

- `pnpm prisma:generate`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm exec playwright test e2e/smoke.spec.ts`
- `pnpm --filter @marketplace-intelligence-os/desktop exec electron-builder --win --x64`
- `git diff --check`

## Windows Artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `MarketPlace Keyword Competitor Analysis Setup 1.0.0.exe` | 147.47 MB | `6A92175B46FBDCC9FB8A93450ED9A9853CB1E0684B83E3DC60C8D15D091C2CC4` |
| `MarketPlace Keyword Competitor Analysis Portable 1.0.0.exe` | 147.25 MB | `327994398E69F4FEEFC5896BBCC0ACB5EE00A639473818F504BBC483DB53B3F4` |
| `win-unpacked/MarketPlace Keyword Competitor Analysis.exe` | 191.91 MB | `96EC7386131E1EAA7852A139BA6524A5307E5E18F392027EDA1B4448CFCBCB9F` |

## macOS Delivery

GitHub Actions publishes separate downloadable packages from the same source commit:

- `marketplace-intelligence-os-macos-intel` for Intel Macs (`x64`).
- `marketplace-intelligence-os-macos-apple-silicon` for M1/M2/M3/M4 Macs (`arm64`).

The macOS packages are currently unsigned and unnotarized. Installation and Gatekeeper instructions are documented in `docs/MACOS_INSTALLATION.md`.

## Packaged Database Smoke Query

The production SQLite database opened successfully through Prisma. Read-only counts returned 11 projects, 1,858 products, 97 stores, 349 reviews, 1,344 evidence assets, and 13 reports.

## Known Non-Blocking Notes

- Vite reports an existing renderer chunk-size warning at 581.15 kB; compilation and packaging pass.
- Electron Builder uses the default Electron icon because a signed production icon has not yet been configured.
- macOS binaries cannot be launched on this Windows workstation; both architectures are built and verified by the macOS GitHub Actions matrix.
