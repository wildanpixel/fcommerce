# Contributing

## Development Principles

- Preserve the marketplace adapter boundary. Core workflows must depend on `MarketplaceAdapter`, not a concrete marketplace implementation.
- Keep business logic out of the renderer UI.
- Keep platform-specific behavior behind the platform service.
- Keep API keys, cookies, browser sessions, local databases, generated reports, and screenshots out of Git.
- Add tests for shared behavior, adapters, database changes, and report workflow changes.

## Local Setup

```bash
pnpm install
pnpm prisma:generate
pnpm dev
```

## Quality Checks

Run these before committing:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Run Playwright checks when changing user flows:

```bash
pnpm test:e2e
```

## Commit Guidelines

Use short conventional commit messages:

- `feat: add marketplace adapter foundation`
- `fix: resolve packaged Prisma startup`
- `docs: add desktop setup instructions`
- `chore: prepare workspace repository`

## Pull Request Checklist

- Source code only is committed.
- `.env`, local databases, browser profiles, generated reports, screenshots, and package outputs are excluded.
- Prisma Client generation succeeds.
- TypeScript, lint, tests, and build pass.
- Documentation is updated when behavior or setup changes.
