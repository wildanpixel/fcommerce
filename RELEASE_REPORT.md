# MarketPlace Keyword Competitor Analysis - Release Report

Release date: 2026-07-19

Version: 1.0.0

Local platform: Windows x64

Release task: Complete M2 guided Shopee evidence, M3 structured intelligence, customer review media extraction, and self-contained packaged PDF export

## Summary

This release completes M2 for the guided Shopee Desktop scope and M3 Intelligence. Review media collection now recognizes customer-attached images and videos across Shopee review-media containers while excluding profile avatars and account imagery. Missing media remains an explicit not-found outcome.

The analysis contract now includes executive summary, SWOT, pricing, store, competitor, visual, recommendation, and Key Store results. OpenAI and Gemini use the same validated structured schema, while the deterministic local provider supplies the complete contract when credentials are unavailable. HTML and DOCX reports render the intelligence module from persisted analysis data.

Windows packaging now stages Chrome Headless Shell 148.0.7778.97 as an Electron extra resource. The PDF exporter resolves that packaged executable before falling back to the development Puppeteer cache, so installer and portable report export are self-contained.

## Release Checklist

| Step | Result |
| --- | --- |
| Delete `dist` / `dist-node` / `release` | Passed before the clean build |
| Generate Prisma Client | Passed |
| TypeScript | Passed |
| ESLint | Passed |
| Unit tests | Passed: 8 files, 23 tests |
| Clean renderer/Electron build | Passed |
| Playwright smoke tests | Passed: 5 tests |
| Stage Puppeteer browser | Passed: Chrome Headless Shell 148.0.7778.97 for win32 x64 |
| Package Electron | Passed on the first and only attempt |
| Generate Windows Installer | Passed |
| Generate Windows Portable | Passed |
| Verify packaged Puppeteer executable | Passed in `win-unpacked/resources/puppeteer/win32-x64` |
| Generate PDF with packaged browser | Passed: non-empty 17,741-byte PDF |
| Launch unpacked Windows application | Passed; `/api/health` returned version 1.0.0 |
| Launch Windows Portable | Passed; `/api/health` returned version 1.0.0 |
| Verify SQLite initialization and Prisma queries | Passed: dashboard query returned 11 projects and 1 report |
| Generate macOS Intel App / DMG | Configured as a dedicated GitHub Actions `x64` job with matching browser staging |
| Generate macOS Apple Silicon App / DMG | Configured as a dedicated GitHub Actions `arm64` job with matching browser staging |
| Update changelog/status/roadmap | Completed |

## Validation Commands

- `pnpm prisma:generate`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @marketplace-intelligence-os/desktop exec playwright test`
- `pnpm --filter @marketplace-intelligence-os/desktop stage:puppeteer -- --platform=win32 --arch=x64`
- `pnpm --filter @marketplace-intelligence-os/desktop smoke:pdf-runtime`
- `pnpm --filter @marketplace-intelligence-os/desktop exec electron-builder --win --x64`
- `git diff --check`

## Windows Artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `MarketPlace Keyword Competitor Analysis Setup 1.0.0.exe` | 236,075,906 bytes | `561EBE5BFBD4F7CB5EBF8EAE4E3AE790101E8B69F9EA8E4FA6FC744D13DE9050` |
| `MarketPlace Keyword Competitor Analysis Portable 1.0.0.exe` | 235,845,519 bytes | `674F90B39FB2A7CEE7FBEC0259922B0E2582606225871FF8BF86CF7EC89F0030` |
| `win-unpacked/MarketPlace Keyword Competitor Analysis.exe` | 201,233,920 bytes | `6446799881667DD3716621E374F5AB002668D0A87EF166C01FE6D6CCE180A871` |

## macOS Delivery

GitHub Actions publishes separate downloadable packages from the same source commit:

- `marketplace-intelligence-os-macos-intel` for Intel Macs (`x64`).
- `marketplace-intelligence-os-macos-apple-silicon` for M1/M2/M3/M4 Macs (`arm64`).

Each macOS job stages a matching Chrome Headless Shell runtime before Electron packaging. The macOS packages remain unsigned and unnotarized; installation and Gatekeeper instructions are documented in `docs/MACOS_INSTALLATION.md`.

## Known Non-Blocking Notes

- Shopee login, captcha, verification, and source-markup changes remain user-controlled operational constraints; they are not bypassed.
- Analysis confidence depends on the evidence available to the local guided session.
- Vite reports an existing renderer chunk-size warning at approximately 583 kB; compilation and packaging pass.
- Electron Builder uses the default Electron icon because a signed production icon has not yet been configured.
- macOS binaries cannot be launched on this Windows workstation; Intel and Apple Silicon packages are built by the GitHub Actions macOS matrix.
