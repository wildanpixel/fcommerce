# Marketplace Intelligence OS Architecture And PDF-Derived PRD

## PDF Workflow Analysis

The reference report defines a consulting workflow, not a visual skin. The application implements the same sequence as modular report sections:

1. Keyword general relevance: capture the marketplace result grid for the target keyword.
2. Top sales: capture the sales-sorted result grid and use it to select competitors.
3. Key product table: normalize rank, source, selection reason, product type, title, sales, store, and badge signals.
4. Product dossiers: capture the product first page, product image slides, description, variants, specifications, price, rating, sold counts, vouchers, and shipping signals.
5. Review evidence: separate positive, neutral, and negative review signals, star rating, variation, timestamp, comment, and user media evidence.
6. Store homepage: collect store identity, followers, product count, rating, chat response, joined date, vouchers, recommended products, best sellers, banners, and promotion areas.
7. Visual style: preserve evidence for banner design, product matrix, color palette, creative consistency, and merchandising quality.
8. Cross-platform evidence: keep a modular section for TikTok or mobile-app screenshots. V1 supports imported or future adapter evidence because Shopee web automation cannot reliably collect all app-only screens.
9. AI recommendations: generate structured JSON for branding, visual quality, voucher strategy, competitive position, trust, pain points, strengths, weaknesses, and recommendations.

## Clean Architecture

The core application depends on interfaces, not Shopee implementation details.

- `apps/desktop/src/domain`: marketplace contracts, domain models, repository interfaces.
- `apps/desktop/src/application`: project service, job queue, intelligence workflow, AI service contract, report service.
- `apps/desktop/src/infrastructure`: Prisma repositories, SQLite bootstrap, platform service, browser discovery, local secret encryption, Playwright marketplace adapters, screenshot engine, AI providers, HTML/PDF export.
- `apps/desktop/src/api`: local Express API used by the desktop renderer.
- `apps/desktop/src/electron`: desktop shell and secure preload bridge.
- `apps/desktop/src/renderer`: React UI using Zustand, React Query, Recharts, Framer Motion, and Tailwind.

## Marketplace Adapter Boundary

All collectors communicate through `MarketplaceAdapter`.

- `ShopeeAdapter` is enabled for Shopee Indonesia V1.
- TikTok Shop, Tokopedia, Lazada, Amazon, and Alibaba are registered as disabled adapters with explicit unsupported-feature errors.
- Core workflow code never imports Shopee selectors or Shopee URLs.
- Future adapters can be added by implementing `searchKeyword`, `collectProduct`, `collectStore`, and `normalizeUrl`.

## Database Design

SQLite is managed through Prisma models and an application bootstrap SQL path for reliable Windows startup.

- `Project`: project identity, keyword, marketplace, folders, language, status.
- `ResearchJob`: keyword job configuration, status, progress, ETA, failure detail.
- `Product`: normalized product metrics, pricing, badges, vouchers, variants, specifications, raw evidence.
- `Store`: store metrics, homepage fields, vouchers, category and visual theme JSON.
- `Review`: sentiment, star rating, timestamp, variation, comment, media references.
- `Asset`: screenshots and media evidence grouped by owner and kind.
- `Analysis`: provider and structured JSON output.
- `Report`: template, enabled sections, HTML path, PDF path, status.
- `LogEntry`: detailed job logs.
- `AppSetting`: local settings; API keys are stored separately in encrypted local secret storage.

Runtime database, settings, screenshots, reports, logs, cache, and browser profiles are resolved through `PlatformService`, not `process.cwd()`. Windows uses the Electron user data directory under `%APPDATA%`; macOS uses `~/Library/Application Support/Marketplace Intelligence OS`.

## UI Flow

1. Dashboard: project metrics, recent jobs, project coverage chart, project cards.
2. Research: create project, configure keyword job, choose product limit and evidence options.
3. Reports: toggle modular sections and export HTML/PDF.
4. Settings: marketplace, theme, browser, export/screenshot folders, language, concurrency, OpenAI and Gemini keys.

## Automation Design

Shopee V1 uses Playwright only. It opens browser-visible Shopee pages, searches keywords, sorts top sales, extracts product cards from DOM anchors, opens product pages, captures screenshots, extracts browser-readable text, infers review sentiment when structured reviews are visible, opens store pages, and captures store evidence.

Browser automation supports bundled Chromium, Google Chrome, Microsoft Edge, and Brave through `BrowserDiscoveryService`. Persistent browser profiles are stored under the platform app data folder. If a selected browser is not installed, automation falls back to bundled Chromium.

No Shopee API is used.

## AI Service Layer

The AI service always returns structured JSON matching the `AiAnalysisJson` contract.

- OpenAI path: uses the Responses endpoint with text and screenshot evidence when an API key is configured.
- Gemini path: uses Generative Language content parts with text and screenshot evidence when a key is configured.
- Local path: deterministic structured analysis when no key is available or a provider fails.

## Report Generation

Reports are rendered as HTML first, then converted to PDF with Puppeteer. The template follows the PDF-derived workflow but remains modular, so future templates can enable, disable, or reorder sections without changing collectors.

## Known Automation Boundaries

- Shopee can require login, captcha, or regional consent, which can limit browser-readable DOM extraction.
- Mobile-app-only evidence is not fully automatable from Shopee web in V1.
- Public marketplace DOM structures can change; screenshots are preserved even when text extraction confidence is limited.
- AI vision quality depends on configured OpenAI or Gemini keys; local analysis is structured but less visually precise.
