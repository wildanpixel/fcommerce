# Changelog

All notable changes to Marketplace Intelligence OS will be documented in this file.

## Unreleased - 2026-07-02

- Made the default UI theme light white/grey and kept dark mode available from the top bar.
- Fixed sidebar collapse so the main content remains visible; sidebar hide/show and browser fullscreen controls are now icon-only with accessible labels.
- Restyled the floating guided browser collector to remain readable in light mode.
- Added visible browser text extraction from the user-controlled embedded session and stores extracted text in evidence metadata during capture.
- Added manual screenshot attachment for guided evidence steps, including Shopee step 13 for TikTok Android emulator screenshots.
- Added project inspection with evidence readiness, products, stores, key-store evidence, recent evidence, reports, and project deletion.
- Added persistent report history with local download/open and delete actions.
- Documented the safe collection boundary: the app does not bypass marketplace anti-bot systems; it supports user-controlled evidence capture, HTML text extraction where accessible, and screenshot attachment.
- Added an ADB-backed Android automation adapter and Android tooling service for ADB, emulator, SDK manager, AVD manager, Java, AVD, connected-device, boot-health, and TikTok package detection.
- Added Android API routes for status, emulator launch, APK install, TikTok app launch, UIAutomator visible-text extraction, and Android evidence capture.
- Reworked TikTok Shop research to open a dedicated Android Emulator Workspace instead of an embedded browser preview.
- Added automatic TikTok APK candidate detection from local Downloads/Desktop folders.
- Added Android mobile collection steps for TikTok launch, keyword search, product detail, store detail, and brand/store search evidence.
- Added Android screenshot evidence persistence to project folders and Prisma assets, including visible text metadata when UIAutomator extraction succeeds.
- Created local `MIO_TikTok_Stable` AVD profile using Android 35 Google Play x86_64 system image to reduce emulator memory pressure versus the earlier Pixel profile.
- Made emulator launch persistent by preserving the AVD data partition and snapshots; the app does not wipe Android, clear TikTok data, or reset Google login when the emulator is closed and reopened.
- Added TikTok runtime diagnostics for active ANR state, focused activity, package ABI, and device ABI.
- Added Recover TikTok, which force-stops and reopens TikTok without clearing app data when Android reports `com.zhiliaoapp.musically` is not responding.
- Validated the provided TikTok APK install as `com.zhiliaoapp.musically`, TikTok app launch/recovery, Android screenshot capture, and UIAutomator visible-text extraction on the local emulator.
- Made the left sidebar fully hideable with a single restore button.
- Made the Shopee floating step collector smaller and expandable/collapsible so it blocks less of the browser.

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
