# MarketPlace Keyword Competitor Analysis

MarketPlace Keyword Competitor Analysis is a local-first desktop application for marketplace keyword research, Shopee Indonesia competitive intelligence, guided evidence collection, AI-assisted analysis, and professional report generation.

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
- Product-led start screen, guided keyword projects, category filtering, project inspection, key-store scoring, and report workflow matching the reference research report sequence.
- Product Detail guided sub-actions for viewport evidence, user-selected HD product media, reviews, user media, descriptions, promotions, and shop homepage capture.
- Report preview with copy-to-docs support plus PDF, HTML, and DOCX export options.
- Android Emulator Workspace for TikTok mobile evidence, with ADB tooling detection, emulator launch, user-selected APK install, TikTok app launch, screenshot capture, and UIAutomator visible-text extraction.

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

## Continuous Builds

GitHub Actions builds production artifacts from the same repository:

- `.github/workflows/ci.yml` runs source checks.
- `.github/workflows/build.yml` builds Windows installer/portable artifacts on Windows runners and macOS app/DMG artifacts on macOS runners.
- macOS download and install instructions are documented in [docs/MACOS_INSTALLATION.md](docs/MACOS_INSTALLATION.md).

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

macOS users should install the generated `.dmg`; the Windows portable `.exe` cannot run natively on macOS.

## AI Configuration

API keys are stored locally and must never be committed. Supported environment variable names for local development are:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `CLAUDE_API_KEY`

The app can fall back to deterministic local analysis when no provider key is configured.

## Android Emulator And TikTok

TikTok Shop collection uses an Android Emulator Workspace, not an embedded browser. The app detects Android SDK tools from platform-standard locations and environment variables:

- `ANDROID_HOME`
- `ANDROID_SDK_ROOT`
- Windows: `%LOCALAPPDATA%/Android/Sdk`
- macOS: `~/Library/Android/sdk`

Supported Android actions in the desktop UI:

- Detect ADB, Android Emulator, SDK manager, AVD manager, Java, AVD profiles, connected devices, boot state, and TikTok package presence.
- Launch an existing Android Virtual Device.
- Detect TikTok APK candidates from local Downloads/Desktop folders.
- Install a user-selected TikTok APK through ADB.
- Open TikTok on the booted Android device.
- Recover TikTok if Android reports the app is not responding.
- Capture the active Android screen as project evidence.
- Extract visible text from the active Android screen with UIAutomator.

The app does not bundle or download TikTok APKs. Provide a trusted APK locally or install TikTok through the emulator's Play Store flow after logging into Google Play. The V1 TikTok flow is manual: after TikTok opens, the user enters TikTok Shop and navigates the app while Marketplace Intelligence OS captures the active Android screen on demand.

Emulator state is persistent. Marketplace Intelligence OS does not launch the emulator with `-wipe-data`, does not clear TikTok data, and does not reset Google login when the emulator is closed and reopened. If TikTok freezes, use Recover TikTok from the Android workspace; it force-stops and reopens TikTok only. If freezes continue, prefer installing TikTok from Play Store or using a universal/x86-compatible APK because ARM-only APKs can be slow on x86_64 emulators.

## Screenshots

Screenshots for documentation can be placed under [docs/screenshots](docs/screenshots). Runtime screenshots captured by the application are stored in platform-specific application folders and are ignored by Git.

## Troubleshooting

- Run `pnpm prisma:generate` after dependency installation or Prisma schema changes.
- If packaged Electron fails to start, rebuild with `pnpm build` and inspect `apps/desktop/dist-node`.
- If browser automation cannot find a preferred browser, select bundled Chromium in Settings.
- If database initialization fails, remove the local development database under `apps/desktop/data/` and run the app again.
- On macOS, package from macOS so Electron Builder can produce signed or notarized artifacts later.
- If the desktop window opens without content, run the packaged app with Electron logging and verify the local API starts; the app depends on the packaged Prisma generated client and native engine being present.

## License

This project is proprietary software. See [LICENSE](LICENSE).
