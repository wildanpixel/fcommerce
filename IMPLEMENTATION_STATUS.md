# Marketplace Intelligence OS - Implementation Status

Official project management document.

Audit date: 2026-06-27  
Last updated: 2026-06-29
Current version target: V1.0 Shopee Indonesia desktop intelligence
Tracking rule: every completed feature must update this document and `ROADMAP.md` in the same commit before the change is pushed.

This document records the current repository state only. It does not describe planned work as completed.

## Overall Version 1 Progress

[############--------] 60%

The overall percentage is a weighted product estimate based on foundation readiness, product experience, marketplace automation, intelligence and reporting depth, mobile automation, future marketplaces, and commercial release work.

## Status Legend

| Status | Meaning |
| --- | --- |
| Completed | Implemented and usable in the current codebase. |
| Partial | Implemented, but important production behavior or verification is missing. |
| Stubbed | Interface or registration exists, but runtime behavior intentionally reports unsupported behavior. |
| Placeholder | UI or document structure exists, but it is backed by sample, static, or incomplete data. |
| Not Started | No meaningful implementation was found in the source tree. |

## Milestone Summary

| Milestone | Area | Progress | Status |
| --- | --- | ---: | --- |
| M0 | Foundation | [####################] 100% | Completed |
| M1 | Product Experience | [####################] 100% | Completed |
| M2 | Shopee Desktop | [##############------] 72% | Partial |
| M3 | Intelligence | [#######-------------] 35% | Partial |
| M4 | Android | [##------------------] 10% | Stubbed |
| M5 | TikTok Shop | [#-------------------] 5% | Stubbed |
| M6 | Commercial | [--------------------] 0% | Not Started |

## M0 Foundation

[####################] 100%

| Feature | Status | Owner | Dependencies | Estimated Effort | Priority |
| --- | --- | --- | --- | --- | --- |
| Electron desktop runtime | Completed | Desktop Platform | Electron | Done | P0 |
| React renderer | Completed | Frontend | React, Vite, TypeScript | Done | P0 |
| Tailwind and application styling | Completed | Frontend | TailwindCSS | Done | P1 |
| Prisma SQLite database layer | Completed | Database | SQLite, Prisma Client | Done | P0 |
| Prisma packaged runtime compatibility | Completed | Database | Prisma generated client, Electron Builder resources | Done | P0 |
| Marketplace adapter interface | Completed | Architecture | Domain contracts | Done | P0 |
| Marketplace registry | Completed | Architecture | Adapter interface | Done | P0 |
| Unsupported marketplace adapter | Completed | Architecture | Adapter interface | Done | P1 |
| Platform service abstraction | Completed | Desktop Platform | Electron app paths, shell, notifications | Done | P0 |
| Browser discovery abstraction | Completed | Automation | Platform service, Playwright | Done | P0 |
| Windows packaging | Completed | Release Engineering | Electron Builder, Prisma resources | Done | P0 |
| macOS packaging configuration | Completed | Release Engineering | Electron Builder, macOS runner verification | Done | P0 |
| GitHub repository setup | Completed | DevOps | Git remote, branch, documentation | Done | P0 |
| GitHub Actions CI/CD | Completed | DevOps | Windows and macOS runners | Done | P0 |
| Code signing preparation | Completed | Release Engineering | Environment variables, signing certificates | Done | P1 |

Foundation notes:

- Marketplace adapter interface exists.
- Marketplace registry exists.
- Shopee is registered as the only enabled marketplace.
- Unsupported marketplace adapter exists for future marketplaces.
- Platform service exists for app folders, native shell actions, notification behavior, and platform-specific browser discovery.
- Electron Builder is configured for Windows installer, Windows portable, macOS app directory, and macOS DMG.
- GitHub Actions build workflow exists for Windows and macOS artifacts.
- Prisma is configured with Windows and macOS binary targets.
- Start screen, navigation, guided analysis setup, project view, key stores view, reports view, and settings view exist in the renderer.
- Electron webview support is enabled for the local visible marketplace surface, with user-controlled navigation and guided evidence capture as the primary collection workflow.
- Packaged renderer assets load through relative `./assets/...` paths so the installed app works under Electron `file://` runtime.
- Packaged runtime version is exposed through `/api/health` and the Settings runtime panel.

Remaining foundation notes:

- macOS artifact generation is configured and verified through GitHub Actions macOS runners, not this Windows workstation.
- Code signing and notarization are environment-driven release concerns; no certificates are hardcoded in application logic.
- Android tooling discovery is not implemented.

Release blocker fixes:

- 2026-06-27: Fixed packaged blank-screen issue caused by absolute Vite `/assets/...` URLs resolving outside `app.asar`.
- 2026-06-27: Verified packaged Windows UI renders latest app shell and reports version `1.0.0`.
- 2026-06-29: Reworked the first-run product experience into the requested two-button Shopee/TikTok research cockpit with a visible marketplace browser surface.
- 2026-06-29: Pivoted the product from fully automatic marketplace collection to guided manual evidence collection because Shopee/TikTok protected flows cannot be made reliable without official APIs or user-controlled sessions.

## M1 Product Experience

[####################] 100%

| Feature | Status | Owner | Dependencies | Estimated Effort | Priority |
| --- | --- | --- | --- | --- | --- |
| Home create-analysis entry | Completed | Product UI | Project API | Done | P0 |
| Primary navigation | Completed | Product UI | Zustand UI state | Done | P0 |
| Guided analysis setup form | Completed | Product UI | Project service, marketplace IDs | Done | P0 |
| Marketplace selection UI | Completed | Product UI | Marketplace registry, adapter capabilities | Done | P0 |
| Shopee desktop/mobile view selector | Completed | Product UI | Embedded platform view | Done | P0 |
| TikTok mobile view selector | Completed | Product UI | Embedded platform view | Done | P1 |
| Visible platform browser panel | Completed | Product UI | Electron webview | Done | P0 |
| Browser fullscreen mode | Completed | Product UI | Electron webview | Done | P0 |
| Floating guided collection controller | Completed | Product UI | Evidence step map, Electron webview | Done | P0 |
| Manual evidence capture API | Completed | API and Database | Project workspace, Prisma assets | Done | P0 |
| Product category persistence | Completed | Database | Prisma migration, project API | Done | P1 |
| Collapsible sidebar | Completed | Product UI | Navigation shell | Done | P1 |
| Dark and light mode toggle | Completed | Product UI | Renderer theme state | Done | P1 |
| Guided collection progress display | Completed | Product UI | Manual evidence state | Done | P0 |
| Projects overview | Completed | Product UI | Project repository, report counts | Done | P0 |
| Product tab UI shell | Completed | Product UI | Product repository, evidence assets | Done | P0 |
| Store tab UI shell | Completed | Product UI | Store repository, screenshots, vouchers | Done | P0 |
| Reviews tab UI shell | Completed | Product UI | Review collector, review repository | Done | P1 |
| Media tab UI shell | Completed | Product UI | Media collector, screenshot assets | Done | P1 |
| Visual Analysis tab UI shell | Completed | Product UI | AI analysis records | Done | P1 |
| Key Stores screen UI shell | Completed | Product UI and AI | Store analysis ranking | Done | P0 |
| Reports screen | Completed | Product UI and Reporting | Report sections, PDF generation | Done | P0 |
| Settings screen | Completed | Product UI and Platform | Settings repository, platform service | Done | P0 |

Implemented:

- Home opens with a single `Create Analysis` action.
- The setup form captures desired keyword, date created, product category, and selected platform (`SHOPEE` or `TIKTOK SHOP`).
- Proceed creates a local project and opens the embedded browser inside the app; no backend collection job is required for the primary workflow.
- Shopee research lets the user interact directly with the marketplace session, including login, traffic verification, language prompts, and any manual navigation Shopee requires.
- Shopee research exposes desktop and mobile visible platform views.
- TikTok Shop research exposes a mobile-style visible platform view for user-controlled evidence capture.
- The browser has a floating top-left guided collection controller inspired by compact voice-chat overlays.
- The collect button appears only when the current page matches the active evidence step, then saves the visible browser screenshot as a project asset.
- Browser fullscreen mode keeps the guided step controller visible for focused evidence capture.
- Sidebar collapse and dark/light mode controls exist in the application shell.
- Project dashboard and tabs exist.
- Key Stores screen exists.
- Reports screen exists.

M1 scope boundary:

- Product, store, review, media, and AI evidence completeness is tracked under M2 and M3.
- Android emulator automation and real TikTok Shop extraction remain tracked under M4 and M5.
- Export formats other than PDF are still tracked outside the M1 UI milestone.

## M2 Shopee Desktop

[##############------] 72%

| Feature | Status | Owner | Dependencies | Estimated Effort | Priority |
| --- | --- | --- | --- | --- | --- |
| Shopee adapter registration | Completed | Marketplace Automation | Marketplace registry | Done | P0 |
| Keyword search URL generation | Completed | Marketplace Automation | Shopee web URLs | Done | P0 |
| Search result capture | Completed | Marketplace Automation | Playwright, screenshot engine | Done | P0 |
| Top sales search path | Completed | Marketplace Automation | Playwright sorting, result parsing | Done | P0 |
| Guided relevance/top-sales capture | Completed | Product UI and Evidence API | Embedded browser, project assets | Done | P0 |
| Guided key-product evidence step | Completed | Product UI and Evidence API | Embedded browser, project assets | Done | P0 |
| Guided product-detail evidence steps | Completed | Product UI and Evidence API | Embedded browser, project assets | Done | P0 |
| Guided store evidence steps | Completed | Product UI and Evidence API | Embedded browser, project assets | Done | P0 |
| Product card extraction | Completed | Marketplace Automation | Playwright DOM parsing | Done | P0 |
| Product detail collection | Completed | Marketplace Automation | Product page parser | Done | P0 |
| Product images and slides | Partial | Marketplace Automation | Product media parser, screenshots | 2 days | P0 |
| Product description | Completed | Marketplace Automation | Product page parser | Done | P0 |
| Product specifications | Completed | Marketplace Automation | Product page parser | Done | P0 |
| Store collection | Partial | Marketplace Automation | Store page parser | 3 days | P0 |
| Store homepage capture | Completed | Marketplace Automation | Store URL discovery, screenshots | Done | P0 |
| Review collection | Partial | Marketplace Automation | Review section parser | 6 days | P0 |
| Review images | Partial | Marketplace Automation | Review media parser | 3 days | P1 |
| User media | Partial | Marketplace Automation | Review media parser, asset storage | 3 days | P1 |
| Voucher collection | Not Started | Marketplace Automation | Voucher section parser | 4 days | P1 |
| Store decoration | Partial | Marketplace Automation | Store homepage parser, screenshot map | 3 days | P1 |
| Product matrix | Partial | Marketplace Automation and Intelligence | Store/product normalization | 3 days | P0 |
| AI evidence packaging | Partial | Marketplace Automation and AI | Screenshots, structured data, analysis service | 4 days | P0 |

Implemented:

- Shopee adapter class exists.
- Keyword search URL generation exists and now uses `page=0&sortBy=relevancy` and `page=0&sortBy=sales` for the requested relevance and top-sales evidence.
- The primary Shopee workflow is now guided/manual: users open target pages inside the app and capture each report-required evidence step themselves.
- Manual evidence capture saves browser screenshots into project folders and Prisma asset records with step metadata.
- Guided steps cover relevance, top sales, key-product source evidence, product first viewport, product images, description, reviews, review media, store homepage, store products, store best sellers, store visual style, and TikTok cross-platform search.
- Relevance and top-sales search paths exist with retry diagnostics.
- Product card extraction exists through Playwright page DOM anchors and parent-card text normalization.
- Search result and top-sales screenshots are saved as project assets when screenshot capture is enabled.
- Empty, blocked, login-gated, captcha, selector-empty, and navigation retry states are emitted as structured warning/error log messages.
- Top-sales result ordering is validated against relevance ordering so ignored sort behavior is visible in job logs.
- Key-product selection now merges relevance and top-sales products, stores source placement, and assigns reason-for-selection values such as platform recommended, best selling, cheap, mid price, high price, and strong visual.
- Product page collection exists and captures first-page, description, and review-section screenshots where the page is browser-readable.
- Product image URLs are collected into product raw evidence for report rendering with a 3-column image grid.
- Store page collection exists.
- Store homepage, banner, popular-products, and best-seller screenshots are captured where Shopee allows access.
- Screenshot capture is wired.
- Review inference now targets three positive 5-star and two negative 1-star browser-readable review signals when available.
- Basic product and store metric parsing exists.

Incomplete:

- No guaranteed bypass for login, captcha, consent screens, or anti-bot blocking; this is now handled by user-controlled browser sessions in the primary UX.
- Review extraction is heuristic and depends on browser-readable text.
- Voucher strategy and user media extraction are not fully structured.
- Shopee mobile app evidence is not implemented.
- Product slide capture is not complete as a distinct evidence workflow.
- Report-quality evidence completeness is not guaranteed.

Sprint 1 completion evidence:

- Build passed.
- TypeScript passed.
- ESLint passed.
- Unit tests passed, including Shopee search parser diagnostics.
- Playwright smoke test passed.
- Windows installer, portable executable, and `win-unpacked` package were generated.
- Packaged Windows runtime launched and returned OK from `/api/health`.
- Local macOS packaging was not available on this Windows workstation; macOS packaging is delegated to the GitHub Actions macOS runner.

## M3 Intelligence

[#######-------------] 35%

| Feature | Status | Owner | Dependencies | Estimated Effort | Priority |
| --- | --- | --- | --- | --- | --- |
| AI provider abstraction | Completed | AI Engineering | OpenAI, Gemini, local fallback | Done | P0 |
| Structured JSON analysis contract | Completed | AI Engineering | `AiAnalysisJson`, validation schema | Done | P0 |
| OpenAI analysis path | Partial | AI Engineering | API key, screenshot evidence | 3 days | P0 |
| Gemini analysis path | Partial | AI Engineering | API key, screenshot evidence | 3 days | P1 |
| Local heuristic fallback | Partial | AI Engineering | Product, store, review inputs | 3 days | P1 |
| Executive summary | Partial | Reporting and AI | Analysis records, report renderer | 3 days | P0 |
| SWOT | Partial | Reporting and AI | Analysis records | 3 days | P0 |
| Pricing analysis | Partial | Intelligence | Product price normalization | 4 days | P0 |
| Store analysis | Partial | Intelligence | Store collection completeness | 5 days | P0 |
| Competitor analysis | Partial | Intelligence | Key products, product matrix | 5 days | P0 |
| Visual analysis | Partial | AI Vision | Screenshot completeness, provider keys | 5 days | P0 |
| Recommendations | Partial | AI Engineering | Structured analysis output | 3 days | P0 |
| Key Stores AI ranking | Placeholder | AI Engineering and Product UI | Store evidence, persisted scoring | 5 days | P0 |
| HTML report generation | Partial | Reporting | Report data loader, renderer | 4 days | P0 |
| PDF export | Partial | Reporting | Puppeteer PDF, local workspace | 3 days | P0 |

Implemented:

- AI service returns structured JSON through a typed analysis contract.
- OpenAI and Gemini provider paths exist when API keys are configured.
- Local heuristic analysis fallback exists.
- Report sections are modular.
- HTML report generation exists.
- Puppeteer PDF export exists.

Incomplete:

- AI quality depends on complete product, store, review, and screenshot evidence.
- Several analysis sections are only as strong as the partial Shopee data pipeline.
- Key Stores ranking is not backed by persisted AI ranking output.
- PowerPoint, Excel, CSV, JSON, and HTML export labels are visible, but only PDF export is wired.

## M4 Android

[##------------------] 10%

| Feature | Status | Owner | Dependencies | Estimated Effort | Priority |
| --- | --- | --- | --- | --- | --- |
| Android automation interface | Completed | Mobile Automation | Domain marketplace contracts | Done | P1 |
| Unsupported Android adapter | Stubbed | Mobile Automation | Android automation interface | Done | P1 |
| ADB detection | Not Started | Mobile Automation | Android SDK or platform-tools | 3 days | P1 |
| Android Emulator discovery | Not Started | Mobile Automation | Android Studio, emulator CLI | 4 days | P1 |
| Device start and health check | Not Started | Mobile Automation | ADB, emulator boot state | 4 days | P1 |
| Android screenshot capture | Stubbed | Mobile Automation | ADB screencap | 3 days | P1 |
| OCR extraction | Not Started | Mobile Automation and AI | Tesseract, image preprocessing | 4 days | P1 |
| Vision analysis from mobile screenshots | Not Started | AI Vision | Screenshot capture, AI providers | 4 days | P1 |
| Shopee Mobile workflow | Not Started | Marketplace Automation | Android automation, Shopee app state | 8 days | P0 |

Implemented:

- `AndroidAutomationAdapter` interface exists.
- `UnsupportedAndroidAutomationAdapter` exists.
- Adapter methods are shaped for availability, start, screenshot capture, visible text extraction, and stop.

Stubbed behavior:

- `isAvailable()` always returns `false`.
- `start()`, `captureScreenshot()`, and `extractVisibleText()` throw unsupported errors.
- No Android Studio Emulator integration exists.
- No Genymotion integration exists.
- No ADB integration exists.
- No UIAutomator integration exists.
- No Accessibility integration exists.
- No OCR pipeline is connected to Android screenshots.
- No Vision AI mobile extraction pipeline is connected.

## M5 TikTok Shop

[#-------------------] 5%

| Feature | Status | Owner | Dependencies | Estimated Effort | Priority |
| --- | --- | --- | --- | --- | --- |
| TikTok marketplace ID | Completed | Architecture | Shared contracts | Done | P1 |
| TikTok UI selection | Completed | Product UI | Product research cockpit | Done | P1 |
| TikTok adapter registration | Stubbed | Marketplace Automation | Unsupported marketplace adapter | Done | P1 |
| TikTok desktop automation | Not Started | Marketplace Automation | Playwright strategy | 8 days | P1 |
| TikTok collection | Not Started | Marketplace Automation | Search, product, store parsers | 8 days | P1 |
| TikTok reports | Not Started | Reporting | TikTok normalized evidence | 5 days | P1 |
| TikTok mobile automation | Not Started | Mobile Automation | Android automation | 8 days | P2 |

Implemented:

- `TIKTOK_SHOP` exists in shared marketplace IDs.
- TikTok Shop is shown in the product research cockpit as a mobile-only Android-style preview.
- TikTok Shop is registered in the marketplace registry.

Stubbed behavior:

- TikTok Shop uses `UnsupportedMarketplaceAdapter`.
- All collection methods throw `MarketplaceFeatureUnavailableError`.
- No TikTok desktop, mobile, Android, OCR, or Vision AI extraction exists.

## M6 Commercial

[--------------------] 0%

| Feature | Status | Owner | Dependencies | Estimated Effort | Priority |
| --- | --- | --- | --- | --- | --- |
| Auto update provider abstraction | Not Started | Release Engineering | Update service contract | 4 days | P1 |
| GitHub Releases update provider | Not Started | Release Engineering | Auto update abstraction | 5 days | P1 |
| Private update server provider | Not Started | Release Engineering | Auto update abstraction | 5 days | P2 |
| Licensing | Not Started | Commercial Engineering | License model and local validation | 7 days | P1 |
| Telemetry | Not Started | Product Engineering | Privacy policy, event schema | 5 days | P2 |
| Plugin SDK | Not Started | Architecture | Marketplace adapter stability | 10 days | P2 |
| Windows code signing | Not Started | Release Engineering | Certificate environment variables | 3 days | P0 before sale |
| Apple signing and notarization | Not Started | Release Engineering | Apple Developer credentials | 5 days | P0 before sale |

## Cross-Cutting Status Categories

### Completed

- Marketplace adapter interface exists.
- Marketplace registry exists.
- Shopee is registered as the only enabled marketplace.
- Unsupported marketplace adapter exists for future marketplaces.
- Platform service exists for app folders, native shell actions, notification behavior, and platform-specific browser discovery.
- Electron Builder is configured for Windows installer, Windows portable, macOS app directory, and macOS DMG.
- GitHub Actions build workflow exists for Windows and macOS artifacts.
- Prisma is configured with Windows and macOS binary targets.
- Start screen, navigation, product research cockpit, project view, key stores view, reports view, and settings view exist in the renderer.
- Embedded visible platform browser exists for Shopee desktop/mobile and TikTok mobile preview.
- Shopee desktop search, top-sales search, product-card normalization, screenshot asset saving, and structured search diagnostics are completed for Sprint 1.

### Partially Completed

- Shopee desktop product detail collection.
- Shopee desktop store detail collection.
- AI analysis workflow.
- HTML report generation.
- PDF report generation.

### Stubbed

- TikTok Shop adapter.
- Android Emulator automation adapter.

### Placeholder

- Key Stores ranking.
- Project detail tabs.
- Mobile evidence UI/report section.
- Export format labels beyond PDF.

### Not Started

- Shopee mobile app automation.
- TikTok Shop mobile automation.
- Android ADB integration.
- OCR pipeline.
- Licensing.
- Auto updates.
- Commercial telemetry.
- Plugin SDK.

## UI Exposure And Accessibility

### Exposed In UI

- Home and New Research expose Shopee Product Research and TikTok Shop Product Research as the primary actions.
- Shopee flow exposes keyword input, desktop/mobile view selection, Start Analyze, activity logs, job progress, fullscreen browser mode, and manual user interaction.
- TikTok Shop flow exposes a mobile-only Android-style platform preview and blocks unsupported extraction from M1.
- The visible platform browser lets users watch and manually interact with the marketplace surface.
- Projects screen exposes project tabs.
- Key Stores screen exposes AI ranking-style UI.
- Reports screen exposes PDF and other export format labels.
- Settings screen exposes browser preference, API keys, local folders, language, and concurrency.

### Exposed But Not Functional

- TikTok Shop is selectable and opens a mobile Android-style preview, but the marketplace adapter is unsupported and no TikTok extraction job is launched from M1.
- Mobile Evidence is visible through the platform preview, but no Android collection pipeline is connected.
- Key Stores ranking is visible, but it is not backed by real AI-ranked store data.
- Export labels for PowerPoint, Excel, CSV, JSON, and HTML are visible, but only PDF export is wired.

### Existing But Inaccessible From UI

- `AndroidAutomationAdapter` exists but is not registered in dependency injection.
- `UnsupportedAndroidAutomationAdapter` exists but is not used by the workflow or exposed through Settings.
- There is no UI to configure Android Studio Emulator, Genymotion, ADB path, device selection, OCR, or mobile screenshot capture.

## Source Files Relevant To This Audit

Modified in the latest implementation commit:

- `IMPLEMENTATION_STATUS.md`
- `ROADMAP.md`
- `CHANGELOG.md`
- `RELEASE_REPORT.md`
- `apps/desktop/eslint.config.js`
- `apps/desktop/e2e/smoke.spec.ts`
- `apps/desktop/src/application/services/IntelligenceWorkflow.ts`
- `apps/desktop/src/application/services/ReportService.ts`
- `apps/desktop/src/domain/models.ts`
- `apps/desktop/src/electron/main.ts`
- `apps/desktop/src/infrastructure/marketplaces/shopee/ShopeeAdapter.ts`
- `apps/desktop/src/infrastructure/report/HtmlReportRenderer.ts`
- `apps/desktop/src/infrastructure/repositories/PrismaRepositories.ts`
- `apps/desktop/src/renderer/App.tsx`
- `apps/desktop/src/renderer/api/client.ts`
- `apps/desktop/src/renderer/styles.css`
- `apps/desktop/src/renderer/vite-env.d.ts`

Existing implementation files inspected:

- `.github/workflows/build.yml`
- `CHANGELOG.md`
- `README.md`
- `apps/desktop/e2e/smoke.spec.ts`
- `apps/desktop/package.json`
- `apps/desktop/prisma/schema.prisma`
- `apps/desktop/src/domain/marketplace/MarketplaceAdapter.ts`
- `apps/desktop/src/infrastructure/android/UnsupportedAndroidAutomationAdapter.ts`
- `apps/desktop/src/infrastructure/browser/BrowserDiscovery.ts`
- `apps/desktop/src/infrastructure/platform/PlatformService.test.ts`
- `apps/desktop/src/infrastructure/platform/PlatformService.ts`
- `apps/desktop/src/renderer/App.tsx`
- `apps/desktop/src/renderer/store/uiStore.ts`
- `apps/desktop/src/renderer/styles.css`
- `docs/ARCHITECTURE_AND_PRD.md`
- `docs/CROSS_PLATFORM.md`
- `apps/desktop/src/infrastructure/marketplaces/MarketplaceRegistry.ts`
- `apps/desktop/src/infrastructure/marketplaces/UnsupportedMarketplaceAdapter.ts`
- `apps/desktop/src/api/server.ts`
- `apps/desktop/src/shared/contracts.ts`
- `apps/desktop/src/shared/reportSections.ts`
- `apps/desktop/src/infrastructure/report/HtmlReportRenderer.ts`

## Maintenance Rule

When a feature changes status:

1. Update the feature row in this document.
2. Update affected milestone progress.
3. Update `ROADMAP.md` sprint status or acceptance criteria if the change affects delivery sequencing.
4. Commit both documents with the feature work.
5. Push the commit to GitHub.
