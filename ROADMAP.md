# Marketplace Intelligence OS - Roadmap

Official project roadmap.

Last updated: 2026-07-10
Current version target: V1.0 Shopee Indonesia desktop intelligence
Companion document: `IMPLEMENTATION_STATUS.md`

This roadmap converts the implementation audit into delivery sprints. It does not mark future work as complete.

## Roadmap Principles

- Complete the Shopee Indonesia desktop workflow before expanding to TikTok Shop or Android.
- Keep marketplace-specific logic behind marketplace adapters.
- Keep operating-system-specific logic behind platform services.
- Treat PDF-quality evidence as a product requirement, not a decorative output.
- Use guided user-controlled collection for protected marketplace pages; automation is optional support, not the source of truth when login, captcha, traffic verification, or app-only screens block collection.
- Update this file and `IMPLEMENTATION_STATUS.md` whenever a feature status changes.

## Release Blockers

| Date | Area | Status | Resolution |
| --- | --- | --- | --- |
| 2026-06-27 | Packaged Electron renderer assets | Fixed | Vite now emits relative `./assets/...` paths for packaged `file://` runtime, and packaged UI verification confirms the app shell renders. |
| 2026-06-29 | M0/M1 home flow mismatch | Fixed | Home now opens with one Create Analysis action, then a setup form, then the guided in-app browser. |
| 2026-06-29 | Shopee guest-view navigation aborts | Accepted | Electron webview `ERR_ABORTED` navigations are treated as non-fatal; users can complete Shopee login or traffic verification manually in the visible browser. |
| 2026-06-29 | Fully automatic collection without APIs | Re-scoped | Primary V1 collection is now guided/manual: the user controls the platform browser and the app captures each report step on demand. |
| 2026-06-30 | Android emulator boot validation | Fixed | `MIO_TikTok_Stable` boots with Android 35 Google Play x86_64 image and reports `sys.boot_completed=1` through ADB. |
| 2026-06-30 | TikTok APK availability | Fixed | The app detects TikTok APK candidates in Downloads, and the provided TikTok APK installed as `com.zhiliaoapp.musically`. |
| 2026-06-30 | Emulator reopens like a new phone | Fixed | Emulator launch preserves the AVD data partition and snapshots; the app does not wipe data, clear TikTok data, or reset Google login on restart. |
| 2026-06-30 | TikTok app not responding | Mitigated | Android status detects active TikTok ANR state and exposes Recover TikTok, which force-stops/reopens TikTok without clearing app data. The provided APK is ARM64 on an x86_64 emulator, so Play Store or universal APK install is recommended if freezes persist. |
| 2026-07-02 | M1 sidebar collapse hides content | Fixed | Hidden sidebar now switches the app shell to one content column; collapse/restore controls are icon-only and keep accessible labels. |
| 2026-07-02 | Shopee anti-bot bypass request | Re-scoped | The app will not bypass marketplace anti-bot protections. The supported path is user-controlled browsing plus visible HTML extraction, screenshot capture, and manual Android screenshot attachment. |
| 2026-07-02 | M1 light-mode UI readability | Fixed | The app now uses stronger light-mode contrast, solid panels, readable sidebar/navigation states, compact collector-first behavior, balanced browser controls, and an explicit manual-action notice for Shopee protected pages. |
| 2026-07-02 | Product extraction from protected marketplace pages | Re-scoped | Collection now captures the user-visible rendered page as screenshot, full HTML, visible text, optional print-PDF, and offline product rows from the current webview instead of launching a separate bot crawler. |
| 2026-07-02 | Portable Android tooling expectation | Clarified | The app cannot bundle Google Play system images or TikTok by default; Android tooling can now be discovered from sidecar SDK folders beside the executable or packaged resources when legally supplied. |
| 2026-07-03 | Projects split-view inspection | Fixed | Projects now opens as a dedicated Vault Metrics and project-list page; selecting a project opens a full-page inspector shaped like the final report. |
| 2026-07-03 | Report hierarchy mismatch | Fixed for guided evidence scope | Project inspection and generated reports now render Keyword General, Key Product, Product Detailed Qualified, Evaluation Phase, Key Store, and TikTok Evidence in the PRD/PDF workflow order. |
| 2026-07-03 | Long Shopee HTML snapshots | Fixed | Browser capture now targets `#main` when available, formats saved HTML across lines, displays capture status, and offers a manual Download HTML fallback. |
| 2026-07-03 | Collection flow too long | Fixed | Guided collection is now split into Part 1 Keyword General, Part 2 Product Details, and Part 3 Evaluation/Key Store with persisted save/resume progress. |
| 2026-07-03 | Shopee login state lost between projects | Fixed | The embedded browser now uses a persistent marketplace session partition instead of per-project partitions. |
| 2026-07-03 | Projects could show saved progress but not resume collection | Fixed | Project cards now separate `Inspect` from `Continue Collection`, and project inspector includes saved-progress details plus a resume action that reopens the collector from the saved state. |
| 2026-07-07 | Screenshot crop preview only showed a scrollable viewport | Fixed | Browser capture now stitches the full scrollable page and the review modal scales the complete capture into a non-scrolling crop preview. |
| 2026-07-07 | Keyword General Step 3 captured redundant evidence | Fixed | Step 3 now processes Relevance and Top Sales rows into the Key Product table, then starts Product Detail collection from a max-10 selected product set. |
| 2026-07-07 | Shopee extraction included too much page shell noise | Fixed | Product extraction now targets the inner content `<div>` under `#main` and prioritizes `picture._displayContents_` thumbnails, source placement, product type, and store badge signals. |
| 2026-07-07 | Project inspector accidentally hid later report stages | Fixed | Evaluation Phase, Key Store, and TikTok Evidence are restored below the focused Keyword General, Key Product, and Product Detailed Qualified sections. |
| 2026-07-07 | Browser fullscreen still behaved like a framed panel | Fixed | Fullscreen now makes the webview fill the viewport while browser controls, manual-action notice, and guided collector float above it. |
| 2026-07-07 | Shopee PDP detail sync was too shallow | Improved | Product Detail Qualified capture now saves structured PDP images, videos, description, review rows, and user-media URLs from browser-readable HTML where available. |
| 2026-07-07 | Key Product table lost rendered Shopee metric strings | Fixed | Duplicate product merging now preserves raw rating/sold text, inferred product type, normalized store type, monthly sold text, and total sold text. |
| 2026-07-08 | Floating collector unreadable in dark mode | Fixed | The collector now has dark-mode surface/text overrides, and compact folded mode keeps target and collect/process actions visible. |
| 2026-07-08 | Product Detail titles could become Shopee chrome labels | Fixed | PDP sync now rejects bad title candidates such as cart/header labels and keeps the existing product title unless a high-confidence PDP title is available. |
| 2026-07-08 | PDP store and promotion signals were not persisted | Improved | PDP sync now updates Store Name/URL from visible shop content and stores shop vouchers, bundle deals, and promotion counts where readable. |
| 2026-07-08 | Key Product Store Name stayed blank after PDP capture | Improved | PDP sync now targets Shopee's `.s112-pdp-product-shop` / `section.page-product__shop` area, using the shop anchor and adjacent visible store-name text before falling back to broader shop links. |
| 2026-07-08 | Key Product Store Type showed invalid fallback labels | Fixed | Search-result Store Type extraction now uses product-card badge images only and displays only `Mall ORI`, `Star+`, or `Star`; stale fallback labels such as `Top-sales store` are hidden. |
| 2026-07-08 | PDP Store Name still failed on Shopee's current shop panel | Fixed | Store Name extraction now walks from the PDP shop anchor to the following sibling name block inside `.s112-pdp-product-shop` / `section.page-product__shop`. |
| 2026-07-08 | Store Type badge text existed only inside images | Improved | Search-result extraction now scores small rendered badge images and uses best-effort visual badge classification, while persistence accepts only `Mall ORI`, `Star+`, or `Star`. |
| 2026-07-08 | Product Detail sub-actions were passive text | Fixed | Product Detail Qualified now has selectable guided sub-actions, including separate 5-star Positive Reviews and 1-star Negative Reviews collection passes. |
| 2026-07-08 | 5-star and 1-star review passes could overwrite each other | Fixed | PDP review persistence now appends deduped review rows, so separate Positive and Negative Review collection passes remain together. |
| 2026-07-08 | Collection progress did not preview product-detail sync results | Improved | The collection workspace now previews the active product, evidence status, and sub-actions for PDP screenshot, slides/media, description, reviews, user media, vouchers, bundle deals, and shop homepage. |
| 2026-07-08 | Evaluation Phase forced a project-inspector context switch | Improved | Evaluation Phase can now open inside the collection workspace, show Potential Store scoring, run AI scoring, and then continue into Key Store collection. |
| 2026-07-08 | Sidebar and inspector navigation scrolled away | Fixed | The main sidebar and Project Inspector outline are sticky; the inspector outline is grouped into collapsible dropdown sections matching the report hierarchy. |
| 2026-07-08 | Key Store lived in two navigation concepts | Fixed | The standalone Key Stores tab was removed; Evaluation Phase owns AI scoring and promotes the top Potential Store into the project-level Key Store section. |
| 2026-07-08 | Playwright smoke tests raced the desktop API | Fixed | E2E now starts isolated API and web preview servers on test-only ports with test app-data/cache folders. |
| 2026-07-08 | macOS artifact workflow failed during unit tests | Fixed | The desktop test script now uses `vitest run` and relies on `vitest.config.ts` for excludes, avoiding unquoted glob expansion on macOS shell runners. |
| 2026-07-08 | Browser Download HTML kept failing | Fixed | The rendered snapshot script now runs as an async webview function and manual HTML saves go through `/api/html-snapshot` into the local project evidence folder. |
| 2026-07-08 | Windows build failed under managed sandbox | Fixed | The desktop build script now uses Vite's `--configLoader runner`, avoiding esbuild parent-directory access failures. |
| 2026-07-08 | Key Product rating showed `5` from review-count text | Fixed | Rating extraction now uses bounded star/rating tokens and structured PDP values, so counts such as `50,7k Ratings` are not parsed as a product rating. |
| 2026-07-08 | PDP Store Name stayed blank after the shop panel changed | Fixed | Store Name extraction now preserves line breaks in Shopee's shop panel and reads the sibling name block after the shop anchor before filtering active/status metadata. |
| 2026-07-09 | PDP Store Name still blank from saved Product Detail HTML | Fixed | The extractor now recognizes `sll2-pdp-product-shop` and generic `pdp-product-shop` containers, and project detail loading backfills missing product store fields from captured PDP HTML assets. |
| 2026-07-09 | Product Detail collection UI was too text-heavy | Fixed | Product Detail collection now has direct Part 1/2/3 navigation, compact sub-action controls, richer active-product previews, screenshot-review zoom, and automatic return to Project Inspector after Product Details completion. |
| 2026-07-10 | Product Detail evidence saved incorrect scope | Fixed | Shop Home Page now uses full-page capture, per-sub-action target buttons drive Part 2 collection, descriptions preserve Shopee line breaks and description images, and review extraction/display is constrained to 3 positive plus 2 low-star rows. |
| 2026-07-10 | Product Detail media collection saved blurry/duplicate gallery assets | Fixed | Slides are now collected through a user-selected HD media cycle: the user selects the main Shopee gallery image/video and each Download click saves one visible media item up to 9 total. |
| 2026-07-10 | Product Detail shop homepage evidence did not appear in Project Inspector | Fixed | Product-owned Shop Home Page captures now stay attached to the product while still updating store records, and the inspector can show compatible existing store-owned captures. |
| 2026-07-10 | Keyword project management and report export gaps | Improved | Keyword Projects now support category filtering, card/list views, typed delete confirmation, completed/incomplete status, report preview/copy, HTML open, and DOCX export. |

## Sprint Overview

| Sprint | GitHub Milestone Name | Target Version | Theme | Estimated Time | Status |
| --- | --- | --- | --- | --- | --- |
| Foundation and Experience | M0/M1 Complete Desktop Product Experience | v0.1.1 | Guided manual evidence collector | 1 week | Completed |
| Sprint 1 | M2.1 Complete Shopee Desktop Search | v0.2.0 | Complete Shopee Desktop | 1 week | Completed |
| Sprint 2 | M2.2 Complete Product Detail | v0.3.0 | Complete Product Detail | 1 week | Completed for guided evidence scope |
| Sprint 3 | M2.3 Complete Store Detail | v0.4.0 | Complete Store Detail | 1 week | Partial |
| Sprint 4 | M3.1 Complete Key Stores AI | v0.5.0 | Key Stores AI | 1 week | Partial |
| Sprint 5 | M3.2 Complete Reports | v0.6.0 | Report completeness | 1 week | Partial |
| Sprint 6 | M4.1 Shopee Mobile Evidence | v0.7.0 | Shopee Mobile | 1 week | Not Started |
| Sprint 7 | M4.2 Android Manual Evidence | v0.8.0 | Android Emulator evidence workspace | 2 weeks | Completed for manual evidence scope |
| Sprint 8 | M5.1 TikTok Shop Adapter | v0.9.0 | TikTok Shop | 2 weeks | Not Started |
| Sprint 9 | M6.1 Commercial Release | v1.0.0 | Commercial Release | 2 weeks | Not Started |

## Foundation and Experience - Complete Desktop Product Experience

GitHub Milestone Name: M0/M1 Complete Desktop Product Experience
Target Version: v0.1.1
Estimated Time: 1 week
Status: Completed
Completed: 2026-06-29

### Objectives

- Make the app open directly into one `Create Analysis` action.
- Capture keyword, created date, product category, and selected platform before opening the browser.
- Show the marketplace surface inside the app and guide the user through PDF-defined evidence steps.
- Store user-triggered screenshots as local project evidence.

### Tasks

| Task | Dependencies | Estimated Time | Acceptance Criteria |
| --- | --- | ---: | --- |
| Redesign home entry | React renderer | Done | Completed: Home starts with a single Create Analysis action. |
| Add analysis setup form | Project API | Done | Completed: keyword, product category, created date, and platform are captured before browser launch. |
| Add Shopee desktop/mobile visible view | Electron webview | Done | Completed: Shopee can be opened in desktop or mobile view. |
| Add browser fullscreen mode | Electron webview | Done | Completed: visible platform browser can expand fullscreen while the floating collector remains visible. |
| Add browser zoom and print | Electron webview | Done | Completed: embedded browser exposes zoom in/out and native print controls. |
| Add background HTML capture status | Electron webview | Done | Completed: browser overlay shows target received, HTML download, done, failed, and Download HTML fallback. |
| Add API-backed HTML snapshot save | Project workspace, Express API | Done | Completed: Download HTML saves the current rendered snapshot into the project evidence folder without relying on browser blob downloads. |
| Add shell personalization | React renderer | Done | Completed: sidebar can collapse and user can switch dark/light mode. |
| Fix light default and readability | React renderer, CSS | Done | Completed: light white/grey theme is default, sidebar is readable, and the floating guide follows the dashboard theme. |
| Add TikTok mobile visible view | Electron webview | Done | Completed: TikTok Shop opens in a mobile-style visible browser. |
| Add manual evidence API | Project workspace, Prisma assets | Done | Completed: captured browser screenshots are saved to project folders and registered as assets. |
| Add rendered-page snapshot persistence | Project workspace, Prisma assets | Done | Completed: capture saves screenshot, HTML, visible text, optional print-PDF data, and extracted product rows. |
| Add three-part guided flow | Evidence step map, project state | Done | Completed: collection is split into Keyword General, Product Details, and Evaluation/Key Store phases. |
| Add collection pause/resume state | Prisma project state | Done | Completed: Projects list shows saved stage/progress and the collector restores stage, completed steps, URL, and view mode. |
| Add collection resume from inspector | Prisma project state, project inspector | Done | Completed: project cards and the inspector expose Continue Collection, which reopens the Shopee collector or TikTok Android workspace from the saved project state. |
| Add full-page screenshot crop review | Electron webview capture | Done | Completed: screenshot capture stitches the scrollable page and shows it fully scaled for crop selection without preview scrolling. |
| Add process-only Key Product table step | Relevance and Top Sales extracted rows | Done | Completed: Step 3 builds the table instead of capturing another page; product detail starts only after the user reviews the table. |
| Add transient manual-action notices | Embedded browser state | Done | Completed: Shopee protected/login states auto-hide after 5 seconds and can be reopened from a persistent warning icon. |
| Add true browser fullscreen overlay | Electron webview | Done | Completed: fullscreen webview is end-to-end with controls and collector as overlays. |
| Add screenshot review crop | React renderer | Done | Completed: user can crop, save full, save selected, or redo before evidence is stored. |
| Add manual screenshot attachment | Project workspace, Prisma assets | Done | Completed: user-selected screenshot files can be attached to guided evidence steps. |
| Add floating step controller | Evidence step map | Done | Completed: the active collection point floats over the browser and reveals the collect button only on matching target pages. |
| Add progress visibility | Manual evidence state | Done | Completed: collected steps and activity log are visible beside the browser. |
| Add project inspector | Project repository | Done | Completed: projects can be inspected through report-shaped collapsible sections, evidence readiness, key stores, products, reports, and delete controls. |
| Add report history management | Report repository | Done | Completed: generated report history can be opened/downloaded or deleted from the Reports screen. |

### Acceptance Criteria

- Passed: Home exposes a single Create Analysis action.
- Passed: setup captures keyword, created date, product category, and marketplace.
- Passed: Proceed opens the in-app browser and creates a local project without requiring an automatic backend crawler job.
- Passed: Shopee and TikTok Shop can be controlled manually inside the visible browser surface.
- Passed: guided report steps are visible in a floating top-left browser controller.
- Passed: user can interact directly with the embedded platform view.
- Passed: default theme is light and the hidden sidebar no longer hides the main content.
- Passed: light-mode sidebar, browser controls, floating collector, and Shopee protected-page states remain readable after the corrective UI polish pass.
- Passed: dark-mode floating collector remains readable, and folded collector state still exposes compact target and collect/process buttons.
- Passed: report history and project inspection persist through the local database.
- Passed: project inspector mirrors the report hierarchy and displays extracted product/store/evidence data in collapsible sections.
- Passed: collection can be saved and resumed from the Projects vault with visible stage and percentage.

### Scope Boundary

- Real Android emulator control remains in Sprint 7.
- Real TikTok Shop extraction remains in Sprint 8.
- Automated product/store/review parsing remains secondary and incomplete; report-grade evidence is collected through the guided manual workflow.

### 2026-06-29 Update

- Relevance and top-sales URLs now follow the requested `page=0&sortBy=relevancy` and `page=0&sortBy=sales` format.
- The product was re-scoped from full autonomous collection to guided manual capture. The user controls the marketplace browser, and the app saves each PDF-defined evidence point on demand.
- Key-product selection now merges relevance and top-sales results and stores source placement plus reason for selection.
- Product details now retain image URLs, first-page screenshots, description screenshots, review-section screenshots, product descriptions, variants, specifications, and heuristic positive/negative reviews.
- Store collection now captures homepage, banner, popular-products, and best-seller screenshots where Shopee allows access.
- Full M3-M6 completion remains blocked by the dependencies listed in their sprint sections.

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
Status: Completed for guided evidence scope
Completed: 2026-07-03

### Objectives

- Complete product page collection for report-grade product dossiers.
- Capture media, variants, description, specification, pricing, stock, and seller metadata.

### Tasks

| Task | Dependencies | Estimated Time | Acceptance Criteria |
| --- | --- | ---: | --- |
| Build product detail parser map | Product detail pages | Done | Completed for guided scope: captured PDP text/HTML enriches title, price range, original price, discount, stock, rating, sold counts, and store signals where visible. |
| Collect product variants | Product page DOM | Done | Completed for guided scope: visible variant-like lines are stored per product. |
| Collect description and specifications | Product page DOM | Done | Completed for guided scope: product description and key/value specifications are stored where readable. |
| Capture product media slides | Screenshot engine, media collector | Partial | Product image URLs and screenshot assets are retained, but guaranteed extraction of every protected Shopee slide remains heuristic. |
| Add product detail validation tests | Fixtures or mocked DOM | Partial | Existing unit/e2e validation passes; dedicated parser fixtures remain a follow-up. |
| Sync PDP structured evidence | User-controlled PDP capture | Done for guided scope | Completed: Product Detail Qualified capture persists visible first viewport, browser-readable images/videos, description, structured review rows, and review media URLs. |

### Dependencies

- Sprint 1 search result URLs.
- Product repository.
- Screenshot workspace.
- Product detail schema fields.

### Acceptance Criteria

- Passed for guided scope: product detail captures populate report-ready product records where the visible Shopee page exposes text/HTML.
- Passed: media evidence is organized in project folders and linked to products through owner metadata.
- Passed: missing fields remain visible as collection limitations in the inspector/report instead of silent failures.
- Passed: Product detail rows in `IMPLEMENTATION_STATUS.md` are updated.
- Follow-up: protected slide/video extraction and dedicated parser fixtures remain open.
- 2026-07-03 update: rendered-page capture now targets `#main`, formats HTML snapshots across lines, shows browser capture status, persists collection phase/progress, and localizes WebP thumbnails to JPG where possible.
- 2026-07-07 update: guided PDP capture now syncs structured media, review, description, and raw Shopee metric text into product records; product dossiers expose videos and Media in User evidence.
- 2026-07-08 update: PDP sync now prevents Shopee UI labels from replacing product titles, updates Store Name/URL from the shop-anchor sibling block under `.s112-pdp-product-shop` / `section.page-product__shop` where visible, records shop vouchers, bundle deals, promotion count, videos, review rows, and review media where browser-readable HTML exposes them, and shows a live collection preview for the current product.
- 2026-07-08 update: PDP rating sync now avoids parsing review counts as ratings, and Store Name sync preserves visible line breaks before filtering noisy shop metadata.
- 2026-07-08 update: Product Detail Qualified sub-actions are selectable, with separate guided 5-star Positive Reviews and 1-star Negative Reviews collection paths that append deduped review rows.
- 2026-07-09 update: Product Detail capture and project-detail repair now parse the current Shopee `sll2-pdp-product-shop` HTML shape, including visible store name, store URL, and Mall/Star badge signals.
- 2026-07-09 update: Product Detail collection navigation now allows jumping between Part 1, Part 2, and Part 3; Part 2 guidance uses compact sub-action controls and previews synced product evidence before the user moves on.
- 2026-07-10 update: Product Detail sub-actions now own target navigation, Shop Home Page captures full-page evidence, descriptions preserve readable Shopee formatting and images, and review rows are filtered to report-grade 3 positive plus 2 negative samples.
- 2026-07-10 update: Product Detail slide collection now saves user-selected main HD media one item at a time, and product shop-home captures now appear in the correct Product Detailed Qualified section.
- 2026-07-10 update: Keyword Projects and Reports gained category filtering, cards/list view, typed deletion, completed-state behavior, report preview/copy, HTML open, and DOCX export.

## Sprint 3 - Complete Store Detail

GitHub Milestone Name: M2.3 Complete Store Detail
Target Version: v0.4.0
Estimated Time: 1 week
Status: Partial

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

- Partial: store records include profile metrics and homepage evidence where visible.
- Partial: voucher and promotion sections are captured as assets where visible, but voucher normalization is not complete.
- Passed: store detail report sections have real evidence inputs and explicit empty states.
- Passed: Product Detail capture now refreshes Store Name/URL from PDP shop content using the Shopee shop block before store evaluation begins.
- Passed: Product Detail capture now targets Shopee's shop-anchor sibling layout for Store Name and can repair Store Type from valid Mall/Star badges when visible.
- Passed: Key Store collection can start from the top Potential Store and targets Store Home Page, Products, Best Sellers, and Visual Style/banner evidence.
- Passed: M2 store-related rows in `IMPLEMENTATION_STATUS.md` are updated.

## Sprint 4 - Complete Key Stores AI

GitHub Milestone Name: M3.1 Complete Key Stores AI
Target Version: v0.5.0
Estimated Time: 1 week
Status: Partial

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

- Passed: Project Inspector Evaluation Phase no longer uses placeholder-only scoring; it combines GMV ETA, monthly sold, promotion signals, rating/trust signals, store assets, and persisted AI output where available.
- Passed: Evaluation Phase now labels entries as Potential Store, owns the AI scoring action, can be opened inside the collection workspace, and promotes the highest-scored store into the project-level Key Store section.
- Partial: rankings show evidence-backed rationale when product/store evidence exists, but high-confidence narrative scoring still depends on completed store evidence and configured providers.
- Passed: AI provider failure falls back to local heuristic analysis with explicit limitations.
- Passed: M1 and M3 Key Stores rows in `IMPLEMENTATION_STATUS.md` are updated.

## Sprint 5 - Complete Reports

GitHub Milestone Name: M3.2 Complete Reports
Target Version: v0.6.0
Estimated Time: 1 week
Status: Partial

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

- Passed: HTML/PDF report can be generated from a guided Shopee project.
- Passed: missing evidence is explicit in the report.
- Passed: report sections remain modular and can be enabled or disabled.
- Passed: M3 report rows in `IMPLEMENTATION_STATUS.md` are updated.
- Follow-up: visual QA against a fully populated real project remains required before marking PDF export complete.

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

## Sprint 7 - Android Manual Evidence

GitHub Milestone Name: M4.2 Android Manual Evidence
Target Version: v0.8.0
Estimated Time: 2 weeks
Status: Completed for manual evidence scope

### Objectives

- Replace the unsupported Android-only placeholder with a real emulator and ADB-backed manual evidence workspace.
- Let the user control TikTok/TikTok Shop manually inside Android while the app handles install, launch, status, screenshots, and visible text.

### Tasks

| Task | Dependencies | Estimated Time | Acceptance Criteria |
| --- | --- | ---: | --- |
| Detect ADB and emulator tools | Platform service | Done | Completed: Android service detects ADB, emulator, SDK manager, AVD manager, Java, and SDK root. |
| Discover connected devices | ADB | Done | Completed: Android status lists connected devices and reports no-device diagnostics when none are running. |
| Create local emulator profile | Android SDK command-line tools | Done | Completed locally: `MIO_TikTok_Stable` AVD was created from Android 35 Google Play x86_64 Google Play image. |
| Start emulator profile | Android Emulator CLI | Done | Completed: `MIO_TikTok_Stable` boots and reports ADB boot completion without wiping existing emulator data. |
| Capture screenshots | ADB screencap | Done | Completed: screenshot capture writes PNG output from the booted emulator. |
| Extract visible text | UIAutomator | Done | Completed: visible text extraction returns UIAutomator text from the active Android screen. |
| Wire Android adapter into workflow | Dependency injection, manual workspace | Done | Completed: API and TikTok Android workspace use the ADB-backed Android tooling path. |
| Detect local TikTok APKs | Downloads/Desktop scan | Done | Completed: the provided TikTok APK in Downloads is detected and prefilled in the UI. |
| Install and launch TikTok app | ADB, user-provided APK | Done | Completed: provided TikTok APK installed as `com.zhiliaoapp.musically` and launched through ADB. |
| Detect and recover TikTok ANR | ADB dumpsys, TikTok package state | Done | Completed: Android status reports TikTok runtime/ANR state and Recover TikTok reopens the app without clearing data. |

### Dependencies

- Sprint 6 mobile evidence model.
- Platform service.
- Android SDK or platform-tools.
- OCR tooling.
- Job queue and logs.

### Acceptance Criteria

- Passed: Android adapter no longer reports unsupported when tools are available.
- Passed: screenshot capture and visible text extraction work for the local emulator.
- Passed: TikTok APK discovery, install, and launch work with the user-provided APK.
- Passed: emulator restart preserves installed apps, Android setup state, and TikTok/login data.
- Passed: TikTok ANR recovery is available from the Android workspace.
- Passed: Android errors are logged with actionable diagnostics.
- Manual scope: TikTok Shop entry, Gmail login, and in-app navigation remain user-controlled by design.
- M4 Android rows in `IMPLEMENTATION_STATUS.md` are updated.

### 2026-06-30 Update

- Added `AndroidToolingService` and `AdbAndroidAutomationAdapter`.
- Added Android status, emulator launch, APK install, TikTok launch, visible-text extraction, and Android evidence capture API routes.
- Added TikTok Android Emulator Workspace in the UI, keeping TikTok collection controls outside the browser surface.
- Added fully hidden sidebar behavior and a more compact expandable Shopee floating collector as supporting UX changes.
- Installed local Android command-line tooling dependencies and created `MIO_TikTok_Stable` AVD.
- Installed the provided TikTok APK from Downloads and launched it on the booted emulator.
- Added runtime diagnostics for TikTok ANR, package ABI, device ABI, and a Recover TikTok action for ARM-on-x86 hangs.
- Current scope boundary: TikTok Shop navigation is manual; normalized TikTok marketplace collection remains Sprint 8.

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
