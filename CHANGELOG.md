# Changelog

All notable changes to Marketplace Intelligence OS will be documented in this file.

## 1.0.0 - 2026-06-27

- Pivoted the primary product flow from fully automatic marketplace crawling to guided manual evidence collection for protected Shopee/TikTok sessions.
- Replaced the cockpit-first home screen with a single `Create Analysis` action, followed by a setup form for keyword, product category, created date, and platform.
- Added a floating guided collection controller over the embedded browser so the user can capture each PDF-defined evidence step on demand.
- Added manual evidence persistence: webview captures are saved to local project folders and registered as Prisma asset records with step metadata.
- Added project product category persistence through Prisma schema, startup schema guard, and project API payloads.
- Reworked Home and New Research into a two-button product research cockpit for Shopee Product Research and TikTok Shop Product Research.
- Added an embedded visible platform browser panel using Electron webview so users can watch and manually assist marketplace navigation.
- Removed Shopee language selection from the app flow; Shopee login, verification, and language prompts are now user-controlled inside the visible browser.
- Added collapsible sidebar, dark/light mode toggle, glass-style visual treatment, and fullscreen browser mode with collection-step display.
- Wired Shopee Start Analyze to open Shopee, input the desired keyword when possible, refresh long-loading visible pages, and queue the backend analysis job.
- Expanded Shopee M2 evidence collection with exact relevance/top-sales URLs, merged key-product selection reasons, product detail screenshots, product image metadata, review-section screenshots, and store homepage/product/best-seller screenshots.
- Added TikTok Shop mobile Android-style preview while keeping real Android/TikTok extraction tracked under later automation milestones.
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
