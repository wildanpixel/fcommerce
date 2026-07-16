# MarketPlace Keyword Competitor Analysis - Release Report

Release date: 2026-07-16

Version: 1.0.0

Local platform: Windows x64

Release task: Guided collection reliability, pricing accuracy, project deletion recovery, and dual-architecture macOS delivery

## Summary

This release fixes the confirmed collection and desktop workflow defects: Indonesian price parsing now preserves full grouped Rupiah values and uses the lower value of product price ranges, Part 1 advances from Relevance to Top Sales with target validation, missing evidence receives an explicit failed state, and Product Detail next actions follow the guided sequence. Project deletion no longer leaves New Research inputs unresponsive, and collection exit returns to the current project inspector.

The browser fullscreen layout no longer overlays Shopee content, unnecessary text/print controls were removed, notifications time out consistently, and Settings now links to official OpenAI and Gemini API-key guidance. GitHub Actions packages macOS independently for Intel (`x64`) and Apple Silicon (`arm64`).

## Release Checklist

| Step | Result |
| --- | --- |
| Delete `dist` / `dist-node` / `release` | Passed before the clean build |
| Generate Prisma Client | Passed |
| TypeScript | Passed |
| ESLint | Passed |
| Unit tests | Passed: 6 files, 19 tests |
| Clean renderer/Electron build | Passed |
| Playwright smoke tests | Passed: 3 tests |
| Package Electron | Passed |
| Generate Windows Installer | Passed |
| Generate Windows Portable | Passed |
| Launch unpacked Windows application | Passed; process remained alive after 10 seconds |
| Launch Windows Portable | Passed; launcher remained alive after 15 seconds |
| Generate macOS Intel App / DMG | Configured as a dedicated GitHub Actions `x64` job |
| Generate macOS Apple Silicon App / DMG | Configured as a dedicated GitHub Actions `arm64` job |
| Update changelog/status/roadmap | Completed |

## Validation Commands

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @marketplace-intelligence-os/desktop exec playwright test e2e/smoke.spec.ts`
- `pnpm --filter @marketplace-intelligence-os/desktop exec electron-builder --win --x64`
- `git diff --check`

## Windows Artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `MarketPlace Keyword Competitor Analysis Setup 1.0.0.exe` | 147.46 MB | `AF14E67C6E8CEF908AFB941FC3F1D75C13E77FE8129527ADD68B448F84CE7C99` |
| `MarketPlace Keyword Competitor Analysis Portable 1.0.0.exe` | 147.24 MB | `42670EABA879220BC9EBC05EC6886E42F8071181D003404266683181324EF9DF` |
| `win-unpacked/MarketPlace Keyword Competitor Analysis.exe` | 191.91 MB | `3CD8AC9563033BE3C69C1709F7332C2AC2AECF9D6EB653F247439C6908C2DB85` |

## macOS Delivery

GitHub Actions publishes two separate downloadable artifacts so users do not need to run a Windows portable executable on macOS:

- `marketplace-intelligence-os-macos-intel` for Intel Macs.
- `marketplace-intelligence-os-macos-apple-silicon` for M1/M2/M3/M4 Macs.

The macOS packages are currently unsigned and unnotarized. Installation and Gatekeeper instructions are documented in `docs/MACOS_INSTALLATION.md`.

## Known Non-Blocking Notes

- Vite reports an existing renderer chunk-size warning at approximately 562 kB; this does not fail compilation or packaging.
- Electron Builder uses the default Electron icon because a signed production icon has not yet been configured.
