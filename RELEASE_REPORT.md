# MarketPlace Keyword Competitor Analysis - Release Report

Release date: 2026-07-13  
Version: 1.0.0  
Local platform: Windows  
Release task: Browser fullscreen overlay, circular icon controls, and packaged validation

## Summary

This release fixes the collection browser display issue: expanding the embedded browser now creates a true edge-to-edge overlay across the full Electron viewport instead of staying constrained inside the collection layout. It also hardens icon-only browser and collector controls so they render as perfect circles in light and dark mode.

## Completed

- Portaled expanded browser content to the app root and changed the expanded frame to fill the full available viewport.
- Added explicit `height: 100%` sizing to the Electron `webview` shadow-root iframe so the internal browser frame inherits its container height.
- Made browser toolbar icon buttons, collector expand/collapse buttons, target/process controls, and previous/next controls consistently circular.
- Added Playwright smoke coverage that verifies the expanded browser starts at `0,0`, matches viewport width/height, keeps the rendered browser surface at full viewport height, confirms the internal shadow-root iframe has `height: 100%`, and keeps the fullscreen control circular.
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
- `npm run clean; npm run package:win`: generated fresh Windows installer and unpacked app; the portable target failed once because the previous portable executable was locked by Windows/AV.
- `pnpm --filter @marketplace-intelligence-os/desktop exec electron-builder --win portable --x64 --publish never`: passed after clearing the stale locked portable executable.
- Packaged startup smoke: passed; `win-unpacked/MarketPlace Keyword Competitor Analysis.exe` launched and stayed alive for the startup window.
- Portable startup smoke: passed; `MarketPlace Keyword Competitor Analysis Portable 1.0.0.exe` launched and spawned the app process with the expected window title.

## Generated Artifacts

- `apps/desktop/release/MarketPlace Keyword Competitor Analysis Setup 1.0.0.exe` - 154,620,332 bytes, generated and launch path verified.
- `apps/desktop/release/win-unpacked/MarketPlace Keyword Competitor Analysis.exe` - generated and launch-verified.
- `apps/desktop/release/MarketPlace Keyword Competitor Analysis Portable 1.0.0.exe` - 120,889,996 bytes, generated and launch-verified.
- `apps/desktop/release/builder-debug.yml` - regenerated with the portable target.

## Remaining Issues

- macOS artifacts still require the GitHub Actions macOS runner from the shared CI workflow.
