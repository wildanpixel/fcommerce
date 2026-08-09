# macOS Build Status

Public macOS downloads are currently disabled. The packaged renderer and native Xcode configuration must be revalidated on macOS before `.app` or `.dmg` files are distributed.

Do not use the Windows portable `.exe` on macOS. It cannot run natively.

## Current Support Boundary

The repository retains the shared Electron source and local `pnpm package:mac` command so macOS support can be restored without rewriting application logic. Any local macOS build should currently be treated as a development artifact, not a release-ready download.

Automated macOS artifacts must not be re-enabled until both Intel and Apple Silicon builds are tested on native macOS hardware, including:

- Renderer startup and asset loading
- Prisma generation, engine loading, and SQLite initialization
- Persistent browser sessions
- Screenshot and evidence storage
- HTML, DOCX, and PDF report export
- Code signing and notarization through environment-provided credentials

## Local Development Build

On a macOS development machine with Node.js, pnpm, and Xcode command-line tools:

```bash
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm typecheck
pnpm lint
pnpm test
pnpm package:mac
```

The resulting files under `apps/desktop/release/` must be validated on the matching Mac architecture before distribution.

## Re-enabling Distribution

Before restoring GitHub macOS downloads:

1. Validate the Intel and Apple Silicon packages on native hardware.
2. Configure Apple Developer signing and notarization through environment variables.
3. Confirm that the packaged renderer starts without missing assets.
4. Confirm that Prisma and report generation work from the packaged application.
5. Restore separate native macOS jobs in `.github/workflows/build.yml`.

Until these checks pass, GitHub Releases publish Windows portable builds only.
