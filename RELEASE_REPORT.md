# Marketplace Intelligence OS - Release Report

Release date: 2026-07-02
Release task: M1 UI readability, project inspection, report history, and safe evidence extraction
Version: 1.0.0
Local platform: Windows

## Summary

This release returns to M1 product experience and fixes the visible UI issues from the installed app:

- The app now defaults to a light white/grey theme, with dark mode still available.
- Sidebar collapse no longer hides the main content; hide/show controls are icon-only with accessible labels.
- Browser fullscreen and browser toolbar actions are icon-focused.
- The floating guided collector uses a readable theme-aware surface.
- Shopee step 13 now supports opening TikTok in Android and attaching a manual emulator screenshot as cross-platform evidence.
- Browser capture now also extracts visible HTML text from the user-controlled embedded session where the page allows it.
- Projects can be inspected for evidence readiness, products, stores, key-store evidence, reports, and recent assets before report generation.
- Projects can be deleted from the UI.
- Reports have persistent history with local open/download and delete actions.

Anti-bot scope remains explicit: the app does not bypass Shopee anti-bot systems. The supported collection path is user-controlled browsing, screenshot capture, visible HTML extraction where accessible, and manual screenshot attachment.

## Files Changed

- `apps/desktop/src/shared/contracts.ts`
- `apps/desktop/src/domain/models.ts`
- `apps/desktop/src/domain/repositories.ts`
- `apps/desktop/src/infrastructure/repositories/PrismaRepositories.ts`
- `apps/desktop/src/api/server.ts`
- `apps/desktop/src/renderer/api/client.ts`
- `apps/desktop/src/renderer/App.tsx`
- `apps/desktop/src/renderer/styles.css`
- `apps/desktop/e2e/smoke.spec.ts`
- `IMPLEMENTATION_STATUS.md`
- `ROADMAP.md`
- `CHANGELOG.md`
- `RELEASE_REPORT.md`

## Release Checklist

| Step | Result |
| --- | --- |
| Delete `dist` | Completed |
| Delete `dist-node` | Completed |
| Delete `release` | Completed |
| Generate Prisma | Completed |
| Clean build | Completed |
| Package Electron | Completed |
| Generate Windows Installer | Completed: `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe` |
| Generate Windows Portable | Completed: `apps/desktop/release/Marketplace Intelligence OS Portable 1.0.0.exe` |
| Generate macOS App | Pending GitHub Actions macOS runner |
| Generate macOS DMG | Pending GitHub Actions macOS runner |
| Launch packaged application automatically | Completed from `apps/desktop/release/win-unpacked/Marketplace Intelligence OS.exe` |
| Verify UI reflects latest implementation | Completed: packaged renderer contains `Project Inspector`, `Report History`, `Attach Shot`, and `Extract visible page text` |
| Verify packaged application version | Completed: packaged `/api/health` returned version `1.0.0` |
| Verify database initialization | Completed: packaged `/api/dashboard`, `/api/reports`, and `/api/projects/:id/detail` returned data |
| Update changelog | Completed |
| Commit | Pending |
| Push | Pending |
| Verify GitHub Actions | Pending after push |

## Local Validation

- `pnpm --dir apps/desktop run typecheck`: passed.
- `pnpm --dir apps/desktop run lint`: passed.
- `pnpm --dir apps/desktop run test`: passed, 12 tests.
- `pnpm --dir apps/desktop run test:e2e`: passed, 2 Playwright smoke tests.
- `pnpm --dir apps/desktop run prisma:generate`: passed.
- `pnpm --dir apps/desktop run build`: passed.
- `pnpm --dir apps/desktop exec electron-builder --win --x64`: passed.
- Packaged runtime `/api/health`: passed, version `1.0.0`.
- Packaged runtime `/api/reports`: passed.
- Packaged runtime `/api/projects/:id/detail`: passed.

## Remaining Notes

- macOS packaging cannot be produced locally from this Windows workstation and must be verified by GitHub Actions macOS runner.
- OCR from arbitrary imported screenshots remains future work; current safe extraction covers visible browser HTML text and Android UIAutomator text.
- Shopee anti-bot bypass is intentionally not implemented.
