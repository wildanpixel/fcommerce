# Marketplace Intelligence OS - Release Report

Release date: 2026-07-03
Version: 1.0.0
Local platform: Windows
Release task: M2/M3 guided Shopee evidence completion, dedicated Projects vault, and packaged UI validation

## Summary

This release removes the Home tab, makes Projects a dedicated vault-first page, and opens selected projects in a full-page inspector shaped like the final consulting report. M2 and M3 now use the guided evidence model consistently: product and store captures enrich local records from browser-visible HTML/text, screenshots remain the source of truth, and the report/inspector hierarchy follows the attached PDF workflow.

## Completed

- Removed the Home navigation tab.
- Projects tab now shows Vault Metrics first, then the project list.
- Clicking a project opens a dedicated Project Inspector page with no split-layout clutter.
- Project Inspector now renders collapsible report sections: Keyword General, Key Product, Product Detailed Qualified, Evaluation Phase, Key Store, and TikTok Evidence.
- Product-specific captures now enrich stored records with PDP fields where visible: price range, original price, discount, rating, review count, total sold, stock, voucher/shipping text, variants, specifications, description, and image URLs.
- Product dossiers now show first-page evidence, slides, description, variants, specifications, review table, review media, and shop-homepage evidence.
- Store evidence now renders homepage, product matrix, bestseller, visual style, TikTok account evidence, theme signals, and GMV ETA.
- HTML/PDF report rendering now follows the same M2/M3 workflow and keeps product/store links available.
- Implementation status, roadmap, and changelog were updated.

## Release Checklist

| Step | Result |
| --- | --- |
| Delete `dist` | Completed |
| Delete `dist-node` | Completed |
| Delete `release` | Completed after closing locked packaged app process |
| Generate Prisma | Completed |
| Clean build | Completed |
| Package Electron | Completed |
| Generate Windows Installer | Completed: `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe` |
| Generate Windows Portable | Completed: `apps/desktop/release/Marketplace Intelligence OS Portable 1.0.0.exe` |
| Generate macOS App | Not run locally on Windows; configured for GitHub Actions macOS runner |
| Generate macOS DMG | Not run locally on Windows; configured for GitHub Actions macOS runner |
| Launch packaged application automatically | Completed from `apps/desktop/release/win-unpacked/Marketplace Intelligence OS.exe` |
| Verify UI reflects latest implementation | Completed through packaged UI screenshots |
| Verify packaged application version | Completed: `/api/health` returned version `1.0.0` |
| Update changelog | Completed |
| Commit | Pending at report generation time |
| Push | Pending at report generation time |
| Verify GitHub Actions | Pending after push |

## Local Validation

- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm test`: passed, 5 files and 12 tests.
- `pnpm test:e2e`: passed, 2 Playwright tests.
- `pnpm prisma:generate`: passed.
- `pnpm build`: passed.
- `pnpm --filter @marketplace-intelligence-os/desktop exec electron-builder --win --x64`: passed.
- Packaged app launched from `win-unpacked` and responded on `/api/health` with `{"ok":true,"product":"Marketplace Intelligence OS","version":"1.0.0"}`.
- Packaged UI screenshot verified Home tab removal and New Research default shell.
- Packaged UI screenshot verified Projects page shows Vault Metrics first and project list below.
- Packaged UI screenshot verified selected project opens a dedicated Project Inspector page with report-shaped collapsible sections.

## Generated Artifacts

- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe`
- `apps/desktop/release/Marketplace Intelligence OS Portable 1.0.0.exe`
- `apps/desktop/release/win-unpacked/Marketplace Intelligence OS.exe`
- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe.blockmap`

## Remaining Notes

- macOS artifacts must be verified on the GitHub Actions macOS runner.
- Shopee and TikTok anti-bot/login/verification flows remain user-controlled by design; the app does not bypass marketplace protections.
- Product slide/video extraction is still heuristic when Shopee hides media from browser-readable HTML.
- Voucher normalization and high-confidence AI narrative quality depend on complete captured evidence.
- TikTok Shop adapter remains stubbed; Android evidence capture exists, but TikTok Shop navigation is user-controlled.
