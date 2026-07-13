# MarketPlace Keyword Competitor Analysis - Release Report

Release date: 2026-07-13  
Version: 1.0.0  
Local platform: Windows  
Release task: UI control polish, project deletion fix, activity visibility, and packaged validation

## Summary

This release fixes the visible UI regressions in Keyword Projects, Project Inspector, and Reports: icon-only controls now render as true circles, dark mode uses the same soft surface system as light mode, Vault Metrics and Report History are restyled, and the Activity toggle only appears on guided collection pages. Keyword project deletion now uses a simpler confirmation flow and refreshes project/report state after successful deletion.

## Completed

- Made sidebar, view-toggle, activity, and trash icon buttons consistently circular in light and dark mode.
- Aligned dark-mode cards, panels, buttons, metrics, and report history with the shared soft UI system.
- Restricted the Activity button to mounted guided browser collection pages.
- Simplified Keyword Project and Project Inspector delete confirmation and disabled repeated delete clicks while pending.
- Restyled Vault Metrics and Report History cards.
- Preserved the existing report, collection, and marketplace data behavior.

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
- `npm run clean; npm run package:win`: generated fresh Windows installer and `win-unpacked`; the outer command timed out while the portable target was still compressing its payload.
- `pnpm --filter @marketplace-intelligence-os/desktop exec electron-builder --win portable --x64 --publish never`: completed after the 7-Zip payload compression step finished in roughly 274 seconds.
- Packaged startup smoke: passed; `win-unpacked/MarketPlace Keyword Competitor Analysis.exe` launched and stayed alive for the startup window.
- Portable startup smoke: passed; `MarketPlace Keyword Competitor Analysis Portable 1.0.0.exe` launched and spawned the app process with the expected window title.

## Generated Artifacts

- `apps/desktop/release/MarketPlace Keyword Competitor Analysis Setup 1.0.0.exe` - generated this run.
- `apps/desktop/release/win-unpacked/MarketPlace Keyword Competitor Analysis.exe` - generated this run and launch-verified.
- `apps/desktop/release/MarketPlace Keyword Competitor Analysis Portable 1.0.0.exe` - generated this run and launch-verified.
- `apps/desktop/release/builder-debug.yml` - regenerated with the portable target at the same timestamp as the portable executable.

## Remaining Issues

- The Windows portable target is slow because `electron-builder` archives the full `win-unpacked` payload with 7-Zip before NSIS compilation. This looked like a hang under shorter timeouts, but it completes when allowed to finish.
- macOS artifacts still require the GitHub Actions macOS runner.
