# MarketPlace Keyword Competitor Analysis - Release Report

Release date: 2026-07-17

Version: 1.0.0

Local platform: Windows x64

Release task: Guided evidence reliability, exact Project Inspector navigation, explicit AI scoring, reusable Part 3 store evidence, and category bulk reports

## Summary

This release fixes the confirmed post-deletion keyboard-focus regression and records missing Product Detail evidence explicitly instead of leaving ambiguous empty states. Review media is restricted to customer review attachments, review samples stop before seller responses and `Report Abuse`, product rows navigate to their target PDPs, and compact three-second success/not-found notifications follow collection actions.

Project Inspector now starts collapsed, opens and scrolls the exact parent/child hierarchy selected from its outline, lazy-loads evidence media, uses a compact sticky header, and applies smooth disclosure/title transitions. Evaluation remains unscored until the user explicitly runs AI scoring; Part 3 reuses existing Product Detail store-home HTML/assets and bounds Best Seller collection time. Reports provide separate Single and Bulk tabs plus a four-stage bulk workflow that produces category-named ZIP files with persisted download history.

## Release Checklist

| Step | Result |
| --- | --- |
| Delete `dist` / `dist-node` / `release` | Passed before the clean build |
| Generate Prisma Client | Passed |
| TypeScript | Passed |
| ESLint | Passed |
| Unit tests | Passed: 6 files, 19 tests |
| Clean renderer/Electron build | Passed |
| Playwright smoke tests | Passed: 4 tests |
| Package Electron | Passed on the first and only attempt |
| Generate Windows Installer | Passed |
| Generate Windows Portable | Passed |
| Verify packaged Prisma Client | Passed: `@prisma/client` and `.prisma/client` are present in `app.asar` |
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
| `MarketPlace Keyword Competitor Analysis Setup 1.0.0.exe` | 147.47 MB | `07B1C3085DC81AD1657E0272A64329E5767C2F10B5F45D5797D51FEB196823EF` |
| `MarketPlace Keyword Competitor Analysis Portable 1.0.0.exe` | 147.25 MB | `4B697658BAEFD1C981A9C5134973523D3AF6D1F1AAC57F11AF4BA2844984F194` |
| `win-unpacked/MarketPlace Keyword Competitor Analysis.exe` | 191.91 MB | `0D1174DB649473E32E46B97E9422A0A39F0D8AA43230BC2860A62DE7D3485E1D` |

## macOS Delivery

GitHub Actions publishes separate downloadable packages from the same source commit:

- `marketplace-intelligence-os-macos-intel` for Intel Macs (`x64`).
- `marketplace-intelligence-os-macos-apple-silicon` for M1/M2/M3/M4 Macs (`arm64`).

The macOS packages are currently unsigned and unnotarized. Installation and Gatekeeper instructions are documented in `docs/MACOS_INSTALLATION.md`.

## Packaged Database Smoke Query

The production SQLite database opened successfully through Prisma after launch. Read-only counts returned 8 projects, 1,285 products, 72 stores, and 201 reviews.

## Known Non-Blocking Notes

- Vite reports an existing renderer chunk-size warning at 576.34 kB; compilation and packaging pass.
- Electron Builder uses the default Electron icon because a signed production icon has not yet been configured.
- macOS binaries cannot be launched on this Windows workstation; both architectures are built and verified by the macOS GitHub Actions matrix.
