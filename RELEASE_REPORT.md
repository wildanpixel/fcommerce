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
| Package Electron | Partial: Windows installer and unpacked app generated; portable packaging hung |
| Generate Windows Installer | Completed |
| Generate Windows Portable | Failed for this run: `electron-builder --win portable --x64 --publish never` timed out and left the old portable artifact unchanged |
| Generate macOS App / DMG | Not available locally on Windows; configured for GitHub Actions macOS runner |
| Launch packaged application automatically | Passed with `win-unpacked/MarketPlace Keyword Competitor Analysis.exe` |
| Update changelog/status/roadmap | Completed |

## Local Validation

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: passed, 6 test files and 14 tests.
- `npm run build`: passed.
- `npm run test:e2e`: passed, 2 Playwright smoke tests.
- `npm run clean; npm run package:win`: timed out while `electron-builder` was still running after creating the NSIS installer.
- `pnpm --filter @marketplace-intelligence-os/desktop exec electron-builder --win portable --x64 --publish never`: timed out; no new portable artifact was produced.
- Packaged startup smoke: passed; `win-unpacked/MarketPlace Keyword Competitor Analysis.exe` launched and stayed alive for the startup window.

## Generated Artifacts

- `apps/desktop/release/MarketPlace Keyword Competitor Analysis Setup 1.0.0.exe` - generated this run.
- `apps/desktop/release/win-unpacked/MarketPlace Keyword Competitor Analysis.exe` - generated this run and launch-verified.
- `apps/desktop/release/MarketPlace Keyword Competitor Analysis Portable 1.0.0.exe` - exists, but timestamp predates this run and is not treated as verified for this release.

## Remaining Issues

- Windows portable packaging is currently blocked by an `electron-builder` hang during the portable target. The installer and unpacked app are valid; the portable artifact must be regenerated after the package hang is diagnosed.
- macOS artifacts still require the GitHub Actions macOS runner.
