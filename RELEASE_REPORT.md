# MarketPlace Keyword Competitor Analysis - Release Report

Release date: 2026-07-14
Version: 1.0.0
Local platform: Windows
Release task: Report Preview viewport fix, macOS install guide, and packaged validation

## Summary

This release fixes the Report Preview modal that could render off-screen when opened from the animated Reports page. The preview now renders through an app-root portal, stays constrained to the Electron viewport, keeps the header and close action visible, and supports Escape-to-close.

It also documents the macOS distribution path through GitHub Actions artifacts, including Apple Silicon and Intel DMG selection, Gatekeeper handling for the current unsigned build, and macOS application data locations.

## Completed

- Portaled Report Preview outside the animated page wrapper into the app root so fixed positioning uses the full viewport.
- Changed the preview modal to a viewport-safe scroll container with an internal iframe area and sticky header.
- Replaced the text-only Close action with a circular icon close button and added Escape-to-close keyboard behavior.
- Added light/dark preview header styles and iframe height rules so the preview remains readable in either theme.
- Added `docs/MACOS_INSTALLATION.md` and linked it from the README and cross-platform documentation.
- Preserved the existing report, collection, marketplace data, and project-management behavior.

## Release Checklist

| Step | Result |
| --- | --- |
| Delete `dist` / `dist-node` / `release` | Completed through `npm run clean` |
| Generate Prisma | Passed through build/package scripts |
| TypeScript | Passed |
| ESLint | Passed |
| Unit tests | Passed |
| Clean build | Passed |
| Playwright tests | Passed |
| Package Electron | Completed for Windows installer, unpacked app, and portable |
| Generate Windows Installer | Completed |
| Generate Windows Portable | Completed after allowing the 7-Zip payload compression step to finish |
| Generate macOS App / DMG | Not available locally on Windows; configured for GitHub Actions macOS runner |
| Launch packaged application automatically | Passed with `win-unpacked/MarketPlace Keyword Competitor Analysis.exe` |
| Update changelog/status/roadmap | Completed |

## Local Validation

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: passed, 6 test files and 14 tests.
- `npm run build`: passed.
- `npm run test:e2e`: passed, 2 Playwright smoke tests.
- `npm run clean; npm run package:win`: passed and generated fresh Windows installer, unpacked app, and portable executable.
- Packaged startup smoke: passed; `win-unpacked/MarketPlace Keyword Competitor Analysis.exe` launched and stayed alive for the startup window.
- Portable startup smoke: passed; `MarketPlace Keyword Competitor Analysis Portable 1.0.0.exe` launched and spawned the app process with the expected window title.

## Generated Artifacts

- `apps/desktop/release/MarketPlace Keyword Competitor Analysis Setup 1.0.0.exe` - 154,620,609 bytes, generated.
- `apps/desktop/release/win-unpacked/MarketPlace Keyword Competitor Analysis.exe` - generated and launch-verified.
- `apps/desktop/release/MarketPlace Keyword Competitor Analysis Portable 1.0.0.exe` - 154,390,323 bytes, generated and launch-verified.
- `apps/desktop/release/builder-debug.yml` - regenerated with the portable target.

## Remaining Issues

- macOS artifacts still require the GitHub Actions macOS runner from the shared CI workflow.
