<p align="center">
  <img src="https://raw.githubusercontent.com/KeepSerene/writ-ai-coding-assistant/main/packages/assets/logo.webp" alt="Writ logo" width="96" height="96" />
</p>

<h1 align="center">Writ</h1>

<p align="center">
  A terminal-based, agentic AI coding assistant — an OpenCode-inspired CLI built from scratch.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@keepserene/writ"><img src="https://img.shields.io/npm/v/@keepserene/writ?color=cb3837&logo=npm&logoColor=white" alt="npm version" /></a>
  <a href="https://pnpm.io/"><img src="https://img.shields.io/badge/pnpm-v11.4.0-f69220?logo=pnpm&logoColor=white" alt="pnpm version" /></a>
  <a href="https://github.com/KeepSerene/writ-ai-coding-assistant/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Bun-000000?logo=bun&logoColor=white" alt="Bun" />
  <img src="https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Hono-E36002?logo=hono&logoColor=white" alt="Hono" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white" alt="Neon Postgres" />
</p>

<p align="center">
  <a href="#demo">Demo</a> ·
  <a href="#features">Features</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#getting-started">Getting Started</a> ·
  <a href="#cli-usage">CLI Usage</a> ·
  <a href="#deployment">Deployment</a> ·
  <a href="#author">Author</a>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Demo](#demo)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
  - [Monorepo Structure](#monorepo-structure)
  - [Data Flow](#data-flow)
- [Getting Started](#getting-started)
  - [Try It Instantly](#try-it-instantly)
  - [Local Development](#local-development)
- [CLI Usage](#cli-usage)
  - [Modes](#modes)
  - [Slash Commands](#slash-commands)
  - [File Mentions](#file-mentions)
- [Supported AI Models](#supported-ai-models)
- [Environment Variables](#environment-variables)
- [Authentication & Security](#authentication--security)
- [Rate Limits & Portfolio Quota](#rate-limits--portfolio-quota)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)
- [Acknowledgments](#acknowledgments)

---

## Overview

**Writ** is a full-stack, terminal-native AI coding assistant — conceptually similar to tools like OpenCode or Claude Code — built as a personal portfolio project to explore agentic tool-calling, real-time streaming UIs in the terminal, and end-to-end type-safe full-stack TypeScript.

It ships as two cooperating pieces:

- A **CLI** (`packages/cli`) — a React-powered Terminal UI (TUI) that runs locally on your machine, renders the chat interface, and executes filesystem/shell tool calls _on your own machine_.
- A **server** (`packages/server`) — a Hono API that handles authentication, LLM inference across multiple providers, session persistence, billing, and rate limiting.

The CLI never talks to LLM providers directly — every request is authenticated, metered, and proxied through the server, which keeps API keys, database credentials, and billing logic entirely off the client.

---

## Demo

<table>
  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/KeepSerene/writ-ai-coding-assistant/main/packages/assets/home.png" width="380" alt="Home screen" /><br/><sub>Home screen</sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/KeepSerene/writ-ai-coding-assistant/main/packages/assets/session.png" width="380" alt="Active session" /><br/><sub>Active session with tool calls</sub></td>
  </tr>

  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/KeepSerene/writ-ai-coding-assistant/main/packages/assets/models.png" width="380" alt="Model picker" /><br/><sub>Model picker</sub></td>
    <td align="center"><img src="https://raw.githubusercontent.com/KeepSerene/writ-ai-coding-assistant/main/packages/assets/themes.png" width="380" alt="Theme switcher" /><br/><sub>Theme switcher</sub></td>
  </tr>

  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/KeepSerene/writ-ai-coding-assistant/main/packages/assets/server.png" width="380" alt="Server landing page" /><br/><sub>Server landing page</sub></td>
  </tr>
</table>

---

## Features

- **Agentic tool use** — the assistant can read, write, and surgically edit files, search the codebase with `grep`/`glob`, list directories, and run shell commands, all executed locally in your project's working directory.
- **Two operating modes**
  - **Plan** — read-only exploration and analysis (no file writes, no shell access).
  - **Build** — full read/write access, including the `bash` tool, for actually implementing changes.
- **Multi-provider model routing** — switch between Google Gemini, Groq, Mistral, Cerebras, and NVIDIA NIM models from a single `/models` picker, with per-model provider options (reasoning effort, thinking budgets, parallel tool calls) tuned individually.
- **Streaming, resumable sessions** — chat history is persisted server-side per session, survives reconnects, and supports interrupting/regenerating responses mid-stream.
- **`@`-mention file references** — type `@` to fuzzy-search and reference files/directories from your project directly in a prompt, with path-traversal protection baked in.
- **Slash command palette** — fast keyboard-driven access to sessions, models, modes, themes, auth, and billing (see [Slash Commands](#slash-commands)).
- **Secure browser-based login** — OAuth 2.0 Authorization Code + PKCE flow via Clerk; the CLI never holds a client secret.
- **Usage-based billing** — integrated with Polar.sh for compute-credit checkout, a self-serve billing portal, and metered token consumption across providers normalized into a single internal unit ("Writ Tokens").
- **Theming** — multiple built-in color themes, persisted to disk per user.
- **Production observability** — Sentry error tracking, performance tracing, and profiling on the server.
- **Abuse-resistant public demo** — a rolling 7-day message quota protects the hosted demo from runaway usage (see [Rate Limits](#rate-limits--portfolio-quota)).

---

## Tech Stack

| Layer                | Technology                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **CLI runtime**      | [Bun](https://bun.sh)                                                                                             |
| **Terminal UI**      | [`@opentui/react`](https://github.com/anomalyco/opentui) — a Zig-native terminal renderer with a React reconciler |
| **CLI routing**      | `react-router` (in-memory router for screen navigation)                                                           |
| **Server framework** | [Hono](https://hono.dev) on Node.js                                                                               |
| **AI orchestration** | [Vercel AI SDK](https://sdk.vercel.ai) (`ai`, `@ai-sdk/react`)                                                    |
| **LLM providers**    | Google Gemini, Groq, Mistral, Cerebras, NVIDIA NIM (via OpenAI-compatible adapter)                                |
| **Database**         | PostgreSQL ([Neon](https://neon.tech), serverless)                                                                |
| **ORM**              | [Prisma](https://www.prisma.io) (v7) with the `@prisma/adapter-pg` driver adapter                                 |
| **Auth**             | [Clerk](https://clerk.com) — OAuth 2.0 Authorization Code + PKCE                                                  |
| **Billing**          | [Polar.sh](https://polar.sh) — checkout, customer portal, usage metering                                          |
| **Validation**       | [Zod](https://zod.dev)                                                                                            |
| **Observability**    | [Sentry](https://sentry.io) (errors, tracing, profiling)                                                          |
| **Package manager**  | [pnpm](https://pnpm.io) workspaces                                                                                |
| **Server build**     | `tsup` (bundling) / `tsx` (dev)                                                                                   |
| **CLI build**        | Bun's native bundler                                                                                              |
| **Type safety**      | End-to-end via Hono's RPC client (`hc`) — the CLI imports the server's route types directly                       |
| **Hosting**          | [Render.com](https://render.com) (server) · [npm](https://npmjs.com) (CLI distribution)                           |

---

## Architecture

### Monorepo Structure

```
writ/
├── packages/
│   ├── cli/              # Terminal UI client (Bun + opentui/react)
│   │   └── src/
│   │       ├── components/    # Chat messages, dialogs, command menu, prompt area
│   │       ├── hooks/          # useAppChat, useCommandMenu
│   │       ├── layouts/        # Root layout, app shell
│   │       ├── lib/             # API client, auth, OAuth, billing, themes, utils
│   │       ├── providers/      # Theme, toast, dialog, input-stack, session context
│   │       ├── screens/        # Home, new-session, session
│   │       └── tools/           # Local tool executors (bash, file ops, search)
│   │
│   ├── server/           # Hono API (deployed to Render.com)
│   │   └── src/
│   │       ├── routes/          # sessions, chat, billing, oauth-callback
│   │       ├── middlewares/    # auth, compute-credit & portfolio-quota gating
│   │       ├── lib/              # Clerk auth, Polar billing, model resolver, system prompt
│   │       └── views/           # Landing page
│   │
│   ├── db/                # Prisma schema, generated client, Neon connection
│   ├── shared/            # Shared Zod schemas, tool contracts, model registry
│   └── assets/             # Logo & favicon
│
├── pnpm-workspace.yaml
├── package.json            # Root workspace scripts
└── .env.example
```

### Data Flow

1. The CLI authenticates the user via a browser-based OAuth + PKCE flow against Clerk, relayed through the server's `/auth/callback` route, and stores the resulting access token locally at `~/.writ/auth.json` (file permissions `0600`).
2. A prompt is sent to `POST /sessions/:sessionId/chat` on the server, authenticated via the Clerk-issued bearer token.
3. The server merges the request with persisted session history, resolves the requested model/provider, and streams a response back via `streamText` from the AI SDK.
4. If the model requests a tool call (e.g. `readFile`, `bash`), the **CLI** — not the server — executes it locally inside the user's own project directory, then reports the result back into the conversation.
5. On completion, token usage is recorded against the user's Polar.sh meter, and the conversation is persisted to Postgres.

---

## Getting Started

### Try It Instantly

No cloning required — the CLI is published to npm and runs anywhere Bun is installed:

```bash
# Install Bun, if you don't already have it
curl -fsSL https://bun.sh/install | bash

# Run Writ
bunx @keepserene/writ
```

> **Note:** The hosted demo runs against a shared free-tier deployment with a [quota](#rate-limits--portfolio-quota) — see that section for details and how to self-host with your own API keys for unlimited use.

### Local Development

**Prerequisites**

- [pnpm](https://pnpm.io/installation) v11+ — package manager for the whole monorepo
- [Bun](https://bun.sh) v1.3.14+ — runtime for the CLI package only
- Node.js 24+ — runtime for the server package (matches the `tsup` build target)
- A [Neon](https://neon.tech) Postgres database (or any Postgres instance)
- API keys for whichever LLM providers you want to use, plus Clerk and Polar.sh accounts (see [Environment Variables](#environment-variables))

**Setup**

```bash
# 1. Clone the repo
git clone https://github.com/KeepSerene/writ-ai-coding-assistant.git
cd writ

# 2. Install dependencies
pnpm install

# 3. Configure environment variables
cp .env.example .env
# then fill in .env with your own keys/credentials

# 4. Push the Prisma schema to your database
pnpm db:push

# 5. Run the server (in one terminal)
pnpm dev:server

# 6. Run the CLI (in another terminal)
pnpm dev:cli
```

Other useful root-level scripts:

```bash
pnpm db:generate   # Regenerate the Prisma client
pnpm db:studio     # Open Prisma Studio
pnpm db:reset      # Reset the database
pnpm build:server  # Production build of the server
pnpm start:server  # Run the built server
```

---

## CLI Usage

### Modes

| Mode      | Access       | Available Tools                                        |
| --------- | ------------ | ------------------------------------------------------ |
| **Plan**  | Read-only    | `readFile`, `listDirectory`, `glob`, `grep`            |
| **Build** | Read & write | All of the above, plus `writeFile`, `editFile`, `bash` |

Switch modes anytime with `/modes` or the <kbd>Tab</kbd> key from the home screen.

### Slash Commands

| Command     | Description                               | Requires Auth |
| ----------- | ----------------------------------------- | ------------- |
| `/new`      | Start a new conversation                  | No            |
| `/modes`    | Switch between Plan and Build mode        | No            |
| `/models`   | Select an AI model for generation         | No            |
| `/sessions` | Browse past sessions                      | Yes           |
| `/themes`   | Change the color theme                    | No            |
| `/login`    | Sign in via your browser                  | —             |
| `/logout`   | Sign out and clear local credentials      | Yes           |
| `/upgrade`  | Open checkout to buy more compute credits | Yes           |
| `/usage`    | View remaining credits and invoices       | Yes           |
| `/exit`     | Quit the application                      | No            |

### File Mentions

Type `@` followed by a path fragment anywhere in a prompt to fuzzy-search and reference files or directories from the current project — e.g. `@src/components` or `@index`. Mentions are resolved relative to your current working directory and cannot escape it.

---

## Supported AI Models

| Model                 | Provider   | Notes                      |
| --------------------- | ---------- | -------------------------- |
| Gemini 3.5 Flash      | Google     | High reasoning effort      |
| Gemini 3.1 Flash Lite | Google     | Default low-latency option |
| Gemini 2.5 Flash      | Google     |                            |
| GPT OSS 120B          | Groq       | Default model              |
| GPT OSS 20B           | Groq       |                            |
| Qwen3 32B             | Groq       |                            |
| Devstral              | Mistral    | Code-focused               |
| Mistral Small         | Mistral    | High reasoning effort      |
| GPT OSS 120B          | Cerebras   | Free tier                  |
| GLM 4.7               | Cerebras   | Free tier                  |
| Kimi K2.6             | NVIDIA NIM | Free tier                  |

Pricing and provider-specific options (thinking budgets, reasoning effort, parallel tool calls) are centrally defined in `packages/shared/src/models.ts` and `packages/server/src/lib/model-resolver.ts`.

---

## Environment Variables

See [`.env.example`](./.env.example) for the full list with descriptions. At a high level:

| Group                | Variables                                                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Server**           | `NODE_ENV`, `PORT`, `API_BASE_URL`                                                                                                             |
| **Database (Neon)**  | `DATABASE_URL`, `DIRECT_URL`                                                                                                                   |
| **Sentry**           | `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_PROFILES_SAMPLE_RATE`, `SENTRY_SEND_DEFAULT_PII`                                            |
| **LLM Providers**    | `GOOGLE_GENERATIVE_AI_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`, `CEREBRAS_API_KEY`, `NIM_API_KEY`                                           |
| **Clerk Auth**       | `CLERK_API_CLIENT_BASE_URL`, `CLERK_OAUTH_CLIENT_ID`, `CLERK_OAUTH_CLIENT_SECRET`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`                 |
| **Polar.sh Billing** | `POLAR_ACCESS_TOKEN`, `POLAR_SERVER_ENVIRONMENT`, `POLAR_TOKENS_METER_ID`, `POLAR_STARTER_PACK_ID`, `POLAR_PRO_PACK_ID`, `POLAR_POWER_PACK_ID` |

The published CLI ships with public-safe defaults baked in for `API_BASE_URL`, `CLERK_API_CLIENT_BASE_URL`, and `CLERK_OAUTH_CLIENT_ID` (none of these are secrets — the CLI is a PKCE public client by design). All server-side secrets stay exclusively in `packages/server` and `packages/db`, and are never bundled into the published CLI.

---

## Authentication & Security

- The CLI is a public OAuth client using **Authorization Code + PKCE** — it never stores or transmits a client secret.
- Access tokens are written to `~/.writ/auth.json` with restrictive file permissions (directory `0700`, file `0600`) so other OS users on a shared machine can't read them.
- Tool execution (`bash`, file reads/writes) happens **entirely on the machine running the CLI** — the deployed server never executes arbitrary commands and has no filesystem access to anyone's project.
- All chat/session endpoints are gated behind Clerk-verified bearer tokens; there is no anonymous access to the LLM-backed routes.

---

## Rate Limits & Portfolio Quota

This project is hosted as a personal portfolio demo, not a production SaaS — so the deployed server enforces a rolling **7-day quota of 3 messages per authenticated user** (`requirePortfolioQuota` middleware, production only) to keep hosting costs predictable. Separately, every request also checks the user's Polar.sh compute-credit balance via `requireComputeCredits`.

If you want unlimited usage, the recommended path is to self-host: clone the repo, supply your own LLM provider keys, and point the CLI at your own server via the `API_BASE_URL` environment variable.

---

## Deployment

### Server (Render.com)

- **Build command:** `pnpm install && pnpm db:push && pnpm build:server`
- **Start command:** `pnpm start:server`
- **Health check:** `GET /healthz`

> Running on Render's free tier — expect a cold-start delay of up to ~50 seconds on the first request after a period of inactivity.

### CLI (npm)

The CLI is published as a standalone, self-contained bundle (workspace-only dependencies are inlined at build time; real npm dependencies remain external):

```bash
cd packages/cli
bun run build
cd dist
npm publish --access public --dry-run
npm publish --access public
```

See `packages/cli/scripts/build.ts` for the full build/publish pipeline.

---

## Roadmap

- [ ] Record and embed a proper demo GIF/screenshots
- [ ] Automate CLI releases via GitHub Actions + npm trusted publishing
- [ ] Expand test coverage across `packages/server` and `packages/cli`
- [ ] Additional themes
- [ ] Self-hosting guide with a one-command Docker Compose setup

---

## Contributing

This is primarily a personal portfolio project, but issues and suggestions are welcome. If you'd like to contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Open a pull request describing the change

---

## License

Distributed under the **Apache-2.0 License**. See [`LICENSE`](./LICENSE) for the full text.

---

## Author

**Dhrubajyoti Bhattacharjee**

- GitHub: [@KeepSerene](https://github.com/KeepSerene)
- Portfolio: [math-to-dev.vercel.app](https://math-to-dev.vercel.app)

---

## Acknowledgments

- [OpenCode](https://opencode.ai) — the project that inspired this build
- [OpenTUI](https://github.com/anomalyco/opentui) — the Zig-native terminal renderer powering the TUI
- [Vercel AI SDK](https://sdk.vercel.ai) — unified streaming/tool-calling interface across LLM providers
