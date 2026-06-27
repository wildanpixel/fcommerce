# Changelog

All notable changes to Marketplace Intelligence OS will be documented in this file.

## 1.0.0 - 2026-06-27

- Fixed packaged Electron renderer asset loading by emitting relative Vite asset URLs for `file://` runtime.
- Added packaged runtime version reporting through `/api/health` and the Settings runtime panel.
- Redesigned the desktop experience around a marketplace research operating system: start screen, guided research wizard, project tabs, key-store scoring, and report workflow.
- Added GitHub Actions build workflow for Windows installer/portable artifacts and macOS app/DMG artifacts.
- Moved platform-specific browser executable discovery behind `PlatformService`.
- Added Android automation adapter contract for future emulator, ADB, OCR, and vision workflows.
- Added explicit Prisma binary targets for Windows, macOS Intel, and macOS Apple Silicon package builds.
- Added Electron desktop foundation with React, TypeScript, Vite, and TailwindCSS.
- Added Clean Architecture module boundaries for domain, application, infrastructure, API, Electron, and renderer layers.
- Added marketplace adapter contract with Shopee Indonesia implementation and future marketplace placeholders.
- Added Prisma and SQLite local database layer.
- Added Playwright browser automation, screenshot capture, and browser discovery.
- Added AI analysis provider abstraction for OpenAI and Gemini with local fallback.
- Added modular HTML report generation and Puppeteer PDF export.
- Added cross-platform platform service for Windows and macOS runtime folders and native shell actions.
- Fixed packaged Electron startup by loading Prisma Client through a CommonJS-compatible boundary.
- Prepared professional Git workspace structure, documentation, and CI.
