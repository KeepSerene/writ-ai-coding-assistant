<p align="center">
  <img src="https://your-app.onrender.com/logo.webp" alt="Writ logo" width="80" height="80" />
</p>

<h1 align="center">writ</h1>

<p align="center">
  A terminal-based, agentic AI coding assistant. Run it with one command — no install, no setup.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@keepserene/writ"><img src="https://img.shields.io/npm/v/@keepserene/writ?label=npm" alt="npm version" /></a>
  <a href="#"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License" /></a>
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/requires-Bun-black?logo=bun" alt="Requires Bun" /></a>
</p>

```bash
bunx @keepserene/writ
```

<!-- TODO: Replace with an actual recording before publishing -->
<p align="center">
  <img src="https://raw.githubusercontent.com/keepserene/writ/main/docs/assets/demo.gif" alt="Writ CLI demo" width="700" />
</p>

---

## What is this?

`writ` is the terminal client for **Writ**, a full-stack AI coding assistant in the spirit of OpenCode and Claude Code. It runs entirely in your terminal, reads and edits files in whatever directory you launch it from, and streams responses from your choice of LLM provider through a small managed backend — no API keys required to try it.

This package is the CLI half only. It's a thin, React-powered terminal UI; all inference, auth, and billing happen server-side. See the [full project README](https://github.com/keepserene/writ) for the complete architecture, including the Hono/Prisma server this talks to.

## Requirements

- [Bun](https://bun.sh) — the only runtime dependency. If you don't have it:
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```
- macOS or Linux (including WSL). Native Windows isn't currently supported.

## Quick Start

```bash
bunx @keepserene/writ
```

That's it — no installation, no config file, no API keys. It connects to the hosted demo server out of the box. Run `/login` from inside the app to authenticate (opens your browser) and start a session.

If you'd rather install it globally instead of invoking it via `bunx` every time:

```bash
bun add -g @keepserene/writ
writ
```

## Features

- **Agentic tool use** — reads, writes, and surgically edits files; searches your codebase with `grep`/`glob`; runs shell commands — all executed locally, in the directory you launched it from.
- **Two modes** — `Plan` for read-only exploration, `Build` for full read/write + shell access. Toggle with <kbd>Tab</kbd>.
- **Multi-model picker** — switch between Gemini, Groq, Mistral, Cerebras, and NVIDIA NIM models on the fly with `/models`.
- **`@`-mention files** — type `@` to fuzzy-find and reference files/directories from your project directly in a prompt.
- **Resumable sessions** — `/sessions` lists your past conversations; pick one up where you left off.
- **Slash command palette** — fast, keyboard-driven access to everything below.
- **Themeable** — several built-in color themes via `/themes`, remembered across runs.
- **Secure auth** — browser-based OAuth (Authorization Code + PKCE); no secrets ever touch your terminal or disk in plaintext. Your token is stored at `~/.writ/auth.json` with owner-only file permissions.

## Usage

### Slash Commands

| Command     | Description                                          |
| ----------- | ---------------------------------------------------- |
| `/new`      | Start a new conversation                             |
| `/modes`    | Switch between Plan and Build mode                   |
| `/models`   | Select an AI model                                   |
| `/sessions` | Browse past sessions _(requires login)_              |
| `/themes`   | Change the color theme                               |
| `/login`    | Sign in via your browser                             |
| `/logout`   | Sign out and clear local credentials                 |
| `/upgrade`  | Buy more compute credits _(requires login)_          |
| `/usage`    | View remaining credits & invoices _(requires login)_ |
| `/exit`     | Quit                                                 |

### Modes

| Mode                     | Tools available                                        |
| ------------------------ | ------------------------------------------------------ |
| **Plan** (read-only)     | `readFile`, `listDirectory`, `glob`, `grep`            |
| **Build** (read & write) | All of the above, plus `writeFile`, `editFile`, `bash` |

> **Heads up:** in Build mode, the assistant can run shell commands in your current directory. It's instructed to always ask before anything destructive (`rm -rf`, force-pushes, dropping databases, etc.), but you're running an LLM-driven agent locally — keep an eye on what it proposes, same as you would with any AI coding tool.

### File Mentions

Type `@` followed by a path fragment to reference a file or folder — e.g. `@src/index.ts` or `@components`. Suggestions are scoped to your current project directory.

## Supported Models

| Model                                         | Provider   |
| --------------------------------------------- | ---------- |
| Gemini 3.5 Flash / 3.1 Flash Lite / 2.5 Flash | Google     |
| GPT OSS 120B / GPT OSS 20B / Qwen3 32B        | Groq       |
| Devstral / Mistral Small                      | Mistral    |
| GPT OSS 120B / GLM 4.7                        | Cerebras   |
| Kimi K2.6                                     | NVIDIA NIM |

## Configuration

`writ` works out of the box with zero configuration — it ships with public, non-secret defaults pointing at the hosted demo server. If you're self-hosting your own [Writ server](https://github.com/keepserene/writ), point the CLI at it with environment variables:

```bash
API_BASE_URL="https://your-server.example.com" \
CLERK_API_CLIENT_BASE_URL="https://your-clerk-instance.clerk.accounts.dev" \
CLERK_OAUTH_CLIENT_ID="your_clerk_client_id" \
writ
```

None of these are secrets — `writ` is a public OAuth client (PKCE), so there's no client secret to configure on the CLI side.

## Demo Limits

The hosted demo server enforces a rolling **7-day quota of 3 messages per account** to keep a free-tier deployment sane — this is a portfolio project, not a hosted product. If you hit it, the CLI will tell you when it resets. For unlimited use, [self-host the server](https://github.com/keepserene/writ#deployment) with your own LLM provider keys and point this CLI at it as shown above.

## Building From Source

This package is published from a monorepo. To build or modify it yourself:

```bash
git clone https://github.com/keepserene/writ.git
cd writ
pnpm install
pnpm dev:cli
```

See the [main repository](https://github.com/keepserene/writ) for full setup instructions, including the server and database.

## License

Apache-2.0 — see [LICENSE](https://github.com/keepserene/writ/blob/main/LICENSE).

## Author

**Dhrubajyoti Bhattacharjee**
[GitHub @KeepSerene](https://github.com/KeepSerene) · [Portfolio](https://math-to-dev.vercel.app)

## Links

- [Source code](https://github.com/keepserene/writ)
- [Report an issue](https://github.com/keepserene/writ/issues)
