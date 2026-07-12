# Changelog

All notable changes to MarketPlace Keyword Competitor Analysis will be documented in this file.

## Unreleased - 2026-07-13

- Changed Product Detail Shop Home Page and Key Store Store Home Page report evidence to export as 9:16 portrait cards in DOCX, HTML, and PDF so long screenshots no longer render as blurred skinny strips.
- Changed the default report section selection so Summary Metrics is off by default, matching the requested Project Inspector content view while keeping the section available as an opt-in report toggle.
- Restyled HTML/PDF report output toward the Project Inspector content layout with a compact report header instead of a cover-style page.
- Expanded Shopee first-page extraction for Relevance, Top Sales, Key Store Popular Products, and Best Sellers by scrolling the full grid and collecting rows during the scroll pass instead of stopping at the initially visible 12 products.
- Fixed PDP Store Type badge detection so compact `Star` badges are preferred over broad Mall ORI badges found elsewhere on the page.

## Unreleased - 2026-07-12

- Fixed structured DOCX product tables so thumbnail cells render actual JPEG-converted images instead of image URL text.
- Changed DOCX Product Detail Slides and Media in user output to compact image grids without per-image captions such as `Slide 1` or `Review media 1`.
- Changed generated Key Store Overall text to use the same narrative selection logic as Project Inspector: why the store is selected for the keyword, benchmark use, GMV/sold/promotion signals, and AI summary when available.
- Restyled generated HTML/PDF product sections to use list-style product rows and expanded Project Inspector-like report sections from Keyword General through TikTok Evidence.
- Changed Key Store Store Home Page capture to start at the top of the store page and stop at the bottom of `.shop-decoration`.
- Removed screenshot placeholder evidence boxes from Key Store Popular Products and Best Sellers in Project Inspector because those Part 3 steps are data-only product matrix collection steps.
- Strengthened Store Popular Products and Best Sellers extraction to scan the store grid while scrolling through the first page, preserving unique products across lazy-loaded viewports instead of only the final mounted rows.
- Renamed Key Store Products to Popular Products and Visual Style to Visual Shop Banner across the collector, Project Inspector, report section metadata, HTML/PDF, and DOCX output.
- Improved Key Store Visual Shop Banner extraction by hydrating `.shop-decoration`, cycling likely carousel controls, and downloading readable non-product banner images.
- Added Part 1 business-priority scoring for Key Product selection, classifying high-price/high-demand products as Priority, low-price/high-demand products as High, weaker but viable combinations as Average, and low-demand products as Not recommended.
- Made generated HTML/PDF reports theme-aware so the export follows the user's last light or dark mode and uses the Project Inspector-style expanded layout.
- Made the collapsed collection activity control more compact while keeping actions reachable.

## Unreleased - 2026-07-11

- Replaced the fallback HTML-to-DOCX ZIP writer with a structured DOCX exporter that renders report data directly and converts supported images to JPEG for Word compatibility.
- Improved PDF/HTML report layout for cleaner A4 pagination, contained product images, portrait video handling, multiline review cards, and configurable Summary Metrics output.
- Tightened Product Detail slide/media filtering so product slides exclude Shopee arrows, icons, placeholders, avatars, and review/user media; product videos now appear only when explicitly captured from product gallery evidence.
- Preserved Shopee review formatting with customer id, timestamp/variation, attribute lines, and comment body instead of flattening reviews into a single line.
- Updated Project Inspector navigation so Evaluation Phase and TikTok Evidence render as plain section links, while Key Store exposes Overall, Store Home Page, Products, Best Sellers, and Visual Style sub-links.
- Changed Keyword Projects progress from horizontal bars to circular indicators for clearer scanability.
- Scoped Part 1 Relevance and Top Sales screenshots and product extraction to `section.shopee-search-item-result`.
- Added visible loading status while screenshots, HTML snapshots, product data, banner downloads, and manual evidence saves are running.
- Scoped Key Store inspection assets to the selected store and changed Visual Style collection to persist only readable `.shop-decoration` banner images.
- Increased Key Store Products and Best Sellers rendering to show full captured store matrices instead of a 12-item preview.
- Changed Key Store Products and Best Sellers collection to data-only `Collect Data` actions that hydrate the Shopee store product grid before extraction and no longer create screenshot evidence.
- Tightened Visual Style collection to download non-product `.shop-decoration` banner/carousel images only.
- Changed report generation action text to `Generate Report`.
- Reworked configurable report sections to match Project Inspector headings: Keyword General, Key Products, Product Detail subparts, Key Store subparts, and TikTok Evidence.
- Added Summary Metrics as a configurable report section for products, stores, reviews, and media evidence.
- Aligned generated Key Products with the inspector's selected max-10 product table and excluded Store Products/Store Best Sellers from that report table.
- Clarified Key Product source placement labels as `Top N in sales` / `Top N in relevance` across collection preview, Project Inspector, and generated reports.
- Deduplicated generated report product slides, capped each product dossier to the inspector's 9 selected media items, limited product videos to one, and made Key Store Visual Style reflect the exact stored banner assets.
- Added report developer attribution for Wildan Ega Pradana and LinkedIn profile.
- Added Bahasa Indonesia, English, and Chinese Modern language choices in setup/settings.
- Changed TikTok Shop in New Research to a disabled `Coming soon` option until the TikTok adapter and normalized collection workflow are implemented.

## Unreleased - 2026-07-10

- Changed the transition after Product Detail completion so the collection workspace automatically opens Part 3 Evaluation Phase instead of closing back to the project inspector.
- Scoped Part 3 Store Home Page screenshots to `.shop-decoration` and Store Products/Best Sellers screenshots to `.shop-page__all-products-section`.
- Persisted Part 3 store-grid product rows as `Store Products` and `Store Best Sellers` so the Key Store inspector can display store-specific product matrices without polluting the Key Product table.
- Added store-decoration banner download/localization for the Visual Style step, including readable carousel banner images.
- Changed Key Store Overall from score cards to conclusion sentences and changed the selected store URL into an Open Store Page button.
- Added a TikTok brand/store search target for the final Key Store evidence step using the selected store name.
- Renamed the visible desktop product to MarketPlace Keyword Competitor Analysis and renamed Projects to Keyword Projects in the product shell.
- Changed Product Detail slide collection from bulk gallery scraping to a user-selected HD media workflow: each click saves the currently visible main product image/video and advances the button from Download to Download 2 through Download 9.
- Fixed Product Detail Shop Home Page persistence so product-level store homepage screenshots remain visible inside the matching Product Detailed Qualified section while store records are still updated.
- Added independent Product Detail sub-action progress keys so a product is not marked complete after only one sub-action.
- Added a collapsed-by-default right-side Activity sidebar for collection actions.
- Added Keyword Projects category filtering, card/list view switching, typed project-delete confirmation, completed/incomplete status labels, and completed-project collection behavior.
- Changed Project Inspector metrics from Evidence/Ready to Media-focused metrics, added clickable saved URL display, and improved Product Detail media de-duplication and broken-image hiding.
- Added report preview, copy-to-docs, HTML open/download, and DOCX export actions backed by local API endpoints.
- Changed Product Detail Shop Home Page collection to request full-page screenshots while keeping First Page as visible-viewport capture.
- Moved Product Detail Open Target controls into each sub-action row and made folded collector target/action buttons follow the selected sub-action.
- Preserved Shopee description line breaks during PDP extraction and added description image persistence/display in Project Inspector.
- Tightened review extraction so Product Detail review sub-actions save only real dated Shopee review rows, with 5-star positives and 1/2/3-star negatives capped to 3 positive plus 2 negative display rows.
- Stopped Product Detail review sub-actions from falling back to broad visible-text parsing when no clean review rows are found, preventing product metadata and URLs from appearing as reviews.
- Compact Project Inspector saved progress into a smaller circular-progress summary so it no longer dominates the inspect page.
- Updated Product Detail video evidence display to preserve vertical Shopee videos with object-contained portrait frames and one selected video per download action.
- Made the Product Detail Qualified inspector navigation collapsible per product, so each product can reveal or hide its own First Page, Slides, Reviews, Media, and Shop Home Page links.
- Made Analysis Session collapsed by default in the collection workspace and reduced the collapsed footprint.
- Removed the forced mobile-view preference from Shop Home Page collection and reduced noisy white borders in dark mode.

## Unreleased - 2026-07-09

- Added Part 1/Part 2/Part 3 jump controls in Collection Progress so users can return to unfinished collection phases without losing saved state.
- Simplified Product Detail Qualified guidance by replacing long instructions with compact sub-action controls in the floating collector and progress panel.
- Added richer Product Detail preview cards showing store, store type, rating, reviews, sold text, media counts, description snippets, and collected review rows before moving to the next product.
- Added screenshot review zoom controls plus mouse-wheel/trackpad pinch zoom support before saving full or cropped evidence.
- After completing Product Details or the final collection phase, the app now closes the collection workspace and opens the project inspector for immediate evidence review.
- Fixed Product Detail Qualified store-name sync for Shopee's current `sll2-pdp-product-shop` container, which was not covered by the previous `s112` selector.
- Added a backend PDP HTML fallback parser so saved product-page HTML can fill `Store Name`, `Store URL`, and valid Mall/Star store type even when the renderer structured payload misses them.
- Added an automatic project-detail repair pass that backfills missing product store fields from existing captured PDP HTML assets.
- Added a regression test for the current Shopee PDP shop block so `iBox Official Shop` / similar visible store names are not replaced by shop chrome labels.

## Unreleased - 2026-07-08

- Fixed Key Product rating extraction so review counts such as `50,7k Ratings` are no longer misread as rating `5`; ratings now come from bounded star/rating tokens and PDP structured evidence.
- Fixed PDP Store Name extraction for Shopee shop panels where the store link is followed by a sibling name block, preserving line breaks before filtering noisy shop metadata.
- Added structured PDP metric persistence for rating text, review text, and total-sold text so Product Detail capture can repair Key Product rows more accurately.
- Fixed the browser `Download HTML` failure by changing the injected snapshot script to an async IIFE so badge-image analysis can run without a runtime syntax error.
- Changed manual HTML download from fragile renderer blob downloads to an API-backed local snapshot save in the project `manual-evidence` folder.
- Added `/api/html-snapshot` and renderer client support for saving standalone browser HTML/text snapshots.
- Made Playwright smoke tests use the configured E2E API port instead of hardcoding `4223`.
- Changed the production Vite build command to use `--configLoader runner`, avoiding Windows sandbox/esbuild parent-folder access failures during build.
- Fixed PDP Store Name extraction by walking from Shopee's shop anchor to the following sibling store-name block inside `.s112-pdp-product-shop` / `section.page-product__shop`.
- Hardened Store Type extraction for Relevance/Top Sales product cards by scoring small rendered badge images and adding a best-effort visual color classifier for image-only `Mall ORI`, `Star+`, and `Star` badges.
- Added strict Store Type persistence so only `Mall ORI`, `Star+`, or `Star` can enter product raw evidence.
- Turned Product Detail Qualified sub-actions into selectable guided collection actions for First Page, Slides, Positive Reviews, Negative Reviews, Media in User, Description/Vouchers/Bundle Deals, and Shop Home Page.
- Made review collection tab-aware: collecting on Shopee's active 5-star tab stores Positive Reviews, and collecting on the active 1-star tab stores Negative Reviews.
- Changed PDP review persistence from replace-all to append-deduped so separate 5-star and 1-star collection passes remain visible together.
- Fixed dark-mode readability for the floating guided collection controller.
- Kept compact target/open and collect/process actions visible when the floating guided collector is folded.
- Prevented Shopee UI labels such as `Shopping Cart icon` from overwriting Product Detail Qualified product titles.
- Updated Product Detail Qualified steps to show product-level substeps for first page, slides, description, reviews, media in user, vouchers/bundle deals, and shop homepage.
- Added PDP sync for Store Name/URL from Shopee's `.s112-pdp-product-shop` / `section.page-product__shop` area, including the shop anchor and adjacent visible store-name text.
- Tightened search-result Store Type extraction to badge images only and display only `Mall ORI`, `Star+`, or `Star`, preventing fallback labels such as `Top-sales store` from appearing in the Key Product table.
- Added Collection Progress previews for product-detail sub-actions so users can inspect whether screenshots, media, reviews, description, vouchers, bundle deals, and shop homepage evidence were captured correctly.
- Added PDP sync for shop vouchers, bundle deals, and promotion counts where browser-readable HTML exposes them.
- Removed the standalone Key Stores navigation tab; Key Store selection now lives inside Project Inspector after Evaluation Phase scoring.
- Changed Evaluation Phase labels from Candidate to Potential Store, moved the AI scoring action into that phase, and made Evaluation Phase open inside the collection workspace before Key Store collection begins.
- Added project-level Key Store subsections for Overall, Store Home Page, Products, Best Sellers, and Visual Style.
- Made the main sidebar sticky and made Project Inspector outline navigation sticky, grouped, collapsible, and readable in light-mode hover states.
- Restored Vite and Vitest config files while keeping deterministic CLI flags for build and test scripts.
- Stabilized Playwright smoke tests by starting isolated web/API servers on test-only ports and test app-data/cache folders.
- Fixed macOS CI unit-test execution by moving Vitest excludes into `vitest.config.ts` and removing unquoted shell globs from the npm test script.
- Added a Prisma generate wrapper for Windows locked-engine cases that only reuses the existing generated client after schema and engine verification.

## Unreleased - 2026-07-07

- Reworked the embedded browser toolbar so Desktop/Mobile view selection sits inline with address, zoom, print, reload, and extraction controls.
- Changed Shopee manual-action messaging into a transient warning toast with a persistent warning icon that can reopen the notice.
- Changed browser fullscreen into a true viewport overlay: the webview fills the screen while controls and the guided collector float above it.
- Fixed crop coordinate mapping for object-fit screenshot previews so saved selected screenshots match the user-selected area more accurately.
- Added cards/list toggles for extracted product evidence under Keyword General.
- Improved Key Product table fields: product type is inferred from title, Store Type is normalized to Mall ORI/Star+/Star, rating and sold strings are preserved from rendered Shopee rows, and reviews stay pending until PDP capture.
- Added structured PDP sync during Product Detail Qualified capture: first viewport screenshot plus background extraction for slides/images, videos, description, reviews, and user media from browser-readable HTML.
- Added review media image/video payloads to project product details and the Project Inspector product dossier.
- Reduced heavy panel/metric shadows and added a left-side Project Inspector outline navigation matching the report hierarchy.
- Changed screenshot capture to stitch a full scrollable page and show the complete captured page in a fit-to-screen crop preview instead of a scrollable preview pane.
- Changed Shopee Step 3 from another evidence capture into a process-only Key Product table review that merges Relevance and Top Sales rows before Product Detail collection starts.
- Focused Shopee rendered HTML extraction on the inner content `<div>` under `#main` and improved product-card parsing for `picture._displayContents_ img[srcset]` thumbnails.
- Added source placement, product type, and store badge/store type signals to extracted product rows and Key Product table display.
- Limited Key Product and Product Detail Qualified flows to an AI-assisted max-10 selected product set, with product-detail steps labeled by product title.
- Focused the project inspector workflow on Keyword General, Key Product, and Product Detail Qualified sections.
- Restored Evaluation Phase, Key Store, and TikTok Evidence below the focused collection sections so the full report workflow remains available for later collection passes.

## Unreleased - 2026-07-03

- Split guided collection into three phases: Keyword General, Product Details, and Evaluation/Key Store, each with explicit Done/Collection Complete progression.
- Added persisted collection pause/resume state per project, including stage, completed steps, browser URL, view mode, and collection percentage in the Projects vault.
- Added explicit `Inspect` and `Continue Collection` actions to project cards, plus a `Continue Collection` action and saved-progress summary inside the project inspector.
- Added a small top-center browser status overlay for target received, HTML download, success, failure, and manual Download HTML fallback.
- Changed rendered-page snapshots to prioritize `div#main`, then `main`, then body, and save formatted multi-line HTML instead of one very long line.
- Changed Shopee webview sessions to use a persistent marketplace partition so login/cache state survives browser close, project switches, and app restarts.
- Added best-effort WebP thumbnail conversion to local JPG files during evidence save, with safe fallback to original image URLs.
- Removed the Home navigation tab so the app starts from New Research and Projects remains the primary vault area.
- Reworked Projects into a dedicated page: Vault Metrics first, project list second, and a full-page project inspector after selecting a project.
- Extended guided product evidence persistence so product-specific captures enrich product records with PDP fields, variants, specifications, descriptions, reviews, images, and store signals where browser-readable data exists.
- Added product dossier, review table, store evidence buckets, and persisted AI analysis summaries to the project inspector.
- Updated store evaluation cards to include normalized store evidence, store assets, trust signals, and GMV ETA scoring.
- Updated generated HTML/PDF reports to follow the PDF workflow more closely: Keyword General, Key Product, Product Detailed Qualified, Evaluation Phase, Key Store, Visual Style, TikTok Evidence, and AI Recommendations.
- Added explicit report subsections for product first page, slides, description, reviews, user media, shop homepage, store homepage, products, bestseller area, and visual style.
- Reworked M1/M2 collection around user-controlled rendered-page snapshots instead of bot-like scraping: captures screenshot, full HTML, visible text, optional webview print-PDF data, and extracted product cards from the currently visible browser page.
- Added browser zoom in/out and print controls for the embedded marketplace browser.
- Added screenshot review before saving evidence, including manual crop selection, save-full, save-selected, and redo controls.
- Persisted extracted Relevance and Top Sales product cards into the local product table with thumbnail, product link, price estimate, rating, sold count, source, and selection reason.
- Made the Shopee guided collector dynamic: after product table extraction, it generates per-product evidence steps for first page, slides/images, description, reviews, review media, and shop homepage.
- Reworked Project Inspector into report-shaped collapsible sections: Keyword General, Key Product, Product Detailed Qualified, Evaluation Phase, Key Store, and TikTok Evidence.
- Added deterministic store evaluation cards using extracted product price and monthly sold values for GMV ETA and local scoring.
- Added project AI evaluation endpoint and Run AI action so key-store/project analysis can be persisted from collected evidence.
- Reworked generated HTML reports into interactive collapsible reports with embedded CSS/script while preserving print/PDF compatibility and product links.
- Added Android SDK sidecar discovery through `MIO_ANDROID_SDK_ROOT`, packaged resources, or an `android-sdk` folder beside the executable for portable distributions.
- Polished M1 light-mode UX after live UI inspection: stronger sidebar contrast, cleaner brand wrapping, flatter panels, clearer active navigation, and reduced visual wash from heavy blur.
- Made the browser collector start in compact mode, improved the browser toolbar balance, and replaced raw load-state text with readable status pills.
- Added a clear Shopee manual-action notice for login, traffic verification, protected pages, or failed embedded loads.
- Auto-hidden the native Windows Electron menu bar so it no longer clashes with the light app shell while preserving macOS menu behavior.
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
