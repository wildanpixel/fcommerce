# Marketplace Intelligence OS

Marketplace Intelligence OS is a local-first desktop application for marketplace research, Shopee Indonesia competitive intelligence, browser automation, AI-assisted analysis, and professional report generation.

The current desktop target is Shopee Indonesia. The architecture keeps marketplace-specific behavior behind adapter interfaces so TikTok Shop, Tokopedia, Lazada, Amazon, Alibaba, and future marketplaces can be added without rewriting the core workflow.

## Features

- Electron desktop application for Windows and macOS.
- React, TypeScript, Vite, TailwindCSS, Zustand, React Query, Framer Motion, and Recharts UI.
- Local Express API hosted inside the desktop runtime.
- SQLite database through Prisma.
- Shopee web automation with Playwright without using Shopee APIs.
- Product, store, screenshot, review, voucher, banner, and homepage collection boundaries.
- AI provider abstraction for OpenAI, Gemini, Claude-ready extension, and local fallback analysis.
- Modular HTML report generation with Puppeteer PDF export.
- Cross-platform browser discovery for Chromium, Google Chrome, Microsoft Edge, and Brave.
- Platform service for application folders, native dialogs, notifications, shell actions, and shortcuts.

## Repository Layout

```text
marketplace-intelligence-os/
├── apps/
│   └── desktop/
├── packages/
│   ├── ui/
│   ├── shared/
│   ├── ai/
│   ├── automation/
│   ├── database/
│   ├── reporting/
│   └── marketplace-adapters/
├── docs/
├── scripts/
├── .github/
│   └── workflows/
├── README.md
├── CONTRIBUTING.md
├── CHANGELOG.md
└── LICENSE
```

## Architecture

The desktop app follows Clean Architecture:

- `apps/desktop/src/domain`: domain models, repository contracts, and marketplace adapter contracts.
- `apps/desktop/src/application`: workflows, job queue, project service, AI service contract, and report service.
- `apps/desktop/src/infrastructure`: Prisma repositories, browser automation, platform service, AI providers, screenshots, local secret storage, and report exporters.
- `apps/desktop/src/api`: local Express API.
- `apps/desktop/src/electron`: Electron main and preload processes.
- `apps/desktop/src/renderer`: React desktop UI.

See [docs/ARCHITECTURE_AND_PRD.md](docs/ARCHITECTURE_AND_PRD.md) and [docs/CROSS_PLATFORM.md](docs/CROSS_PLATFORM.md).

## Requirements

- Node.js 22 or newer.
- pnpm 11.7.0 or newer.
- Windows 10/11 for Windows packaging.
- macOS for macOS `.app` and `.dmg` packaging.

## Installation

```bash
pnpm install
pnpm prisma:generate
```

For local environment configuration, copy the example file:

```bash
cp apps/desktop/.env.example apps/desktop/.env
```

Do not commit real `.env` files.

## Development

```bash
pnpm dev
```

Useful checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

## Packaging

Windows installer and portable builds:

```bash
pnpm package:win
```

macOS app and DMG builds, run on macOS:

```bash
pnpm package:mac
```

Build outputs are generated under `apps/desktop/release/` and are intentionally ignored by Git.

## AI Configuration

API keys are stored locally and must never be committed. Supported environment variable names for local development are:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `CLAUDE_API_KEY`

The app can fall back to deterministic local analysis when no provider key is configured.

## Screenshots

Screenshots for documentation can be placed under [docs/screenshots](docs/screenshots). Runtime screenshots captured by the application are stored in platform-specific application folders and are ignored by Git.

## Troubleshooting

- Run `pnpm prisma:generate` after dependency installation or Prisma schema changes.
- If packaged Electron fails to start, rebuild with `pnpm build` and inspect `apps/desktop/dist-node`.
- If browser automation cannot find a preferred browser, select bundled Chromium in Settings.
- If database initialization fails, remove the local development database under `apps/desktop/data/` and run the app again.
- On macOS, package from macOS so Electron Builder can produce signed or notarized artifacts later.

## License

This project is proprietary software. See [LICENSE](LICENSE).
