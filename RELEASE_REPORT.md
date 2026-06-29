# Marketplace Intelligence OS - Release Report

Release date: 2026-06-29
Release task: Guided manual evidence collection pivot
Version: 1.0.0
Local platform: Windows

## Summary

The desktop experience now opens with a single `Create Analysis` action. The user enters a desired keyword, product category, created date, and platform, then proceeds into an embedded browser where they control the marketplace session manually.

Fully automatic marketplace collection without official APIs has been re-scoped. The app now shows a floating guided collection controller over the browser; when the user reaches the target page for a report step, the collect button appears and saves the visible browser screenshot as local project evidence.

## Files Changed

- `apps/desktop/src/renderer/App.tsx`
- `apps/desktop/src/api/server.ts`
- `apps/desktop/src/shared/contracts.ts`
- `apps/desktop/src/infrastructure/db/bootstrapSql.ts`
- `apps/desktop/prisma/schema.prisma`
- `apps/desktop/prisma/migrations/0002_project_product_category/migration.sql`
- `apps/desktop/src/electron/main.ts`
- `apps/desktop/src/renderer/api/client.ts`
- `apps/desktop/src/renderer/styles.css`
- `apps/desktop/src/renderer/vite-env.d.ts`
- `apps/desktop/eslint.config.js`
- `apps/desktop/e2e/smoke.spec.ts`
- `apps/desktop/src/domain/models.ts`
- `apps/desktop/src/application/services/IntelligenceWorkflow.ts`
- `apps/desktop/src/application/services/ReportService.ts`
- `apps/desktop/src/infrastructure/marketplaces/shopee/ShopeeAdapter.ts`
- `apps/desktop/src/infrastructure/repositories/PrismaRepositories.ts`
- `apps/desktop/src/infrastructure/report/HtmlReportRenderer.ts`
- `IMPLEMENTATION_STATUS.md`
- `ROADMAP.md`
- `CHANGELOG.md`
- `RELEASE_REPORT.md`

## Release Checklist

| Step | Result |
| --- | --- |
| Delete `dist` | Completed |
| Delete `dist-node` | Completed |
| Delete `release` | Completed after stopping stale packaged validation process |
| Generate Prisma | Completed |
| Clean build | Completed |
| Package Electron | Completed |
| Generate Windows Installer | Completed: `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe` |
| Generate Windows Portable | Completed: `apps/desktop/release/Marketplace Intelligence OS Portable 1.0.0.exe` |
| Generate macOS App | Pending GitHub Actions macOS runner |
| Generate macOS DMG | Pending GitHub Actions macOS runner |
| Launch packaged application automatically | Completed from `apps/desktop/release/win-unpacked/Marketplace Intelligence OS.exe` |
| Verify UI reflects latest implementation | Completed: packaged app showed `Create Analysis`, setup form, `Guided Platform Browser`, and `Guided Collection 1/13` |
| Verify packaged application version | Completed: packaged `/api/health` returned version `1.0.0` |
| Update changelog | Completed |
| Commit | Completed in final release commit |
| Push | Completed after final release commit |
| Verify GitHub Actions | Checked after push; see final sprint report |

## Local Validation Before Packaging

- `pnpm --dir apps/desktop run typecheck`: passed.
- `pnpm --dir apps/desktop run lint`: passed.
- `pnpm --dir apps/desktop run test`: passed, 12 tests.
- `pnpm --dir apps/desktop run test:e2e`: passed, 1 Playwright smoke test.
- `pnpm --dir apps/desktop run prisma:generate`: passed.
- `pnpm --dir apps/desktop run build`: passed.
- `pnpm --dir apps/desktop exec electron-builder --win --x64`: passed.
- Packaged runtime launch validation: passed, including project creation through the guided setup and `/api/health` version `1.0.0`.

## Remaining Notes

- TikTok Shop is exposed as a mobile Android-style preview in M1. Real Android emulator control remains M4, and real TikTok Shop extraction remains M5.
- macOS packaging cannot be produced locally from this Windows workstation. It must be verified by the GitHub Actions macOS runner after push.
