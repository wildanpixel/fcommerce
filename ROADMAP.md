# Marketplace Intelligence OS - Roadmap

Official project roadmap.

Last updated: 2026-06-27
Current version target: V1.0 Shopee Indonesia desktop intelligence
Companion document: `IMPLEMENTATION_STATUS.md`

This roadmap converts the implementation audit into delivery sprints. It does not mark future work as complete.

## Roadmap Principles

- Complete the Shopee Indonesia desktop workflow before expanding to TikTok Shop or Android.
- Keep marketplace-specific logic behind marketplace adapters.
- Keep operating-system-specific logic behind platform services.
- Treat PDF-quality evidence as a product requirement, not a decorative output.
- Update this file and `IMPLEMENTATION_STATUS.md` whenever a feature status changes.

## Sprint Overview

| Sprint | GitHub Milestone Name | Target Version | Theme | Estimated Time | Status |
| --- | --- | --- | --- | --- | --- |
| Sprint 1 | M2.1 Complete Shopee Desktop Search | v0.2.0 | Complete Shopee Desktop | 1 week | Completed |
| Sprint 2 | M2.2 Complete Product Detail | v0.3.0 | Complete Product Detail | 1 week | Next |
| Sprint 3 | M2.3 Complete Store Detail | v0.4.0 | Complete Store Detail | 1 week | Not Started |
| Sprint 4 | M3.1 Complete Key Stores AI | v0.5.0 | Key Stores AI | 1 week | Not Started |
| Sprint 5 | M3.2 Complete Reports | v0.6.0 | Report completeness | 1 week | Not Started |
| Sprint 6 | M4.1 Shopee Mobile Evidence | v0.7.0 | Shopee Mobile | 1 week | Not Started |
| Sprint 7 | M4.2 Android Automation | v0.8.0 | Android Automation | 2 weeks | Not Started |
| Sprint 8 | M5.1 TikTok Shop Adapter | v0.9.0 | TikTok Shop | 2 weeks | Not Started |
| Sprint 9 | M6.1 Commercial Release | v1.0.0 | Commercial Release | 2 weeks | Not Started |

## Sprint 1 - Complete Shopee Desktop

GitHub Milestone Name: M2.1 Complete Shopee Desktop Search
Target Version: v0.2.0
Estimated Time: 1 week
Status: Completed
Completed: 2026-06-27

### Objectives

- Make Shopee desktop search collection reliable enough for repeatable consulting reports.
- Normalize search result, top-sales, and product-card evidence.
- Reduce runtime failure modes from consent screens, login prompts, and empty result pages.

### Tasks

| Task | Dependencies | Estimated Time | Acceptance Criteria |
| --- | --- | ---: | --- |
| Harden Shopee search navigation | Shopee adapter, Playwright launcher | 1 day | Completed: navigation retries, interruption dismissal, readiness waits, and blocked-page diagnostics are implemented. |
| Normalize search result products | Product card parser | 1 day | Completed: browser-readable card title, URL, price, sold count, rating, image, sort source, and visible location/store clues are normalized. |
| Capture search result screenshots | Screenshot engine, project workspace | 1 day | Completed: search result and top-sales screenshots are saved in project folders with database asset references. |
| Add top-sales extraction validation | Shopee sorting path | 1 day | Completed: top-sales ordering is compared against relevance ordering and ignored-sort behavior is logged. |
| Add collection error logging | Job queue, logs | 1 day | Completed: failed selectors, blocked pages, login gates, empty results, navigation retries, and empty extraction failures appear in job logs. |

### Dependencies

- Existing Shopee desktop adapter.
- Playwright browser launch configuration.
- Project workspace asset folders.
- Prisma product and asset repositories.

### Acceptance Criteria

- Passed: a Shopee keyword job has a hardened path to collect normalized search results when the page is browser-readable.
- Passed: screenshots exist for search results and top sales when capture is enabled.
- Passed: empty or blocked pages are reported as structured warning/error log messages.
- Passed: `IMPLEMENTATION_STATUS.md` M2 search-related rows are updated with the final status.

### Validation

- Build passed.
- TypeScript passed.
- ESLint passed.
- Unit tests passed.
- Playwright smoke test passed.
- Windows installer, portable executable, and `win-unpacked` package were generated.
- Packaged Windows runtime launched and returned OK from `/api/health`.
- Local macOS packaging was not available on this Windows workstation; macOS packaging remains covered by the GitHub Actions macOS runner.

## Sprint 2 - Complete Product Detail

GitHub Milestone Name: M2.2 Complete Product Detail
Target Version: v0.3.0
Estimated Time: 1 week
Status: Next

### Objectives

- Complete product page collection for report-grade product dossiers.
- Capture media, variants, description, specification, pricing, stock, and seller metadata.

### Tasks

| Task | Dependencies | Estimated Time | Acceptance Criteria |
| --- | --- | ---: | --- |
| Build product detail parser map | Product detail pages | 1 day | Parser extracts title, price, original price, discount, stock, rating, sold counts, and store references. |
| Collect product variants | Product page DOM | 1 day | Variant names and visible options are stored per product. |
| Collect description and specifications | Product page DOM | 1 day | Description and specification fields are stored as structured data. |
| Capture product media slides | Screenshot engine, media collector | 1 day | First image, gallery slides, and video presence are captured or recorded. |
| Add product detail validation tests | Fixtures or mocked DOM | 1 day | Unit tests cover parser behavior for representative Shopee product pages. |

### Dependencies

- Sprint 1 search result URLs.
- Product repository.
- Screenshot workspace.
- Product detail schema fields.

### Acceptance Criteria

- Product detail pages populate report-ready product records.
- Media evidence is organized in project folders.
- Missing fields are recorded as collection limitations, not silent failures.
- Product detail rows in `IMPLEMENTATION_STATUS.md` are updated.

## Sprint 3 - Complete Store Detail

GitHub Milestone Name: M2.3 Complete Store Detail
Target Version: v0.4.0
Estimated Time: 1 week
Status: Not Started

### Objectives

- Complete Shopee store homepage and store profile evidence.
- Capture followers, products, rating, chat response, joined date, categories, banners, featured products, promotions, best sellers, vouchers, and decoration cues.

### Tasks

| Task | Dependencies | Estimated Time | Acceptance Criteria |
| --- | --- | ---: | --- |
| Harden store page navigation | Product store URLs | 1 day | Store URL opens and stores clear blocked-page errors when unavailable. |
| Collect store profile metrics | Store page parser | 1 day | Followers, products, rating, chat response, joined date, and store categories are stored where visible. |
| Capture store homepage sections | Screenshot engine | 1 day | Banner, homepage, featured product, best seller, and promotion screenshots are saved. |
| Collect vouchers | Voucher section parser | 1 day | Voucher count and visible voucher types are stored. |
| Classify store decoration | AI or heuristic classifier | 1 day | Branding, visual theme, campaign, and promotion evidence are available for report sections. |

### Dependencies

- Product detail store links.
- Store repository.
- Screenshot engine.
- Report asset loader.

### Acceptance Criteria

- Store records include profile metrics and homepage evidence where visible.
- Voucher and promotion sections are either captured or reported as unavailable.
- Store detail report sections have real evidence inputs.
- M2 store-related rows in `IMPLEMENTATION_STATUS.md` are updated.

## Sprint 4 - Complete Key Stores AI

GitHub Milestone Name: M3.1 Complete Key Stores AI
Target Version: v0.5.0
Estimated Time: 1 week
Status: Not Started

### Objectives

- Replace placeholder Key Stores scoring with persisted AI-backed rankings.
- Generate strengths, weaknesses, trust signals, visual quality, voucher strategy, and recommendations from collected evidence.

### Tasks

| Task | Dependencies | Estimated Time | Acceptance Criteria |
| --- | --- | ---: | --- |
| Define key store scoring schema | AI analysis contract | 1 day | Score fields and rationale are typed and persisted. |
| Feed store evidence to AI analysis | Store screenshots, store metrics | 1 day | AI receives structured store profile and homepage evidence. |
| Persist rankings | Prisma analysis repository | 1 day | Key store ranking survives app restart and reload. |
| Render real rankings in UI | Key Stores screen | 1 day | Key Stores table uses persisted AI output instead of sample-derived scores. |
| Add tests for ranking fallback | Local heuristic service | 1 day | Local fallback produces deterministic key store ranking when API keys are absent. |

### Dependencies

- Sprint 3 store evidence.
- AI provider abstraction.
- Analysis repository.
- Key Stores UI.

### Acceptance Criteria

- Key Stores UI no longer uses placeholder score logic.
- Rankings show evidence-backed rationale.
- AI provider failure falls back to local heuristic analysis with explicit limitations.
- M1 and M3 Key Stores rows in `IMPLEMENTATION_STATUS.md` are updated.

## Sprint 5 - Complete Reports

GitHub Milestone Name: M3.2 Complete Reports
Target Version: v0.6.0
Estimated Time: 1 week
Status: Not Started

### Objectives

- Make the PDF report workflow match the logical sequence from the source PRD.
- Ensure every enabled report section either renders real evidence or clearly states missing evidence.

### Tasks

| Task | Dependencies | Estimated Time | Acceptance Criteria |
| --- | --- | ---: | --- |
| Audit report section evidence requirements | Report sections, PRD mapping | 1 day | Every section lists required evidence and fallback behavior. |
| Complete product dossier sections | Sprint 2 data | 1 day | Product sections render collected product details and media evidence. |
| Complete store dossier sections | Sprint 3 data | 1 day | Store sections render homepage, voucher, banner, promotion, and profile evidence. |
| Complete AI recommendation section | Sprint 4 analysis | 1 day | Executive summary, SWOT, gaps, and recommendations render from structured JSON. |
| Validate generated PDF layout | Puppeteer PDF | 1 day | PDF exports without blank pages, broken images, or missing core sections. |

### Dependencies

- Sprint 1 search evidence.
- Sprint 2 product details.
- Sprint 3 store details.
- Sprint 4 AI ranking and recommendations.
- Report renderer and PDF exporter.

### Acceptance Criteria

- PDF report can be generated from a completed Shopee desktop job.
- Missing evidence is explicit in the report.
- Report sections remain modular and can be enabled or disabled.
- M3 report rows in `IMPLEMENTATION_STATUS.md` are updated.

## Sprint 6 - Shopee Mobile

GitHub Milestone Name: M4.1 Shopee Mobile Evidence
Target Version: v0.7.0
Estimated Time: 1 week
Status: Not Started

### Objectives

- Add a reliable mobile evidence path for Shopee app-only screens.
- Avoid blocking desktop workflow while mobile automation matures.

### Tasks

| Task | Dependencies | Estimated Time | Acceptance Criteria |
| --- | --- | ---: | --- |
| Design mobile evidence data model | Report assets, analysis inputs | 1 day | Mobile screenshots can be linked to projects, products, stores, and report sections. |
| Add manual mobile screenshot import | Project workspace, asset repository | 2 days | User can import mobile screenshots as evidence without emulator automation. |
| Add mobile evidence report rendering | Report renderer | 1 day | Mobile screenshots appear in modular cross-platform report sections. |
| Feed mobile images to AI analysis | AI provider abstraction | 1 day | AI analysis receives imported mobile screenshots where available. |

### Dependencies

- Report asset model.
- AI provider abstraction.
- Project workspace.
- Product and store records.

### Acceptance Criteria

- Shopee mobile evidence can be attached to a project manually.
- Imported evidence appears in reports and AI analysis.
- M4 Shopee Mobile rows in `IMPLEMENTATION_STATUS.md` are updated.

## Sprint 7 - Android Automation

GitHub Milestone Name: M4.2 Android Automation
Target Version: v0.8.0
Estimated Time: 2 weeks
Status: Not Started

### Objectives

- Replace the unsupported Android adapter with real emulator and ADB-based automation.
- Capture app screenshots and visible text for Shopee mobile evidence.

### Tasks

| Task | Dependencies | Estimated Time | Acceptance Criteria |
| --- | --- | ---: | --- |
| Detect ADB and emulator tools | Platform service | 2 days | Settings can show Android tooling availability. |
| Discover connected devices | ADB | 2 days | Available devices are listed with status. |
| Start emulator profile | Android Emulator CLI | 2 days | Configured emulator can be launched and health-checked. |
| Capture screenshots | ADB screencap | 2 days | Screenshots are saved to project asset folders. |
| Extract visible text | OCR and/or UIAutomator | 3 days | Visible text is extracted into structured evidence. |
| Wire Android adapter into workflow | Dependency injection, job queue | 3 days | Mobile collection jobs can call the Android adapter. |

### Dependencies

- Sprint 6 mobile evidence model.
- Platform service.
- Android SDK or platform-tools.
- OCR tooling.
- Job queue and logs.

### Acceptance Criteria

- Android adapter no longer reports unsupported when tools are available.
- Screenshot capture and visible text extraction work for an emulator or connected device.
- Android errors are logged with actionable diagnostics.
- M4 Android rows in `IMPLEMENTATION_STATUS.md` are updated.

## Sprint 8 - TikTok Shop

GitHub Milestone Name: M5.1 TikTok Shop Adapter
Target Version: v0.9.0
Estimated Time: 2 weeks
Status: Not Started

### Objectives

- Replace the TikTok unsupported adapter with a real marketplace adapter.
- Keep TikTok logic isolated behind the marketplace adapter interface.

### Tasks

| Task | Dependencies | Estimated Time | Acceptance Criteria |
| --- | --- | ---: | --- |
| Define TikTok collection strategy | Marketplace adapter interface | 2 days | Desktop, mobile, and evidence limitations are documented. |
| Implement TikTok search collection | Playwright or mobile workflow | 3 days | Keyword search returns normalized product candidates. |
| Implement TikTok product detail collection | TikTok parser | 3 days | Product detail fields map into shared product models. |
| Implement TikTok store collection | TikTok parser | 3 days | Store profile fields map into shared store models. |
| Add TikTok report mapping | Report renderer | 2 days | TikTok evidence renders through existing report sections. |
| Add adapter tests | Fixtures or mocked DOM | 1 day | Adapter parsing is covered by repeatable tests. |

### Dependencies

- Stable marketplace adapter interface.
- Completed Shopee data model lessons.
- Playwright browser support or Android automation.
- Report section abstraction.

### Acceptance Criteria

- TikTok Shop is no longer backed by `UnsupportedMarketplaceAdapter`.
- TikTok jobs do not fail immediately because of unsupported adapter registration.
- Shared report workflow can render TikTok evidence.
- M5 rows in `IMPLEMENTATION_STATUS.md` are updated.

## Sprint 9 - Commercial Release

GitHub Milestone Name: M6.1 Commercial Release
Target Version: v1.0.0
Estimated Time: 2 weeks
Status: Not Started

### Objectives

- Prepare the app for commercial distribution on Windows and macOS.
- Add release, signing, update, licensing, and operational readiness without changing core marketplace architecture.

### Tasks

| Task | Dependencies | Estimated Time | Acceptance Criteria |
| --- | --- | ---: | --- |
| Configure release artifact verification | CI/CD build workflow | 1 day | Windows and macOS artifacts are uploaded with clear names. |
| Prepare code signing environment config | Electron Builder | 2 days | Signing uses environment variables and no certificate paths are hardcoded. |
| Add update service abstraction | Platform service, settings | 2 days | App can support GitHub Releases or private update providers later. |
| Add licensing architecture | Local settings, secure storage | 3 days | License checks are isolated from core business logic. |
| Add privacy-aware telemetry plan | Product requirements | 2 days | Telemetry is opt-in or clearly documented before implementation. |
| Complete production QA checklist | Build, typecheck, lint, tests, packaged launch | 2 days | Release candidate checklist is documented and repeatable. |
| Update user documentation | README, troubleshooting docs | 2 days | Windows and macOS setup, build, and packaging instructions are current. |

### Dependencies

- Stable Shopee desktop workflow.
- Report generation reliability.
- Cross-platform builds.
- Signing credentials supplied through environment variables.

### Acceptance Criteria

- Windows installer and portable artifacts are verified.
- macOS app and DMG artifacts are verified on macOS runner.
- Update, licensing, and signing architecture is documented and isolated.
- `IMPLEMENTATION_STATUS.md` M6 rows are updated.

## Ongoing Documentation Maintenance

Every feature completion must include:

1. Source code or configuration changes for the feature.
2. Tests or validation appropriate to the feature.
3. Updated `IMPLEMENTATION_STATUS.md`.
4. Updated `ROADMAP.md` if sprint sequencing, acceptance criteria, status, or target version changed.
5. A Git commit containing the feature and the progress document updates.
6. A push to GitHub.
