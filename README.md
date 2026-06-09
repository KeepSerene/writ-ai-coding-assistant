# Writ

> Work in progress...

## Prerequisites

- [pnpm](https://pnpm.io/installation) v11+ — package manager for all packages
- [Bun](https://bun.sh) — runtime for the CLI package only

## Getting Started (Should be updated!)

```bash
pnpm install
pnpm dev:server # in one terminal
pnpm dev:cli # in another terminal
```

## Server Package Render.com Deployment (Free tier: add a note for cold starts!)

- Build command: `pnpm install && pnpm db:push && pnpm build:server`
- Start command: `pnpm start:server`
