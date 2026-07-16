# MarketPlace Keyword Competitor Analysis - Release Report

Release date: 2026-07-17

Version: 1.0.0

Local platform: Windows x64

Release task: Collection outcome reliability, Project Inspector navigation, Part 3 performance, and category bulk reports

## Summary

This release fixes the confirmed post-deletion keyboard-focus regression and records missing Product Detail evidence explicitly instead of leaving ambiguous empty states. Review media is restricted to customer review attachments, seller-response text is removed from review samples, product rows navigate to their target PDPs, and compact success/not-found notifications follow collection actions.

Project Inspector now starts collapsed, opens and scrolls the hierarchy selected from its outline, lazy-loads evidence media, and applies smooth disclosure/title transitions. Data-only Part 3 Popular Products, Best Sellers, and Visual Shop Banner collection avoids unnecessary large HTML serialization. Reports add a four-stage bulk workflow that selects category, projects, DOCX/PDF/HTML formats, and custom sections before producing a category-named ZIP.

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
| Launch unpacked Windows application | Passed; live Electron process tree confirmed after 12 seconds |
| Launch Windows Portable | Passed; live Electron process tree confirmed after 18 seconds |
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
| `MarketPlace Keyword Competitor Analysis Setup 1.0.0.exe` | 147.46 MB | `40BBA582E771C480594D45E54869DB90A5CC2326CEA8DA39B133BD4CCAA80C8F` |
| `MarketPlace Keyword Competitor Analysis Portable 1.0.0.exe` | 147.24 MB | `C6885AA92FA2A678F70594A85C9A5F463E7BE3BBF27BDB04C1C27408A232BB6A` |
| `win-unpacked/MarketPlace Keyword Competitor Analysis.exe` | 191.91 MB | `3E3756D807964C2AC27619BB0F03B818F2743EAE583F237CD261763897B3E1C2` |

## macOS Delivery

GitHub Actions publishes separate downloadable packages from the same source commit:

- `marketplace-intelligence-os-macos-intel` for Intel Macs (`x64`).
- `marketplace-intelligence-os-macos-apple-silicon` for M1/M2/M3/M4 Macs (`arm64`).

The macOS packages are currently unsigned and unnotarized. Installation and Gatekeeper instructions are documented in `docs/MACOS_INSTALLATION.md`.

## Known Non-Blocking Notes

- Vite reports an existing renderer chunk-size warning at 570.69 kB; compilation and packaging pass.
- Electron Builder uses the default Electron icon because a signed production icon has not yet been configured.
- macOS binaries cannot be launched on this Windows workstation; both architectures are built and verified by the macOS GitHub Actions matrix.
