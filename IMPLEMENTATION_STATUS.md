# Marketplace Intelligence OS - Implementation Status

Official project management document.

Audit date: 2026-06-27  
Last updated: 2026-07-08
Current version target: V1.0 Shopee Indonesia desktop intelligence
Tracking rule: every completed feature must update this document and `ROADMAP.md` in the same commit before the change is pushed.

This document records the current repository state only. It does not describe planned work as completed.

## Overall Version 1 Progress

[#################---] 84%

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
| M2 | Shopee Desktop | [###################-] 95% | Partial |
| M3 | Intelligence | [##############------] 70% | Partial |
| M4 | Android | [################----] 80% | Partial |
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
- Start screen, navigation, guided analysis setup, project view, project-level Key Store section, reports view, and settings view exist in the renderer.
- Electron webview support is enabled for the local visible marketplace surface, with user-controlled navigation and guided evidence capture as the primary collection workflow.
- Packaged renderer assets load through relative `./assets/...` paths so the installed app works under Electron `file://` runtime.
- Packaged runtime version is exposed through `/api/health` and the Settings runtime panel.

Remaining foundation notes:

- macOS artifact generation is configured and verified through GitHub Actions macOS runners, not this Windows workstation.
- Code signing and notarization are environment-driven release concerns; no certificates are hardcoded in application logic.
- Android tooling discovery is implemented for ADB, emulator, SDK manager, AVD manager, Java, local AVDs, connected devices, boot health, and TikTok package presence.

Release blocker fixes:

- 2026-06-27: Fixed packaged blank-screen issue caused by absolute Vite `/assets/...` URLs resolving outside `app.asar`.
- 2026-06-27: Verified packaged Windows UI renders latest app shell and reports version `1.0.0`.
- 2026-06-29: Reworked the first-run product experience into the requested two-button Shopee/TikTok research cockpit with a visible marketplace browser surface.
- 2026-06-29: Pivoted the product from fully automatic marketplace collection to guided manual evidence collection because Shopee/TikTok protected flows cannot be made reliable without official APIs or user-controlled sessions.
- 2026-07-03: Removed the Home navigation tab; Projects now opens as a dedicated Vault Metrics and project-list page, and individual project inspection opens as a full dedicated page.
- 2026-07-08: Fixed dark-mode floating collector readability and kept target/collect actions available when the collector is folded.
- 2026-07-08: Hardened PDP title/store sync so Shopee chrome labels such as `Shopping Cart icon` cannot overwrite product titles, while store names are synced from PDP shop content when visible.
- 2026-07-08: Tightened Key Product Store Name sync to the Shopee PDP shop block (`.s112-pdp-product-shop` / `section.page-product__shop`) and limited search-result Store Type display to badge-derived `Mall ORI`, `Star+`, or `Star`.
- 2026-07-08: Added product-detail collection previews, in-flow Evaluation Phase review, sticky main navigation, and grouped sticky Project Inspector navigation.
- 2026-07-08: Reworked Store Name extraction to follow the exact PDP shop-anchor sibling structure and added image-only Store Type badge detection with strict persistence of `Mall ORI`, `Star+`, and `Star`.
- 2026-07-08: Product Detail Qualified now exposes selectable guided sub-actions, including separate 5-star Positive Reviews and 1-star Negative Reviews collection passes with deduped persistence.
- 2026-07-08: Moved Key Store work into the project inspection and Evaluation Phase flow; the standalone Key Stores navigation tab is removed from the product shell.
- 2026-07-08: Playwright validation now boots isolated web/API servers on test-only ports so E2E tests do not race the local desktop API.
- 2026-07-08: macOS artifact workflow unit tests now rely on `vitest.config.ts` excludes instead of unquoted npm-script globs, avoiding shell expansion differences between Windows and macOS runners.
- 2026-07-08: Fixed manual `Download HTML` by making the webview snapshot script async-safe and saving HTML through the local API into project evidence folders instead of using fragile renderer blob downloads.
- 2026-07-08: Build scripts now use Vite's runner config loader so Windows validation does not fail when esbuild attempts to inspect inaccessible parent directories.
- 2026-07-08: Fixed Key Product rating extraction so Shopee review-count text such as `50,7k Ratings` is not parsed as rating `5`, and PDP captures now persist structured rating/review/sold text.
- 2026-07-08: Repaired Store Name extraction by preserving PDP shop-panel line breaks and reading the sibling name block after the Shopee shop anchor before noisy status text is filtered.

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
| Icon-only browser controls | Completed | Product UI | Embedded platform browser | Done | P1 |
| Browser-visible HTML text extraction | Completed | Product UI and Evidence API | Electron webview session | Done | P1 |
| Browser HTML download status | Completed | Product UI and Evidence API | Electron webview session | Done | P1 |
| API-backed browser HTML snapshot save | Completed | Product UI and Evidence API | Project workspace, Express API | Done | P1 |
| Persistent marketplace browser session | Completed | Product UI | Electron persistent partition | Done | P0 |
| Browser zoom and print controls | Completed | Product UI | Electron webview | Done | P1 |
| Rendered-page snapshot capture | Completed | Product UI and Evidence API | Electron webview, project workspace | Done | P0 |
| Full-page screenshot crop and redo review | Completed | Product UI | Manual evidence capture | Done | P0 |
| Floating guided collection controller | Completed | Product UI | Evidence step map, Electron webview | Done | P0 |
| Manual evidence capture API | Completed | API and Database | Project workspace, Prisma assets | Done | P0 |
| Manual screenshot attachment API | Completed | API and Database | Project workspace, Prisma assets | Done | P0 |
| Product category persistence | Completed | Database | Prisma migration, project API | Done | P1 |
| Collapsible sidebar | Completed | Product UI | Navigation shell | Done | P1 |
| Readable icon-only sidebar collapse | Completed | Product UI | Navigation shell, light theme | Done | P1 |
| Dark and light mode toggle | Completed | Product UI | Renderer theme state | Done | P1 |
| Light mode default | Completed | Product UI | Renderer theme state, CSS | Done | P1 |
| Guided collection progress display | Completed | Product UI | Manual evidence state | Done | P0 |
| Three-part collection workflow | Completed | Product UI | Guided step map, project state | Done | P0 |
| Pause/resume collection state | Completed | Product UI and Database | Project collection state JSON | Done | P0 |
| Projects overview | Completed | Product UI | Project repository, report counts | Done | P0 |
| Project inspection and delete | Completed | Product UI and API | Project repository, Prisma cascade delete | Done | P0 |
| Product tab UI shell | Completed | Product UI | Product repository, evidence assets | Done | P0 |
| Store tab UI shell | Completed | Product UI | Store repository, screenshots, vouchers | Done | P0 |
| Reviews tab UI shell | Completed | Product UI | Review collector, review repository | Done | P1 |
| Media tab UI shell | Completed | Product UI | Media collector, screenshot assets | Done | P1 |
| Visual Analysis tab UI shell | Completed | Product UI | AI analysis records | Done | P1 |
| Standalone Key Stores navigation removal | Completed | Product UI | Navigation shell, project inspector | Done | P0 |
| Key Stores inside project inspector | Completed | Product UI | Project detail evidence assets | Done | P0 |
| Reports screen | Completed | Product UI and Reporting | Report sections, PDF generation | Done | P0 |
| Report history download/delete | Completed | Product UI and API | Report repository, platform open path | Done | P0 |
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
- Sidebar can now be fully hidden with a single control and restored from a floating show button.
- The default app theme is now light white/grey, with dark mode available from the top bar.
- Sidebar collapse uses a one-column shell when hidden, so the main content no longer disappears into a zero-width grid track.
- Sidebar collapse and browser fullscreen controls are icon-only while keeping accessible labels.
- Shopee browser collection uses a compact expandable/collapsible floating controller instead of a large blocking panel.
- The floating browser collector follows the active dashboard theme and remains readable in light mode.
- The floating browser collector is now readable in dark mode, and its minimized state still exposes compact target/open and collect/process actions.
- M1 corrective UI polish now strengthens the light theme with solid panels, clearer sidebar text, active navigation contrast, balanced browser controls, compact collector-first behavior, and explicit manual-action states for Shopee login or protected pages.
- The native Windows Electron menu is auto-hidden to reduce chrome clash; macOS keeps the standard application menu behavior.
- The browser toolbar can extract visible page text from the user-controlled embedded session and stores extracted text in manual evidence metadata during capture.
- The browser shows a small top-center background status while it receives the target page, downloads `#main` HTML, completes, or needs manual HTML download.
- Shopee browser sessions now use a persistent marketplace partition so login/cache state can survive browser close, project switches, and app restarts.
- The browser toolbar now supports zoom in, zoom out, and native print for the current embedded page.
- The browser toolbar keeps Desktop/Mobile controls inline with navigation, zoom, print, and extraction controls to maximize the webview surface.
- Manual Shopee login/verification states now appear as a transient warning toast and can be reopened from a persistent warning icon.
- Browser fullscreen now fills the viewport end to end while keeping controls and the compact guided collector as overlays.
- Manual collection now saves a rendered-page snapshot: screenshot, full page HTML, visible text, optional print-PDF data, and extracted product rows from the page the user is currently viewing.
- Screenshot capture now stitches the scrollable embedded page into one full-page image and shows the entire captured page in a non-scrolling fit-to-screen crop preview.
- Manual collection is split into Part 1 Keyword General, Part 2 Product Details, and Part 3 Evaluation/Key Store so the user can finish and save each phase without one long collection run.
- Project cards now show saved collection stage and percentage so unfinished analysis can be resumed from the Projects vault.
- Project cards now expose separate `Inspect` and `Continue Collection` actions, and the project inspector has its own saved-progress summary plus `Continue Collection` action to resume the collector from the saved stage.
- Screenshot capture now opens a review modal so the user can crop the evidence area, save the full capture, save only the selected area, or redo before data is stored.
- Project inspection now mirrors the report hierarchy with collapsible sections for Keyword General, Key Product, Product Detailed Qualified, Evaluation Phase, Key Store, and TikTok Evidence.
- Project inspection now includes a sticky collapsible outline navigation whose light-mode hover state remains readable while scrolling long report-shaped projects.
- Shopee cross-platform step 13 now supports opening TikTok in the Android emulator and attaching a manual emulator screenshot to the Shopee project.
- TikTok Shop no longer opens as a browser preview; it routes into a dedicated Android Emulator Workspace.
- Project dashboard and tabs exist.
- Projects are inspectable before report generation, including evidence readiness, products, stores, key-store evidence, recent evidence, reports, and project deletion.
- Key-store evidence is available inside the selected project inspector.
- The standalone Key Stores navigation tab has been removed; Key Store selection and evidence now live inside the selected project inspector.
- Reports screen exists.
- Reports screen includes persistent report history with open/download and delete actions.

M1 scope boundary:

- Product, store, review, media, and AI evidence completeness is tracked under M2 and M3.
- Android emulator automation and real TikTok Shop extraction remain tracked under M4 and M5.
- Export formats other than PDF are still tracked outside the M1 UI milestone.

## M2 Shopee Desktop

[###################-] 95%

| Feature | Status | Owner | Dependencies | Estimated Effort | Priority |
| --- | --- | --- | --- | --- | --- |
| Shopee adapter registration | Completed | Marketplace Automation | Marketplace registry | Done | P0 |
| Keyword search URL generation | Completed | Marketplace Automation | Shopee web URLs | Done | P0 |
| Search result capture | Completed | Marketplace Automation | Playwright, screenshot engine | Done | P0 |
| Top sales search path | Completed | Marketplace Automation | Playwright sorting, result parsing | Done | P0 |
| Guided relevance/top-sales capture | Completed | Product UI and Evidence API | Embedded browser, project assets | Done | P0 |
| Rendered relevance/top-sales product extraction | Completed | Product UI and Evidence API | Electron webview DOM snapshot, Prisma products | Done | P0 |
| `#main` HTML snapshot formatting | Completed | Product UI and Evidence API | Electron webview DOM snapshot | Done | P1 |
| Focused inner `#main` product extraction | Completed | Product UI and Evidence API | Shopee rendered DOM snapshot | Done | P0 |
| WebP thumbnail JPG localization | Partial | Evidence API | Network image fetch, Sharp conversion | 1 day | P1 |
| Guided key-product table processing step | Completed | Product UI and Evidence API | Relevance and Top Sales extracted rows | Done | P0 |
| Dynamic guided product-detail evidence steps | Completed | Product UI and Evidence API | Extracted product table, embedded browser | Done | P0 |
| Guided store evidence steps | Completed | Product UI and Evidence API | Embedded browser, project assets | Done | P0 |
| Product card extraction | Completed | Product UI and Evidence API | Rendered-page snapshot extraction | Done | P0 |
| Product detail collection | Completed | Product UI and Evidence API | User-controlled PDP snapshot capture | Done | P0 |
| Product images and slides | Partial | Marketplace Automation | Product media parser, screenshots | 1 day | P0 |
| Product description | Completed | Marketplace Automation | Product page parser | Done | P0 |
| Product specifications | Completed | Marketplace Automation | Product page parser | Done | P0 |
| Store collection | Partial | Marketplace Automation | Store page parser, guided screenshots | 2 days | P0 |
| Store homepage capture | Completed | Marketplace Automation | Store URL discovery, screenshots | Done | P0 |
| Review collection | Partial | Marketplace Automation | Review section parser | 4 days | P0 |
| Review images | Partial | Marketplace Automation | Review media parser | 2 days | P1 |
| User media | Partial | Marketplace Automation | Review media parser, asset storage | 2 days | P1 |
| Voucher collection | Partial | Marketplace Automation | Voucher section parser | 2 days | P1 |
| Store decoration | Partial | Marketplace Automation | Store homepage parser, screenshot map | 3 days | P1 |
| Product matrix | Partial | Marketplace Automation and Intelligence | Store/product normalization | 3 days | P0 |
| AI evidence packaging | Completed | Marketplace Automation and AI | Screenshots, structured data, analysis service | Done | P0 |

Implemented:

- Shopee adapter class exists.
- Keyword search URL generation exists and now uses `page=0&sortBy=relevancy` and `page=0&sortBy=sales` for the requested relevance and top-sales evidence.
- The primary Shopee workflow is now guided/manual: users open target pages inside the app and capture each report-required evidence step themselves.
- Manual evidence capture saves browser screenshots, full rendered HTML, visible text, optional print-PDF output, and Prisma asset records with step metadata.
- Manual evidence capture now targets `div#main`/`main`/body content and formats saved HTML across multiple lines to avoid unusable single-line snapshots.
- Shopee product extraction now narrows from `#main` into the inner content `<div>` below the marketplace header and before the footer, reducing header/footer/sidebar distraction in saved HTML and product parsing.
- Relevance and Top Sales cards now prioritize `picture._displayContents_ img[srcset]` thumbnails and persist source placement, product type, and store badge/store type signals where available.
- Search result Store Type extraction now reads badge images from the product card body and only surfaces `Mall ORI`, `Star+`, or `Star`; broad text fallbacks are suppressed so stale labels such as `Top-sales store` do not appear in the Key Product table.
- Search result Store Type extraction now also scores small rendered badge images and uses a best-effort visual color classifier for image-only badges when Shopee does not expose useful alt/title text.
- Step 3 in Keyword General is now process-only: it builds an AI-assisted Key Product table from Relevance and Top Sales rows instead of capturing another screenshot.
- Key Product selection now deduplicates products, prioritizes Top Sales placement, monthly sold, review count, rating, price signal, and thumbnail availability, and caps the Product Detail Qualified flow to 10 products.
- Key Product table display now preserves raw Shopee rating/sold strings, infers Product Type from title, normalizes Store Type to Mall ORI/Star+/Star, and leaves Reviews pending until PDP capture.
- Product Detail Qualified collection steps now use product titles as section/step labels instead of generic Product 1/Product 2 labels.
- Product Detail Qualified collection now captures only the visible first viewport and syncs structured PDP evidence in the background: slides/images, videos, description, review rows, review media, shop vouchers, and bundle deals.
- Product Detail Qualified collection progress now previews the active product, evidence status, and sub-actions for first page, slides/images, description, reviews, media in user, and shop homepage so users can verify whether the current PDP data looks correct before moving on.
- Product dossiers now show collected videos plus Media in User image/video evidence when browser-readable Shopee HTML exposes it.
- Browser capture status is visible to the user with `targeted page received`, `downloading HTML`, done, and failed states plus a manual `Download HTML` fallback action.
- Relevance and top-sales snapshots extract rendered product cards from the visible browser page and persist product rows with thumbnail, product URL, price estimate, rating, sold count, source, and selection reason.
- WebP product thumbnails from rendered result pages are converted to local JPG files where the backend can fetch them; failed conversions safely fall back to original URLs.
- The key-product table is populated from rendered Relevance and Top Sales snapshots rather than direct marketplace API calls.
- Product detail steps are generated dynamically from the collected product table; a 10-product table produces product-specific guided steps for those products.
- Product evidence capture supports review/crop/redo before storage to reduce human capture errors.
- Guided steps cover relevance, top sales, key-product source evidence, product first viewport, product images, description, reviews, review media, store homepage, store products, store best sellers, store visual style, and TikTok cross-platform search.
- Relevance and top-sales search paths exist with retry diagnostics.
- Product card extraction exists through Playwright page DOM anchors and parent-card text normalization.
- Search result and top-sales screenshots are saved as project assets when screenshot capture is enabled.
- Empty, blocked, login-gated, captcha, selector-empty, and navigation retry states are emitted as structured warning/error log messages.
- Top-sales result ordering is validated against relevance ordering so ignored sort behavior is visible in job logs.
- Key-product selection now merges relevance and top-sales products, stores source placement, and assigns reason-for-selection values such as platform recommended, best selling, cheap, mid price, high price, and strong visual.
- Product page collection exists as user-controlled rendered snapshot capture and stores product-specific assets where the user opens the PDP.
- Product-specific evidence now enriches stored product records with browser-readable PDP fields including price range, original price, discount, rating, review count, total sold, stock, voucher/shipping text, variants, specifications, description, and image URLs where visible.
- Product-specific evidence now keeps the existing product title unless the PDP exposes a high-confidence product title, preventing Shopee header/cart/accessibility labels from replacing the real product name.
- Product-specific evidence now updates Store Name and Store URL from PDP shop content when browser-readable `#s112-product-shop`, `.s112-pdp-product-shop`, or `section.page-product__shop` content and equivalent shop links are visible.
- Product-specific Store Name extraction now walks from the PDP shop anchor to the following sibling store-name block, matching Shopee's visible shop panel layout.
- Product-specific Store Name extraction now preserves visible line breaks before filtering, so the real store name can be separated from `Active`, chat, product-count, and follower metadata.
- Product-specific rating extraction now uses bounded star/rating tokens and structured PDP values so review-count strings are not mistaken for rating values.
- Product-specific Store Type can be repaired during PDP capture when the page exposes a valid Mall/Star badge, and persisted product evidence rejects any Store Type outside `Mall ORI`, `Star+`, and `Star`.
- Product image URLs are collected into product raw evidence for report rendering with a 3-column image grid.
- Product Detail Qualified capture now records product videos, review media images/videos, shop vouchers, bundle deals, and a promotion count where the visible PDP HTML exposes those sections.
- Product Detail Qualified capture now exposes selectable sub-actions for First Page, Slides, Positive Reviews, Negative Reviews, Media in User, Description/Vouchers/Bundle Deals, and Shop Home Page.
- Review capture is tab-aware: if the user opens Shopee's 5-star review filter before collecting, rows are stored as Positive Reviews; if the user opens the 1-star filter, rows are stored as Negative Reviews. Multiple review passes are appended with deduplication instead of replacing each other.
- Project inspection now renders dynamic product dossiers for every collected product with first-page evidence, slides, description, variants, specifications, reviews, review media, and shop-homepage evidence.
- Store page collection exists.
- Store homepage, banner, popular-products, and best-seller screenshots are captured where Shopee allows access.
- Store evidence now normalizes store profile records from guided captures and renders homepage, product matrix, bestseller, visual style, TikTok account evidence, and theme signals inside the project inspector.
- Screenshot capture is wired.
- Review inference now targets three positive 5-star and two negative 1-star browser-readable review signals when available.
- Basic product and store metric parsing exists.
- The generated HTML/PDF report renderer now follows the PDF-defined M2 structure: Keyword General, Key Product, repeated Product detail dossiers, review tables, store overview, store dossiers, visual style, TikTok evidence, and AI recommendations.

Incomplete:

- No guaranteed bypass for login, captcha, consent screens, or anti-bot blocking; this is now handled by user-controlled browser sessions in the primary UX.
- Review extraction is heuristic and depends on browser-readable text.
- Voucher strategy and user media extraction are not fully structured.
- Voucher and bundle-deal extraction is partial and PDP-scoped; full store-level voucher strategy remains incomplete.
- Shopee mobile app evidence is not implemented.
- Product slide capture is supported as a product-specific guided step, but structured slide URL extraction from every PDP is still heuristic.
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

[##############------] 70%

| Feature | Status | Owner | Dependencies | Estimated Effort | Priority |
| --- | --- | --- | --- | --- | --- |
| AI provider abstraction | Completed | AI Engineering | OpenAI, Gemini, local fallback | Done | P0 |
| Structured JSON analysis contract | Completed | AI Engineering | `AiAnalysisJson`, validation schema | Done | P0 |
| OpenAI analysis path | Partial | AI Engineering | API key, screenshot evidence | 3 days | P0 |
| Gemini analysis path | Partial | AI Engineering | API key, screenshot evidence | 3 days | P1 |
| Local heuristic fallback | Completed | AI Engineering | Product, store, review inputs | Done | P1 |
| Executive summary | Partial | Reporting and AI | Analysis records, report renderer | 2 days | P0 |
| SWOT | Partial | Reporting and AI | Analysis records | 3 days | P0 |
| Pricing analysis | Partial | Intelligence | Product price normalization | 4 days | P0 |
| Store analysis | Partial | Intelligence | Store collection completeness | 3 days | P0 |
| Competitor analysis | Partial | Intelligence | Key products, product matrix | 3 days | P0 |
| Visual analysis | Partial | AI Vision | Screenshot completeness, provider keys | 5 days | P0 |
| Recommendations | Partial | AI Engineering | Structured analysis output | 3 days | P0 |
| Key Stores AI ranking | Partial | AI Engineering and Product UI | Store evidence, persisted scoring | 2 days | P0 |
| HTML report generation | Completed | Reporting | Report data loader, renderer | Done | P0 |
| PDF export | Partial | Reporting | Puppeteer PDF, local workspace | 2 days | P0 |

Implemented:

- AI service returns structured JSON through a typed analysis contract.
- OpenAI and Gemini provider paths exist when API keys are configured.
- Local heuristic analysis fallback exists.
- Project-level AI evaluation can be triggered from Project Inspector and persists a structured analysis record from collected products, stores, reviews, and screenshots.
- Store Evaluation Phase cards estimate GMV locally from extracted price and monthly sold values, then expose a deterministic Potential Store score.
- Evaluation Phase now labels stores as `Potential Store`, owns the AI scoring action, deduplicates stores from the qualified-product set, opens inside the collection workspace before Key Store collection, and promotes the top scored store into the project-level Key Store section.
- Key Product processing now receives richer normalized product signals from M2, including source placement, inferred product type, raw rating/sold text, PDP review rows, videos, and review media pointers.
- Project Inspector now displays persisted AI scoring, observations, and recommendations inside the Evaluation Phase so users can review evidence before report export.
- Report sections are modular.
- HTML report generation now produces interactive collapsible report sections with embedded CSS and script while remaining printable/PDF-compatible.
- Report rendering now maps AI output into score cards, recommendation tables, store overall text, and explicit missing-evidence notes instead of hiding incomplete sections.
- Puppeteer PDF export exists.

Incomplete:

- AI quality depends on complete product, store, review, and screenshot evidence.
- Several analysis sections are only as strong as the partial Shopee data pipeline.
- Key Store ranking still depends on the completeness of captured store evidence and configured AI providers for higher-confidence narrative scoring.
- PowerPoint, Excel, CSV, and JSON export labels are visible, but only HTML/PDF report output is wired.

## M4 Android

[################----] 80%

| Feature | Status | Owner | Dependencies | Estimated Effort | Priority |
| --- | --- | --- | --- | --- | --- |
| Android automation interface | Completed | Mobile Automation | Domain marketplace contracts | Done | P1 |
| Unsupported Android adapter fallback | Completed | Mobile Automation | Android automation interface | Done | P1 |
| ADB detection | Completed | Mobile Automation | Android SDK Platform Tools | Done | P1 |
| Android Emulator discovery | Completed | Mobile Automation | Android SDK Emulator CLI | Done | P1 |
| Android sidecar SDK discovery | Completed | Mobile Automation | Packaged resources, executable folder, environment variables | Done | P1 |
| SDK manager and AVD manager discovery | Completed | Mobile Automation | Android command-line tools, Java | Done | P1 |
| Local AVD profile discovery | Completed | Mobile Automation | Android emulator CLI | Done | P1 |
| Local AVD profile creation | Completed | Mobile Automation | Android 35 Google Play x86_64 image | Done | P1 |
| Google Play Android system image | Completed | Mobile Automation | Android 35 Google Play x86_64 system image | Done | P1 |
| Device start and health check | Completed | Mobile Automation | ADB, emulator boot state | Done | P1 |
| Persistent emulator restart | Completed | Mobile Automation | AVD data partition, emulator snapshots | Done | P1 |
| TikTok APK discovery | Completed | Mobile Automation | User Downloads folder | Done | P1 |
| TikTok APK install support | Completed | Mobile Automation | Booted Android device, user-provided APK | Done | P1 |
| TikTok app launch support | Completed | Mobile Automation | Booted Android device, installed TikTok package | Done | P1 |
| TikTok ANR detection and recovery | Completed | Mobile Automation | ADB dumpsys, TikTok package state | Done | P1 |
| Android screenshot capture | Completed | Mobile Automation | ADB screencap, booted Android device | Done | P1 |
| UIAutomator visible text extraction | Completed | Mobile Automation | ADB, booted Android device | Done | P1 |
| OCR extraction | Not Started | Mobile Automation and AI | Tesseract, image preprocessing | 4 days | P1 |
| Vision analysis from mobile screenshots | Not Started | AI Vision | Screenshot capture, AI providers | 4 days | P1 |
| Shopee Mobile workflow | Not Started | Marketplace Automation | Android automation, Shopee app state | 8 days | P0 |

Implemented:

- `AndroidAutomationAdapter` interface exists.
- `UnsupportedAndroidAutomationAdapter` exists.
- Adapter methods are shaped for availability, start, screenshot capture, visible text extraction, and stop.
- `AdbAndroidAutomationAdapter` exists and delegates to the Android tooling service.
- `AndroidToolingService` detects ADB, Android Emulator, SDK manager, AVD manager, Java, SDK root, local AVD profiles, connected devices, Android boot completion, and TikTok package IDs.
- Android SDK discovery now also checks `MIO_ANDROID_SDK_ROOT`, packaged Electron resources, and an `android-sdk` folder beside the executable. This supports portable sidecar distribution without bundling restricted Google Play/TikTok assets into the app binary.
- Local workstation setup now prefers `MIO_TikTok_Stable`, an Android 35 Google Play x86_64 AVD profile tuned for lower memory pressure than the earlier Pixel profile.
- `MIO_TikTok_Stable` uses a Google Play system image so users can install apps through Play Store after logging in.
- Emulator launch is persistent: the app does not pass `-wipe-data`, does not clear TikTok data, and does not reset Google login when the emulator is closed and reopened.
- The local API exposes Android status, emulator launch, APK install, TikTok launch, visible-text extraction, and Android evidence capture endpoints.
- The local API detects TikTok APK candidates in the user's Downloads/Desktop folders.
- TikTok Shop analysis now opens a dedicated Android Emulator Workspace instead of an embedded web browser.
- Android evidence capture saves ADB screenshots into project folders and persists Prisma asset records with Android step metadata.
- Android screenshot metadata includes UIAutomator visible text when extraction succeeds.
- Android status now reports TikTok runtime state, active ANR state, focused activity, package ABI, device ABI, and ARM-on-x86 compatibility warnings.
- TikTok runtime diagnostics and Recover TikTok controls are exposed in the Android Emulator Workspace.
- The TikTok Android workspace keeps the collection steps outside the emulator/browser surface so fullscreen browser mode does not cover them.
- Local validation installed `C:\Users\F-Commerce ID\Downloads\TikTok+-+Videos,+Shop+&+LIVE_45.8.2_APKPure.apk` into the emulator as `com.zhiliaoapp.musically`.
- Local validation launched TikTok through ADB and confirmed Android status `ready: true`.
- Local validation reproduced a TikTok app ANR on the login/authorization activity, traced it to the ARM64 TikTok APK running on the x86_64 emulator, and added a Recover TikTok action that force-stops/reopens TikTok without clearing app data.
- Local validation captured an Android screenshot and extracted UIAutomator visible text.

Partial behavior and blockers:

- TikTok Shop navigation remains user-controlled inside TikTok; the app does not automate TikTok Shop taps, login, Gmail, or account state.
- OCR and Vision AI analysis are still not connected to Android screenshots.
- Shopee Mobile app workflow is still not implemented.
- Google Play system images and TikTok APKs are not bundled into the installer because they are large third-party assets with separate licensing/distribution requirements; supported production distribution is sidecar SDK/tooling plus user-installed apps or user-provided APKs.

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
- TikTok Shop is selectable from the product research setup and opens the Android Emulator Workspace.
- TikTok Shop is registered in the marketplace registry.

Stubbed behavior:

- TikTok Shop uses `UnsupportedMarketplaceAdapter`.
- All collection methods throw `MarketplaceFeatureUnavailableError`.
- No TikTok desktop marketplace adapter, normalized TikTok product/store collection, OCR, or Vision AI extraction exists. Android screenshot evidence support is tracked under M4.

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
- Start screen, navigation, product research cockpit, project view, project-level Key Store section, reports view, and settings view exist in the renderer.
- Embedded visible platform browser exists for Shopee desktop/mobile and TikTok mobile preview.
- TikTok Shop now routes to a dedicated Android Emulator Workspace instead of a webview preview.
- Android ADB/emulator/tooling discovery and evidence capture APIs exist.
- TikTok APK discovery, install, app launch, Android screenshot capture, and UIAutomator text extraction are validated locally.
- Shopee desktop search, top-sales search, product-card normalization, screenshot asset saving, and structured search diagnostics are completed for Sprint 1.

### Partially Completed

- Shopee desktop product detail collection.
- Shopee desktop store detail collection.
- AI analysis workflow.
- PDF report generation.
- TikTok Shop in-app navigation and account login remain manual.

### Stubbed

- TikTok Shop adapter.

### Placeholder

- Project detail tabs.
- Mobile evidence report section.
- Export format labels beyond PDF.

### Not Started

- Shopee mobile app automation.
- TikTok Shop mobile automation.
- OCR pipeline.
- Licensing.
- Auto updates.
- Commercial telemetry.
- Plugin SDK.

## UI Exposure And Accessibility

### Exposed In UI

- Home and New Research expose Shopee Product Research and TikTok Shop Product Research as the primary actions.
- Shopee flow exposes keyword input, desktop/mobile view selection, Start Analyze, activity logs, job progress, fullscreen browser mode, and manual user interaction.
- TikTok Shop flow exposes the Android Emulator Workspace and blocks capture until Android tooling, a booted device, and TikTok are ready.
- The visible platform browser lets users watch and manually interact with the marketplace surface.
- Projects screen exposes project tabs.
- Project Inspector exposes Evaluation Phase scoring and project-level Key Store evidence.
- Reports screen exposes PDF and other export format labels.
- Settings screen exposes browser preference, API keys, local folders, language, and concurrency.

### Exposed But Not Functional

- TikTok Shop is selectable and opens the Android Emulator Workspace, but the marketplace adapter is unsupported and no normalized TikTok extraction job is launched from M1.
- Android Mobile Evidence is visible in the TikTok Android Emulator Workspace, but capture remains disabled until a booted device and TikTok install are available.
- Key Store ranking is visible inside Project Inspector, but high-confidence ranking still depends on complete captured evidence and configured AI providers.
- Export labels for PowerPoint, Excel, CSV, JSON, and HTML are visible, but only PDF export is wired.

### Existing But Inaccessible From UI

- `UnsupportedAndroidAutomationAdapter` remains as a fallback class, but the API now uses `AdbAndroidAutomationAdapter`.
- There is no UI to create new AVD profiles, configure Genymotion, choose between multiple running devices, or run OCR/Vision analysis on mobile screenshots.

## Source Files Relevant To This Audit

Modified in the latest implementation commit:

- `IMPLEMENTATION_STATUS.md`
- `ROADMAP.md`
- `CHANGELOG.md`
- `RELEASE_REPORT.md`
- `apps/desktop/e2e/smoke.spec.ts`
- `apps/desktop/package.json`
- `apps/desktop/playwright.config.ts`
- `apps/desktop/scripts/generatePrismaClient.mjs`
- `apps/desktop/vite.config.ts`
- `apps/desktop/vitest.config.ts`
- `apps/desktop/src/api/server.dev.ts`
- `apps/desktop/src/api/server.ts`
- `apps/desktop/src/infrastructure/platform/PlatformService.ts`
- `apps/desktop/src/electron/main.ts`
- `apps/desktop/src/infrastructure/android/AndroidToolingService.ts`
- `apps/desktop/src/infrastructure/report/HtmlReportRenderer.ts`
- `apps/desktop/src/infrastructure/repositories/PrismaRepositories.ts`
- `apps/desktop/src/renderer/App.tsx`
- `apps/desktop/src/renderer/api/client.ts`
- `apps/desktop/src/renderer/store/uiStore.ts`
- `apps/desktop/src/renderer/styles.css`
- `apps/desktop/src/shared/contracts.ts`

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
- `apps/desktop/src/infrastructure/android/AdbAndroidAutomationAdapter.ts`
- `apps/desktop/src/infrastructure/android/AndroidToolingService.ts`
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
