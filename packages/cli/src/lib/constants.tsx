import type { KeyBinding } from "@opentui/core";
import type { CommandMenuItem } from "../components/command-menu/types";
import { SUPPORTED_CHAT_MODELS } from "@writ/shared";
import {
  ModelsDialog,
  ModesDialog,
  SessionsDialog,
  ThemesDialog,
} from "../components/dialogs";
import { initiateOAuthLogin } from "./oauth";
import { clearAuthToken } from "./auth-token-store";
import { openBillingPortal, openCheckout } from "./billing";

export const EMPTY_BORDER_CONFIG = {
  topLeft: "",
  bottomLeft: "",
  vertical: "",
  topRight: "",
  bottomRight: "",
  horizontal: " ",
  bottomT: "",
  topT: "",
  cross: "",
  leftT: "",
  rightT: "",
} as const;

export const SPLIT_BORDER_CONFIG = {
  border: ["left" as const, "right" as const],
  customBorderChars: {
    ...EMPTY_BORDER_CONFIG,
    vertical: "┃",
  },
} as const;

export const TEXTAREA_KEY_BINDINGS: KeyBinding[] = [
  { name: "return", shift: true, action: "newline" },
  { name: "enter", shift: true, action: "newline" },
  { name: "return", action: "submit" },
  { name: "enter", action: "submit" },
] as const;

export const COMMAND_MENU_ITEMS: CommandMenuItem[] = [
  {
    name: "new",
    description: "Start a new conversation",
    showWhen: "always",
    command: "/new",
    action: (ctx) => {
      ctx.navigate("/");
    },
  },
  {
    name: "modes",
    description: "Switch modes",
    showWhen: "always",
    command: "/modes",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Modes",
        children: (
          <ModesDialog currentMode={ctx.mode} onSelectMode={ctx.setMode} />
        ),
      });
    },
  },
  {
    name: "models",
    description: "Select an AI model for generation",
    showWhen: "always",
    command: "/models",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Models",
        children: (
          <ModelsDialog
            models={SUPPORTED_CHAT_MODELS.map((m) => m.id)}
            currentModel={ctx.model}
            onSelectModel={ctx.setModel}
          />
        ),
      });
    },
  },
  {
    name: "sessions",
    description: "Browse past sessions",
    showWhen: "authenticated", // Requires DB lookup
    command: "/sessions",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Sessions",
        children: <SessionsDialog />,
      });
    },
  },
  {
    name: "themes",
    description: "Change color theme",
    showWhen: "always",
    command: "/themes",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Themes",
        children: <ThemesDialog />,
      });
    },
  },
  {
    name: "login",
    description: "Sign in with your browser",
    showWhen: "unauthenticated",
    command: "/login",
    action: async (ctx) => {
      ctx.toast.show({ message: "Opening browser to sign in..." });

      try {
        await initiateOAuthLogin();
        ctx.toast.show({
          variant: "success",
          message: "Signed in successfully",
        });
      } catch (error) {
        const errMsg =
          error instanceof Error
            ? error.message
            : "Sign in failed or timed out";
        ctx.toast.show({ variant: "error", message: errMsg });
      }
    },
  },
  {
    name: "logout",
    description: "Sign out of your account",
    showWhen: "authenticated",
    command: "/logout",
    action: (ctx) => {
      clearAuthToken();
      ctx.toast.show({
        variant: "success",
        message: "Signed out successfully",
      });
    },
  },
  {
    name: "upgrade",
    description: "Buy more compute credits",
    showWhen: "authenticated",
    command: "/upgrade",
    action: async (ctx) => {
      ctx.toast.show({ message: "Opening checkout..." });

      try {
        await openCheckout();
        ctx.toast.show({
          variant: "success",
          message: "Checkout opened in browser",
        });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : "Failed to open checkout";
        ctx.toast.show({ variant: "error", message: errMsg });
      }
    },
  },
  {
    name: "usage",
    description: "View remaining credits & invoices",
    showWhen: "authenticated",
    command: "/usage",
    action: async (ctx) => {
      ctx.toast.show({ message: "Opening billing portal..." });

      try {
        await openBillingPortal();
        ctx.toast.show({
          variant: "success",
          message: "Portal opened in browser",
        });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : "Failed to open portal";
        ctx.toast.show({ variant: "error", message: errMsg });
      }
    },
  },
  {
    name: "exit",
    description: "Quit the application",
    showWhen: "always",
    command: "/exit",
    action: (ctx) => ctx.exit(),
  },
] as const;

export const MAX_VISIBLE_COMMAND_ITEMS = 8 as const;

export const DEFAULT_TOAST_DURATION = 3000 as const;

export const MAX_VISIBLE_FILTER_LIST_ITEMS = 6 as const;

export const MAX_VISIBLE_MENTIONS = 8 as const;
export const CWD = process.cwd();
export const MAX_MENTION_FALLBACK_CANDIDATES = 32 as const;
export const VALID_MENTION_QUERY_CHAR_REGEX = /[A-Za-z0-9._/-]/;
export const MENTION_SKIP_DIRS = new Set([
  // Version control
  ".git",
  ".svn",
  ".hg",
  // JS/TS dependency & build dirs
  "node_modules",
  "dist",
  "build",
  "out",
  ".next", // Next.js
  ".nuxt", // Nuxt
  ".svelte-kit", // SvelteKit
  ".turbo", // Turborepo
  ".cache", // Various build tools (Parcel, Babel, etc.)
  "coverage", // Jest/Vitest coverage output
  ".expo", // Expo (React Native)
  // Python (common in full-stack repos)
  "__pycache__",
  ".venv",
  "venv",
  ".mypy_cache",
  ".pytest_cache",
  // Rust / systems
  "target",
  // macOS / editor noise
  ".DS_Store",
  ".idea",
  ".vscode",
]);
