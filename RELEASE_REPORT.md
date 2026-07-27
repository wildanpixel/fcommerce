# MarketPlace Keyword Competitor Analysis - Release Report

Release date: 2026-07-27

Version: 1.0.0

Local platform: Windows x64

Release task: Publish a verified Windows installer and portable build, and disable public macOS artifacts until the macOS renderer is revalidated with Xcode.

## Summary

The Windows installer, portable executable, and unpacked application were generated in one packaging attempt from the current application source. The packaged Chrome Headless Shell and Prisma query engine are included in the release resources.

Both the unpacked application and portable executable were launched with isolated application-data directories. Their packaged API health checks returned version 1.0.0, and their settings queries completed through the packaged Prisma and SQLite runtime.

GitHub Actions now publishes the Windows portable executable and SHA-256 checksum for version tags. Public macOS artifacts are intentionally disabled until Intel and Apple Silicon builds can be configured, launched, and renderer-tested in Xcode on macOS hardware.

## Release Checklist

| Step | Result |
| --- | --- |
| Delete `dist` / `dist-node` / `release` | Passed after closing the prior portable process |
| Generate Prisma Client | Passed |
| TypeScript | Passed |
| ESLint | Passed |
| Unit tests | Passed: 11 files, 31 tests |
| Clean renderer/Electron build | Passed |
| Playwright tests | Passed: 5 tests |
| Stage Puppeteer browser | Passed: Chrome Headless Shell 148.0.7778.97 for win32 x64 |
| Package Electron | Passed on the first and only attempt |
| Generate Windows Installer | Passed |
| Generate Windows Portable | Passed |
| Verify packaged Prisma engine | Passed in `app.asar.unpacked/node_modules/.prisma/client` |
| Verify packaged Puppeteer executable | Passed in `win-unpacked/resources/puppeteer/win32-x64` |
| Generate PDF with packaged browser | Passed: non-empty 17,741-byte PDF |
| Launch unpacked Windows application | Passed; `/api/health` returned version 1.0.0 |
| Launch Windows Portable | Passed; `/api/health` returned version 1.0.0 |
| Verify SQLite initialization and Prisma query | Passed; `/api/settings` returned marketplace `SHOPEE_ID` |
| Generate macOS App / DMG | Intentionally disabled from public CI delivery pending Xcode/runtime validation |
| Update release documentation | Completed |

## Validation Commands

- `pnpm clean`
- `pnpm prisma:generate`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm package:win`
- `pnpm --filter @marketplace-intelligence-os/desktop exec playwright test`
- `pnpm --filter @marketplace-intelligence-os/desktop smoke:pdf-runtime`
- Packaged `/api/health` and `/api/settings` requests for unpacked and portable runtimes
- `git diff --check`

## Windows Artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `MarketPlace Keyword Competitor Analysis Setup 1.0.0.exe` | 236,083,465 bytes | `19BE01B22B649998AEF96068AA6B6CEBDCF61EFE0F6EA1FE9E6FB069681D21CC` |
| `MarketPlace Keyword Competitor Analysis Portable 1.0.0.exe` | 235,853,174 bytes | `8C4B0943D0D45955E87CC82A2A54D49E5AEEC8469E80FF971967B387AC289301` |
| `win-unpacked/MarketPlace Keyword Competitor Analysis.exe` | 201,233,920 bytes | `004F9358889718DCF3FA8B18957980F504B4336B8B4746F304183880A317FA80` |

## GitHub Delivery

Version tags matching `v*` run the Windows release workflow. A successful tagged workflow creates a GitHub Release containing:

- `MarketPlace Keyword Competitor Analysis Portable 1.0.0.exe`
- `MarketPlace Keyword Competitor Analysis Portable 1.0.0.sha256`

The installer and unpacked directory remain local build artifacts. The portable executable is the supported public download.

## macOS Delivery

Public macOS downloads are disabled. The shared Electron source and local `package:mac` configuration remain available, but macOS packages must not be published until both Intel and Apple Silicon builds pass Xcode configuration, renderer launch, signing/notarization preparation, and packaged-runtime validation on macOS.

## Known Non-Blocking Notes

- Shopee login, captcha, verification, and source-markup changes remain user-controlled operational constraints; they are not bypassed.
- Vite reports an existing renderer chunk-size warning at approximately 607 kB; compilation and packaging pass.
- Electron Builder uses the default Electron icon because a signed production icon has not yet been configured.
- The plain-Node PDF smoke script requires `MIO_PUPPETEER_EXECUTABLE_PATH`; packaged Electron resolves its staged browser through `process.resourcesPath`.
