# Marketplace Intelligence OS - Release Report

Release date: 2026-06-27  
Release task: Packaged renderer asset loading fix  
Version: 1.0.0  
Local platform: Windows

## Summary

The installed/packaged application opened to a blank renderer because Vite emitted absolute `/assets/...` URLs in `dist/index.html`. Under Electron `file://` runtime those paths resolved outside `app.asar`, producing `ERR_FILE_NOT_FOUND` for the JavaScript and CSS bundles.

The release fix sets Vite `base` to `./`, so packaged HTML references renderer assets relative to `dist/index.html`.

## Files Changed

- `apps/desktop/vite.config.ts`
- `apps/desktop/src/electron/main.ts`
- `apps/desktop/src/api/server.ts`
- `apps/desktop/src/shared/contracts.ts`
- `apps/desktop/src/renderer/api/client.ts`
- `apps/desktop/src/renderer/App.tsx`
- `CHANGELOG.md`
- `IMPLEMENTATION_STATUS.md`
- `ROADMAP.md`
- `RELEASE_REPORT.md`

## Release Checklist

| Step | Result |
| --- | --- |
| Delete `dist` | Passed |
| Delete `dist-node` | Passed |
| Delete `release` | Passed after stopping the previous portable executable using the release folder |
| Generate Prisma | Passed |
| Clean build | Passed |
| Package Electron | Passed |
| Generate Windows Installer | Passed |
| Generate Windows Portable | Passed |
| Generate macOS App | Not available locally on Windows; expected through GitHub Actions macOS runner |
| Generate macOS DMG | Not available locally on Windows; expected through GitHub Actions macOS runner |
| Launch packaged application automatically | Passed |
| Verify UI reflects latest implementation | Passed |
| Verify packaged application version | Passed: `/api/health` returned version `1.0.0` |
| Update changelog | Passed |
| Commit | Pending at report creation |
| Push | Pending at report creation |
| Verify GitHub Actions | Pending at report creation |

## Local Validation

- `pnpm --dir apps/desktop prisma:generate`: passed.
- `pnpm --dir apps/desktop build`: passed.
- `pnpm --dir apps/desktop typecheck`: passed.
- `pnpm --dir apps/desktop lint`: passed.
- `pnpm --dir apps/desktop test`: passed, 12 tests.
- `pnpm --dir apps/desktop test:e2e`: passed, 1 Playwright smoke test.
- `pnpm --dir apps/desktop exec electron-builder --win --x64`: passed.

## Generated Local Artifacts

- `apps/desktop/release/Marketplace Intelligence OS Setup 1.0.0.exe`
- `apps/desktop/release/Marketplace Intelligence OS Portable 1.0.0.exe`
- `apps/desktop/release/win-unpacked/`

## Packaged App Verification

The packaged application was launched from:

`apps/desktop/release/win-unpacked/Marketplace Intelligence OS.exe`

Verification results:

- Renderer mounted with non-empty `#root`.
- UI text `Marketplace Intelligence OS` was visible.
- UI text `New Research` was visible.
- Script loaded from `file:///.../resources/app.asar/dist/assets/index-BnjE6RG5.js`.
- Stylesheet loaded from `file:///.../resources/app.asar/dist/assets/index-Bbey5EK8.css`.
- `/api/health` returned `{ "ok": true, "product": "Marketplace Intelligence OS", "version": "1.0.0" }`.
- `/api/platform` returned `isPackaged: true`.

## Remaining Notes

- macOS packaging cannot be produced locally from this Windows workstation. It must be verified by the GitHub Actions macOS runner.
- The default Electron icon is still used; custom app icon work remains outside this release-blocker task.
